export type Locale = 'en' | 'bn';

export type CategorySlug =
  | 'technology'
  | 'education'
  | 'digital-skills'
  | 'general-knowledge';

export type AdminRole = 'superAdmin' | 'editor' | 'reviewer' | 'adsManager';

export type ArticleStatus =
  | 'draft'
  | 'pending_review'
  | 'needs_revision'
  | 'rejected'
  | 'scheduled'
  | 'published'
  | 'archived';

export type AdPlacement =
  | 'header'
  | 'homepage_content'
  | 'article_top'
  | 'in_article'
  | 'sidebar'
  | 'article_bottom';

export type AdProvider = 'adsense' | 'monetag' | 'direct_banner';

export type MonetagFormat =
  | 'vignette'
  | 'in_page_push'
  | 'popunder'
  | 'push_notifications'
  | 'direct_link'
  | 'multitag';

export interface Subcategory {
  id: string;
  slug: string;
  categorySlug: CategorySlug;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
}

export interface Category {
  id: CategorySlug;
  slug: CategorySlug;
  name: Record<Locale, string>;
  shortName: Record<Locale, string>;
  description: Record<Locale, string>;
  isActive?: boolean;
  subcategories: Subcategory[];
}

export interface Author {
  id: string;
  name: Record<Locale, string>;
  role: Record<Locale, string>;
  bio: Record<Locale, string>;
  avatarUrl: string;
  expertise: Record<Locale, string[]>;
  location: Record<Locale, string>;
  joinedAt: string;
}

export interface SourceReference {
  sourceId: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
  accessedAt: string;
}

export type ContentBlock =
  | {
      id: string;
      type: 'heading';
      level: 2 | 3;
      text: string;
    }
  | {
      id: string;
      type: 'paragraph';
      text: string;
      dropCap?: boolean;
    }
  | {
      id: string;
      type: 'quote';
      text: string;
      attribution?: string;
    }
  | {
      id: string;
      type: 'list';
      ordered: boolean;
      items: string[];
    }
  | {
      id: string;
      type: 'callout';
      title: string;
      text: string;
      tone?: 'info' | 'verification' | 'note';
    }
  | {
      id: string;
      type: 'image';
      src: string;
      alt: string;
      caption: string;
    }
  | {
      id: string;
      type: 'table';
      headers: string[];
      rows: string[][];
    };

export interface ArticleSeo {
  metaTitle: string;
  metaDescription: string;
  canonicalPath: string;
}

export interface Article {
  articleId: string;
  translationGroupId: string;
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string;
  contentBlocks: ContentBlock[];
  categoryId: CategorySlug;
  subcategorySlug: string;
  tags: string[];
  featuredImage: {
    src: string;
    alt: string;
    caption: string;
  };
  authorId: string;
  createdByUid?: string;
  status: ArticleStatus;
  revisionNotes?: string;
  scheduledAt?: string;
  isFeatured: boolean;
  isRecommended: boolean;
  engagementScore: number; // Real view/read metric in production
  readingTimeMinutes: number;
  sources: SourceReference[];
  seo: ArticleSeo;
  publishedAt: string;
  updatedAt: string;
}

export type AdSenseFormat = 'auto' | 'horizontal' | 'rectangle' | 'vertical';

export interface MonetagAdEntry {
  id: string;
  name: string;
  zoneId: string;
  format: MonetagFormat;
  placement: AdPlacement;
  locale: Locale | 'all';
  scriptDomain: string;
  directLinkUrl?: string;
  enabled: boolean;
  createdAt: string;
}

export interface DirectBannerCampaign {
  campaignId: string;
  title: string;
  provider: 'direct_banner';
  placement: AdPlacement;
  locale: Locale | 'all';
  imageUrl: string;
  destinationUrl: string;
  format?: string;
  startAt?: string;
  endAt?: string;
  enabled: boolean;
  createdAt: string;
}

export interface AdSlotConfig {
  slotId: string;
  name: string;
  placement: AdPlacement;
  provider: AdProvider;
  enabled: boolean;
  locale: Locale | 'all';
  adsenseClient?: string;
  adsenseSlot?: string;
  adsenseFormat?: AdSenseFormat;
  monetagZoneId?: string;
  monetagFormat?: MonetagFormat;
  bannerTitle?: string;
  bannerDestinationUrl?: string;
  updatedAt?: string;
}

export interface GlobalAdSettings {
  adsEnabled: boolean;
  adsensePublisherId: string;
  adsenseAutoAds: boolean;
  monetagGlobalEnabled: boolean;
}

export type TopicStatus = 'queued' | 'in_progress' | 'completed' | 'flagged';

export interface TopicItem {
  topicId: string;
  title: string;
  categoryId: CategorySlug;
  subcategorySlug?: string;
  priority: number;
  localeTargets: Locale[];
  status: TopicStatus;
  createdByUid: string;
  createdAt: string;
}

export type AiJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'flagged';

export interface AiJobRecord {
  jobId: string;
  topic: string;
  categoryId: CategorySlug;
  status: AiJobStatus;
  model: string;
  localeTargets: Locale[];
  error?: string;
  createdByUid: string;
  startedAt: string;
  completedAt?: string;
}

export interface AiSuggestedTopic {
  title: string;
  rationale: string;
  subcategorySlug: string;
  priority: number;
}

export interface AiDraftLocalePayload {
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
  keyTakeaways: string[];
  quoteText?: string;
  quoteAttribution?: string;
  calloutTitle?: string;
  calloutText?: string;
  metaTitle: string;
  metaDescription: string;
  verificationFlag: boolean;
  verificationNotes: string;
}

