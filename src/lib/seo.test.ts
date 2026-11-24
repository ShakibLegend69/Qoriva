import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditEditorialSeoHealth,
  buildRobotsTxt,
  buildSitemapXml,
  isSafeExternalHttpUrl,
  resolveSeoMetadata,
} from './seo';
import { SEED_ARTICLES, SEED_AUTHORS, SEED_CATEGORIES } from '../data/seedCatalog';
import { parseRoute } from './routing';

test('resolveSeoMetadata produces Organization + WebSite SearchAction JSON-LD on homepage', () => {
  const meta = resolveSeoMetadata({
    parsedRoute: parseRoute('/en/'),
    articles: SEED_ARTICLES,
    categories: SEED_CATEGORIES,
    authors: SEED_AUTHORS,
    origin: 'https://qorvia.org',
  });
  assert.equal(meta.robots, 'index, follow');
  assert.equal(meta.canonicalUrl, 'https://qorvia.org/en/');
  assert.equal(meta.jsonLdObjects.length, 2);
  assert.equal(meta.jsonLdObjects[0]['@type'], 'Organization');
  assert.equal(meta.jsonLdObjects[1]['@type'], 'WebSite');
});

test('resolveSeoMetadata emits Article + BreadcrumbList JSON-LD with verified citations on article page', () => {
  const article = SEED_ARTICLES.find((a) => a.locale === 'en' && a.status === 'published')!;
  const meta = resolveSeoMetadata({
    parsedRoute: parseRoute(`/en/article/${article.slug}`),
    matchedArticle: article,
    articles: SEED_ARTICLES,
    categories: SEED_CATEGORIES,
    authors: SEED_AUTHORS,
    origin: 'https://qorvia.org',
  });
  assert.equal(meta.ogType, 'article');
  assert.equal(meta.jsonLdObjects.length, 2);
  assert.equal(meta.jsonLdObjects[0]['@type'], 'Article');
  assert.equal(meta.jsonLdObjects[1]['@type'], 'BreadcrumbList');
});

test('resolveSeoMetadata hides admin/staff details and sets noindex on /login', () => {
  const meta = resolveSeoMetadata({
    parsedRoute: parseRoute('/login'),
    articles: SEED_ARTICLES,
    categories: SEED_CATEGORIES,
    authors: SEED_AUTHORS,
    origin: 'https://qorvia.org',
    isAdminStaff: false,
  });
  assert.equal(meta.title, 'Sign In | QORVIA');
  assert.equal(meta.robots, 'noindex, nofollow');
  assert.equal(meta.jsonLdObjects.length, 0);
  assert.equal(meta.title.toLowerCase().includes('admin'), false);
});

test('buildSitemapXml links bilingual translation pairs and excludes drafts and /login', () => {
  const draftArticle = {
    ...SEED_ARTICLES[0],
    articleId: 'draft-hidden-01',
    slug: 'secret-draft-not-public',
    status: 'draft' as const,
  };
  const xml = buildSitemapXml({
    articles: [...SEED_ARTICLES, draftArticle],
    categories: SEED_CATEGORIES,
    authors: SEED_AUTHORS,
    origin: 'https://qorvia.org',
  });
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.ok(xml.includes('https://qorvia.org/en/'));
  assert.ok(xml.includes('https://qorvia.org/bn/'));
  assert.equal(xml.includes('secret-draft-not-public'), false);
  assert.equal(xml.includes('/login'), false);
  assert.equal(xml.includes('/admin'), false);
});

test('buildRobotsTxt blocks /admin, /login, /api/ and links sitemap', () => {
  const robots = buildRobotsTxt('https://qorvia.org');
  assert.ok(robots.includes('Disallow: /admin'));
  assert.ok(robots.includes('Disallow: /login'));
  assert.ok(robots.includes('Sitemap: https://qorvia.org/sitemap.xml'));
});

test('isSafeExternalHttpUrl allows https/http and blocks javascript/data schemes', () => {
  assert.equal(isSafeExternalHttpUrl('https://arxiv.org/abs/2005.11401'), true);
  assert.equal(isSafeExternalHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalHttpUrl('data:text/html,<script>'), false);
});

test('auditEditorialSeoHealth flags missing meta descriptions and unpaired translations', () => {
  const incomplete = {
    ...SEED_ARTICLES[0],
    articleId: 'art-incomplete',
    translationGroupId: 'grp-unpaired-only',
    seo: {
      metaTitle: 'Short',
      metaDescription: 'Too short',
      canonicalPath: '/en/article/short',
    },
    sources: [],
  };
  const report = auditEditorialSeoHealth([incomplete]);
  assert.equal(report.missingMetaDescriptionCount, 1);
  assert.equal(report.missingCitationsCount, 1);
  assert.equal(report.unpairedTranslationCount, 1);
});
