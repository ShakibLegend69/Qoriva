import type { Article, CategorySlug, Locale } from '../types/qorvia';

export interface ArticleFilterOptions {
  locale: Locale | 'all';
  categoryId?: CategorySlug;
  subcategorySlug?: string;
  query?: string;
  sortBy?: 'latest' | 'popular' | 'featured';
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export function filterAndSortArticles(
  articles: Article[],
  options: ArticleFilterOptions
): PaginatedResult<Article> {
  const {
    locale,
    categoryId,
    subcategorySlug,
    query,
    sortBy = 'latest',
    page = 1,
    pageSize = 12,
  } = options;

  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  const filtered = articles.filter((article) => {
    if (article.status !== 'published') return false;
    if (locale !== 'all' && article.locale !== locale) return false;
    if (categoryId && article.categoryId !== categoryId) return false;
    if (subcategorySlug && article.subcategorySlug !== subcategorySlug) return false;
    if (normalizedQuery) {
      const haystack = [
        article.title,
        article.excerpt,
        ...article.tags,
        article.categoryId,
        article.subcategorySlug,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.engagementScore - a.engagementScore;
    }
    if (sortBy === 'featured') {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const safePageSize = Math.max(1, pageSize);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: sorted.slice(start, start + safePageSize),
    total,
    page: safePage,
    totalPages,
  };
}

export function getRelatedArticles(
  article: Article,
  allArticles: Article[],
  limit = 3
): Article[] {
  return allArticles
    .filter(
      (candidate) =>
        candidate.status === 'published' &&
        candidate.locale === article.locale &&
        candidate.articleId !== article.articleId
    )
    .sort((a, b) => {
      const aSameSub = a.subcategorySlug === article.subcategorySlug ? 2 : 0;
      const bSameSub = b.subcategorySlug === article.subcategorySlug ? 2 : 0;
      const aSameCat = a.categoryId === article.categoryId ? 1 : 0;
      const bSameCat = b.categoryId === article.categoryId ? 1 : 0;
      const scoreDiff = bSameSub + bSameCat - (aSameSub + aSameCat);
      if (scoreDiff !== 0) return scoreDiff;
      return b.engagementScore - a.engagementScore;
    })
    .slice(0, limit);
}

export function extractTableOfContents(
  article: Article
): Array<{ id: string; text: string; level: 2 | 3 }> {
  return article.contentBlocks
    .filter(
      (block): block is Extract<Article['contentBlocks'][number], { type: 'heading' }> =>
        block.type === 'heading'
    )
    .map((block) => ({
      id: block.id,
      text: block.text,
      level: block.level,
    }));
}
