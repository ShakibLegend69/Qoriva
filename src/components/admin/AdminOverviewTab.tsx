import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileEdit,
  Languages,
  Mail,
  MessageSquare,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react';
import type { Article, Category, Locale } from '../../types/qorvia';
import {
  type AuditLogRecord,
  type MediaAssetRecord,
  syncArticleEngagementScoreInFirestore,
} from '../../lib/firestoreService';
import { computeOverviewStats, pairBilingualArticles } from '../../lib/editorialValidation';
import { auditEditorialSeoHealth } from '../../lib/seo';

interface AdminInsightsPayload {
  articleMetrics: Array<{
    articleId: string;
    locale: Locale;
    views: number;
    reads: number;
    scoreDelta: number;
    lastActivityAt: string;
  }>;
  totalTrackedViews: number;
  totalTrackedReads: number;
  newsletterCount: number;
  recentSubscribers: Array<{ email: string; locale: Locale; subscribedAt: string }>;
  contactInquiries: Array<{
    id: string;
    name: string;
    email: string;
    message: string;
    locale: Locale;
    createdAt: string;
  }>;
}

interface AdminOverviewTabProps {
  firebaseUser: User;
  actorUid: string;
  actorEmail?: string | null;
  articles: Article[];
  categories: Category[];
  mediaAssets: MediaAssetRecord[];
  auditLogs: AuditLogRecord[];
  canCreateArticles: boolean;
  hasRoleAdminPermission: boolean;
  onOpenArticleManager: () => void;
  onOpenReviewQueue: () => void;
  onCreateTranslationPair: (sourceArticle: Article, targetLocale: Locale) => void;
  onEditArticle: (article: Article) => void;
}

const STATUS_LABEL: Record<Article['status'], string> = {
  published: 'Published',
  pending_review: 'Pending Review',
  draft: 'Draft',
  scheduled: 'Scheduled',
  needs_revision: 'Needs Revision',
  rejected: 'Rejected',
  archived: 'Archived',
};

export function AdminOverviewTab({
  firebaseUser,
  actorUid,
  actorEmail,
  articles,
  categories,
  mediaAssets,
  auditLogs,
  canCreateArticles,
  hasRoleAdminPermission,
  onOpenArticleManager,
  onOpenReviewQueue,
  onCreateTranslationPair,
  onEditArticle,
}: AdminOverviewTabProps) {
  const stats = computeOverviewStats(articles, categories);
  const bilingualGroups = pairBilingualArticles(articles);
  const seoHealth = auditEditorialSeoHealth(articles);

  const [insights, setInsights] = useState<AdminInsightsPayload | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/insights', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as AdminInsightsPayload;
        setInsights(data);
      }
    } catch {
      // Ignore network errors cleanly
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    void fetchInsights();
  }, [firebaseUser.uid]);

  const handleSyncLiveScores = async () => {
    if (!insights || insights.articleMetrics.length === 0) return;
    setSyncStatus('Syncing engagement scores to Firestore...');
    try {
      let updatedCount = 0;
      for (const metric of insights.articleMetrics) {
        const existing = articles.find((a) => a.articleId === metric.articleId);
        if (!existing || metric.scoreDelta <= 0) continue;
        await syncArticleEngagementScoreInFirestore({
          actorUid,
          actorEmail,
          articleId: existing.articleId,
          engagementScore: existing.engagementScore + metric.scoreDelta,
        });
        updatedCount += 1;
      }
      setSyncStatus(
        updatedCount > 0
          ? `Synced ${updatedCount} article engagement scores to Firestore.`
          : 'No matching Firestore articles had pending engagement deltas.'
      );
    } catch (err) {
      setSyncStatus(err instanceof Error ? err.message : 'Unable to sync engagement scores.');
    }
  };

  const statCards = [
    {
      label: 'Published Articles',
      value: stats.publishedCount,
      sub: `${stats.englishCount} EN · ${stats.bengaliCount} BN total`,
      icon: CheckCircle2,
      accent: 'text-[#22A06B]',
    },
    {
      label: 'Pending Review',
      value: stats.pendingReviewCount,
      sub: `${stats.needsRevisionCount} needing revision`,
      icon: Clock,
      accent: 'text-[#4263EB] dark:text-[#748FFC]',
    },
    {
      label: 'Drafts & Scheduled',
      value: stats.draftCount + stats.scheduledCount,
      sub: `${stats.draftCount} drafts · ${stats.scheduledCount} scheduled`,
      icon: FileEdit,
      accent: 'text-[#101827] dark:text-[#F5F4EF]',
    },
    {
      label: 'Bilingual Paired Groups',
      value: stats.bilingualPairedGroups,
      sub: `of ${bilingualGroups.length} translation groups`,
      icon: Languages,
      accent: 'text-[#4263EB] dark:text-[#748FFC]',
    },
    {
      label: 'Live Reader Views',
      value: insights?.totalTrackedViews ?? 0,
      sub: `${insights?.totalTrackedReads ?? 0} verified article reads`,
      icon: Activity,
      accent: 'text-[#22A06B]',
    },
    {
      label: 'Newsletter Subscribers',
      value: insights?.newsletterCount ?? 0,
      sub: `${mediaAssets.length} media assets · ${categories.length} depts`,
      icon: Mail,
      accent: 'text-[#101827] dark:text-[#F5F4EF]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="border border-black/10 dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#11192B]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-black/60 dark:text-[#A5AAB4]">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 ${card.accent}`} aria-hidden="true" />
              </div>
              <div className="font-editorial text-3xl font-bold mt-2 text-[#101827] dark:text-[#F5F4EF]">
                {card.value}
              </div>
              <div className="text-xs text-black/55 dark:text-[#A5AAB4] mt-1">
                {card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-black/10 dark:border-white/10 rounded-2xl p-5 bg-[#F5F4EF]/70 dark:bg-[#11192B]">
        <div>
          <h2 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF]">
            Editorial Publishing Workflow
          </h2>
          <p className="text-xs text-black/65 dark:text-[#A5AAB4] mt-0.5">
            Articles must pass human review in the Review Queue before moving to live EN/BN editions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onOpenReviewQueue}
            className="btn-transparent-black inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Open Review Queue ({stats.pendingReviewCount})</span>
          </button>
          <button
            type="button"
            onClick={onOpenArticleManager}
            className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Manage Articles</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Live Engagement & SEO Health Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Engagement Analytics */}
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#22A06B]" aria-hidden="true" />
              <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
                Real-Time Readership Analytics
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchInsights}
                disabled={insightsLoading}
                className="btn-transparent-black inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Refresh</span>
              </button>
              {hasRoleAdminPermission && (insights?.articleMetrics.length ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={handleSyncLiveScores}
                  className="btn-transparent-black-solid px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Sync Scores to Firestore
                </button>
              )}
            </div>
          </div>

          {syncStatus && (
            <p role="status" className="text-xs font-medium text-[#22A06B]">
              {syncStatus}
            </p>
          )}

          {!insights || insights.articleMetrics.length === 0 ? (
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] py-6">
              Live reader views and 8-second read-completion events will appear here automatically as readers browse public articles.
            </p>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10 text-xs">
              {insights.articleMetrics.slice(0, 6).map((m) => {
                const art = articles.find((a) => a.articleId === m.articleId);
                return (
                  <div key={m.articleId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-[#101827] dark:text-[#F5F4EF] truncate">
                        {art?.title || m.articleId}
                      </div>
                      <div className="font-mono-tabular text-[11px] text-black/55 dark:text-[#A5AAB4]">
                        {m.locale.toUpperCase()} · {m.views} views · {m.reads} reads
                      </div>
                    </div>
                    <span className="font-mono-tabular font-semibold text-[#22A06B] shrink-0">
                      +{m.scoreDelta} score
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Editorial SEO & Sitemap Health Audit */}
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SearchCheck className="w-4 h-4 text-[#4263EB] dark:text-[#748FFC]" aria-hidden="true" />
              <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
                SEO, Schema.org & Sitemap Audit
              </h2>
            </div>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-transparent-black px-2.5 py-1.5 rounded-lg text-xs font-semibold"
            >
              View /sitemap.xml
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-[#F5F4EF]/60 dark:bg-white/[0.03]">
              <div className="text-black/60 dark:text-[#A5AAB4]">Short/Missing Meta Desc</div>
              <div className="font-editorial text-xl font-bold mt-0.5">
                {seoHealth.missingMetaDescriptionCount}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-[#F5F4EF]/60 dark:bg-white/[0.03]">
              <div className="text-black/60 dark:text-[#A5AAB4]">Missing Primary Sources</div>
              <div className="font-editorial text-xl font-bold mt-0.5">
                {seoHealth.missingCitationsCount}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-[#F5F4EF]/60 dark:bg-white/[0.03]">
              <div className="text-black/60 dark:text-[#A5AAB4]">Missing Image Alt Text</div>
              <div className="font-editorial text-xl font-bold mt-0.5">
                {seoHealth.missingAltTextCount}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-[#F5F4EF]/60 dark:bg-white/[0.03]">
              <div className="text-black/60 dark:text-[#A5AAB4]">Unpaired Translations</div>
              <div className="font-editorial text-xl font-bold mt-0.5">
                {seoHealth.unpairedTranslationCount}
              </div>
            </div>
          </div>

          {seoHealth.issues.length === 0 ? (
            <p className="text-xs font-medium text-[#22A06B]">
              All {seoHealth.totalPublished} published articles pass meta description, image alt, source citation, and bilingual pairing checks.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {seoHealth.issues.slice(0, 4).map((item) => (
                <div
                  key={item.articleId}
                  className="p-2.5 rounded-lg border border-black/10 dark:border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{item.title}</div>
                    <div className="text-black/60 dark:text-[#A5AAB4]">
                      {item.locale.toUpperCase()} · {item.problems.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Reader Newsletter & Contact Inquiries Inbox */}
      {insights && (insights.recentSubscribers.length > 0 || insights.contactInquiries.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#4263EB] dark:text-[#748FFC]" aria-hidden="true" />
              <h2 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF]">
                Newsletter Subscribers ({insights.newsletterCount})
              </h2>
            </div>
            <div className="divide-y divide-black/10 dark:divide-white/10 text-xs">
              {insights.recentSubscribers.slice(0, 6).map((sub) => (
                <div key={sub.email} className="py-2 flex items-center justify-between gap-2">
                  <span className="font-mono-tabular font-medium">{sub.email}</span>
                  <span className="text-black/55 dark:text-[#A5AAB4] uppercase">
                    {sub.locale}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#22A06B]" aria-hidden="true" />
              <h2 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF]">
                Editorial Contact Inquiries ({insights.contactInquiries.length})
              </h2>
            </div>
            <div className="divide-y divide-black/10 dark:divide-white/10 text-xs">
              {insights.contactInquiries.slice(0, 5).map((inq) => (
                <div key={inq.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {inq.name} ({inq.email})
                    </span>
                    <span className="text-black/50 dark:text-[#A5AAB4] uppercase">
                      {inq.locale}
                    </span>
                  </div>
                  <p className="text-black/70 dark:text-white/80 leading-relaxed">
                    {inq.message}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Bilingual Translation Group Parity Matrix */}
      <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              Bilingual Translation Groups (translationGroupId)
            </h2>
            <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-0.5">
              Independent English (/en/) and Bengali (/bn/) articles linked via shared group IDs—never auto-published without review.
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-black/60 dark:text-[#A5AAB4]">
            {bilingualGroups.length} groups
          </span>
        </div>

        {bilingualGroups.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-8 text-center">
            No Firestore articles yet. Use “Sync Seed Catalog to Firestore” above or create a new article in Article Manager.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 dark:border-white/10 uppercase tracking-wider text-black/55 dark:text-[#A5AAB4]">
                <tr>
                  <th className="py-3 pr-4">Group ID</th>
                  <th className="py-3 pr-4">English (/en/)</th>
                  <th className="py-3">Bengali (/bn/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {bilingualGroups.map((group) => (
                  <tr key={group.translationGroupId} className="align-top">
                    <td className="py-3.5 pr-4 font-mono-tabular text-black/70 dark:text-[#A5AAB4] whitespace-nowrap">
                      {group.translationGroupId}
                    </td>
                    <td className="py-3.5 pr-4 min-w-[240px]">
                      {group.en ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => onEditArticle(group.en!)}
                            className="text-left font-semibold text-sm text-[#101827] dark:text-[#F5F4EF] hover:text-[#4263EB] cursor-pointer"
                          >
                            {group.en.title}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-black/60 dark:text-[#A5AAB4]">
                            <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                              {STATUS_LABEL[group.en.status]}
                            </span>
                            <span>/en/article/{group.en.slug}</span>
                          </div>
                        </div>
                      ) : group.bn && canCreateArticles ? (
                        <button
                          type="button"
                          onClick={() => onCreateTranslationPair(group.bn!, 'en')}
                          className="btn-transparent-black px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          + Create Paired EN Article
                        </button>
                      ) : (
                        <span className="text-black/45 dark:text-[#A5AAB4]">Missing EN edition</span>
                      )}
                    </td>
                    <td className="py-3.5 min-w-[240px]">
                      {group.bn ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => onEditArticle(group.bn!)}
                            className="text-left font-semibold text-sm font-bn text-[#101827] dark:text-[#F5F4EF] hover:text-[#4263EB] cursor-pointer"
                          >
                            {group.bn.title}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-black/60 dark:text-[#A5AAB4]">
                            <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                              {STATUS_LABEL[group.bn.status]}
                            </span>
                            <span>/bn/article/{group.bn.slug}</span>
                          </div>
                        </div>
                      ) : group.en && canCreateArticles ? (
                        <button
                          type="button"
                          onClick={() => onCreateTranslationPair(group.en!, 'bn')}
                          className="btn-transparent-black px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          + Create Paired BN Translation
                        </button>
                      ) : (
                        <span className="text-black/45 dark:text-[#A5AAB4]">Missing BN edition</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Audit Activity */}
      {auditLogs.length > 0 && (
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4263EB] dark:text-[#748FFC]" aria-hidden="true" />
            <h2 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF]">
              Recent Editorial & Admin Activity
            </h2>
          </div>
          <div className="divide-y divide-black/10 dark:divide-white/10 text-xs">
            {auditLogs.slice(0, 6).map((log) => (
              <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-mono-tabular font-semibold text-[#4263EB] dark:text-[#748FFC]">
                    {log.action}
                  </span>{' '}
                  <span className="text-black/75 dark:text-white/80">→ {log.target}</span>
                </div>
                <span className="font-mono-tabular text-black/50 dark:text-[#A5AAB4]">
                  {log.actorEmail || log.actorUid}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

