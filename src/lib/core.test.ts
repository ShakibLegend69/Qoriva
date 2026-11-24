import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRoute,
  resolveEquivalentLocalePath,
  buildHreflangLinks,
  buildArticlePath,
} from './routing';
import { filterAndSortArticles, extractTableOfContents, getRelatedArticles } from './search';
import { validateMonetagInput, getActiveMonetagForSlot } from './adsStore';
import { SEED_ARTICLES } from '../data/seedCatalog';

test('parseRoute resolves English and Bengali homepages and categories', () => {
  assert.deepEqual(parseRoute('/'), { kind: 'home', locale: 'en' });
  assert.deepEqual(parseRoute('/en/'), { kind: 'home', locale: 'en' });
  assert.deepEqual(parseRoute('/bn/'), { kind: 'home', locale: 'bn' });
  assert.deepEqual(parseRoute('/bn/technology/artificial-intelligence/'), {
    kind: 'category',
    locale: 'bn',
    categorySlug: 'technology',
    subcategorySlug: 'artificial-intelligence',
  });
  assert.deepEqual(parseRoute('/admin'), { kind: 'admin', tab: undefined });
  assert.deepEqual(parseRoute('/login'), { kind: 'admin', tab: undefined });
});

test('resolveEquivalentLocalePath preserves translationGroupId across locales', () => {
  const enRoute = parseRoute('/en/article/how-source-grounded-retrieval-reduces-hallucinations');
  const bnPath = resolveEquivalentLocalePath(enRoute, 'bn', SEED_ARTICLES);
  assert.equal(
    bnPath,
    buildArticlePath('bn', 'source-grounded-retrieval-reduces-ai-hallucinations-bn')
  );

  const hreflangs = buildHreflangLinks(enRoute, SEED_ARTICLES, 'https://qorvia.org');
  assert.equal(hreflangs.length, 3);
  assert.equal(hreflangs[1].hreflang, 'bn');
  assert.match(hreflangs[1].href, /\/bn\/article\//);
});

test('filterAndSortArticles separates locales and orders by engagement when popular', () => {
  const bnOnly = filterAndSortArticles(SEED_ARTICLES, {
    locale: 'bn',
    sortBy: 'popular',
  });
  assert.ok(bnOnly.total >= 4);
  assert.ok(bnOnly.items.every((a) => a.locale === 'bn'));
  assert.ok(bnOnly.items[0].engagementScore >= bnOnly.items[1].engagementScore);

  const searchRes = filterAndSortArticles(SEED_ARTICLES, {
    locale: 'en',
    query: 'prism',
  });
  assert.equal(searchRes.total, 1);
  assert.equal(searchRes.items[0].categoryId, 'general-knowledge');
});

test('extractTableOfContents and getRelatedArticles produce structured results', () => {
  const article = SEED_ARTICLES[0];
  const toc = extractTableOfContents(article);
  assert.equal(toc.length, 3);
  const related = getRelatedArticles(article, SEED_ARTICLES, 2);
  assert.equal(related.length, 2);
  assert.ok(related.every((r) => r.locale === article.locale && r.articleId !== article.articleId));
});

test('validateMonetagInput rejects invalid zone IDs and accepts valid entries', () => {
  const bad = validateMonetagInput({
    name: 'Header Vignette',
    zoneId: 'abc-not-digits',
    format: 'vignette',
    placement: 'header',
  });
  assert.equal(bad.valid, false);

  const good = validateMonetagInput({
    name: 'Article Bottom In-Page',
    zoneId: '8492014',
    format: 'in_page_push',
    placement: 'article_bottom',
  });
  assert.equal(good.valid, true);

  const active = getActiveMonetagForSlot(
    [
      {
        id: 'm1',
        name: 'Test',
        zoneId: '8492014',
        format: 'in_page_push',
        placement: 'article_bottom',
        locale: 'bn',
        scriptDomain: 'alwingulla.com',
        enabled: true,
        createdAt: '2026-11-23T00:00:00Z',
      },
    ],
    'article_bottom',
    'bn'
  );
  assert.equal(active?.zoneId, '8492014');
});
