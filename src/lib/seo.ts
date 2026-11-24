import type { Article, Author, Category, Locale } from '../types/qorvia';
import {
  buildArticlePath,
  buildCategoryPath,
  buildHreflangLinks,
  type ParsedRoute,
} from './routing';
import { UI_COPY } from './i18n';

export interface SeoMetadataBundle {
  title: string;
  description: string;
  canonicalUrl: string;
  ogType: 'website' | 'article';
  ogLocale: 'en_US' | 'bn_BD';
  ogImage: string;
  robots: 'index, follow' | 'noindex, nofollow';
  hreflangs: Array<{ hreflang: 'en' | 'bn' | 'x-default'; href: string }>;
  jsonLdObjects: Array<Record<string, unknown>>;
}

export interface SeoHealthReport {
  totalPublished: number;
  missingMetaDescriptionCount: number;
  missingAltTextCount: number;
  missingCitationsCount: number;
  unpairedTranslationCount: number;
  issues: Array<{
    articleId: string;
    title: string;
    locale: Locale;
    problems: string[];
  }>;
}

const DEFAULT_OG_IMAGE_PATH = '/src/assets/images/hero_ai_architecture_1795449989757.jpg';

export function isSafeExternalHttpUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function toAbsoluteUrl(origin: string, pathOrUrl: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return `${cleanOrigin}${DEFAULT_OG_IMAGE_PATH}`;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanOrigin}${normalized}`;
}

export function resolveSeoMetadata(params: {
  parsedRoute: ParsedRoute;
  matchedArticle?: Article;
  articles: Article[];
  categories: Category[];
  authors: Author[];
  origin: string;
  isAdminStaff?: boolean;
}): SeoMetadataBundle {
  const {
    parsedRoute,
    matchedArticle,
    articles,
    categories,
    authors,
    origin,
    isAdminStaff = false,
  } = params;
  const cleanOrigin = origin.replace(/\/+$/, '');

  // Stealth login / private console route: strict noindex & zero editorial/admin JSON-LD
  if (parsedRoute.kind === 'admin') {
    return {
      title: isAdminStaff ? 'QORVIA Workspace' : 'Sign In | QORVIA',
      description: 'Sign in to your QORVIA reader account.',
      canonicalUrl: `${cleanOrigin}/login`,
      ogType: 'website',
      ogLocale: 'en_US',
      ogImage: toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
      robots: 'noindex, nofollow',
      hreflangs: [],
      jsonLdObjects: [],
    };
  }

  const locale = parsedRoute.locale;
  const copy = UI_COPY[locale];
  const ogLocale = locale === 'bn' ? 'bn_BD' : 'en_US';
  const hreflangs = buildHreflangLinks(parsedRoute, articles, cleanOrigin);

  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'QORVIA',
    url: `${cleanOrigin}/${locale}/`,
    slogan: 'Discover More. Understand Better.',
    logo: toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
  };

  if (parsedRoute.kind === 'article' && matchedArticle) {
    const canonicalPath =
      matchedArticle.seo.canonicalPath || buildArticlePath(locale, matchedArticle.slug);
    const canonicalUrl = toAbsoluteUrl(cleanOrigin, canonicalPath);
    const author = authors.find((a) => a.id === matchedArticle.authorId);
    const category = categories.find((c) => c.id === matchedArticle.categoryId);
    const ogImage = toAbsoluteUrl(cleanOrigin, matchedArticle.featuredImage.src);

    const articleSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: matchedArticle.title,
      description: matchedArticle.seo.metaDescription || matchedArticle.excerpt,
      inLanguage: locale,
      datePublished: matchedArticle.publishedAt,
      dateModified: matchedArticle.updatedAt,
      mainEntityOfPage: canonicalUrl,
      image: [ogImage],
      keywords: matchedArticle.tags.join(', '),
      author: {
        '@type': 'Person',
        name: author?.name[locale] || 'QORVIA Editorial Desk',
      },
      publisher: {
        '@type': 'Organization',
        name: 'QORVIA',
      },
      ...(matchedArticle.sources.length > 0
        ? {
            citation: matchedArticle.sources
              .filter((s) => isSafeExternalHttpUrl(s.url))
              .map((s) => ({
                '@type': 'CreativeWork',
                name: s.title,
                url: s.url,
                publisher: { '@type': 'Organization', name: s.publisher },
              })),
          }
        : {}),
    };

    const breadcrumbItems: Array<Record<string, unknown>> = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'QORVIA',
        item: `${cleanOrigin}/${locale}/`,
      },
    ];
    if (category) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: category.name[locale],
        item: toAbsoluteUrl(cleanOrigin, buildCategoryPath(locale, category.slug)),
      });
    }
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: matchedArticle.title,
      item: canonicalUrl,
    });

    const breadcrumbSchema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    };

    return {
      title: matchedArticle.seo.metaTitle || `${matchedArticle.title} | QORVIA`,
      description: matchedArticle.seo.metaDescription || matchedArticle.excerpt,
      canonicalUrl,
      ogType: 'article',
      ogLocale,
      ogImage,
      robots: 'index, follow',
      hreflangs,
      jsonLdObjects: [articleSchema, breadcrumbSchema],
    };
  }

  if (parsedRoute.kind === 'category') {
    const category = categories.find((c) => c.slug === parsedRoute.categorySlug);
    const subcategory = category?.subcategories.find(
      (s) => s.slug === parsedRoute.subcategorySlug
    );
    const canonicalPath = buildCategoryPath(
      locale,
      parsedRoute.categorySlug,
      parsedRoute.subcategorySlug
    );
    const canonicalUrl = toAbsoluteUrl(cleanOrigin, canonicalPath);
    const title = subcategory
      ? `${subcategory.name[locale]} — ${category?.shortName[locale] || ''} | QORVIA`
      : `${category?.name[locale] || parsedRoute.categorySlug} | QORVIA`;
    const description =
      subcategory?.description[locale] ||
      category?.description[locale] ||
      copy.hero.subheadline;

    return {
      title,
      description,
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogImage: toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
      robots: 'index, follow',
      hreflangs,
      jsonLdObjects: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          inLanguage: locale,
          url: canonicalUrl,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'QORVIA',
              item: `${cleanOrigin}/${locale}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: category?.name[locale] || parsedRoute.categorySlug,
              item: toAbsoluteUrl(
                cleanOrigin,
                buildCategoryPath(locale, parsedRoute.categorySlug)
              ),
            },
            ...(subcategory
              ? [
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: subcategory.name[locale],
                    item: canonicalUrl,
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }

  if (parsedRoute.kind === 'not_found') {
    return {
      title: `404 | QORVIA`,
      description: copy.pages.notFoundBody,
      canonicalUrl: `${cleanOrigin}/${locale}/`,
      ogType: 'website',
      ogLocale,
      ogImage: toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
      robots: 'noindex, nofollow',
      hreflangs,
      jsonLdObjects: [],
    };
  }

  if (parsedRoute.kind === 'author') {
    const author = authors.find((a) => a.id === parsedRoute.authorId);
    const canonicalUrl = `${cleanOrigin}/${locale}/author/${parsedRoute.authorId}`;
    return {
      title: author ? `${author.name[locale]} | QORVIA` : 'QORVIA Author',
      description: author?.bio[locale] || copy.hero.subheadline,
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogImage: author?.avatarUrl
        ? toAbsoluteUrl(cleanOrigin, author.avatarUrl)
        : toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
      robots: author ? 'index, follow' : 'noindex, nofollow',
      hreflangs,
      jsonLdObjects: author
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name: author.name[locale],
                jobTitle: author.role[locale],
                description: author.bio[locale],
              },
            },
          ]
        : [],
    };
  }

  if (parsedRoute.kind === 'static') {
    const canonicalUrl = `${cleanOrigin}/${locale}/${parsedRoute.page}`;
    const staticTitleMap: Record<string, string> = {
      latest: `${copy.pages.latestTitle} | QORVIA`,
      featured: `${copy.pages.featuredTitle} | QORVIA`,
      trending: `${copy.pages.trendingTitle} | QORVIA`,
      archive: `${copy.pages.archiveTitle} | QORVIA`,
      search: `${copy.pages.searchTitle} | QORVIA`,
      about: `${copy.footer.links.about} | QORVIA`,
      contact: `${copy.footer.links.contact} | QORVIA`,
      privacy: `${copy.footer.links.privacy} | QORVIA`,
      terms: `${copy.footer.links.terms} | QORVIA`,
      'editorial-policy': `${copy.footer.links.editorialPolicy} | QORVIA`,
      'corrections-policy': `${copy.footer.links.correctionsPolicy} | QORVIA`,
      advertise: `${copy.footer.links.advertise} | QORVIA`,
      sitemap: `${copy.footer.links.sitemap} | QORVIA`,
    };
    return {
      title: staticTitleMap[parsedRoute.page] || `QORVIA — ${copy.tagline}`,
      description: copy.hero.subheadline,
      canonicalUrl,
      ogType: 'website',
      ogLocale,
      ogImage: toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
      robots: parsedRoute.page === 'search' ? 'noindex, follow' as 'index, follow' : 'index, follow',
      hreflangs,
      jsonLdObjects: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: staticTitleMap[parsedRoute.page] || 'QORVIA',
          inLanguage: locale,
          url: canonicalUrl,
        },
      ],
    };
  }

  // Homepage
  const homeUrl = `${cleanOrigin}/${locale}/`;
  const webSiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'QORVIA',
    alternateName: 'কোরভিয়া',
    url: homeUrl,
    inLanguage: ['en', 'bn'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${cleanOrigin}/${locale}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return {
    title: `${copy.brandName} — ${copy.tagline}`,
    description: copy.hero.subheadline,
    canonicalUrl: homeUrl,
    ogType: 'website',
    ogLocale,
    ogImage: toAbsoluteUrl(cleanOrigin, DEFAULT_OG_IMAGE_PATH),
    robots: 'index, follow',
    hreflangs,
    jsonLdObjects: [organizationSchema, webSiteSchema],
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(params: {
  articles: Article[];
  categories: Category[];
  authors: Author[];
  origin: string;
}): string {
  const { articles, categories, authors, origin } = params;
  const cleanOrigin = origin.replace(/\/+$/, '');
  const published = articles.filter((a) => a.status === 'published');

  interface SitemapEntry {
    loc: string;
    lastmod?: string;
    changefreq: 'daily' | 'weekly' | 'monthly';
    priority: string;
    alternates: Array<{ hreflang: 'en' | 'bn' | 'x-default'; href: string }>;
  }

  const entries: SitemapEntry[] = [];

  // Bilingual Homepages
  for (const loc of ['en', 'bn'] as const) {
    entries.push({
      loc: `${cleanOrigin}/${loc}/`,
      changefreq: 'daily',
      priority: '1.0',
      alternates: [
        { hreflang: 'en', href: `${cleanOrigin}/en/` },
        { hreflang: 'bn', href: `${cleanOrigin}/bn/` },
        { hreflang: 'x-default', href: `${cleanOrigin}/en/` },
      ],
    });
  }

  // Static Editorial & Institutional Pages (excluding search)
  const staticPages = [
    'latest',
    'featured',
    'trending',
    'archive',
    'about',
    'contact',
    'editorial-policy',
    'corrections-policy',
    'advertise',
    'privacy',
    'terms',
    'sitemap',
  ];
  for (const page of staticPages) {
    const alternates: SitemapEntry['alternates'] = [
      { hreflang: 'en', href: `${cleanOrigin}/en/${page}` },
      { hreflang: 'bn', href: `${cleanOrigin}/bn/${page}` },
      { hreflang: 'x-default', href: `${cleanOrigin}/en/${page}` },
    ];
    for (const loc of ['en', 'bn'] as const) {
      entries.push({
        loc: `${cleanOrigin}/${loc}/${page}`,
        changefreq: 'weekly',
        priority: '0.6',
        alternates,
      });
    }
  }

  // Categories & Subcategories
  for (const cat of categories.filter((c) => c.isActive !== false)) {
    const catAlts: SitemapEntry['alternates'] = [
      { hreflang: 'en', href: `${cleanOrigin}${buildCategoryPath('en', cat.slug)}` },
      { hreflang: 'bn', href: `${cleanOrigin}${buildCategoryPath('bn', cat.slug)}` },
      { hreflang: 'x-default', href: `${cleanOrigin}${buildCategoryPath('en', cat.slug)}` },
    ];
    for (const loc of ['en', 'bn'] as const) {
      entries.push({
        loc: `${cleanOrigin}${buildCategoryPath(loc, cat.slug)}`,
        changefreq: 'daily',
        priority: '0.8',
        alternates: catAlts,
      });
    }
    for (const sub of cat.subcategories) {
      const subAlts: SitemapEntry['alternates'] = [
        { hreflang: 'en', href: `${cleanOrigin}${buildCategoryPath('en', cat.slug, sub.slug)}` },
        { hreflang: 'bn', href: `${cleanOrigin}${buildCategoryPath('bn', cat.slug, sub.slug)}` },
        { hreflang: 'x-default', href: `${cleanOrigin}${buildCategoryPath('en', cat.slug, sub.slug)}` },
      ];
      for (const loc of ['en', 'bn'] as const) {
        entries.push({
          loc: `${cleanOrigin}${buildCategoryPath(loc, cat.slug, sub.slug)}`,
          changefreq: 'weekly',
          priority: '0.7',
          alternates: subAlts,
        });
      }
    }
  }

  // Author Profiles
  for (const author of authors) {
    const authAlts: SitemapEntry['alternates'] = [
      { hreflang: 'en', href: `${cleanOrigin}/en/author/${author.id}` },
      { hreflang: 'bn', href: `${cleanOrigin}/bn/author/${author.id}` },
      { hreflang: 'x-default', href: `${cleanOrigin}/en/author/${author.id}` },
    ];
    for (const loc of ['en', 'bn'] as const) {
      entries.push({
        loc: `${cleanOrigin}/${loc}/author/${author.id}`,
        changefreq: 'monthly',
        priority: '0.5',
        alternates: authAlts,
      });
    }
  }

  // Published Articles (linked via translationGroupId)
  for (const art of published) {
    const enSibling = published.find(
      (candidate) =>
        candidate.translationGroupId === art.translationGroupId && candidate.locale === 'en'
    );
    const bnSibling = published.find(
      (candidate) =>
        candidate.translationGroupId === art.translationGroupId && candidate.locale === 'bn'
    );
    const alternates: SitemapEntry['alternates'] = [];
    if (enSibling) {
      alternates.push({
        hreflang: 'en',
        href: `${cleanOrigin}${buildArticlePath('en', enSibling.slug)}`,
      });
      alternates.push({
        hreflang: 'x-default',
        href: `${cleanOrigin}${buildArticlePath('en', enSibling.slug)}`,
      });
    }
    if (bnSibling) {
      alternates.push({
        hreflang: 'bn',
        href: `${cleanOrigin}${buildArticlePath('bn', bnSibling.slug)}`,
      });
    }

    entries.push({
      loc: `${cleanOrigin}${buildArticlePath(art.locale, art.slug)}`,
      lastmod: (art.updatedAt || art.publishedAt).slice(0, 10),
      changefreq: 'weekly',
      priority: art.isFeatured ? '0.9' : '0.8',
      alternates,
    });
  }

  const xmlNodes = entries.map((entry) => {
    const altXml = entry.alternates
      .map(
        (alt) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(
            alt.href
          )}" />`
      )
      .join('\n');
    const lastmodXml = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
    return [
      '  <url>',
      `    <loc>${escapeXml(entry.loc)}</loc>${lastmodXml}`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      altXml,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...xmlNodes,
    '</urlset>',
  ].join('\n');
}

export function buildRobotsTxt(origin: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  return [
    'User-agent: *',
    'Allow: /en/',
    'Allow: /bn/',
    'Disallow: /admin',
    'Disallow: /login',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function auditEditorialSeoHealth(articles: Article[]): SeoHealthReport {
  const published = articles.filter((a) => a.status === 'published');
  let missingMetaDescriptionCount = 0;
  let missingAltTextCount = 0;
  let missingCitationsCount = 0;
  let unpairedTranslationCount = 0;
  const issues: SeoHealthReport['issues'] = [];

  for (const art of published) {
    const problems: string[] = [];
    const metaDesc = (art.seo?.metaDescription || '').trim();
    if (metaDesc.length < 40) {
      missingMetaDescriptionCount += 1;
      problems.push('Meta description under 40 chars');
    }
    if (!(art.featuredImage?.alt || '').trim()) {
      missingAltTextCount += 1;
      problems.push('Missing featured image alt text');
    }
    if (!Array.isArray(art.sources) || art.sources.length === 0) {
      missingCitationsCount += 1;
      problems.push('No cited primary sources');
    }
    const targetLocale: Locale = art.locale === 'en' ? 'bn' : 'en';
    const hasSibling = published.some(
      (cand) =>
        cand.translationGroupId === art.translationGroupId && cand.locale === targetLocale
    );
    if (!hasSibling) {
      unpairedTranslationCount += 1;
      problems.push(`No published ${targetLocale.toUpperCase()} translation pair`);
    }
    if (problems.length > 0) {
      issues.push({
        articleId: art.articleId,
        title: art.title,
        locale: art.locale,
        problems,
      });
    }
  }

  return {
    totalPublished: published.length,
    missingMetaDescriptionCount,
    missingAltTextCount,
    missingCitationsCount,
    unpairedTranslationCount,
    issues,
  };
}
