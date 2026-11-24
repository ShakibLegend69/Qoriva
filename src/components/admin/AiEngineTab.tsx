import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Globe,
  Lightbulb,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type {
  AiAutoPostConfig,
  AiDraftLocalePayload,
  AiJobRecord,
  AiSeoOptimizationResult,
  AiSuggestedTopic,
  AiTrendingTopicSuggestion,
  Article,
  Author,
  Category,
  CategorySlug,
  Locale,
  TopicItem,
} from '../../types/qorvia';
import {
  getTodayUtcDateKey,
  mapAiDraftToArticle,
  sanitizeGroundedSources,
  shouldRunDailyAutoPost,
  validateTopicInput,
} from '../../lib/aiDraftMapper';
import {
  createAiJobInFirestore,
  createTopicInFirestore,
  deleteTopicInFirestore,
  saveAiAutoPostConfigInFirestore,
  saveArticleInFirestore,
  saveArticleSeoInFirestore,
  saveSourcesInFirestore,
  updateAiJobInFirestore,
  updateTopicStatusInFirestore,
  writeAuditLog,
} from '../../lib/firestoreService';

interface AiEngineTabProps {
  firebaseUser: User;
  actorUid: string;
  actorEmail?: string | null;
  articles: Article[];
  categories: Category[];
  authors: Author[];
  topics: TopicItem[];
  aiJobs: AiJobRecord[];
  aiAutoPostConfig: AiAutoPostConfig;
  isSuperAdmin: boolean;
  hasPublishPermission: boolean;
  hasRoleAdminPermission: boolean;
  onOpenReviewQueue: () => void;
}

export function AiEngineTab({
  firebaseUser,
  actorUid,
  actorEmail,
  articles,
  categories,
  authors,
  topics,
  aiJobs,
  aiAutoPostConfig,
  isSuperAdmin,
  hasPublishPermission,
  hasRoleAdminPermission,
  onOpenReviewQueue,
}: AiEngineTabProps) {
  const [aiHealth, setAiHealth] = useState<{ configured: boolean; model: string } | null>(null);

  // Daily Auto-Post Config & Runner
  const [autoConfig, setAutoConfig] = useState<AiAutoPostConfig>(aiAutoPostConfig);
  const [savingAutoConfig, setSavingAutoConfig] = useState(false);
  const [runningAutoPost, setRunningAutoPost] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<AiTrendingTopicSuggestion[]>([]);
  const autoRunLatchRef = useRef(false);

  // Batch SEO Optimizer
  const [optimizingSeo, setOptimizingSeo] = useState(false);
  const [seoProgress, setSeoProgress] = useState<{ done: number; total: number } | null>(null);

  // Topic Composer
  const [topicTitle, setTopicTitle] = useState('');
  const [categoryId, setCategoryId] = useState<CategorySlug>(
    categories[0]?.id ?? 'technology'
  );
  const [subcategorySlug, setSubcategorySlug] = useState(
    categories[0]?.subcategories[0]?.slug ?? ''
  );
  const [priority, setPriority] = useState(7);
  const [targetEn, setTargetEn] = useState(true);
  const [targetBn, setTargetBn] = useState(true);
  const [editorialGuidance, setEditorialGuidance] = useState('');
  const [authorId, setAuthorId] = useState(authors[0]?.id ?? 'ananya-rahman');

  // AI Suggestions
  const [focusPrompt, setFocusPrompt] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestedTopic[]>([]);

  // Job execution state
  const [runningTopicId, setRunningTopicId] = useState<string | null>(null);
  const [runningBatch, setRunningBatch] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    setAutoConfig(aiAutoPostConfig);
  }, [aiAutoPostConfig]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? categories[0],
    [categories, categoryId]
  );

  const queuedTopics = useMemo(
    () =>
      topics
        .filter((t) => t.status === 'queued')
        .sort((a, b) => b.priority - a.priority),
    [topics]
  );

  const needsSeoCount = useMemo(
    () =>
      articles.filter(
        (a) =>
          !a.seo?.metaDescription ||
          a.seo.metaDescription.trim().length < 100 ||
          !a.tags ||
          a.tags.length < 3
      ).length,
    [articles]
  );

  useEffect(() => {
    let cancelled = false;
    firebaseUser
      .getIdToken()
      .then((token) =>
        fetch('/api/ai/health', {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setAiHealth(data);
      })
      .catch(() => {
        // Ignore transient health check errors
      });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  const getSelectedLocales = (): Locale[] => {
    const out: Locale[] = [];
    if (targetEn) out.push('en');
    if (targetBn) out.push('bn');
    return out;
  };

  const handleQueueTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const localeTargets = getSelectedLocales();
    const check = validateTopicInput({ title: topicTitle, localeTargets, priority });
    if (!check.valid) {
      setFeedback({ type: 'error', text: check.error || 'Invalid topic.' });
      return;
    }

    try {
      const topicId = `top-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      await createTopicInFirestore({
        actorUid,
        actorEmail,
        topic: {
          topicId,
          title: topicTitle.trim(),
          categoryId,
          subcategorySlug,
          priority,
          localeTargets,
          status: 'queued',
        },
      });
      setTopicTitle('');
      setFeedback({
        type: 'success',
        text: `Topic queued for ${localeTargets.map((l) => l.toUpperCase()).join(' + ')} drafting.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to queue topic.',
      });
    }
  };

  const handleSuggestTopics = async () => {
    setFeedback(null);
    setSuggesting(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/ai/suggest-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryId,
          categoryName: selectedCategory?.name.en ?? categoryId,
          subcategories: (selectedCategory?.subcategories ?? []).map((s) => ({
            slug: s.slug,
            name: s.name.en,
          })),
          focusPrompt,
        }),
      });
      const data = (await res.json()) as {
        suggestions?: AiSuggestedTopic[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Topic suggestion failed.');
      }
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to suggest topics.',
      });
    } finally {
      setSuggesting(false);
    }
  };

  const executeGroundedDraftForTopic = useCallback(
    async (params: {
      topicId?: string;
      title: string;
      catId: CategorySlug;
      subSlug: string;
      locales: Locale[];
      guidance?: string;
      publishImmediately?: boolean;
    }) => {
      const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const model = aiHealth?.model || 'gemini-4-hydrogen';
      const cat = categories.find((c) => c.id === params.catId) ?? selectedCategory;
      const sub = cat?.subcategories.find((s) => s.slug === params.subSlug);
      const canPublishNow = Boolean(params.publishImmediately && hasPublishPermission);

      if (params.topicId) {
        await updateTopicStatusInFirestore({ topicId: params.topicId, status: 'in_progress' });
      }

      await createAiJobInFirestore({
        actorUid,
        jobId,
        topic: params.title,
        categoryId: params.catId,
        model,
        localeTargets: params.locales,
      });

      try {
        const token = await firebaseUser.getIdToken();
        const res = await fetch('/api/ai/generate-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topicTitle: params.title,
            categoryName: cat?.name.en ?? params.catId,
            subcategoryName: sub?.name.en ?? params.subSlug,
            targetLocales: params.locales,
            editorialGuidance: params.guidance ?? '',
          }),
        });

        const payload = (await res.json()) as {
          model?: string;
          groundedChunks?: Array<{ uri: string; title: string }>;
          drafts?: AiDraftLocalePayload[];
          error?: string;
        };

        if (!res.ok || !Array.isArray(payload.drafts) || payload.drafts.length === 0) {
          throw new Error(payload.error || 'Gemini failed to return structured drafts.');
        }

        const groundedSources = sanitizeGroundedSources(payload.groundedChunks ?? []);
        const translationGroupId = `grp-ai-${Date.now().toString(36)}`;
        let anyFlagged = groundedSources.length === 0;

        for (const draft of payload.drafts) {
          if (draft.verificationFlag) anyFlagged = true;
          const mappedArticle = mapAiDraftToArticle({
            draft,
            translationGroupId,
            categoryId: params.catId,
            subcategorySlug: params.subSlug || (cat?.subcategories[0]?.slug ?? ''),
            authorId,
            groundedSources,
            publishImmediately: canPublishNow,
          });

          await saveArticleInFirestore({
            actorUid,
            actorEmail,
            article: mappedArticle,
            isNew: true,
            canPublishOrFeature: hasPublishPermission,
          });

          if (mappedArticle.sources.length > 0) {
            await saveSourcesInFirestore({
              articleId: mappedArticle.articleId,
              sources: mappedArticle.sources,
            });
          }
        }

        const finalStatus = anyFlagged && !canPublishNow ? 'flagged' : 'completed';
        await updateAiJobInFirestore({
          jobId,
          status: finalStatus,
          error:
            anyFlagged && !canPublishNow
              ? 'Flagged for human fact-checking: inspect Review Queue notes before approving.'
              : undefined,
        });

        if (params.topicId) {
          await updateTopicStatusInFirestore({
            topicId: params.topicId,
            status: finalStatus,
          });
        }

        await writeAuditLog({
          actorUid,
          actorEmail,
          action: canPublishNow ? 'RUN_AI_AUTO_POST' : 'RUN_AI_CONTENT_DRAFT',
          target: `aiJobs/${jobId}`,
          metadata: {
            translationGroupId,
            locales: params.locales,
            sourcesCount: groundedSources.length,
            flagged: anyFlagged,
            published: canPublishNow,
          },
        });

        return {
          count: payload.drafts.length,
          flagged: anyFlagged,
          sources: groundedSources.length,
          published: canPublishNow,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI generation failed.';
        await updateAiJobInFirestore({
          jobId,
          status: 'failed',
          error: message,
        });
        if (params.topicId) {
          await updateTopicStatusInFirestore({
            topicId: params.topicId,
            status: 'flagged',
          });
        }
        throw err;
      }
    },
    [
      actorEmail,
      actorUid,
      aiHealth?.model,
      authorId,
      categories,
      firebaseUser,
      hasPublishPermission,
      selectedCategory,
    ]
  );

  const runDailyTopSearchAutoPost = useCallback(
    async (isAutomaticTrigger = false) => {
      const locales: Locale[] =
        autoConfig.localeTargets.length > 0 ? autoConfig.localeTargets : ['en', 'bn'];
      setFeedback(null);
      setRunningAutoPost(true);

      try {
        const token = await firebaseUser.getIdToken();
        const discoverRes = await fetch('/api/ai/discover-top-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            count: autoConfig.dailyCount,
            existingTitles: articles.map((a) => a.title),
          }),
        });

        const discoverData = (await discoverRes.json()) as {
          topics?: AiTrendingTopicSuggestion[];
          error?: string;
        };

        if (!discoverRes.ok || !Array.isArray(discoverData.topics) || discoverData.topics.length === 0) {
          throw new Error(
            discoverData.error || 'Gemini could not discover trending top-search topics.'
          );
        }

        const discovered = discoverData.topics.slice(0, autoConfig.dailyCount);
        setTrendingTopics(discovered);

        let postedCount = 0;
        const canAutoPublish = autoConfig.autoPublish && hasPublishPermission;

        for (const t of discovered) {
          const res = await executeGroundedDraftForTopic({
            title: t.title,
            catId: t.categoryId,
            subSlug: t.subcategorySlug || '',
            locales,
            guidance: `Optimize SEO headings, semantic keywords, and factual answers for today's top Google Search query: "${t.searchQuery}".`,
            publishImmediately: canAutoPublish,
          });
          postedCount += res.count;
        }

        const todayKey = getTodayUtcDateKey();
        const summary = `${isAutomaticTrigger ? 'Auto-posted' : 'Posted'} ${postedCount} ${
          canAutoPublish ? 'live' : 'review-queued'
        } SEO article(s) from ${discovered.length} daily top-search topic(s).`;

        if (isSuperAdmin && postedCount > 0) {
          const nextConfig: AiAutoPostConfig = {
            ...autoConfig,
            localeTargets: locales,
            lastRunDate: todayKey,
            lastRunSummary: summary,
          };
          setAutoConfig(nextConfig);
          await saveAiAutoPostConfigInFirestore({
            actorUid,
            actorEmail,
            config: nextConfig,
          });
        }

        setFeedback({ type: 'success', text: summary });
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Daily top-search auto-post failed.',
        });
      } finally {
        setRunningAutoPost(false);
      }
    },
    [
      actorEmail,
      actorUid,
      articles,
      autoConfig,
      executeGroundedDraftForTopic,
      firebaseUser,
      hasPublishPermission,
      isSuperAdmin,
    ]
  );

  // Automatic daily runner when enabled and today's UTC date hasn't executed yet
  useEffect(() => {
    if (
      !autoRunLatchRef.current &&
      isSuperAdmin &&
      hasPublishPermission &&
      shouldRunDailyAutoPost(aiAutoPostConfig) &&
      !runningAutoPost &&
      !runningBatch &&
      runningTopicId === null
    ) {
      autoRunLatchRef.current = true;
      void runDailyTopSearchAutoPost(true);
    }
  }, [
    aiAutoPostConfig,
    hasPublishPermission,
    isSuperAdmin,
    runDailyTopSearchAutoPost,
    runningAutoPost,
    runningBatch,
    runningTopicId,
  ]);

  const handleSaveAutoPostConfig = async () => {
    if (!isSuperAdmin) return;
    setFeedback(null);
    setSavingAutoConfig(true);
    try {
      const locales: Locale[] =
        autoConfig.localeTargets.length > 0 ? autoConfig.localeTargets : ['en', 'bn'];
      const nextConfig: AiAutoPostConfig = { ...autoConfig, localeTargets: locales };
      await saveAiAutoPostConfigInFirestore({
        actorUid,
        actorEmail,
        config: nextConfig,
      });
      setFeedback({
        type: 'success',
        text: nextConfig.enabled
          ? 'Daily top-search auto-posting enabled and saved.'
          : 'Auto-post preferences saved.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to save auto-post settings.',
      });
    } finally {
      setSavingAutoConfig(false);
    }
  };

  const handleRunBatchSeo = async () => {
    if (articles.length === 0) return;
    setFeedback(null);
    setOptimizingSeo(true);
    setSeoProgress({ done: 0, total: articles.length });

    let optimizedCount = 0;
    try {
      const token = await firebaseUser.getIdToken();
      const chunkSize = 10;

      for (let i = 0; i < articles.length; i += chunkSize) {
        const chunk = articles.slice(i, i + chunkSize);
        const res = await fetch('/api/ai/optimize-seo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            articles: chunk.map((a) => ({
              articleId: a.articleId,
              locale: a.locale,
              slug: a.slug,
              title: a.title,
              excerpt: a.excerpt,
              categoryId: a.categoryId,
              tags: a.tags,
              currentMetaTitle: a.seo?.metaTitle,
              currentMetaDescription: a.seo?.metaDescription,
              imageAlt: a.featuredImage?.alt,
            })),
          }),
        });

        const payload = (await res.json()) as {
          results?: AiSeoOptimizationResult[];
          error?: string;
        };

        if (!res.ok || !Array.isArray(payload.results)) {
          throw new Error(payload.error || 'Gemini SEO optimization batch failed.');
        }

        const articleById = new Map(chunk.map((a) => [a.articleId, a]));
        for (const seoResult of payload.results) {
          const target = articleById.get(seoResult.articleId);
          if (!target) continue;
          await saveArticleSeoInFirestore({
            actorUid,
            actorEmail,
            article: target,
            seoResult,
            isSuperAdmin,
          });
          optimizedCount += 1;
          setSeoProgress({ done: optimizedCount, total: articles.length });
        }
      }

      await writeAuditLog({
        actorUid,
        actorEmail,
        action: 'RUN_AI_SEO_OPTIMIZATION',
        target: 'articles/*',
        metadata: { optimizedCount },
      });

      setFeedback({
        type: 'success',
        text: `Gemini optimized SEO meta titles, descriptions, tags, and image alt text across ${optimizedCount} article(s).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Batch SEO optimization failed.',
      });
    } finally {
      setOptimizingSeo(false);
    }
  };

  const handleGenerateTopicNow = async (topic: TopicItem) => {
    setFeedback(null);
    setRunningTopicId(topic.topicId);
    try {
      const res = await executeGroundedDraftForTopic({
        topicId: topic.topicId,
        title: topic.title,
        catId: topic.categoryId,
        subSlug: topic.subcategorySlug || '',
        locales: topic.localeTargets,
      });
      setFeedback({
        type: 'success',
        text: `Generated ${res.count} draft(s) (${res.sources} grounded sources) into Review Queue${
          res.flagged ? ' — flagged for verification' : ''
        }.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Draft generation failed.',
      });
    } finally {
      setRunningTopicId(null);
    }
  };

  const handleRunCustomNow = async () => {
    setFeedback(null);
    const locales = getSelectedLocales();
    const check = validateTopicInput({ title: topicTitle, localeTargets: locales, priority });
    if (!check.valid) {
      setFeedback({ type: 'error', text: check.error || 'Enter a valid topic title.' });
      return;
    }
    setRunningTopicId('custom');
    try {
      const res = await executeGroundedDraftForTopic({
        title: topicTitle.trim(),
        catId: categoryId,
        subSlug: subcategorySlug,
        locales,
        guidance: editorialGuidance,
      });
      setTopicTitle('');
      setEditorialGuidance('');
      setFeedback({
        type: 'success',
        text: `Created ${res.count} grounded bilingual draft(s) in Review Queue (${res.sources} sources).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'AI generation failed.',
      });
    } finally {
      setRunningTopicId(null);
    }
  };

  const handleRunDailyBatch = async () => {
    if (queuedTopics.length === 0) return;
    setFeedback(null);
    setRunningBatch(true);
    let generatedTotal = 0;
    try {
      for (const topic of queuedTopics.slice(0, 3)) {
        const res = await executeGroundedDraftForTopic({
          topicId: topic.topicId,
          title: topic.title,
          catId: topic.categoryId,
          subSlug: topic.subcategorySlug || '',
          locales: topic.localeTargets,
        });
        generatedTotal += res.count;
      }
      setFeedback({
        type: 'success',
        text: `Daily AI batch finished: generated ${generatedTotal} pending-review draft(s) into the Review Queue.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Batch stopped due to an error.',
      });
    } finally {
      setRunningBatch(false);
    }
  };

  const toggleAutoLocale = (loc: Locale) => {
    setAutoConfig((prev) => {
      const exists = prev.localeTargets.includes(loc);
      const next = exists
        ? prev.localeTargets.filter((l) => l !== loc)
        : [...prev.localeTargets, loc];
      return {
        ...prev,
        localeTargets: next.length > 0 ? next : [loc],
      };
    });
  };

  return (
    <div className="space-y-8">
      {/* Banner Header */}
      <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-[#F5F4EF]/70 dark:bg-[#11192B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>
              Gemini Grounded Editorial & SEO Engine · Model: {aiHealth?.model || 'gemini-4-hydrogen'}
            </span>
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#101827] dark:text-[#F5F4EF]">
            Daily Top-Search Auto-Post, Grounded Drafting & Catalog SEO
          </h2>
          <p className="text-xs text-black/65 dark:text-[#A5AAB4]">
            Discovers today’s top Google Search trends, auto-posts SEO-optimized EN/BN articles via Gemini API, and optimizes metadata across your catalog.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenReviewQueue}
            className="btn-transparent-black inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Review Queue</span>
          </button>
          <button
            type="button"
            disabled={runningBatch || runningAutoPost || queuedTopics.length === 0}
            onClick={handleRunDailyBatch}
            className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {runningBatch
                ? 'Running Daily Batch...'
                : `Run Queued Batch (${Math.min(3, queuedTopics.length)} Queued)`}
            </span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-xs font-medium border ${
            feedback.type === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-[#22A06B]/40 bg-[#22A06B]/10 text-[#22A06B]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Daily Top-Search Auto-Post & Gemini Batch SEO Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Top-Search Auto-Post */}
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Daily Top-Search Automation</span>
              </div>
              <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
                Gemini Auto Article Poster
              </h3>
            </div>
            <span className="font-mono-tabular text-[11px] px-2 py-1 rounded bg-[#F5F4EF] dark:bg-white/[0.06] text-black/70 dark:text-[#A5AAB4]">
              {autoConfig.enabled ? 'Auto Daily: ON' : 'Manual Trigger'}
            </span>
          </div>

          <p className="text-xs text-black/65 dark:text-[#A5AAB4] leading-relaxed">
            Searches today’s highest-volume queries via Gemini + Google Search grounding, avoids duplicate titles, generates bilingual SEO-optimized articles, and saves them to Firestore.
          </p>

          <div className="space-y-2.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfig.enabled}
                onChange={(e) =>
                  setAutoConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                }
              />
              <span className="font-medium">
                Auto-post once per day automatically when Editorial Console opens
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoConfig.autoPublish}
                onChange={(e) =>
                  setAutoConfig((prev) => ({ ...prev, autoPublish: e.target.checked }))
                }
              />
              <span className="font-medium">
                Publish live immediately (requires reviewer/superAdmin permission)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="ai-autopost-count" className="block text-xs font-semibold mb-1.5">
                Daily Top-Search Topics
              </label>
              <select
                id="ai-autopost-count"
                value={autoConfig.dailyCount}
                onChange={(e) =>
                  setAutoConfig((prev) => ({
                    ...prev,
                    dailyCount: Math.max(1, Math.min(3, Number(e.target.value))),
                  }))
                }
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              >
                <option value={1}>1 Top-Search Topic / day</option>
                <option value={2}>2 Top-Search Topics / day</option>
                <option value={3}>3 Top-Search Topics / day</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-semibold mb-1.5">Target Editions</span>
              <div className="flex items-center gap-4 min-h-[38px]">
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfig.localeTargets.includes('en')}
                    onChange={() => toggleAutoLocale('en')}
                  />
                  <span>EN</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfig.localeTargets.includes('bn')}
                    onChange={() => toggleAutoLocale('bn')}
                  />
                  <span>BN</span>
                </label>
              </div>
            </div>
          </div>

          {(autoConfig.lastRunDate || autoConfig.lastRunSummary) && (
            <div className="rounded-xl bg-[#F5F4EF]/70 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 px-3.5 py-2.5 text-[11px] space-y-0.5">
              <div className="font-mono-tabular text-black/60 dark:text-[#A5AAB4]">
                Last Auto-Post Date: {autoConfig.lastRunDate || 'Never'}
              </div>
              {autoConfig.lastRunSummary && (
                <div className="font-medium text-[#101827] dark:text-[#F5F4EF]">
                  {autoConfig.lastRunSummary}
                </div>
              )}
            </div>
          )}

          {trendingTopics.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-black/55 dark:text-[#A5AAB4]">
                Today’s Discovered Top Searches
              </div>
              <div className="space-y-1.5">
                {trendingTopics.map((t, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 text-xs bg-[#F5F4EF]/40 dark:bg-white/[0.02]"
                  >
                    <div className="font-semibold text-[#101827] dark:text-[#F5F4EF]">
                      {t.title}
                    </div>
                    <div className="font-mono-tabular text-[11px] text-black/60 dark:text-[#A5AAB4]">
                      Search query: “{t.searchQuery}” · {t.categoryId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            {isSuperAdmin && (
              <button
                type="button"
                disabled={savingAutoConfig}
                onClick={handleSaveAutoPostConfig}
                className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{savingAutoConfig ? 'Saving...' : 'Save Auto-Post Settings'}</span>
              </button>
            )}
            <button
              type="button"
              disabled={runningAutoPost || runningBatch || runningTopicId !== null}
              onClick={() => runDailyTopSearchAutoPost(false)}
              className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {runningAutoPost ? 'Auto-Posting Top Search...' : 'Post Daily Top-Search Now'}
              </span>
            </button>
          </div>
        </section>

        {/* Gemini SEO Optimizer for All Articles */}
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#22A06B]">
                  <Search className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Catalog-Wide Search Engine Optimization</span>
                </div>
                <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
                  Gemini SEO Optimizer (All Articles)
                </h3>
              </div>
              <span className="font-mono-tabular text-[11px] px-2 py-1 rounded bg-[#F5F4EF] dark:bg-white/[0.06] text-black/70 dark:text-[#A5AAB4]">
                {articles.length} Articles
              </span>
            </div>

            <p className="text-xs text-black/65 dark:text-[#A5AAB4] leading-relaxed">
              Runs Gemini across every EN & BN article in your catalog to craft 50–65 char keyword-first meta titles, 135–160 char meta descriptions, semantic SEO tags, and accessible image alt descriptions.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3.5 bg-[#F5F4EF]/50 dark:bg-white/[0.02]">
                <div className="font-mono-tabular text-2xl font-bold text-[#101827] dark:text-[#F5F4EF]">
                  {articles.length}
                </div>
                <div className="text-[11px] text-black/60 dark:text-[#A5AAB4] mt-0.5">
                  Total Articles Indexed
                </div>
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 p-3.5 bg-[#F5F4EF]/50 dark:bg-white/[0.02]">
                <div className="font-mono-tabular text-2xl font-bold text-[#4263EB] dark:text-[#748FFC]">
                  {needsSeoCount}
                </div>
                <div className="text-[11px] text-black/60 dark:text-[#A5AAB4] mt-0.5">
                  Can Benefit From SEO Refresh
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 dark:border-white/10 px-3.5 py-2.5 text-[11px] text-black/70 dark:text-[#A5AAB4] flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#4263EB] shrink-0" aria-hidden="true" />
              <span>
                Preserves bilingual canonical URLs (<code>/en/article/...</code> &{' '}
                <code>/bn/article/...</code>) and updates sitemap/OpenGraph/JSON-LD metadata cleanly.
              </span>
            </div>

            {seoProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono-tabular text-[11px] text-black/65 dark:text-[#A5AAB4]">
                  <span>SEO Optimization Progress</span>
                  <span>
                    {seoProgress.done} / {seoProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#22A06B] transition-all duration-300"
                    style={{
                      width: `${Math.round((seoProgress.done / Math.max(1, seoProgress.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-1">
            <button
              type="button"
              disabled={optimizingSeo || runningAutoPost || articles.length === 0}
              onClick={handleRunBatchSeo}
              className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${optimizingSeo ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {optimizingSeo
                  ? `Optimizing SEO (${seoProgress?.done ?? 0}/${articles.length})...`
                  : `Run Gemini SEO for All ${articles.length} Articles`}
              </span>
            </button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Topic Discovery & Composer */}
        <div className="lg:col-span-5 space-y-6">
          <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
            <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              Topic Queue & Direct Draft
            </h3>

            <form onSubmit={handleQueueTopic} className="space-y-4">
              <div>
                <label htmlFor="ai-topic-title" className="block text-xs font-semibold mb-1.5">
                  Article Topic or Editorial Brief
                </label>
                <input
                  id="ai-topic-title"
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g. How HTTP/3 QUIC Reduces Latency on Mobile Networks"
                  className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ai-cat" className="block text-xs font-semibold mb-1.5">
                    Category
                  </label>
                  <select
                    id="ai-cat"
                    value={categoryId}
                    onChange={(e) => {
                      const nextId = e.target.value as CategorySlug;
                      setCategoryId(nextId);
                      const matched = categories.find((c) => c.id === nextId);
                      setSubcategorySlug(matched?.subcategories[0]?.slug ?? '');
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-subcat" className="block text-xs font-semibold mb-1.5">
                    Subcategory
                  </label>
                  <select
                    id="ai-subcat"
                    value={subcategorySlug}
                    onChange={(e) => setSubcategorySlug(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    {(selectedCategory?.subcategories ?? []).map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ai-priority" className="block text-xs font-semibold mb-1.5">
                    Priority (1–10)
                  </label>
                  <input
                    id="ai-priority"
                    type="number"
                    min={1}
                    max={10}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="ai-author" className="block text-xs font-semibold mb-1.5">
                    Byline Author
                  </label>
                  <select
                    id="ai-author"
                    value={authorId}
                    onChange={(e) => setAuthorId(e.target.value)}
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  >
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-xs pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetEn}
                    onChange={(e) => setTargetEn(e.target.checked)}
                  />
                  <span>English (/en/)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetBn}
                    onChange={(e) => setTargetBn(e.target.checked)}
                  />
                  <span>Bengali Unicode (/bn/)</span>
                </label>
              </div>

              <div>
                <label htmlFor="ai-guidance" className="block text-xs font-semibold mb-1.5">
                  Editorial Guidance (Optional)
                </label>
                <textarea
                  id="ai-guidance"
                  rows={2}
                  value={editorialGuidance}
                  onChange={(e) => setEditorialGuidance(e.target.value)}
                  placeholder="Angle, audience depth, or specific concepts to verify..."
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="submit"
                  className="btn-transparent-black inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add to Queue</span>
                </button>
                <button
                  type="button"
                  disabled={runningTopicId !== null || runningBatch || runningAutoPost}
                  onClick={handleRunCustomNow}
                  className="btn-transparent-black-solid inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {runningTopicId === 'custom' ? 'Drafting...' : 'Generate Draft Now'}
                  </span>
                </button>
              </div>
            </form>
          </section>

          {/* AI Topic Suggestion Box */}
          <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#4263EB] dark:text-[#748FFC]" aria-hidden="true" />
              <h3 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF]">
                Gemini Topic Discovery
              </h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                aria-label="Topic discovery focus"
                value={focusPrompt}
                onChange={(e) => setFocusPrompt(e.target.value)}
                placeholder="Optional angle (e.g. university students, cybersecurity)..."
                className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
              <button
                type="button"
                disabled={suggesting}
                onClick={handleSuggestTopics}
                className="btn-transparent-black px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {suggesting ? 'Thinking...' : 'Suggest 4 Topics'}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2.5 pt-2">
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-[#F5F4EF]/50 dark:bg-white/[0.03] space-y-1.5 text-xs"
                  >
                    <div className="font-semibold text-[#101827] dark:text-[#F5F4EF]">
                      {s.title}
                    </div>
                    <p className="text-black/65 dark:text-[#A5AAB4]">{s.rationale}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono-tabular text-[11px] text-black/50 dark:text-[#A5AAB4]">
                        {s.subcategorySlug} · P{s.priority}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          const locales = getSelectedLocales();
                          const topicId = `top-${Date.now().toString(36)}-${idx}`;
                          await createTopicInFirestore({
                            actorUid,
                            actorEmail,
                            topic: {
                              topicId,
                              title: s.title,
                              categoryId,
                              subcategorySlug: s.subcategorySlug,
                              priority: s.priority,
                              localeTargets: locales.length > 0 ? locales : ['en', 'bn'],
                              status: 'queued',
                            },
                          });
                          setFeedback({
                            type: 'success',
                            text: `Queued suggested topic "${s.title}".`,
                          });
                        }}
                        className="btn-transparent-black px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                      >
                        + Queue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Queued Topics & AI Job Execution Log */}
        <div className="lg:col-span-7 space-y-6">
          <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
            <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              Editorial Topic Queue ({topics.length})
            </h3>
            {topics.length === 0 ? (
              <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-8 text-center">
                No topics queued yet. Add a topic or click “Suggest 4 Topics”.
              </p>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {topics.map((t) => (
                  <div
                    key={t.topicId}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular">
                        <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-semibold">
                          {t.status}
                        </span>
                        <span>
                          P{t.priority} · {t.categoryId} ·{' '}
                          {t.localeTargets.map((l) => l.toUpperCase()).join(' + ')}
                        </span>
                      </div>
                      <div className="font-semibold text-sm text-[#101827] dark:text-[#F5F4EF]">
                        {t.title}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={runningTopicId !== null || runningBatch || runningAutoPost}
                        onClick={() => handleGenerateTopicNow(t)}
                        className="btn-transparent-black-solid inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" aria-hidden="true" />
                        <span>
                          {runningTopicId === t.topicId ? 'Drafting...' : 'Draft'}
                        </span>
                      </button>
                      {hasRoleAdminPermission && (
                        <button
                          type="button"
                          aria-label={`Delete topic ${t.title}`}
                          onClick={() =>
                            deleteTopicInFirestore({
                              actorUid,
                              actorEmail,
                              topicId: t.topicId,
                            })
                          }
                          className="btn-transparent-black p-1.5 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI Jobs Log */}
          <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
            <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              AI Research & Drafting Jobs ({aiJobs.length})
            </h3>
            {aiJobs.length === 0 ? (
              <p className="text-xs text-black/60 dark:text-[#A5AAB4] py-6 text-center">
                No Gemini generation runs recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10 text-xs">
                {aiJobs.map((job) => (
                  <div key={job.jobId} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-[#101827] dark:text-[#F5F4EF]">
                        {job.topic}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-mono-tabular font-semibold ${
                          job.status === 'completed'
                            ? 'text-[#22A06B]'
                            : job.status === 'flagged'
                            ? 'text-amber-600 dark:text-amber-400'
                            : job.status === 'failed'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-[#4263EB]'
                        }`}
                      >
                        {job.status === 'completed' && (
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {job.status === 'flagged' && (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{job.status}</span>
                      </span>
                    </div>
                    <div className="font-mono-tabular text-[11px] text-black/55 dark:text-[#A5AAB4]">
                      Model: {job.model} · Locales: {job.localeTargets.join(', ').toUpperCase()} ·{' '}
                      {job.startedAt}
                    </div>
                    {job.error && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        {job.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
