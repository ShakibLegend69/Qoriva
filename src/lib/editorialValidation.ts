import type { Article, Category, ContentBlock } from '../types/qorvia';

export interface BilingualTranslationGroup {
  translationGroupId: string;
  en?: Article;
  bn?: Article;
}

export interface OverviewStats {
  publishedCount: number;
  pendingReviewCount: number;
  draftCount: number;
  scheduledCount: number;
  needsRevisionCount: number;
  englishCount: number;
  bengaliCount: number;
  bilingualPairedGroups: number;
  totalCategories: number;
}

export function slugifyTitle(title: string, fallbackPrefix = 'article'): string {
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160);
  if (ascii.length >= 3) return ascii;
  return `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function estimateReadingTimeMinutes(blocks: ContentBlock[]): number {
  let words = 0;
  for (const b of blocks) {
    if (b.type === 'heading' || b.type === 'paragraph' || b.type === 'quote') {
      words += b.text.trim().split(/\s+/).filter(Boolean).length;
    } else if (b.type === 'callout') {
      words += (b.title + ' ' + b.text).trim().split(/\s+/).filter(Boolean).length;
    } else if (b.type === 'list') {
      words += b.items.join(' ').trim().split(/\s+/).filter(Boolean).length;
    } else if (b.type === 'table') {
      words += [...b.headers, ...b.rows.flat()].join(' ').trim().split(/\s+/).filter(Boolean).length;
    }
  }
  return Math.max(1, Math.ceil(words / 180));
}

export function validateArticleDraftInput(input: {
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  contentBlocks: ContentBlock[];
  scheduledAt?: string;
  status: Article['status'];
}): { valid: boolean; error?: string } {
  const titleLen = input.title.trim().length;
  if (titleLen < 3 || titleLen > 240) {
    return { valid: false, error: 'Headline must be between 3 and 240 characters.' };
  }
  const slugTrimmed = input.slug.trim();
  if (!/^[a-z0-9-]{3,180}$/.test(slugTrimmed)) {
    return {
      valid: false,
      error: 'URL slug must be 3–180 characters using only lowercase letters, numbers, and hyphens.',
    };
  }
  const excerptLen = input.excerpt.trim().length;
  if (excerptLen < 10 || excerptLen > 600) {
    return { valid: false, error: 'Excerpt must be between 10 and 600 characters.' };
  }
  if (input.tags.length > 15) {
    return { valid: false, error: 'Maximum 15 tags are allowed per article.' };
  }
  if (input.contentBlocks.length === 0) {
    return { valid: false, error: 'Article must contain at least one content block.' };
  }
  if (input.contentBlocks.length > 80) {
    return { valid: false, error: 'Maximum 80 content blocks are allowed.' };
  }
  if (input.status === 'scheduled' && !(input.scheduledAt ?? '').trim()) {
    return { valid: false, error: 'Scheduled publication requires a target date and time.' };
  }
  return { valid: true };
}

export function pairBilingualArticles(articles: Article[]): BilingualTranslationGroup[] {
  const map = new Map<string, BilingualTranslationGroup>();
  for (const art of articles) {
    const existing = map.get(art.translationGroupId) ?? {
      translationGroupId: art.translationGroupId,
    };
    if (art.locale === 'en') existing.en = art;
    if (art.locale === 'bn') existing.bn = art;
    map.set(art.translationGroupId, existing);
  }
  return Array.from(map.values());
}

export function computeOverviewStats(
  articles: Article[],
  categories: Category[]
): OverviewStats {
  const groups = pairBilingualArticles(articles);
  return {
    publishedCount: articles.filter((a) => a.status === 'published').length,
    pendingReviewCount: articles.filter((a) => a.status === 'pending_review').length,
    draftCount: articles.filter((a) => a.status === 'draft').length,
    scheduledCount: articles.filter((a) => a.status === 'scheduled').length,
    needsRevisionCount: articles.filter((a) => a.status === 'needs_revision').length,
    englishCount: articles.filter((a) => a.locale === 'en').length,
    bengaliCount: articles.filter((a) => a.locale === 'bn').length,
    bilingualPairedGroups: groups.filter((g) => Boolean(g.en && g.bn)).length,
    totalCategories: categories.length,
  };
}

export interface TagUsageStat {
  tag: string;
  count: number;
}

export function computeTagUsageCounts(articles: Article[]): TagUsageStat[] {
  const counts = new Map<string, number>();
  for (const article of articles) {
    for (const rawTag of article.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function countMediaUsageInArticles(mediaUrl: string, articles: Article[]): number {
  if (!mediaUrl) return 0;
  let usageCount = 0;
  for (const article of articles) {
    const usedInFeatured = article.featuredImage?.src === mediaUrl;
    const usedInBlocks = article.contentBlocks.some(
      (b) => b.type === 'image' && b.src === mediaUrl
    );
    if (usedInFeatured || usedInBlocks) {
      usageCount += 1;
    }
  }
  return usageCount;
}

