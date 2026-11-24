import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Edit3, Eye, MessageSquareWarning, XCircle } from 'lucide-react';
import type { Article, Category } from '../../types/qorvia';
import { updateArticleStatusInFirestore } from '../../lib/firestoreService';
import { EditorialImage } from '../EditorialImage';

interface ReviewQueueTabProps {
  actorUid: string;
  actorEmail?: string | null;
  articles: Article[];
  categories: Category[];
  hasPublishPermission: boolean;
  onEditInManager: (article: Article) => void;
}

export function ReviewQueueTab({
  actorUid,
  actorEmail,
  articles,
  categories,
  hasPublishPermission,
  onEditInManager,
}: ReviewQueueTabProps) {
  const queueArticles = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.status === 'pending_review' ||
          a.status === 'needs_revision' ||
          a.status === 'scheduled'
      ),
    [articles]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    () => queueArticles[0]?.articleId ?? null
  );
  const [revisionNote, setRevisionNote] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const selectedArticle =
    queueArticles.find((a) => a.articleId === selectedId) ?? queueArticles[0] ?? null;

  const selectedCategory = categories.find(
    (c) => c.id === selectedArticle?.categoryId
  );

  const handleDecision = async (
    nextStatus: 'published' | 'scheduled' | 'needs_revision' | 'rejected'
  ) => {
    if (!selectedArticle || !hasPublishPermission) return;
    setStatusMessage(null);

    if (nextStatus === 'needs_revision' && !revisionNote.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please provide revision instructions before requesting revisions.',
      });
      return;
    }

    if (
      nextStatus === 'scheduled' &&
      !(scheduleInput.trim() || selectedArticle.scheduledAt)
    ) {
      setStatusMessage({
        type: 'error',
        text: 'Specify a target schedule date and time before approving scheduled release.',
      });
      return;
    }

    setBusy(true);
    try {
      await updateArticleStatusInFirestore({
        actorUid,
        actorEmail,
        articleId: selectedArticle.articleId,
        nextStatus,
        revisionNotes: revisionNote.trim() || selectedArticle.revisionNotes,
        scheduledAt:
          nextStatus === 'scheduled'
            ? scheduleInput.trim() || selectedArticle.scheduledAt
            : undefined,
      });
      setRevisionNote('');
      setScheduleInput('');
      setStatusMessage({
        type: 'success',
        text: `Article "${selectedArticle.title}" transitioned to ${nextStatus.replace(/_/g, ' ')}.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to apply review decision.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Queue Sidebar */}
      <div className="lg:col-span-5 border border-black/10 dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#11192B] space-y-4">
        <div>
          <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
            Editorial Review Queue ({queueArticles.length})
          </h2>
          <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-0.5">
            Articles awaiting verification, revision, or scheduled release.
          </p>
        </div>

        {queueArticles.length === 0 ? (
          <div className="py-12 text-center text-xs text-black/55 dark:text-[#A5AAB4] border border-dashed border-black/15 dark:border-white/15 rounded-xl px-4">
            Queue is clear. Submit a draft for review in Article Manager to inspect it here.
          </div>
        ) : (
          <div className="space-y-2.5">
            {queueArticles.map((art) => {
              const isSelected = selectedArticle?.articleId === art.articleId;
              return (
                <button
                  key={art.articleId}
                  type="button"
                  onClick={() => {
                    setSelectedId(art.articleId);
                    setStatusMessage(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#101827] dark:border-white bg-[#F5F4EF] dark:bg-white/[0.06]'
                      : 'border-black/10 dark:border-white/10 hover:bg-[#F5F4EF]/50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                    <span className="uppercase font-semibold">
                      {art.locale} · {art.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-black/50 dark:text-[#A5AAB4]">
                      {art.sources.length} sources
                    </span>
                  </div>
                  <div
                    className={`font-semibold text-sm mt-1 text-[#101827] dark:text-[#F5F4EF] line-clamp-2 ${
                      art.locale === 'bn' ? 'font-bn' : ''
                    }`}
                  >
                    {art.title}
                  </div>
                  {art.scheduledAt && (
                    <div className="text-[11px] font-mono-tabular text-[#4263EB] dark:text-[#748FFC] mt-1">
                      Scheduled: {art.scheduledAt}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview & Reviewer Actions */}
      <div className="lg:col-span-7 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-6">
        {!selectedArticle ? (
          <div className="py-16 text-center text-sm text-black/55 dark:text-[#A5AAB4]">
            Select an article from the Review Queue to inspect its content, SEO metadata, and citations.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Editorial Verification Preview · {selectedArticle.locale.toUpperCase()}
                  </span>
                </div>
                <h3
                  className={`font-editorial text-2xl font-bold text-[#101827] dark:text-[#F5F4EF] ${
                    selectedArticle.locale === 'bn' ? 'font-bn' : ''
                  }`}
                >
                  {selectedArticle.title}
                </h3>
                <p className="text-xs font-mono-tabular text-black/55 dark:text-[#A5AAB4]">
                  {selectedCategory?.name[selectedArticle.locale] || selectedArticle.categoryId} ·{' '}
                  {selectedArticle.readingTimeMinutes} min read · /{selectedArticle.locale}/article/
                  {selectedArticle.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditInManager(selectedArticle)}
                className="btn-transparent-black inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Open in Editor</span>
              </button>
            </div>

            {statusMessage && (
              <div
                role={statusMessage.type === 'error' ? 'alert' : 'status'}
                className={`rounded-xl px-4 py-3 text-xs font-medium border ${
                  statusMessage.type === 'error'
                    ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                    : 'border-[#22A06B]/40 bg-[#22A06B]/10 text-[#22A06B]'
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            {/* Full Article Preview */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 border border-black/10 dark:border-white/10 rounded-xl p-4 bg-[#F5F4EF]/40 dark:bg-white/[0.02]">
              <p className="text-sm font-medium text-black/80 dark:text-white/85 leading-relaxed">
                {selectedArticle.excerpt}
              </p>
              <EditorialImage
                src={selectedArticle.featuredImage.src}
                alt={selectedArticle.featuredImage.alt}
                caption={selectedArticle.featuredImage.caption}
                aspectClass="aspect-[16/9]"
              />
              <div className="space-y-3 text-sm leading-relaxed text-[#101827] dark:text-[#F5F4EF]">
                {selectedArticle.contentBlocks.map((block) => {
                  if (block.type === 'heading') {
                    return (
                      <h4 key={block.id} className="font-editorial text-lg font-bold pt-2">
                        {block.text}
                      </h4>
                    );
                  }
                  if (block.type === 'paragraph') {
                    return <p key={block.id}>{block.text}</p>;
                  }
                  if (block.type === 'quote') {
                    return (
                      <blockquote
                        key={block.id}
                        className="border-l-2 border-[#4263EB] pl-4 italic text-black/80 dark:text-white/80"
                      >
                        “{block.text}”
                      </blockquote>
                    );
                  }
                  if (block.type === 'list') {
                    return (
                      <ul key={block.id} className="list-disc pl-5 space-y-1">
                        {block.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.type === 'callout') {
                    return (
                      <div
                        key={block.id}
                        className="p-3 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-[#0B111E]"
                      >
                        <div className="font-semibold text-xs mb-1">{block.title}</div>
                        <div className="text-xs">{block.text}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              {selectedArticle.sources.length > 0 && (
                <div className="pt-3 border-t border-black/10 dark:border-white/10 text-xs">
                  <div className="font-semibold mb-1.5">
                    Cited Sources ({selectedArticle.sources.length})
                  </div>
                  <ul className="space-y-1 text-black/70 dark:text-[#A5AAB4]">
                    {selectedArticle.sources.map((s) => (
                      <li key={s.sourceId}>
                        • {s.title} — <span className="font-semibold">{s.publisher}</span> ({s.url})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Reviewer Controls */}
            {!hasPublishPermission ? (
              <p className="text-xs text-black/60 dark:text-[#A5AAB4]">
                Reviewer or Super Admin role is required to approve, reject, or request revisions.
              </p>
            ) : (
              <div className="space-y-4 border-t border-black/10 dark:border-white/10 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="review-notes" className="block text-xs font-semibold mb-1.5">
                      Reviewer Notes / Revision Instructions
                    </label>
                    <textarea
                      id="review-notes"
                      rows={2}
                      value={revisionNote}
                      onChange={(e) => setRevisionNote(e.target.value)}
                      placeholder="Explain any factual gaps, missing citations, or Bengali phrasing notes..."
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="review-schedule" className="block text-xs font-semibold mb-1.5">
                      Schedule Target (Optional)
                    </label>
                    <input
                      id="review-schedule"
                      type="datetime-local"
                      value={scheduleInput || selectedArticle.scheduledAt || ''}
                      onChange={(e) => setScheduleInput(e.target.value)}
                      className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDecision('rejected')}
                    className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDecision('needs_revision')}
                    className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <MessageSquareWarning className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Request Revisions</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDecision('scheduled')}
                    className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Approve Schedule</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDecision('published')}
                    className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Approve & Publish</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
