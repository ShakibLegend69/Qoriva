import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeOverviewStats,
  computeTagUsageCounts,
  countMediaUsageInArticles,
  estimateReadingTimeMinutes,
  pairBilingualArticles,
  slugifyTitle,
  validateArticleDraftInput,
} from './editorialValidation';
import { SEED_ARTICLES, SEED_CATEGORIES } from '../data/seedCatalog';

test('slugifyTitle generates clean ASCII slugs and safe fallback for Bengali text', () => {
  assert.equal(
    slugifyTitle('Core Web Vitals: Best Practices!'),
    'core-web-vitals-best-practices'
  );
  const bnSlug = slugifyTitle('তথ্যসূত্র ভিত্তিক অনুসন্ধান', 'bn-story');
  assert.match(bnSlug, /^bn-story-[a-z0-9]+$/);
});

test('validateArticleDraftInput enforces blueprint bounds and scheduled date requirement', () => {
  const badSlug = validateArticleDraftInput({
    title: 'Valid Headline',
    slug: 'Invalid Slug!',
    excerpt: 'This is a sufficiently long excerpt for validation.',
    tags: ['AI'],
    contentBlocks: [{ id: 'p1', type: 'paragraph', text: 'Body content.' }],
    status: 'draft',
  });
  assert.equal(badSlug.valid, false);

  const missingSchedule = validateArticleDraftInput({
    title: 'Scheduled Headline',
    slug: 'scheduled-headline',
    excerpt: 'This is a sufficiently long excerpt for validation.',
    tags: [],
    contentBlocks: [{ id: 'p1', type: 'paragraph', text: 'Body content.' }],
    status: 'scheduled',
  });
  assert.equal(missingSchedule.valid, false);

  const validDraft = validateArticleDraftInput({
    title: 'Scheduled Headline',
    slug: 'scheduled-headline',
    excerpt: 'This is a sufficiently long excerpt for validation.',
    tags: ['Education'],
    contentBlocks: [{ id: 'p1', type: 'paragraph', text: 'Body content.' }],
    scheduledAt: '2026-12-01T10:00',
    status: 'scheduled',
  });
  assert.equal(validDraft.valid, true);
});

test('pairBilingualArticles and computeOverviewStats pair EN and BN editions via translationGroupId', () => {
  const pairs = pairBilingualArticles(SEED_ARTICLES);
  assert.equal(pairs.length, 4);
  assert.ok(pairs.every((p) => p.en && p.bn));

  const stats = computeOverviewStats(SEED_ARTICLES, SEED_CATEGORIES);
  assert.equal(stats.publishedCount, 8);
  assert.equal(stats.bilingualPairedGroups, 4);
  assert.equal(stats.totalCategories, 4);
});

test('estimateReadingTimeMinutes computes at least 1 min', () => {
  assert.equal(
    estimateReadingTimeMinutes([{ id: '1', type: 'paragraph', text: 'Short text.' }]),
    1
  );
});

test('computeTagUsageCounts and countMediaUsageInArticles track editorial usage accurately', () => {
  const tagStats = computeTagUsageCounts(SEED_ARTICLES);
  assert.ok(tagStats.length > 0);
  assert.ok(tagStats[0].count >= 1);

  const usedCount = countMediaUsageInArticles(
    '/src/assets/images/hero_ai_architecture_1795449989757.jpg',
    SEED_ARTICLES
  );
  assert.ok(usedCount >= 2);
  assert.equal(
    countMediaUsageInArticles('https://example.com/unused-image.jpg', SEED_ARTICLES),
    0
  );
});

