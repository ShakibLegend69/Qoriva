import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from './firebase';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  isValidDocumentId,
  type UserRole,
  validateFirestorePayloadConstraints,
} from './rbac';
import type {
  AdPlacement,
  AdProvider,
  AdSenseFormat,
  AdSlotConfig,
  AiJobRecord,
  AiJobStatus,
  Article,
  ArticleStatus,
  Category,
  CategorySlug,
  DirectBannerCampaign,
  GlobalAdSettings,
  Locale,
  MonetagAdEntry,
  MonetagFormat,
  SourceReference,
  TopicItem,
  TopicStatus,
} from '../types/qorvia';
import { DEFAULT_GLOBAL_AD_SETTINGS } from './adsStore';
import { SEED_ARTICLES, SEED_AUTHORS, SEED_CATEGORIES } from '../data/seedCatalog';

export interface FirestoreUserRecord {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface MediaAssetRecord {
  mediaId: string;
  url: string;
  storagePath: string;
  alt: string;
  title?: string;
  uploadedByUid: string;
  createdAt: string;
}

function formatTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function mapDocToArticle(id: string, data: Record<string, unknown>): Article {
  return {
    articleId: (data.articleId as string) || id,
    translationGroupId: (data.translationGroupId as string) || `grp-${id}`,
    locale: (data.locale as Locale) || 'en',
    title: (data.title as string) || '',
    slug: (data.slug as string) || id,
    excerpt: (data.excerpt as string) || '',
    contentBlocks: Array.isArray(data.contentBlocks) ? (data.contentBlocks as Article['contentBlocks']) : [],
    categoryId: (data.categoryId as CategorySlug) || 'technology',
    subcategorySlug: (data.subcategorySlug as string) || '',
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    featuredImage: (data.featuredImage as Article['featuredImage']) || {
      src: '/src/assets/images/hero_ai_architecture_1795449989757.jpg',
      alt: (data.title as string) || 'QORVIA Editorial Feature',
      caption: '',
    },
    authorId: (data.authorId as string) || 'ananya-rahman',
    createdByUid: (data.createdByUid as string) || undefined,
    status: (data.status as ArticleStatus) || 'draft',
    revisionNotes: (data.revisionNotes as string) || undefined,
    scheduledAt: (data.scheduledAt as string) || undefined,
    isFeatured: Boolean(data.isFeatured),
    isRecommended: Boolean(data.isRecommended),
    engagementScore: typeof data.engagementScore === 'number' ? data.engagementScore : 0,
    readingTimeMinutes: typeof data.readingTimeMinutes === 'number' ? data.readingTimeMinutes : 4,
    sources: Array.isArray(data.sources) ? (data.sources as Article['sources']) : [],
    seo: (data.seo as Article['seo']) || {
      metaTitle: (data.title as string) || '',
      metaDescription: (data.excerpt as string) || '',
      canonicalPath: `/${(data.locale as Locale) || 'en'}/article/${(data.slug as string) || id}`,
    },
    publishedAt: formatTimestamp(data.publishedAt ?? data.createdAt),
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

export async function syncUserAccount(firebaseUser: User): Promise<FirestoreUserRecord> {
  const userPath = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);
  const isBootstrappedAdmin =
    firebaseUser.emailVerified &&
    firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL;

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialRole: UserRole = isBootstrappedAdmin ? 'superAdmin' : 'reader';
      const displayName = (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User').slice(0, 120);
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        displayName,
        email: firebaseUser.email || '',
        role: initialRole,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      return {
        uid: firebaseUser.uid,
        displayName,
        email: firebaseUser.email || '',
        role: initialRole,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    }

    const data = snap.data();
    return {
      uid: data.uid,
      displayName: data.displayName || 'User',
      email: data.email || firebaseUser.email || '',
      role: isBootstrappedAdmin ? 'superAdmin' : (data.role as UserRole) || 'reader',
      isActive: Boolean(data.isActive),
      createdAt: formatTimestamp(data.createdAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function writeAuditLog(params: {
  actorUid: string;
  actorEmail?: string | null;
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorUid: params.actorUid,
      actorEmail: (params.actorEmail || '').slice(0, 254),
      action: params.action.slice(0, 100),
      target: params.target.slice(0, 200),
      timestamp: serverTimestamp(),
      metadata: params.metadata ?? {},
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ---------- ARTICLES (PUBLIC + ADMIN) ----------

export function subscribePublishedArticles(
  onData: (articles: Article[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'articles'),
    where('status', '==', 'published'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(SEED_ARTICLES);
        return;
      }
      const list = snapshot.docs.map((d) => mapDocToArticle(d.id, d.data()));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    }
  );
}

export function subscribeAllArticlesForAdmin(
  actorUid: string,
  isBootstrappedSuperAdmin: boolean,
  onData: (articles: Article[]) => void
): Unsubscribe {
  const col = collection(db, 'articles');
  const q = isBootstrappedSuperAdmin
    ? query(col, limit(150))
    : query(col, where('createdByUid', '==', actorUid), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapDocToArticle(d.id, d.data()));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    }
  );
}

export async function saveArticleInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  article: Article;
  isNew: boolean;
  canPublishOrFeature?: boolean;
}): Promise<void> {
  const { actorUid, actorEmail, article, isNew, canPublishOrFeature = true } = params;
  if (!isValidDocumentId(article.articleId)) {
    throw new Error('Invalid article ID.');
  }
  const path = `articles/${article.articleId}`;

  try {
    if (isNew) {
      await setDoc(doc(db, 'articles', article.articleId), {
        articleId: article.articleId,
        translationGroupId: article.translationGroupId,
        locale: article.locale,
        title: article.title.trim().slice(0, 240),
        slug: article.slug.trim().slice(0, 180),
        excerpt: article.excerpt.trim().slice(0, 600),
        contentBlocks: article.contentBlocks.slice(0, 80),
        categoryId: article.categoryId,
        subcategorySlug: article.subcategorySlug,
        tags: article.tags.slice(0, 15),
        featuredImage: article.featuredImage,
        authorId: article.authorId,
        createdByUid: actorUid,
        status: article.status,
        ...(article.scheduledAt ? { scheduledAt: article.scheduledAt.slice(0, 64) } : {}),
        ...(article.revisionNotes ? { revisionNotes: article.revisionNotes.slice(0, 1000) } : {}),
        isFeatured: article.isFeatured,
        isRecommended: article.isRecommended,
        engagementScore: article.engagementScore,
        readingTimeMinutes: article.readingTimeMinutes,
        sources: article.sources.slice(0, 25),
        seo: article.seo,
        publishedAt: article.publishedAt || new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        actorUid,
        actorEmail,
        action: 'CREATE_ARTICLE',
        target: path,
        metadata: { locale: article.locale, status: article.status, translationGroupId: article.translationGroupId },
      });
    } else {
      await updateDoc(doc(db, 'articles', article.articleId), {
        title: article.title.trim().slice(0, 240),
        slug: article.slug.trim().slice(0, 180),
        excerpt: article.excerpt.trim().slice(0, 600),
        contentBlocks: article.contentBlocks.slice(0, 80),
        categoryId: article.categoryId,
        subcategorySlug: article.subcategorySlug,
        tags: article.tags.slice(0, 15),
        featuredImage: article.featuredImage,
        status: article.status,
        ...(article.scheduledAt ? { scheduledAt: article.scheduledAt.slice(0, 64) } : {}),
        ...(canPublishOrFeature && article.revisionNotes
          ? { revisionNotes: article.revisionNotes.slice(0, 1000) }
          : {}),
        ...(canPublishOrFeature
          ? {
              isFeatured: article.isFeatured,
              isRecommended: article.isRecommended,
              publishedAt:
                article.status === 'published'
                  ? article.publishedAt || new Date().toISOString()
                  : article.publishedAt,
            }
          : {}),
        readingTimeMinutes: article.readingTimeMinutes,
        sources: article.sources.slice(0, 25),
        seo: article.seo,
        updatedAt: serverTimestamp(),
      });
      await writeAuditLog({
        actorUid,
        actorEmail,
        action: 'UPDATE_ARTICLE',
        target: path,
        metadata: { locale: article.locale, status: article.status },
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function updateArticleStatusInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  articleId: string;
  nextStatus: ArticleStatus;
  revisionNotes?: string;
  scheduledAt?: string;
}): Promise<void> {
  if (!isValidDocumentId(params.articleId)) {
    throw new Error('Invalid article ID.');
  }
  const path = `articles/${params.articleId}`;
  try {
    await updateDoc(doc(db, 'articles', params.articleId), {
      status: params.nextStatus,
      ...(params.revisionNotes !== undefined
        ? { revisionNotes: params.revisionNotes.trim().slice(0, 1000) }
        : {}),
      ...(params.scheduledAt !== undefined
        ? { scheduledAt: params.scheduledAt.trim().slice(0, 64) }
        : {}),
      ...(params.nextStatus === 'published'
        ? { publishedAt: new Date().toISOString() }
        : {}),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: `ARTICLE_STATUS_${params.nextStatus.toUpperCase()}`,
      target: path,
      metadata: { nextStatus: params.nextStatus },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncArticleEngagementScoreInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  articleId: string;
  engagementScore: number;
}): Promise<void> {
  if (!isValidDocumentId(params.articleId)) {
    throw new Error('Invalid article ID.');
  }
  const path = `articles/${params.articleId}`;
  try {
    await updateDoc(doc(db, 'articles', params.articleId), {
      engagementScore: Math.max(0, Math.round(params.engagementScore)),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'SYNC_ARTICLE_ENGAGEMENT',
      target: path,
      metadata: { engagementScore: Math.max(0, Math.round(params.engagementScore)) },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteArticleInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  articleId: string;
}): Promise<void> {
  if (!isValidDocumentId(params.articleId)) {
    throw new Error('Invalid article ID.');
  }
  const path = `articles/${params.articleId}`;
  try {
    await deleteDoc(doc(db, 'articles', params.articleId));
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'DELETE_ARTICLE',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------- CATEGORIES ----------

export function subscribeCategories(
  onData: (categories: Category[]) => void,
  includeInactiveForAdmin = false
): Unsubscribe {
  const q = includeInactiveForAdmin
    ? query(collection(db, 'categories'))
    : query(collection(db, 'categories'), where('isActive', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(SEED_CATEGORIES);
        return;
      }
      const list: Category[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: (data.categoryId || d.id) as CategorySlug,
          slug: (data.slug || d.id) as CategorySlug,
          name: data.name || { en: d.id, bn: d.id },
          shortName: data.shortName || data.name || { en: d.id, bn: d.id },
          description: data.description || { en: '', bn: '' },
          isActive: data.isActive !== false,
          subcategories: Array.isArray(data.subcategories) ? data.subcategories : [],
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  );
}

export async function saveCategoryInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  category: Category;
}): Promise<void> {
  const { actorUid, actorEmail, category } = params;
  if (!isValidDocumentId(category.id)) {
    throw new Error('Invalid category ID.');
  }
  const path = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), {
      categoryId: category.id,
      slug: category.slug,
      name: category.name,
      shortName: category.shortName,
      description: category.description,
      subcategories: category.subcategories.slice(0, 25),
      isActive: category.isActive !== false,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'SAVE_CATEGORY',
      target: path,
      metadata: { subcategoriesCount: category.subcategories.length },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCategoryInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  categoryId: string;
}): Promise<void> {
  if (!isValidDocumentId(params.categoryId)) {
    throw new Error('Invalid category ID.');
  }
  const path = `categories/${params.categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', params.categoryId));
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'DELETE_CATEGORY',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------- ADVERTISEMENTS (ADSENSE + DIRECT BANNERS + MONETAG) ----------

export function subscribePublicAdCampaigns(
  onData: (ads: MonetagAdEntry[]) => void,
  includeDisabledForAdmin = false
): Unsubscribe {
  return subscribeAllAdCampaigns(
    ({ monetagAds }) => onData(monetagAds),
    includeDisabledForAdmin
  );
}

export function subscribeAllAdCampaigns(
  onData: (result: {
    monetagAds: MonetagAdEntry[];
    directBanners: DirectBannerCampaign[];
  }) => void,
  includeDisabledForAdmin = false
): Unsubscribe {
  const campaignsCol = collection(db, 'adCampaigns');
  const q = includeDisabledForAdmin
    ? query(campaignsCol)
    : query(campaignsCol, where('enabled', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const monetagAds: MonetagAdEntry[] = [];
      const directBanners: DirectBannerCampaign[] = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const provider = (data.provider as AdProvider) || 'monetag';
        if (provider === 'direct_banner') {
          directBanners.push({
            campaignId: (data.campaignId as string) || d.id,
            title: (data.title as string) || 'Sponsored Banner',
            provider: 'direct_banner',
            placement: (data.placement as AdPlacement) || 'header',
            locale: (data.locale as Locale | 'all') || 'all',
            imageUrl: (data.imageUrl as string) || '',
            destinationUrl: (data.destinationUrl as string) || '',
            format: (data.format as string) || 'responsive',
            startAt: (data.startAt as string) || undefined,
            endAt: (data.endAt as string) || undefined,
            enabled: Boolean(data.enabled),
            createdAt: formatTimestamp(data.createdAt),
          });
        } else if (provider === 'monetag') {
          monetagAds.push({
            id: (data.campaignId as string) || d.id,
            name: (data.title as string) || 'Untitled Campaign',
            zoneId: (data.zoneId as string) || '',
            format: (data.format as MonetagFormat) || 'in_page_push',
            placement: (data.placement as AdPlacement) || 'article_bottom',
            locale: (data.locale as Locale | 'all') || 'all',
            scriptDomain: (data.scriptDomain as string) || 'alwingulla.com',
            directLinkUrl: (data.destinationUrl as string) || undefined,
            enabled: Boolean(data.enabled),
            createdAt: formatTimestamp(data.createdAt),
          });
        }
      });

      onData({ monetagAds, directBanners });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adCampaigns');
    }
  );
}

export async function createMonetagCampaignInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  entry: MonetagAdEntry;
}): Promise<void> {
  const { entry, actorUid, actorEmail } = params;
  const check = validateFirestorePayloadConstraints({
    id: entry.id,
    title: entry.name,
    zoneId: entry.zoneId,
  });
  if (!check.valid) {
    throw new Error(check.reason || 'Invalid Monetag campaign payload.');
  }

  const path = `adCampaigns/${entry.id}`;
  try {
    await setDoc(doc(db, 'adCampaigns', entry.id), {
      campaignId: entry.id,
      title: entry.name.slice(0, 140),
      provider: 'monetag',
      zoneId: entry.zoneId.slice(0, 24),
      format: entry.format,
      placement: entry.placement,
      scriptDomain: entry.scriptDomain.slice(0, 120),
      ...(entry.directLinkUrl ? { destinationUrl: entry.directLinkUrl.slice(0, 1000) } : {}),
      enabled: entry.enabled,
      locale: entry.locale,
      createdByUid: actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'CREATE_MONETAG_CAMPAIGN',
      target: path,
      metadata: { zoneId: entry.zoneId, placement: entry.placement, format: entry.format },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createDirectBannerCampaignInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  campaign: DirectBannerCampaign;
}): Promise<void> {
  const { campaign, actorUid, actorEmail } = params;
  if (!isValidDocumentId(campaign.campaignId)) {
    throw new Error('Invalid campaign ID.');
  }
  const path = `adCampaigns/${campaign.campaignId}`;
  try {
    await setDoc(doc(db, 'adCampaigns', campaign.campaignId), {
      campaignId: campaign.campaignId,
      title: campaign.title.trim().slice(0, 140),
      provider: 'direct_banner',
      placement: campaign.placement,
      format: (campaign.format || 'responsive').slice(0, 40),
      imageUrl: campaign.imageUrl.trim().slice(0, 1000),
      destinationUrl: campaign.destinationUrl.trim().slice(0, 1000),
      ...(campaign.startAt ? { startAt: campaign.startAt.slice(0, 64) } : {}),
      ...(campaign.endAt ? { endAt: campaign.endAt.slice(0, 64) } : {}),
      enabled: campaign.enabled,
      locale: campaign.locale,
      createdByUid: actorUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'CREATE_DIRECT_BANNER_CAMPAIGN',
      target: path,
      metadata: { placement: campaign.placement, locale: campaign.locale },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function uploadAdBannerImage(params: {
  actorUid: string;
  actorEmail?: string | null;
  file: File;
}): Promise<{ url: string; storagePath: string }> {
  const { file, actorUid, actorEmail } = params;
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPEG, PNG, WebP, AVIF, GIF) are permitted for banners.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Banner image exceeds the 5 MB Firebase Storage upload limit.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const bannerId = `banner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `media/ad-banners/${bannerId}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  await writeAuditLog({
    actorUid,
    actorEmail,
    action: 'UPLOAD_AD_BANNER_IMAGE',
    target: storagePath,
  });

  return { url, storagePath };
}

export async function toggleAdCampaignInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  campaignId: string;
  nextEnabled: boolean;
}): Promise<void> {
  if (!isValidDocumentId(params.campaignId)) {
    throw new Error('Invalid campaign ID.');
  }
  const path = `adCampaigns/${params.campaignId}`;
  try {
    await updateDoc(doc(db, 'adCampaigns', params.campaignId), {
      enabled: params.nextEnabled,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: params.nextEnabled ? 'ENABLE_AD_CAMPAIGN' : 'DISABLE_AD_CAMPAIGN',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAdCampaignInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  campaignId: string;
}): Promise<void> {
  if (!isValidDocumentId(params.campaignId)) {
    throw new Error('Invalid campaign ID.');
  }
  const path = `adCampaigns/${params.campaignId}`;
  try {
    await deleteDoc(doc(db, 'adCampaigns', params.campaignId));
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'DELETE_AD_CAMPAIGN',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAdSlots(
  onData: (slots: AdSlotConfig[]) => void,
  includeDisabledForAdmin = false
): Unsubscribe {
  const slotsCol = collection(db, 'adSlots');
  const q = includeDisabledForAdmin
    ? query(slotsCol)
    : query(slotsCol, where('enabled', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AdSlotConfig[] = snapshot.docs.map((d) => {
        const data = d.data();
        const cfg = (data.configuration as Record<string, unknown>) || {};
        return {
          slotId: (data.slotId as string) || d.id,
          name: (data.name as string) || 'Ad Placement',
          placement: (data.placement as AdPlacement) || 'header',
          provider: (data.provider as AdProvider) || 'adsense',
          enabled: Boolean(data.enabled),
          locale: (data.locale as Locale | 'all') || 'all',
          adsenseClient: (cfg.adsenseClient as string) || undefined,
          adsenseSlot: (cfg.adsenseSlot as string) || undefined,
          adsenseFormat: (cfg.adsenseFormat as AdSenseFormat) || 'auto',
          monetagZoneId: (cfg.monetagZoneId as string) || undefined,
          monetagFormat: (cfg.monetagFormat as MonetagFormat) || undefined,
          bannerTitle: (cfg.bannerTitle as string) || undefined,
          bannerDestinationUrl: (cfg.bannerDestinationUrl as string) || undefined,
          updatedAt: formatTimestamp(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'adSlots');
    }
  );
}

export async function saveAdSlotInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  slot: AdSlotConfig;
}): Promise<void> {
  const { slot, actorUid, actorEmail } = params;
  if (!isValidDocumentId(slot.slotId)) {
    throw new Error('Invalid ad slot ID.');
  }
  const path = `adSlots/${slot.slotId}`;
  try {
    await setDoc(doc(db, 'adSlots', slot.slotId), {
      slotId: slot.slotId,
      name: slot.name.trim().slice(0, 140),
      placement: slot.placement,
      provider: slot.provider,
      enabled: slot.enabled,
      locale: slot.locale,
      configuration: {
        adsenseClient: (slot.adsenseClient || '').trim().slice(0, 64),
        adsenseSlot: (slot.adsenseSlot || '').trim().slice(0, 32),
        adsenseFormat: slot.adsenseFormat || 'auto',
      },
      updatedByUid: actorUid,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'SAVE_AD_SLOT',
      target: path,
      metadata: {
        placement: slot.placement,
        provider: slot.provider,
        enabled: slot.enabled,
        locale: slot.locale,
      },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdSlotInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  slotId: string;
}): Promise<void> {
  if (!isValidDocumentId(params.slotId)) {
    throw new Error('Invalid ad slot ID.');
  }
  const path = `adSlots/${params.slotId}`;
  try {
    await deleteDoc(doc(db, 'adSlots', params.slotId));
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'DELETE_AD_SLOT',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeGlobalAdSettings(
  onData: (settings: GlobalAdSettings) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'siteSettings', 'public'),
    (snap) => {
      if (!snap.exists()) {
        onData(DEFAULT_GLOBAL_AD_SETTINGS);
        return;
      }
      const adCfg = (snap.data()?.adConfiguration as Record<string, unknown>) || {};
      onData({
        adsEnabled: adCfg.adsEnabled !== false,
        adsensePublisherId: (adCfg.adsensePublisherId as string) || '',
        adsenseAutoAds: Boolean(adCfg.adsenseAutoAds),
        monetagGlobalEnabled: adCfg.monetagGlobalEnabled !== false,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'siteSettings/public');
    }
  );
}

export async function saveGlobalAdSettingsInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  settings: GlobalAdSettings;
}): Promise<void> {
  const path = 'siteSettings/public';
  try {
    await setDoc(
      doc(db, 'siteSettings', 'public'),
      {
        settingId: 'public',
        adConfiguration: {
          adsEnabled: params.settings.adsEnabled,
          adsensePublisherId: params.settings.adsensePublisherId.trim().slice(0, 64),
          adsenseAutoAds: params.settings.adsenseAutoAds,
          monetagGlobalEnabled: params.settings.monetagGlobalEnabled,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'UPDATE_GLOBAL_AD_SETTINGS',
      target: path,
      metadata: {
        adsEnabled: params.settings.adsEnabled,
        adsenseAutoAds: params.settings.adsenseAutoAds,
      },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---------- USERS / AUDIT / MEDIA ----------

export function subscribeUsersForAdmin(
  onData: (users: FirestoreUserRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'users'), limit(100)),
    (snapshot) => {
      const list: FirestoreUserRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          uid: data.uid || d.id,
          displayName: data.displayName || 'User',
          email: data.email || '',
          role: (data.role as UserRole) || 'reader',
          isActive: Boolean(data.isActive),
          createdAt: formatTimestamp(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export async function updateUserRoleInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  targetUid: string;
  role: UserRole;
  isActive: boolean;
}): Promise<void> {
  if (!isValidDocumentId(params.targetUid)) {
    throw new Error('Invalid target UID.');
  }
  const path = `users/${params.targetUid}`;
  try {
    await updateDoc(doc(db, 'users', params.targetUid), {
      role: params.role,
      isActive: params.isActive,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'UPDATE_USER_ROLE',
      target: path,
      metadata: { role: params.role, isActive: params.isActive },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeAuditLogs(
  onData: (logs: AuditLogRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(40)),
    (snapshot) => {
      const logs: AuditLogRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          actorUid: data.actorUid || '',
          actorEmail: data.actorEmail || '',
          action: data.action || '',
          target: data.target || '',
          timestamp: formatTimestamp(data.timestamp),
        };
      });
      onData(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  );
}

export function subscribeMediaAssets(
  onData: (assets: MediaAssetRecord[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(40)),
    (snapshot) => {
      const assets: MediaAssetRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          mediaId: data.mediaId || d.id,
          url: data.url || '',
          storagePath: data.storagePath || '',
          alt: data.alt || '',
          title: data.title || '',
          uploadedByUid: data.uploadedByUid || '',
          createdAt: formatTimestamp(data.createdAt),
        };
      });
      onData(assets);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'media');
    }
  );
}

export async function uploadMediaAsset(params: {
  actorUid: string;
  actorEmail?: string | null;
  file: File;
  alt: string;
}): Promise<MediaAssetRecord> {
  const { file, alt, actorUid, actorEmail } = params;
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files (JPEG, PNG, WebP, AVIF, GIF) are permitted.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image exceeds the 5 MB Firebase Storage upload limit.');
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `media/${mediaId}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  const firestorePath = `media/${mediaId}`;
  try {
    await setDoc(doc(db, 'media', mediaId), {
      mediaId,
      url,
      storagePath,
      alt: alt.trim().slice(0, 300) || safeName,
      title: safeName,
      uploadedByUid: actorUid,
      createdAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'UPLOAD_MEDIA_ASSET',
      target: firestorePath,
      metadata: { storagePath },
    });
    return {
      mediaId,
      url,
      storagePath,
      alt: alt.trim() || safeName,
      title: safeName,
      uploadedByUid: actorUid,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, firestorePath);
  }
}

export async function updateMediaMetadataInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  mediaId: string;
  alt: string;
  title: string;
}): Promise<void> {
  if (!isValidDocumentId(params.mediaId)) {
    throw new Error('Invalid media ID.');
  }
  const path = `media/${params.mediaId}`;
  try {
    await updateDoc(doc(db, 'media', params.mediaId), {
      alt: params.alt.trim().slice(0, 300),
      title: params.title.trim().slice(0, 200),
    });
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'UPDATE_MEDIA_METADATA',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteMediaAsset(params: {
  actorUid: string;
  actorEmail?: string | null;
  asset: MediaAssetRecord;
}): Promise<void> {
  if (!isValidDocumentId(params.asset.mediaId)) {
    throw new Error('Invalid media ID.');
  }
  const path = `media/${params.asset.mediaId}`;
  try {
    if (params.asset.storagePath) {
      try {
        await deleteObject(ref(storage, params.asset.storagePath));
      } catch {
        // Ignore if already absent in Storage
      }
    }
    await deleteDoc(doc(db, 'media', params.asset.mediaId));
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'DELETE_MEDIA_ASSET',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedCatalogToFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
}): Promise<{ categories: number; authors: number; articles: number }> {
  const { actorUid, actorEmail } = params;
  try {
    for (const cat of SEED_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), {
        categoryId: cat.id,
        slug: cat.slug,
        name: cat.name,
        shortName: cat.shortName,
        description: cat.description,
        subcategories: cat.subcategories,
        isActive: true,
        updatedAt: serverTimestamp(),
      });
    }

    for (const author of SEED_AUTHORS) {
      await setDoc(doc(db, 'authors', author.id), {
        authorId: author.id,
        name: author.name,
        role: author.role,
        bio: author.bio,
        avatarUrl: author.avatarUrl,
        expertise: author.expertise,
        location: author.location,
        joinedAt: author.joinedAt,
      });
    }

    for (const article of SEED_ARTICLES) {
      await setDoc(doc(db, 'articles', article.articleId), {
        articleId: article.articleId,
        translationGroupId: article.translationGroupId,
        locale: article.locale,
        title: article.title.slice(0, 240),
        slug: article.slug.slice(0, 180),
        excerpt: article.excerpt.slice(0, 600),
        contentBlocks: article.contentBlocks,
        categoryId: article.categoryId,
        subcategorySlug: article.subcategorySlug,
        tags: article.tags.slice(0, 15),
        featuredImage: article.featuredImage,
        authorId: article.authorId,
        createdByUid: actorUid,
        status: article.status,
        isFeatured: article.isFeatured,
        isRecommended: article.isRecommended,
        engagementScore: article.engagementScore,
        readingTimeMinutes: article.readingTimeMinutes,
        sources: article.sources,
        seo: article.seo,
        publishedAt: article.publishedAt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'SEED_EDITORIAL_CATALOG',
      target: 'articles,categories,authors',
      metadata: {
        articles: SEED_ARTICLES.length,
        categories: SEED_CATEGORIES.length,
        authors: SEED_AUTHORS.length,
      },
    });

    return {
      categories: SEED_CATEGORIES.length,
      authors: SEED_AUTHORS.length,
      articles: SEED_ARTICLES.length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'articles');
  }
}

// ---------- PHASE 4: TOPICS, SOURCES & GEMINI AI JOBS ----------

export function subscribeTopics(
  actorUid: string,
  isBootstrappedSuperAdmin: boolean,
  onData: (topics: TopicItem[]) => void
): Unsubscribe {
  const col = collection(db, 'topics');
  const q = isBootstrappedSuperAdmin
    ? query(col, orderBy('createdAt', 'desc'), limit(100))
    : query(col, where('createdByUid', '==', actorUid), limit(80));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: TopicItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          topicId: (data.topicId as string) || d.id,
          title: (data.title as string) || '',
          categoryId: (data.categoryId as CategorySlug) || 'technology',
          priority: typeof data.priority === 'number' ? data.priority : 5,
          localeTargets: Array.isArray(data.localeTargets)
            ? (data.localeTargets as Locale[])
            : ['en', 'bn'],
          status: (data.status as TopicStatus) || 'queued',
          createdByUid: (data.createdByUid as string) || '',
          createdAt: formatTimestamp(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'topics');
    }
  );
}

export async function createTopicInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  topic: Omit<TopicItem, 'createdByUid' | 'createdAt'>;
}): Promise<void> {
  const { actorUid, actorEmail, topic } = params;
  if (!isValidDocumentId(topic.topicId)) {
    throw new Error('Invalid topic ID.');
  }
  const path = `topics/${topic.topicId}`;
  try {
    await setDoc(doc(db, 'topics', topic.topicId), {
      topicId: topic.topicId,
      title: topic.title.trim().slice(0, 240),
      categoryId: topic.categoryId,
      priority: Math.max(1, Math.min(10, Number(topic.priority) || 5)),
      localeTargets: topic.localeTargets.slice(0, 5),
      status: topic.status,
      createdByUid: actorUid,
      createdAt: serverTimestamp(),
    });
    await writeAuditLog({
      actorUid,
      actorEmail,
      action: 'CREATE_AI_TOPIC',
      target: path,
      metadata: { categoryId: topic.categoryId, locales: topic.localeTargets },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTopicStatusInFirestore(params: {
  topicId: string;
  status: TopicStatus;
}): Promise<void> {
  if (!isValidDocumentId(params.topicId)) {
    throw new Error('Invalid topic ID.');
  }
  const path = `topics/${params.topicId}`;
  try {
    await updateDoc(doc(db, 'topics', params.topicId), {
      status: params.status,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTopicInFirestore(params: {
  actorUid: string;
  actorEmail?: string | null;
  topicId: string;
}): Promise<void> {
  if (!isValidDocumentId(params.topicId)) {
    throw new Error('Invalid topic ID.');
  }
  const path = `topics/${params.topicId}`;
  try {
    await deleteDoc(doc(db, 'topics', params.topicId));
    await writeAuditLog({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'DELETE_AI_TOPIC',
      target: path,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAiJobs(
  actorUid: string,
  isBootstrappedSuperAdmin: boolean,
  onData: (jobs: AiJobRecord[]) => void
): Unsubscribe {
  const col = collection(db, 'aiJobs');
  const q = isBootstrappedSuperAdmin
    ? query(col, orderBy('startedAt', 'desc'), limit(50))
    : query(col, where('createdByUid', '==', actorUid), limit(40));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: AiJobRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          jobId: (data.jobId as string) || d.id,
          topic: (data.topic as string) || '',
          categoryId: (data.categoryId as CategorySlug) || 'technology',
          status: (data.status as AiJobStatus) || 'pending',
          model: (data.model as string) || 'gemini-4-hydrogen',
          localeTargets: Array.isArray(data.localeTargets)
            ? (data.localeTargets as Locale[])
            : ['en'],
          error: (data.error as string) || undefined,
          createdByUid: (data.createdByUid as string) || '',
          startedAt: formatTimestamp(data.startedAt),
          completedAt: data.completedAt ? formatTimestamp(data.completedAt) : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'aiJobs');
    }
  );
}

export async function createAiJobInFirestore(params: {
  actorUid: string;
  jobId: string;
  topic: string;
  categoryId: CategorySlug;
  model: string;
  localeTargets: Locale[];
}): Promise<void> {
  if (!isValidDocumentId(params.jobId)) {
    throw new Error('Invalid AI job ID.');
  }
  const path = `aiJobs/${params.jobId}`;
  try {
    await setDoc(doc(db, 'aiJobs', params.jobId), {
      jobId: params.jobId,
      topic: params.topic.trim().slice(0, 240),
      categoryId: params.categoryId,
      status: 'running',
      model: params.model.slice(0, 100),
      localeTargets: params.localeTargets.slice(0, 5),
      createdByUid: params.actorUid,
      startedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateAiJobInFirestore(params: {
  jobId: string;
  status: AiJobStatus;
  error?: string;
}): Promise<void> {
  if (!isValidDocumentId(params.jobId)) {
    throw new Error('Invalid AI job ID.');
  }
  const path = `aiJobs/${params.jobId}`;
  try {
    await updateDoc(doc(db, 'aiJobs', params.jobId), {
      status: params.status,
      ...(params.error ? { error: params.error.slice(0, 1000) } : {}),
      completedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveSourcesInFirestore(params: {
  articleId: string;
  sources: SourceReference[];
}): Promise<void> {
  if (!isValidDocumentId(params.articleId)) {
    throw new Error('Invalid article ID for sources.');
  }
  for (const src of params.sources.slice(0, 25)) {
    const cleanSourceId = isValidDocumentId(src.sourceId)
      ? src.sourceId
      : `src-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const path = `sources/${cleanSourceId}`;
    try {
      await setDoc(doc(db, 'sources', cleanSourceId), {
        sourceId: cleanSourceId,
        articleId: params.articleId,
        url: src.url.slice(0, 1000),
        title: src.title.slice(0, 300),
        publisher: src.publisher.slice(0, 200),
        ...(src.publishedAt ? { publishedAt: src.publishedAt.slice(0, 64) } : {}),
        accessedAt: src.accessedAt.slice(0, 64),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
}

