import 'dotenv/config';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import defaultFirebaseConfig from '../../firebase-applet-config.json';
import { SEED_ARTICLES, SEED_AUTHORS, SEED_CATEGORIES } from '../data/seedCatalog';
import { buildRobotsTxt, buildSitemapXml } from '../lib/seo';
import { EngagementStore, type RuntimeInsightsSnapshot } from '../lib/engagementStore';
import {
  mapAiDraftToArticle,
  sanitizeGroundedSources,
  sanitizeSeoOptimizationPayload,
} from '../lib/aiDraftMapper';
import type { AiDraftLocalePayload, Article, CategorySlug, Locale } from '../types/qorvia';

const MODEL_ID = 'gemini-4-hydrogen';
const BOOTSTRAPPED_SUPER_ADMIN_EMAIL = 'sbgangster016@gmail.com';

interface FirebaseConfigFile {
  apiKey: string;
  projectId: string;
  firestoreDatabaseId: string;
}

const firebaseConfig: FirebaseConfigFile = {
  apiKey: (
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    defaultFirebaseConfig.apiKey
  ).trim(),
  projectId: (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    defaultFirebaseConfig.projectId
  ).trim(),
  firestoreDatabaseId: (
    process.env.FIREBASE_DATABASE_ID ||
    defaultFirebaseConfig.firestoreDatabaseId
  ).trim(),
};

function getAiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface VerifiedStaffRequest extends Request {
  staffUser?: {
    uid: string;
    email: string;
    role: string;
  };
}

async function verifyStaffAuthorization(
  req: VerifiedStaffRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Authentication token required.' });
    return;
  }
  const idToken = match[1].trim();

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupRes.ok) {
      res.status(401).json({ error: 'Invalid or expired authentication session.' });
      return;
    }

    const lookupData = (await lookupRes.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const account = lookupData.users?.[0];
    if (!account?.localId || !account.email || account.emailVerified !== true) {
      res.status(403).json({ error: 'Verified account required.' });
      return;
    }

    const emailLower = account.email.toLowerCase();
    if (emailLower === BOOTSTRAPPED_SUPER_ADMIN_EMAIL) {
      req.staffUser = {
        uid: account.localId,
        email: account.email,
        role: 'superAdmin',
      };
      next();
      return;
    }

    const dbUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(
      firebaseConfig.firestoreDatabaseId
    )}/documents/users/${encodeURIComponent(account.localId)}`;

    const userDocRes = await fetch(dbUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!userDocRes.ok) {
      res.status(403).json({ error: 'Access restricted.' });
      return;
    }

    const userDoc = (await userDocRes.json()) as {
      fields?: {
        role?: { stringValue?: string };
        isActive?: { booleanValue?: boolean };
      };
    };

    const role = userDoc.fields?.role?.stringValue || 'reader';
    const isActive = userDoc.fields?.isActive?.booleanValue === true;

    if (!isActive || !['superAdmin', 'editor', 'reviewer'].includes(role)) {
      res.status(403).json({ error: 'Access restricted.' });
      return;
    }

    req.staffUser = {
      uid: account.localId,
      email: account.email,
      role,
    };
    next();
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Unable to verify authorization.',
    });
  }
}

function sanitizeGroundedUrls(
  rawChunks: Array<{ web?: { uri?: string; title?: string } }> | undefined
): Array<{ uri: string; title: string }> {
  if (!Array.isArray(rawChunks)) return [];
  const seen = new Set<string>();
  const out: Array<{ uri: string; title: string }> = [];

  for (const chunk of rawChunks) {
    const uri = (chunk.web?.uri || '').trim();
    if (!uri || seen.has(uri)) continue;
    try {
      const parsed = new URL(uri);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') continue;
      seen.add(uri);
      out.push({
        uri: uri.slice(0, 1000),
        title: (chunk.web?.title || parsed.hostname).trim().slice(0, 300),
      });
    } catch {
      continue;
    }
    if (out.length >= 10) break;
  }
  return out;
}

const RUNTIME_DATA_DIR = process.env.VERCEL
  ? path.resolve('/tmp', 'qorvia-data')
  : path.resolve(process.cwd(), '.data');
const RUNTIME_DATA_FILE = path.resolve(RUNTIME_DATA_DIR, 'qorvia-runtime.json');

function loadEngagementStore(): EngagementStore {
  try {
    if (
      RUNTIME_DATA_FILE.startsWith(RUNTIME_DATA_DIR + path.sep) &&
      fs.existsSync(RUNTIME_DATA_FILE)
    ) {
      const raw = fs.readFileSync(RUNTIME_DATA_FILE, 'utf-8');
      return new EngagementStore(JSON.parse(raw) as Partial<RuntimeInsightsSnapshot>);
    }
  } catch {
    // Fallback cleanly to empty in-memory store
  }
  return new EngagementStore();
}

const engagementStore = loadEngagementStore();

function persistEngagementStore(): void {
  try {
    if (!RUNTIME_DATA_FILE.startsWith(RUNTIME_DATA_DIR + path.sep)) return;
    fs.mkdirSync(RUNTIME_DATA_DIR, { recursive: true });
    fs.writeFileSync(RUNTIME_DATA_FILE, JSON.stringify(engagementStore.exportSnapshot(), null, 2));
  } catch {
    // Non-fatal in read-only runtimes
  }
}

function getVisitorFingerprint(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded) || req.socket?.remoteAddress || 'anon';
  const ua = req.headers['user-agent'] || 'ua';
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
}

function resolveRequestOrigin(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host =
    (req.headers['x-forwarded-host'] as string) ||
    req.headers.host ||
    `localhost:${process.env.PORT || 3000}`;
  return `${proto.split(',')[0].trim()}://${host.split(',')[0].trim()}`;
}

async function fetchPublishedArticlesForSitemap(): Promise<Article[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      firebaseConfig.projectId
    )}/databases/${encodeURIComponent(
      firebaseConfig.firestoreDatabaseId
    )}/documents:runQuery`;

    const res = await fetch(runQueryUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'articles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'published' },
            },
          },
          limit: 200,
        },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) return SEED_ARTICLES;
    const rows = (await res.json()) as Array<{
      document?: {
        name?: string;
        fields?: Record<string, { stringValue?: string; booleanValue?: boolean; timestampValue?: string }>;
      };
    }>;

    const mapped: Article[] = [];
    for (const row of rows) {
      const fields = row.document?.fields;
      if (!fields) continue;
      const slug = fields.slug?.stringValue;
      const title = fields.title?.stringValue;
      if (!slug || !title) continue;
      mapped.push({
        ...SEED_ARTICLES[0],
        articleId: fields.articleId?.stringValue || slug,
        translationGroupId: fields.translationGroupId?.stringValue || `grp-${slug}`,
        locale: (fields.locale?.stringValue as Locale) === 'bn' ? 'bn' : 'en',
        title,
        slug,
        categoryId: (fields.categoryId?.stringValue as CategorySlug) || 'technology',
        status: 'published',
        isFeatured: Boolean(fields.isFeatured?.booleanValue),
        publishedAt:
          fields.publishedAt?.stringValue ||
          fields.createdAt?.timestampValue ||
          new Date().toISOString(),
        updatedAt: fields.updatedAt?.timestampValue || new Date().toISOString(),
      });
    }
    return mapped.length > 0 ? mapped : SEED_ARTICLES;
  } catch {
    return SEED_ARTICLES;
  }
}

export function createQorviaApiApp(): Express {
  const app = express();
  const jsonParser = express.json({ limit: '1mb' });

  // Support both raw Node HTTP streams (local/AI Studio) and Vercel pre-parsed req.body
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body !== undefined && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      next();
      return;
    }
    jsonParser(req, res, next);
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    res.type('text/plain; charset=utf-8').send(buildRobotsTxt(resolveRequestOrigin(req)));
  });

  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    const articles = await fetchPublishedArticlesForSitemap();
    const xml = buildSitemapXml({
      articles,
      categories: SEED_CATEGORIES,
      authors: SEED_AUTHORS,
      origin: resolveRequestOrigin(req),
    });
    res.type('application/xml; charset=utf-8').send(xml);
  });

  app.get('/api/engagement/scores', (_req: Request, res: Response) => {
    res.json({ scores: engagementStore.getPublicScores() });
  });

  app.post('/api/engagement/track', (req: Request, res: Response) => {
    const { articleId, locale, event } = (req.body ?? {}) as {
      articleId?: string;
      locale?: 'en' | 'bn';
      event?: 'view' | 'read';
    };
    const result = engagementStore.recordEngagement({
      articleId: String(articleId || ''),
      locale: locale === 'bn' ? 'bn' : 'en',
      event: event === 'read' ? 'read' : 'view',
      visitorFingerprint: getVisitorFingerprint(req),
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Invalid engagement event.' });
      return;
    }
    if (result.counted) {
      persistEngagementStore();
    }
    res.json({
      ok: true,
      counted: result.counted,
      scoreDelta: result.entry?.scoreDelta ?? 0,
    });
  });

  app.post('/api/public/newsletter', (req: Request, res: Response) => {
    const { email, locale } = (req.body ?? {}) as { email?: string; locale?: 'en' | 'bn' };
    const result = engagementStore.subscribeNewsletter({
      email: String(email || ''),
      locale: locale === 'bn' ? 'bn' : 'en',
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Invalid email address.' });
      return;
    }
    persistEngagementStore();
    res.json({ ok: true, alreadySubscribed: Boolean(result.alreadySubscribed) });
  });

  app.post('/api/public/contact', (req: Request, res: Response) => {
    const { name, email, message, locale } = (req.body ?? {}) as {
      name?: string;
      email?: string;
      message?: string;
      locale?: 'en' | 'bn';
    };
    const result = engagementStore.submitContactInquiry({
      name: String(name || ''),
      email: String(email || ''),
      message: String(message || ''),
      locale: locale === 'bn' ? 'bn' : 'en',
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Invalid inquiry submission.' });
      return;
    }
    persistEngagementStore();
    res.json({ ok: true, inquiryId: result.inquiry?.id });
  });

  app.get('/api/admin/insights', verifyStaffAuthorization, (_req: Request, res: Response) => {
    res.json(engagementStore.getAdminInsights());
  });

  app.get('/api/ai/health', verifyStaffAuthorization, (_req: Request, res: Response) => {
    res.json({
      configured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      model: MODEL_ID,
    });
  });

  app.post(
    '/api/ai/suggest-topics',
    verifyStaffAuthorization,
    async (req: Request, res: Response) => {
      try {
        const ai = getAiClient();
        const { categoryId, categoryName, subcategories, focusPrompt } = (req.body ?? {}) as {
          categoryId?: string;
          categoryName?: string;
          subcategories?: Array<{ slug: string; name: string }>;
          focusPrompt?: string;
        };

        const safeCategory = String(categoryName || categoryId || 'Technology & AI').slice(0, 120);
        const safeSubList = Array.isArray(subcategories)
          ? subcategories
              .slice(0, 10)
              .map((s) => `${String(s.slug)} (${String(s.name)})`)
              .join(', ')
          : '';
        const safeFocus = String(focusPrompt || '').trim().slice(0, 300);

        const prompt = [
          `You are the commissioning editor for QORVIA, a bilingual (English + Bengali) knowledge publication serving international and Bangladeshi readers.`,
          `Category: ${safeCategory}.`,
          safeSubList ? `Available subcategories: ${safeSubList}.` : '',
          safeFocus ? `Editorial focus: ${safeFocus}.` : '',
          `Suggest 4 timely, verifiable, high-value educational/explainer article topics that are genuinely useful for learners, developers, or curious readers.`,
          `Pick matching subcategorySlug values from the available subcategories list when applicable.`,
        ]
          .filter(Boolean)
          .join('\n');

        const response = await ai.models.generateContent({
          model: MODEL_ID,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Clear editorial headline/topic title (max 140 chars).',
                  },
                  rationale: {
                    type: Type.STRING,
                    description: 'Brief editorial rationale why readers need this guide now.',
                  },
                  subcategorySlug: {
                    type: Type.STRING,
                    description: 'Best matching subcategory slug.',
                  },
                  priority: {
                    type: Type.INTEGER,
                    description: 'Priority 1 to 10 (10 highest).',
                  },
                },
                required: ['title', 'rationale', 'subcategorySlug', 'priority'],
              },
            },
          },
        });

        const parsed = JSON.parse((response.text || '[]').trim());
        res.json({ model: MODEL_ID, suggestions: Array.isArray(parsed) ? parsed.slice(0, 6) : [] });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Topic suggestion request failed.';
        res.status(502).json({ error: msg });
      }
    }
  );

  app.post(
    '/api/ai/generate-draft',
    verifyStaffAuthorization,
    async (req: Request, res: Response) => {
      try {
        const ai = getAiClient();
        const {
          topicTitle,
          categoryName,
          subcategoryName,
          targetLocales,
          editorialGuidance,
        } = (req.body ?? {}) as {
          topicTitle?: string;
          categoryName?: string;
          subcategoryName?: string;
          targetLocales?: Array<'en' | 'bn'>;
          editorialGuidance?: string;
        };

        const cleanTopic = String(topicTitle || '').trim().slice(0, 240);
        if (cleanTopic.length < 3) {
          res.status(400).json({ error: 'Topic title must be at least 3 characters.' });
          return;
        }

        const locales: Array<'en' | 'bn'> =
          Array.isArray(targetLocales) && targetLocales.length > 0
            ? targetLocales.filter((l): l is 'en' | 'bn' => l === 'en' || l === 'bn')
            : ['en'];

        const cleanCategory = String(categoryName || 'Knowledge').slice(0, 120);
        const cleanSub = String(subcategoryName || '').slice(0, 120);
        const cleanGuidance = String(editorialGuidance || '').trim().slice(0, 500);

        const researchPrompt = [
          `Conduct concise factual background research with primary or authoritative sources on the topic:`,
          `"${cleanTopic}" (Department: ${cleanCategory}${cleanSub ? `, Topic: ${cleanSub}` : ''}).`,
          cleanGuidance ? `Additional editorial guidance: ${cleanGuidance}` : '',
          `Summarize the verified consensus, concrete specifications or dates, and highlight any conflicting or uncertain claims clearly.`,
        ]
          .filter(Boolean)
          .join('\n');

        const researchRes = await ai.models.generateContent({
          model: MODEL_ID,
          contents: researchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const researchBrief = (researchRes.text || '').trim().slice(0, 8000);
        const rawChunks = researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const groundedChunks = sanitizeGroundedUrls(rawChunks);

        const drafts = [];
        for (const loc of locales) {
          const isBn = loc === 'bn';
          const synthesisPrompt = [
            `You are a senior editorial writer at QORVIA writing a verified, deeply informative article in ${
              isBn
                ? 'formal, natural Bengali Unicode script (বাংলা ইউনিকোড — NEVER Banglish or Romanized Bengali)'
                : 'clear, authoritative international English'
            }.`,
            `Topic: "${cleanTopic}".`,
            `Department: ${cleanCategory}${cleanSub ? ` / ${cleanSub}` : ''}.`,
            cleanGuidance ? `Editorial guidance: ${cleanGuidance}.` : '',
            `Grounded Research Brief:\n${researchBrief || 'Limited live search results; flag any specific statistics needing human verification.'}`,
            groundedChunks.length > 0
              ? `Grounded Sources Found:\n${groundedChunks
                  .map((c, idx) => `${idx + 1}. ${c.title} (${c.uri})`)
                  .join('\n')}`
              : `No external search sources returned; set verificationFlag to true and note which facts require human citation.`,
            `Requirements:`,
            `- Produce 3 to 4 structured sections with clear H2 headings containing natural high-intent search keywords and thorough, non-fluff paragraphs.`,
            `- Produce an SEO-friendly ASCII lowercase hyphenated URL slug (^[a-z0-9-]+$) even for Bengali articles (e.g. 'grounded-ai-retrieval-bn').`,
            `- Generate an optimized metaTitle (50–65 chars, ending with ' | QORVIA' if space permits), compelling metaDescription (135–160 chars), and 4–6 semantic SEO tags.`,
            `- Never invent citations, dates, or statistics not supported in the research brief; if evidence is missing or uncertain, set verificationFlag=true and list exact checks in verificationNotes.`,
          ].join('\n\n');

          const draftRes = await ai.models.generateContent({
            model: MODEL_ID,
            contents: synthesisPrompt,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Article headline (max 200 chars).' },
                  slug: {
                    type: Type.STRING,
                    description: 'ASCII lowercase hyphenated URL slug matching ^[a-z0-9-]+$.',
                  },
                  excerpt: {
                    type: Type.STRING,
                    description: 'Editorial standfirst summary (30 to 400 chars).',
                  },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 to 6 relevant topical tags.',
                  },
                  sections: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        heading: { type: Type.STRING },
                        paragraphs: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ['heading', 'paragraphs'],
                    },
                  },
                  keyTakeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  quoteText: { type: Type.STRING },
                  quoteAttribution: { type: Type.STRING },
                  calloutTitle: { type: Type.STRING },
                  calloutText: { type: Type.STRING },
                  metaTitle: { type: Type.STRING },
                  metaDescription: { type: Type.STRING },
                  verificationFlag: {
                    type: Type.BOOLEAN,
                    description: 'True if human verification is needed for uncertain/unverified facts.',
                  },
                  verificationNotes: {
                    type: Type.STRING,
                    description: 'Specific verification notes for the human reviewer.',
                  },
                },
                required: [
                  'title',
                  'slug',
                  'excerpt',
                  'tags',
                  'sections',
                  'keyTakeaways',
                  'metaTitle',
                  'metaDescription',
                  'verificationFlag',
                  'verificationNotes',
                ],
              },
            },
          });

          const parsedDraft = JSON.parse((draftRes.text || '{}').trim());
          drafts.push({
            locale: loc,
            ...parsedDraft,
          });
        }

        res.json({
          model: MODEL_ID,
          groundedChunks,
          drafts,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI draft generation failed.';
        res.status(502).json({ error: msg });
      }
    }
  );

  app.post(
    '/api/ai/discover-top-search',
    verifyStaffAuthorization,
    async (req: Request, res: Response) => {
      try {
        const ai = getAiClient();
        const { count = 2, existingTitles = [], preferredCategory } = (req.body ?? {}) as {
          count?: number;
          existingTitles?: string[];
          preferredCategory?: string;
        };

        const safeCount = Math.max(1, Math.min(4, Number(count) || 2));
        const todayStr = new Date().toISOString().slice(0, 10);
        const avoidList = Array.isArray(existingTitles)
          ? existingTitles.slice(0, 40).map((t) => String(t).slice(0, 140))
          : [];
        const catFilter = preferredCategory ? String(preferredCategory).slice(0, 64) : '';

        const trendSearchPrompt = [
          `Today is ${todayStr}. Use Google Search to identify today's top-searched, high-interest, evergreen-useful knowledge topics across technology & AI, education & learning, digital skills, and general science/knowledge.`,
          catFilter ? `Prioritize department: ${catFilter}.` : '',
          avoidList.length > 0
            ? `Avoid repeating or duplicating these existing publication titles:\n- ${avoidList.join('\n- ')}`
            : '',
          `Summarize the top ${safeCount + 2} trending search topics with concrete factual context explaining why people are searching for them right now.`,
        ]
          .filter(Boolean)
          .join('\n\n');

        const trendRes = await ai.models.generateContent({
          model: MODEL_ID,
          contents: trendSearchPrompt,
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const trendBrief = (trendRes.text || '').trim().slice(0, 6000);
        const extractPrompt = [
          `From the trending search brief below, select the best ${safeCount} non-duplicate article topics for QORVIA.`,
          `Allowed categoryId values: "technology", "education", "digital-skills", "general-knowledge".`,
          `Subcategory hints:`,
          `- technology: "artificial-intelligence", "software-and-applications", "internet-technology", "cybersecurity-education"`,
          `- education: "study-methods", "student-guides", "research-skills", "online-learning"`,
          `- digital-skills: "web-development", "productivity-tools", "data-and-analytics", "creator-economy"`,
          `- general-knowledge: "science-explainers", "world-systems", "history-and-culture", "health-literacy"`,
          `Trending brief:\n${trendBrief}`,
        ].join('\n\n');

        const structuredRes = await ai.models.generateContent({
          model: MODEL_ID,
          contents: extractPrompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'SEO-strong editorial headline (max 140 chars).' },
                  categoryId: { type: Type.STRING, description: 'One of technology, education, digital-skills, general-knowledge.' },
                  subcategorySlug: { type: Type.STRING },
                  searchQuery: { type: Type.STRING, description: 'Primary top search query keyword.' },
                  rationale: { type: Type.STRING },
                  priority: { type: Type.INTEGER },
                },
                required: ['title', 'categoryId', 'subcategorySlug', 'searchQuery', 'rationale', 'priority'],
              },
            },
          },
        });

        const allowedCats: CategorySlug[] = [
          'technology',
          'education',
          'digital-skills',
          'general-knowledge',
        ];
        const rawList = JSON.parse((structuredRes.text || '[]').trim());
        const topics = (Array.isArray(rawList) ? rawList : [])
          .slice(0, safeCount)
          .map((item) => {
            const catRaw = String(item?.categoryId || 'technology') as CategorySlug;
            const categoryId: CategorySlug = allowedCats.includes(catRaw) ? catRaw : 'technology';
            return {
              title: String(item?.title || '').trim().slice(0, 140),
              categoryId,
              subcategorySlug: String(item?.subcategorySlug || '').trim().slice(0, 80),
              searchQuery: String(item?.searchQuery || item?.title || '').trim().slice(0, 140),
              rationale: String(item?.rationale || '').trim().slice(0, 300),
              priority: Math.max(1, Math.min(10, Number(item?.priority) || 9)),
            };
          })
          .filter((t) => t.title.length >= 3);

        res.json({ model: MODEL_ID, date: todayStr, topics });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Top-search discovery failed.';
        res.status(502).json({ error: msg });
      }
    }
  );

  app.post(
    '/api/ai/optimize-seo',
    verifyStaffAuthorization,
    async (req: Request, res: Response) => {
      try {
        const ai = getAiClient();
        const { articles: rawArticles } = (req.body ?? {}) as {
          articles?: Array<{
            articleId?: string;
            locale?: Locale;
            slug?: string;
            title?: string;
            excerpt?: string;
            categoryId?: string;
            tags?: string[];
            currentMetaTitle?: string;
            currentMetaDescription?: string;
            imageAlt?: string;
          }>;
        };

        const batch = Array.isArray(rawArticles) ? rawArticles.slice(0, 12) : [];
        if (batch.length === 0) {
          res.status(400).json({ error: 'Provide at least one article to optimize SEO.' });
          return;
        }

        const prompt = [
          `You are QORVIA's Technical SEO Specialist. Optimize search engine metadata for each article below in its exact language ("en" for English, "bn" for natural Bengali Unicode script).`,
          `Rules per article:`,
          `- metaTitle: 50–65 characters, keyword-first, concise, ending with ' | QORVIA' when natural (max 160 chars).`,
          `- metaDescription: 135–160 characters, informative, accurate to the article's excerpt without clickbait.`,
          `- tags: 5–8 high-intent SEO tags in the article's language (English or Bengali).`,
          `- imageAlt: clear, descriptive accessibility + image-search alt text (60–140 chars).`,
          `Articles:\n${JSON.stringify(
            batch.map((a) => ({
              articleId: String(a.articleId || ''),
              locale: a.locale === 'bn' ? 'bn' : 'en',
              title: String(a.title || '').slice(0, 200),
              excerpt: String(a.excerpt || '').slice(0, 400),
              categoryId: String(a.categoryId || 'technology'),
              currentTags: Array.isArray(a.tags) ? a.tags.slice(0, 8) : [],
            })),
            null,
            2
          )}`,
        ].join('\n\n');

        const seoRes = await ai.models.generateContent({
          model: MODEL_ID,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  articleId: { type: Type.STRING },
                  metaTitle: { type: Type.STRING },
                  metaDescription: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  imageAlt: { type: Type.STRING },
                },
                required: ['articleId', 'metaTitle', 'metaDescription', 'tags', 'imageAlt'],
              },
            },
          },
        });

        const parsed = JSON.parse((seoRes.text || '[]').trim());
        const byId = new Map<string, Partial<{ articleId: string; metaTitle: string; metaDescription: string; tags: string[]; imageAlt: string }>>();
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.articleId) byId.set(String(item.articleId), item);
          }
        }

        const results = batch.map((a) => {
          const articleId = String(a.articleId || '');
          const rawOpt = byId.get(articleId) ?? {};
          return sanitizeSeoOptimizationPayload(rawOpt, {
            articleId,
            locale: a.locale === 'bn' ? 'bn' : 'en',
            slug: String(a.slug || articleId),
            title: String(a.title || 'QORVIA Article'),
            excerpt: String(a.excerpt || a.title || ''),
            tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
            featuredImage: { src: '', alt: String(a.imageAlt || a.title || ''), caption: '' },
            seo: {
              metaTitle: String(a.currentMetaTitle || ''),
              metaDescription: String(a.currentMetaDescription || ''),
              canonicalPath: `/${a.locale === 'bn' ? 'bn' : 'en'}/article/${String(a.slug || articleId)}`,
            },
          });
        });

        res.json({ model: MODEL_ID, results });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'SEO optimization request failed.';
        res.status(502).json({ error: msg });
      }
    }
  );

  app.post(
    '/api/ai/auto-post',
    verifyStaffAuthorization,
    async (req: Request, res: Response) => {
      try {
        const ai = getAiClient();
        const {
          count = 1,
          targetLocales = ['en', 'bn'],
          existingTitles = [],
          autoPublish = true,
          authorId = 'ananya-rahman',
        } = (req.body ?? {}) as {
          count?: number;
          targetLocales?: Array<'en' | 'bn'>;
          existingTitles?: string[];
          autoPublish?: boolean;
          authorId?: string;
        };

        const safeCount = Math.max(1, Math.min(3, Number(count) || 1));
        const locales: Array<'en' | 'bn'> =
          Array.isArray(targetLocales) && targetLocales.length > 0
            ? targetLocales.filter((l): l is 'en' | 'bn' => l === 'en' || l === 'bn')
            : ['en', 'bn'];
        const todayStr = new Date().toISOString().slice(0, 10);
        const avoidList = Array.isArray(existingTitles)
          ? existingTitles.slice(0, 30).map((t) => String(t).slice(0, 140))
          : [];

        const trendRes = await ai.models.generateContent({
          model: MODEL_ID,
          contents: [
            `Today is ${todayStr}. Use Google Search to pick the top ${safeCount} trending educational or technology search topics right now.`,
            avoidList.length > 0 ? `Avoid existing titles: ${avoidList.join('; ')}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          config: {
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        const extractTopicsRes = await ai.models.generateContent({
          model: MODEL_ID,
          contents: `Extract ${safeCount} topic object(s) as JSON array from:\n${(trendRes.text || '').slice(0, 5000)}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  categoryId: { type: Type.STRING },
                  subcategorySlug: { type: Type.STRING },
                },
                required: ['title', 'categoryId', 'subcategorySlug'],
              },
            },
          },
        });

        const parsedTopics = JSON.parse((extractTopicsRes.text || '[]').trim());
        const topicList = (Array.isArray(parsedTopics) ? parsedTopics : []).slice(0, safeCount);
        const allowedCats: CategorySlug[] = [
          'technology',
          'education',
          'digital-skills',
          'general-knowledge',
        ];
        const generatedArticles: Article[] = [];

        for (const t of topicList) {
          const topicTitle = String(t?.title || '').trim().slice(0, 200);
          if (topicTitle.length < 3) continue;
          const catRaw = String(t?.categoryId || 'technology') as CategorySlug;
          const categoryId: CategorySlug = allowedCats.includes(catRaw) ? catRaw : 'technology';
          const subcategorySlug = String(t?.subcategorySlug || '').trim().slice(0, 80);

          const researchRes = await ai.models.generateContent({
            model: MODEL_ID,
            contents: `Research factual specifications, dates, and context for: "${topicTitle}".`,
            config: {
              tools: [{ googleSearch: {} }],
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const brief = (researchRes.text || '').trim().slice(0, 7000);
          const groundedChunks = sanitizeGroundedUrls(
            researchRes.candidates?.[0]?.groundingMetadata?.groundingChunks
          );
          const groundedSources = sanitizeGroundedSources(groundedChunks);
          const translationGroupId = `grp-auto-${Date.now().toString(36)}`;

          for (const loc of locales) {
            const draftRes = await ai.models.generateContent({
              model: MODEL_ID,
              contents: [
                `Write an SEO-optimized ${
                  loc === 'bn' ? 'Bengali Unicode (বাংলা)' : 'English'
                } article on "${topicTitle}".`,
                `Research:\n${brief}`,
                `Include 3–4 structured sections, metaTitle (50–65 chars), metaDescription (135–160 chars), 5 SEO tags, and ASCII slug.`,
              ].join('\n\n'),
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    slug: { type: Type.STRING },
                    excerpt: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    sections: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          heading: { type: Type.STRING },
                          paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ['heading', 'paragraphs'],
                      },
                    },
                    keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
                    metaTitle: { type: Type.STRING },
                    metaDescription: { type: Type.STRING },
                    verificationFlag: { type: Type.BOOLEAN },
                    verificationNotes: { type: Type.STRING },
                  },
                  required: [
                    'title',
                    'slug',
                    'excerpt',
                    'tags',
                    'sections',
                    'keyTakeaways',
                    'metaTitle',
                    'metaDescription',
                    'verificationFlag',
                    'verificationNotes',
                  ],
                },
              },
            });

            const parsedDraft = JSON.parse((draftRes.text || '{}').trim()) as Omit<
              AiDraftLocalePayload,
              'locale'
            >;
            const mapped = mapAiDraftToArticle({
              draft: { locale: loc, ...parsedDraft },
              translationGroupId,
              categoryId,
              subcategorySlug,
              authorId: String(authorId || 'ananya-rahman'),
              groundedSources,
              publishImmediately: Boolean(autoPublish),
            });
            generatedArticles.push(mapped);
          }
        }

        res.json({
          model: MODEL_ID,
          date: todayStr,
          articles: generatedArticles,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Automated article post failed.';
        res.status(502).json({ error: msg });
      }
    }
  );

  return app;
}
