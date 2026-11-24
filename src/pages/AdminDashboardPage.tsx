import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Database,
  FileImage,
  FolderTree,
  LayoutDashboard,
  LogIn,
  LogOut,
  Megaphone,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Users,
} from 'lucide-react';
import type {
  AdSlotConfig,
  AiJobRecord,
  Article,
  Category,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
  TopicItem,
} from '../types/qorvia';
import { SEED_AUTHORS, SEED_CATEGORIES } from '../data/seedCatalog';
import { DEFAULT_GLOBAL_AD_SETTINGS } from '../lib/adsStore';
import { useFirebase } from '../contexts/FirebaseContext';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  isBootstrappedSuperAdmin,
  type UserRole,
} from '../lib/rbac';
import {
  type AuditLogRecord,
  type FirestoreUserRecord,
  type MediaAssetRecord,
  seedCatalogToFirestore,
  subscribeAdSlots,
  subscribeAiJobs,
  subscribeAllAdCampaigns,
  subscribeAllArticlesForAdmin,
  subscribeAuditLogs,
  subscribeCategories,
  subscribeGlobalAdSettings,
  subscribeMediaAssets,
  subscribeTopics,
  subscribeUsersForAdmin,
  updateUserRoleInFirestore,
} from '../lib/firestoreService';
import { AdminOverviewTab } from '../components/admin/AdminOverviewTab';
import { ArticleManagerTab } from '../components/admin/ArticleManagerTab';
import { ReviewQueueTab } from '../components/admin/ReviewQueueTab';
import { CategoryManagerTab } from '../components/admin/CategoryManagerTab';
import { MediaLibraryTab } from '../components/admin/MediaLibraryTab';
import { AiEngineTab } from '../components/admin/AiEngineTab';
import { AdsManagerTab } from '../components/admin/AdsManagerTab';

interface AdminDashboardPageProps {
  onNavigate: (path: string) => void;
}

type AdminTab =
  | 'overview'
  | 'articles'
  | 'review'
  | 'ai'
  | 'categories'
  | 'media'
  | 'ads'
  | 'rbac'
  | 'audit';

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const {
    firebaseUser,
    authReady,
    authSubject,
    firestoreConnected,
    authError,
    isAdminStaff,
    hasAdsPermission,
    hasPublishPermission,
    hasRoleAdminPermission,
    signInWithGoogle,
    signOutUser,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Cross-tab navigation requests into ArticleManagerTab
  const [editingArticleRequest, setEditingArticleRequest] = useState<Article | null>(null);
  const [translationSeedRequest, setTranslationSeedRequest] = useState<{
    source: Article;
    targetLocale: Locale;
  } | null>(null);

  // Live Firestore collections
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>(SEED_CATEGORIES);
  const [campaigns, setCampaigns] = useState<MonetagAdEntry[]>([]);
  const [directBanners, setDirectBanners] = useState<DirectBannerCampaign[]>([]);
  const [adSlots, setAdSlots] = useState<AdSlotConfig[]>([]);
  const [globalAdSettings, setGlobalAdSettings] = useState<GlobalAdSettings>(
    DEFAULT_GLOBAL_AD_SETTINGS
  );
  const [usersList, setUsersList] = useState<FirestoreUserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAssetRecord[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);

  // Seeding feedback
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const userIsBootstrappedAdmin = useMemo(
    () => (authSubject ? isBootstrappedSuperAdmin(authSubject) : false),
    [authSubject]
  );

  const canCreateArticles = useMemo(() => {
    const r = authSubject?.role;
    return userIsBootstrappedAdmin || r === 'superAdmin' || r === 'editor';
  }, [authSubject?.role, userIsBootstrappedAdmin]);

  useEffect(() => {
    if (!authReady || !isAdminStaff || !firebaseUser) return;

    const unsubs: Array<() => void> = [];

    unsubs.push(
      subscribeAllArticlesForAdmin(
        firebaseUser.uid,
        userIsBootstrappedAdmin,
        setArticles
      )
    );
    unsubs.push(subscribeCategories(setCategories, true));
    unsubs.push(subscribeMediaAssets(setMediaAssets));
    unsubs.push(
      subscribeTopics(firebaseUser.uid, userIsBootstrappedAdmin, setTopics)
    );
    unsubs.push(
      subscribeAiJobs(firebaseUser.uid, userIsBootstrappedAdmin, setAiJobs)
    );

    if (hasAdsPermission) {
      unsubs.push(
        subscribeAllAdCampaigns(({ monetagAds, directBanners: banners }) => {
          setCampaigns(monetagAds);
          setDirectBanners(banners);
        }, userIsBootstrappedAdmin)
      );
      unsubs.push(subscribeAdSlots(setAdSlots, userIsBootstrappedAdmin));
      unsubs.push(subscribeGlobalAdSettings(setGlobalAdSettings));
    }
    if (hasRoleAdminPermission) {
      unsubs.push(subscribeUsersForAdmin(setUsersList));
      unsubs.push(subscribeAuditLogs(setAuditLogs));
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [
    authReady,
    isAdminStaff,
    firebaseUser,
    userIsBootstrappedAdmin,
    hasAdsPermission,
    hasRoleAdminPermission,
  ]);

  const pendingQueueCount = useMemo(
    () =>
      articles.filter(
        (a) =>
          a.status === 'pending_review' ||
          a.status === 'needs_revision' ||
          a.status === 'scheduled'
      ).length,
    [articles]
  );

  const handleOpenEditArticle = (article: Article) => {
    setTranslationSeedRequest(null);
    setEditingArticleRequest(article);
    setActiveTab('articles');
  };

  const handleOpenCreateTranslationPair = (source: Article, targetLocale: Locale) => {
    setEditingArticleRequest(null);
    setTranslationSeedRequest({ source, targetLocale });
    setActiveTab('articles');
  };

  const handleSeedFirestore = async () => {
    if (!firebaseUser) return;
    setSeedMessage('Syncing bilingual catalog to Firestore...');
    try {
      const res = await seedCatalogToFirestore({
        actorUid: firebaseUser.uid,
        actorEmail: firebaseUser.email,
      });
      setSeedMessage(
        `Synced ${res.categories} categories, ${res.authors} authors, and ${res.articles} bilingual articles to Firestore.`
      );
    } catch (err) {
      setSeedMessage(err instanceof Error ? err.message : 'Failed to seed Firestore.');
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-black/60 dark:text-[#A5AAB4]">
        Loading account session...
      </div>
    );
  }

  // Gate 1: Standard Public Sign-In Screen (Zero Admin / Role / Email Disclosure)
  if (!firebaseUser) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="border border-black/15 dark:border-white/15 bg-[#F5F4EF]/70 dark:bg-[#11192B] rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>QORVIA Account</span>
          </div>
          <h1 className="font-editorial text-3xl font-bold text-[#101827] dark:text-[#F5F4EF]">
            Sign in to QORVIA
          </h1>
          <p className="text-sm text-black/70 dark:text-[#A5AAB4] leading-relaxed">
            Sign in with your Google account to access your QORVIA reader profile, saved reading preferences, and member account.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="btn-transparent-black-solid w-full inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-3 rounded-lg text-sm font-semibold cursor-pointer"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Continue with Google</span>
          </button>

          {authError && (
            <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
              {authError}
            </p>
          )}

          <div className="pt-4 border-t border-black/10 dark:border-white/10">
            <a
              href="/en/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/en/');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/65 dark:text-[#A5AAB4] hover:text-[#4263EB]"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Return to Homepage</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Gate 2: Standard Reader Account View (Zero Mention of Admin Panel or RBAC Roles)
  if (!isAdminStaff) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16">
        <div className="border border-black/15 dark:border-white/15 bg-white dark:bg-[#11192B] rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#22A06B]">
            <UserIcon className="w-4 h-4" aria-hidden="true" />
            <span>Member Profile</span>
          </div>
          <h1 className="font-editorial text-2xl font-bold text-[#101827] dark:text-[#F5F4EF]">
            Welcome to QORVIA
          </h1>
          <p className="text-sm text-black/70 dark:text-[#A5AAB4] leading-relaxed">
            Signed in as <span className="font-semibold text-[#101827] dark:text-[#F5F4EF]">{firebaseUser.email}</span>. Your reader account is active across both English and Bengali editions.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/en/latest"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/en/latest');
              }}
              className="btn-transparent-black-solid px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Browse Latest Editions
            </a>
            <button
              type="button"
              onClick={signOutUser}
              className="btn-transparent-black inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header (Visible Exclusively After Authorized Staff Sign-In) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#4263EB] dark:text-[#748FFC]">
            QORVIA Editorial Console · Role: {userIsBootstrappedAdmin ? 'superAdmin' : authSubject?.role}
          </p>
          <h1 className="font-editorial text-3xl font-bold text-[#101827] dark:text-[#F5F4EF] mt-1">
            Publishing, AI Engine & Monetization Workspace
          </h1>
          <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-1">
            Authenticated as {firebaseUser.email} · Firestore:{' '}
            {firestoreConnected ? 'Connected' : 'Offline'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasRoleAdminPermission && (
            <button
              type="button"
              onClick={handleSeedFirestore}
              className="btn-transparent-black inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sync Seed Catalog to Firestore</span>
            </button>
          )}
          <button
            type="button"
            onClick={signOutUser}
            className="btn-transparent-black inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
          <a
            href="/en/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/en/');
            }}
            className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Public Site</span>
          </a>
        </div>
      </div>

      {seedMessage && (
        <div
          role="status"
          className="border border-black/15 dark:border-white/15 bg-[#F5F4EF] dark:bg-white/[0.04] rounded-xl px-4 py-3 text-xs font-medium text-[#22A06B]"
        >
          {seedMessage}
        </div>
      )}

      {/* Workspace Tabs (Transparent Black Controls) */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label="Workspace sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'overview' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'articles'}
          onClick={() => setActiveTab('articles')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'articles' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Articles ({articles.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'review'}
          onClick={() => setActiveTab('review')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'review' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Review Queue ({pendingQueueCount})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ai'}
          onClick={() => setActiveTab('ai')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ai' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>AI Engine ({topics.filter((t) => t.status === 'queued').length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          onClick={() => setActiveTab('categories')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'categories' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Categories ({categories.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'media'}
          onClick={() => setActiveTab('media')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'media' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <FileImage className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Media ({mediaAssets.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ads'}
          onClick={() => setActiveTab('ads')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'ads' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ads & Monetization ({campaigns.length + directBanners.length})</span>
        </button>

        {hasRoleAdminPermission && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rbac'}
            onClick={() => setActiveTab('rbac')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'rbac' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
            }`}
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Users ({usersList.length})</span>
          </button>
        )}

        {hasRoleAdminPermission && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'audit' ? 'btn-transparent-black-solid' : 'btn-transparent-black'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        )}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <AdminOverviewTab
          firebaseUser={firebaseUser}
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          articles={articles}
          categories={categories}
          mediaAssets={mediaAssets}
          auditLogs={auditLogs}
          canCreateArticles={canCreateArticles}
          hasRoleAdminPermission={hasRoleAdminPermission}
          onOpenArticleManager={() => setActiveTab('articles')}
          onOpenReviewQueue={() => setActiveTab('review')}
          onCreateTranslationPair={handleOpenCreateTranslationPair}
          onEditArticle={handleOpenEditArticle}
        />
      )}

      {/* TAB: ARTICLE MANAGER */}
      {activeTab === 'articles' && (
        <ArticleManagerTab
          key={
            editingArticleRequest?.articleId ||
            (translationSeedRequest
              ? `pair-${translationSeedRequest.source.articleId}-${translationSeedRequest.targetLocale}`
              : 'articles-default')
          }
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          articles={articles}
          categories={categories}
          authors={SEED_AUTHORS}
          mediaAssets={mediaAssets}
          hasPublishPermission={hasPublishPermission}
          hasRoleAdminPermission={hasRoleAdminPermission}
          editingArticleRequest={editingArticleRequest}
          translationSeedRequest={translationSeedRequest}
          onClearExternalRequests={() => {
            setEditingArticleRequest(null);
            setTranslationSeedRequest(null);
          }}
        />
      )}

      {/* TAB: REVIEW QUEUE */}
      {activeTab === 'review' && (
        <ReviewQueueTab
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          articles={articles}
          categories={categories}
          hasPublishPermission={hasPublishPermission}
          onEditInManager={handleOpenEditArticle}
        />
      )}

      {/* TAB: GEMINI AI CONTENT ENGINE */}
      {activeTab === 'ai' && (
        <AiEngineTab
          firebaseUser={firebaseUser}
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          categories={categories}
          authors={SEED_AUTHORS}
          topics={topics}
          aiJobs={aiJobs}
          hasPublishPermission={hasPublishPermission}
          hasRoleAdminPermission={hasRoleAdminPermission}
          onOpenReviewQueue={() => setActiveTab('review')}
        />
      )}

      {/* TAB: CATEGORIES & TAGS */}
      {activeTab === 'categories' && (
        <CategoryManagerTab
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          categories={categories}
          articles={articles}
          hasRoleAdminPermission={hasRoleAdminPermission}
        />
      )}

      {/* TAB: MEDIA LIBRARY */}
      {activeTab === 'media' && (
        <MediaLibraryTab
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          mediaAssets={mediaAssets}
          articles={articles}
        />
      )}

      {/* TAB: ADSENSE, DIRECT BANNERS & MONETAG MANAGER */}
      {activeTab === 'ads' && (
        <AdsManagerTab
          actorUid={firebaseUser.uid}
          actorEmail={firebaseUser.email}
          hasAdsPermission={hasAdsPermission}
          hasRoleAdminPermission={hasRoleAdminPermission}
          adSlots={adSlots}
          directBanners={directBanners}
          monetagCampaigns={campaigns}
          globalAdSettings={globalAdSettings}
          mediaAssets={mediaAssets}
        />
      )}

      {/* TAB: RBAC USER ROLE MANAGEMENT */}
      {activeTab === 'rbac' && hasRoleAdminPermission && (
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
          <h2 className="font-editorial text-xl font-semibold">
            Registered Users & RBAC Permissions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 dark:border-white/10 text-xs uppercase tracking-wider text-black/60 dark:text-[#A5AAB4]">
                <tr>
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {usersList.map((u) => {
                  const isBootstrapped = u.email.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL;
                  return (
                    <tr key={u.uid}>
                      <td className="py-3 pr-4 font-medium">{u.displayName}</td>
                      <td className="py-3 pr-4 font-mono-tabular text-xs">{u.email}</td>
                      <td className="py-3 pr-4">
                        <select
                          aria-label={`Role for ${u.email}`}
                          value={isBootstrapped ? 'superAdmin' : u.role}
                          disabled={isBootstrapped}
                          onChange={(e) =>
                            updateUserRoleInFirestore({
                              actorUid: firebaseUser.uid,
                              actorEmail: firebaseUser.email,
                              targetUid: u.uid,
                              role: e.target.value as UserRole,
                              isActive: u.isActive,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                        >
                          <option value="reader">reader</option>
                          <option value="editor">editor</option>
                          <option value="reviewer">reviewer</option>
                          <option value="adsManager">adsManager</option>
                          <option value="superAdmin">superAdmin</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          disabled={isBootstrapped}
                          onClick={() =>
                            updateUserRoleInFirestore({
                              actorUid: firebaseUser.uid,
                              actorEmail: firebaseUser.email,
                              targetUid: u.uid,
                              role: u.role,
                              isActive: !u.isActive,
                            })
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                            u.isActive ? 'btn-transparent-black-solid' : 'btn-transparent-black'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Suspended'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === 'audit' && hasRoleAdminPermission && (
        <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
          <h2 className="font-editorial text-xl font-semibold">
            Immutable Admin Audit Logs
          </h2>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-[#A5AAB4] py-6">
              No admin actions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono-tabular font-semibold text-[#4263EB] dark:text-[#748FFC]">
                      {log.action}
                    </span>{' '}
                    <span className="text-black/70 dark:text-white/80">→ {log.target}</span>
                    <div className="text-black/55 dark:text-[#A5AAB4] mt-0.5">
                      Actor: {log.actorEmail || log.actorUid}
                    </div>
                  </div>
                  <time className="font-mono-tabular text-black/50 dark:text-[#A5AAB4]">
                    {log.timestamp}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
