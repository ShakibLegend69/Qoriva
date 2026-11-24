import type {
  AiDraftLocalePayload,
  Article,
  CategorySlug,
  ContentBlock,
  Locale,
  SourceReference,
} from '../types/qorvia';
import { estimateReadingTimeMinutes, slugifyTitle } from './editorialValidation';

export function validateTopicInput(input: {
  title: string;
  localeTargets: Locale[];
  priority: number;
}): { valid: boolean; error?: string } {
  const trimmed = input.title.trim();
  if (trimmed.length < 3 || trimmed.length > 240) {
    return {
      valid: false,
      error: 'Topic title must be between 3 and 240 characters.',
    };
  }
  if (!Array.isArray(input.localeTargets) || input.localeTargets.length === 0) {
    return {
      valid: false,
      error: 'Select at least one target language edition (EN or BN).',
    };
  }
  if (!Number.isFinite(input.priority) || input.priority < 1 || input.priority > 10) {
    return {
      valid: false,
      error: 'Topic priority must be between 1 and 10.',
    };
  }
  return { valid: true };
}

export function isSafeHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function sanitizeGroundedSources(
  rawChunks: Array<{ uri?: string; title?: string }>,
  accessedAt = new Date().toISOString().slice(0, 10)
): SourceReference[] {
  const seen = new Set<string>();
  const sources: SourceReference[] = [];

  for (const chunk of rawChunks) {
    const url = (chunk.uri || '').trim();
    if (!url || seen.has(url) || !isSafeHttpUrl(url)) continue;
    seen.add(url);

    let publisher = 'External Reference';
    try {
      publisher = new URL(url).hostname.replace(/^www\./, '').slice(0, 200);
    } catch {
      // ignore
    }

    const title = (chunk.title || publisher).trim().slice(0, 300);
    sources.push({
      sourceId: `src-${Date.now().toString(36)}-${sources.length + 1}`,
      title,
      publisher,
      url: url.slice(0, 1000),
      publishedAt: null,
      accessedAt: accessedAt.slice(0, 64),
    });

    if (sources.length >= 12) break;
  }

  return sources;
}

const DEFAULT_CATEGORY_IMAGE: Record<CategorySlug, string> = {
  technology: '/src/assets/images/hero_ai_architecture_1795449989757.jpg',
  education: '/src/assets/images/article_education_study_1795449988371.jpg',
  'digital-skills': '/src/assets/images/article_digital_skills_1795449988507.jpg',
  'general-knowledge': '/src/assets/images/article_science_knowledge_1795449988615.jpg',
};

export function mapAiDraftToArticle(params: {
  draft: AiDraftLocalePayload;
  translationGroupId: string;
  categoryId: CategorySlug;
  subcategorySlug: string;
  authorId: string;
  groundedSources: SourceReference[];
}): Article {
  const { draft, translationGroupId, categoryId, subcategorySlug, authorId, groundedSources } = params;
  const ts = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const cleanSlug = slugifyTitle(
    draft.slug || draft.title,
    `ai-${draft.locale}-${categoryId}`
  ).slice(0, 180);

  const blocks: ContentBlock[] = [];
  let blockIdx = 1;

  for (const sec of draft.sections.slice(0, 12)) {
    if (sec.heading.trim()) {
      blocks.push({
        id: `ai-blk-${ts}-${blockIdx++}`,
        type: 'heading',
        level: 2,
        text: sec.heading.trim().slice(0, 240),
      });
    }
    for (const para of sec.paragraphs.slice(0, 8)) {
      if (para.trim()) {
        blocks.push({
          id: `ai-blk-${ts}-${blockIdx++}`,
          type: 'paragraph',
          text: para.trim(),
          dropCap: blocks.filter((b) => b.type === 'paragraph').length === 0,
        });
      }
    }
  }

  if (draft.quoteText && draft.quoteText.trim()) {
    blocks.push({
      id: `ai-blk-${ts}-${blockIdx++}`,
      type: 'quote',
      text: draft.quoteText.trim(),
      attribution: draft.quoteAttribution?.trim() || 'Editorial Research Synthesis',
    });
  }

  const cleanTakeaways = draft.keyTakeaways.map((k) => k.trim()).filter(Boolean);
  if (cleanTakeaways.length > 0) {
    blocks.push({
      id: `ai-blk-${ts}-${blockIdx++}`,
      type: 'list',
      ordered: false,
      items: cleanTakeaways.slice(0, 10),
    });
  }

  if (draft.calloutText && draft.calloutText.trim()) {
    blocks.push({
      id: `ai-blk-${ts}-${blockIdx++}`,
      type: 'callout',
      title:
        draft.calloutTitle?.trim() ||
        (draft.locale === 'bn' ? 'তথ্য যাচাই নোট' : 'Editorial Verification Note'),
      text: draft.calloutText.trim(),
      tone: draft.verificationFlag ? 'verification' : 'note',
    });
  }

  if (blocks.length === 0) {
    blocks.push({
      id: `ai-blk-${ts}-1`,
      type: 'paragraph',
      text: draft.excerpt.trim() || draft.title.trim(),
      dropCap: true,
    });
  }

  const title = draft.title.trim().slice(0, 240);
  const excerptRaw = draft.excerpt.trim();
  const excerpt =
    excerptRaw.length >= 10
      ? excerptRaw.slice(0, 600)
      : `${title} — AI-assisted research draft pending editorial verification.`.slice(0, 600);

  const revisionNotes = draft.verificationFlag || groundedSources.length === 0
    ? (
        draft.verificationNotes ||
        'Flagged by AI Verification Guard: Verify claims and attach primary source citations before publishing.'
      ).slice(0, 1000)
    : draft.verificationNotes
    ? draft.verificationNotes.slice(0, 1000)
    : undefined;

  const nowIso = new Date().toISOString();

  return {
    articleId: `art-ai-${draft.locale}-${ts}`,
    translationGroupId,
    locale: draft.locale,
    title,
    slug: cleanSlug,
    excerpt,
    contentBlocks: blocks.slice(0, 80),
    categoryId,
    subcategorySlug,
    tags: draft.tags.map((t) => t.trim()).filter(Boolean).slice(0, 15),
    featuredImage: {
      src: DEFAULT_CATEGORY_IMAGE[categoryId] ?? DEFAULT_CATEGORY_IMAGE.technology,
      alt: title,
      caption:
        draft.locale === 'bn'
          ? 'সম্পাদকীয় পর্যালোচনার জন্য প্রস্তুত এআই-সহায়তাকৃত খসড়া।'
          : 'AI-assisted grounded research draft queued for human editorial review.',
    },
    authorId,
    // CRITICAL INVARIANT: AI drafts NEVER auto-publish; they always require human review
    status: 'pending_review',
    revisionNotes,
    isFeatured: false,
    isRecommended: false,
    engagementScore: 0,
    readingTimeMinutes: estimateReadingTimeMinutes(blocks),
    sources: groundedSources.slice(0, 25),
    seo: {
      metaTitle: (draft.metaTitle || `${title} | QORVIA`).slice(0, 180),
      metaDescription: (draft.metaDescription || excerpt).slice(0, 320),
      canonicalPath: `/${draft.locale}/article/${cleanSlug}`,
    },
    publishedAt: nowIso,
    updatedAt: nowIso,
  };
}
