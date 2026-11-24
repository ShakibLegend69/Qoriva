import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lightbulb,
  Play,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AiDraftLocalePayload,
  AiJobRecord,
  AiSuggestedTopic,
  Author,
  Category,
  CategorySlug,
  Locale,
  TopicItem,
} from '../../types/qorvia';
import {
  mapAiDraftToArticle,
  sanitizeGroundedSources,
  validateTopicInput,
} from '../../lib/aiDraftMapper';
import {
  createAiJobInFirestore,
  createTopicInFirestore,
  deleteTopicInFirestore,
  saveArticleInFirestore,
  saveSourcesInFirestore,
  updateAiJobInFirestore,
  updateTopicStatusInFirestore,
  writeAuditLog,
} from '../../lib/firestoreService';

interface AiEngineTabProps {
  firebaseUser: User;
  actorUid: string;
  actorEmail?: string | null;
  categories: Category[];
  authors: Author[];
  topics: TopicItem[];
  aiJobs: AiJobRecord[];
  hasPublishPermission: boolean;
  hasRoleAdminPermission: boolean;
  onOpenReviewQueue: () => void;
}

export function AiEngineTab({
  firebaseUser,
  actorUid,
  actorEmail,
  categories,
  authors,
  topics,
  aiJobs,
  hasPublishPermission,
  hasRoleAdminPermission,
  onOpenReviewQueue,
}: AiEngineTabProps) {
  const [aiHealth, setAiHealth] = useState<{ configured: boolean; model: string } | null>(null);

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

  const executeGroundedDraftForTopic = async (params: {
    topicId?: string;
    title: string;
    catId: CategorySlug;
    subSlug: string;
    locales: Locale[];
    guidance?: string;
  }) => {
    const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const model = aiHealth?.model || 'gemini-4-hydrogen';
    const cat = categories.find((c) => c.id === params.catId) ?? selectedCategory;
    const sub = cat?.subcategories.find((s) => s.slug === params.subSlug);

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

      const finalStatus = anyFlagged ? 'flagged' : 'completed';
      await updateAiJobInFirestore({
        jobId,
        status: finalStatus,
        error: anyFlagged
          ? 'Flagged for human fact-checking: inspect Review Queue notes before approving.'
          : undefined,
      });

      if (params.topicId) {
        await updateTopicStatusInFirestore({
          topicId: params.topicId,
          status: anyFlagged ? 'flagged' : 'completed',
        });
      }

      await writeAuditLog({
        actorUid,
        actorEmail,
        action: 'RUN_AI_CONTENT_DRAFT',
        target: `aiJobs/${jobId}`,
        metadata: {
          translationGroupId,
          locales: params.locales,
          sourcesCount: groundedSources.length,
          flagged: anyFlagged,
        },
      });

      return { count: payload.drafts.length, flagged: anyFlagged, sources: groundedSources.length };
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

  return (
    <div className="space-y-8">
      {/* Banner Header */}
      <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-[#F5F4EF]/70 dark:bg-[#11192B] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>
              Gemini Grounded Editorial Engine · Model: {aiHealth?.model || 'gemini-4-hydrogen'}
            </span>
          </div>
          <h2 className="font-editorial text-2xl font-bold text-[#101827] dark:text-[#F5F4EF]">
            Automated Topic Discovery & Source-Grounded Drafting
          </h2>
          <p className="text-xs text-black/65 dark:text-[#A5AAB4]">
            Runs server-side Google Search grounding and structured JSON synthesis. Every generated EN/BN draft enters{' '}
            <span className="font-mono-tabular font-semibold">pending_review</span> and never auto-publishes.
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
            disabled={runningBatch || queuedTopics.length === 0}
            onClick={handleRunDailyBatch}
            className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              {runningBatch
                ? 'Running Daily Batch...'
                : `Run Daily Batch (${Math.min(3, queuedTopics.length)} Queued)`}
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
                  disabled={runningTopicId !== null || runningBatch}
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
                        disabled={runningTopicId !== null || runningBatch}
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
