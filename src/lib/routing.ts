import type { Article, CategorySlug, Locale } from '../types/qorvia';

export type StaticPageKey =
  | 'home'
  | 'latest'
  | 'featured'
  | 'trending'
  | 'archive'
  | 'search'
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'editorial-policy'
  | 'corrections-policy'
  | 'advertise'
  | 'sitemap';

export type ParsedRoute =
  | { kind: 'home'; locale: Locale }
  | { kind: 'category'; locale: Locale; categorySlug: CategorySlug; subcategorySlug?: string }
  | { kind: 'article'; locale: Locale; slug: string; categorySlug?: CategorySlug }
  | { kind: 'author'; locale: Locale; authorId: string }
  | { kind: 'static'; locale: Locale; page: Exclude<StaticPageKey, 'home'> }
  | { kind: 'admin'; tab?: string }
  | { kind: 'not_found'; locale: Locale; path: string };

const CATEGORY_SLUGS: ReadonlySet<string> = new Set([
  'technology',
  'education',
  'digital-skills',
  'general-knowledge',
]);

const STATIC_PAGES: ReadonlySet<string> = new Set([
  'latest',
  'featured',
  'trending',
  'archive',
  'search',
  'about',
  'contact',
  'privacy',
  'terms',
  'editorial-policy',
  'corrections-policy',
  'advertise',
  'sitemap',
]);

export function isCategorySlug(value: string): value is CategorySlug {
  return CATEGORY_SLUGS.has(value);
}

export function normalizePathname(pathname: string): string {
  const clean = pathname.split('?')[0].split('#')[0].trim();
  if (!clean || clean === '/') return '/en/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export function parseRoute(rawPathname: string): ParsedRoute {
  const pathname = normalizePathname(rawPathname);
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'login' || segments[0] === 'admin') {
    return { kind: 'admin', tab: segments[1] };
  }

  let locale: Locale = 'en';
  let rest = segments;

  if (segments[0] === 'en' || segments[0] === 'bn') {
    locale = segments[0];
    rest = segments.slice(1);
  } else {
    // Root-level paths without locale prefix default to English or trigger 404
    if (segments.length === 0) {
      return { kind: 'home', locale: 'en' };
    }
    return { kind: 'not_found', locale: 'en', path: pathname };
  }

  if (rest.length === 0) {
    return { kind: 'home', locale };
  }

  const [first, second, third] = rest;

  if (rest.length === 1 && STATIC_PAGES.has(first)) {
    return {
      kind: 'static',
      locale,
      page: first as Exclude<StaticPageKey, 'home'>,
    };
  }

  if (first === 'article' && second) {
    return { kind: 'article', locale, slug: second };
  }

  if (first === 'author' && second) {
    return { kind: 'author', locale, authorId: second };
  }

  if (isCategorySlug(first)) {
    if (!second) {
      return { kind: 'category', locale, categorySlug: first };
    }
    // Check if second is an article slug or subcategory slug:
    // Subcategories can be resolved unambiguously if third is absent; caller can check article lookup if needed.
    if (third) {
      return { kind: 'article', locale, categorySlug: first, slug: third };
    }
    return { kind: 'category', locale, categorySlug: first, subcategorySlug: second };
  }

  return { kind: 'not_found', locale, path: pathname };
}

export function buildLocalePath(locale: Locale, subPath = ''): string {
  const cleaned = subPath.replace(/^\/+/, '');
  return cleaned ? `/${locale}/${cleaned}` : `/${locale}/`;
}

export function buildArticlePath(locale: Locale, slug: string): string {
  return `/${locale}/article/${slug}`;
}

export function buildCategoryPath(
  locale: Locale,
  categorySlug: CategorySlug,
  subcategorySlug?: string
): string {
  return subcategorySlug
    ? `/${locale}/${categorySlug}/${subcategorySlug}/`
    : `/${locale}/${categorySlug}/`;
}

export function resolveEquivalentLocalePath(
  currentRoute: ParsedRoute,
  targetLocale: Locale,
  articles: Article[]
): string {
  if (currentRoute.kind === 'admin') {
    return `/${targetLocale}/`;
  }
  if (currentRoute.kind === 'home' || currentRoute.kind === 'not_found') {
    return `/${targetLocale}/`;
  }
  if (currentRoute.kind === 'static') {
    return `/${targetLocale}/${currentRoute.page}`;
  }
  if (currentRoute.kind === 'author') {
    return `/${targetLocale}/author/${currentRoute.authorId}`;
  }
  if (currentRoute.kind === 'category') {
    return buildCategoryPath(
      targetLocale,
      currentRoute.categorySlug,
      currentRoute.subcategorySlug
    );
  }
  if (currentRoute.kind === 'article') {
    const currentArticle = articles.find(
      (a) => a.locale === currentRoute.locale && a.slug === currentRoute.slug
    );
    if (currentArticle) {
      const sibling = articles.find(
        (a) =>
          a.translationGroupId === currentArticle.translationGroupId &&
          a.locale === targetLocale &&
          a.status === 'published'
      );
      if (sibling) {
        return buildArticlePath(targetLocale, sibling.slug);
      }
    }
    return `/${targetLocale}/`;
  }
  return `/${targetLocale}/`;
}

export function buildHreflangLinks(
  currentRoute: ParsedRoute,
  articles: Article[],
  origin = 'https://qorvia.org'
): Array<{ hreflang: 'en' | 'bn' | 'x-default'; href: string }> {
  const enPath = resolveEquivalentLocalePath(currentRoute, 'en', articles);
  const bnPath = resolveEquivalentLocalePath(currentRoute, 'bn', articles);
  return [
    { hreflang: 'en', href: `${origin}${enPath}` },
    { hreflang: 'bn', href: `${origin}${bnPath}` },
    { hreflang: 'x-default', href: `${origin}${enPath}` },
  ];
}
