import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapAiDraftToArticle,
  sanitizeGroundedSources,
  validateTopicInput,
} from './aiDraftMapper';

test('validateTopicInput enforces length, target locales, and priority bounds', () => {
  assert.equal(
    validateTopicInput({ title: 'AI', localeTargets: ['en'], priority: 5 }).valid,
    false
  );
  assert.equal(
    validateTopicInput({ title: 'HTTP/3 Multiplexing', localeTargets: [], priority: 5 }).valid,
    false
  );
  assert.equal(
    validateTopicInput({ title: 'HTTP/3 Multiplexing', localeTargets: ['en', 'bn'], priority: 15 })
      .valid,
    false
  );
  assert.equal(
    validateTopicInput({ title: 'HTTP/3 Multiplexing', localeTargets: ['en', 'bn'], priority: 8 })
      .valid,
    true
  );
});

test('sanitizeGroundedSources blocks unsafe protocols/local hosts and deduplicates URLs', () => {
  const sources = sanitizeGroundedSources(
    [
      { uri: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', title: 'MDN HTTP' },
      { uri: 'https://developer.mozilla.org/en-US/docs/Web/HTTP', title: 'Duplicate' },
      { uri: 'javascript:alert(1)', title: 'Bad JS' },
      { uri: 'http://127.0.0.1:8080/internal', title: 'Localhost SSRF' },
      { uri: 'https://web.dev/articles/vitals', title: 'Core Web Vitals' },
    ],
    '2026-11-23'
  );
  assert.equal(sources.length, 2);
  assert.equal(sources[0].publisher, 'developer.mozilla.org');
  assert.equal(sources[1].accessedAt, '2026-11-23');
});

test('mapAiDraftToArticle always enforces pending_review and blueprint bounds', () => {
  const sources = sanitizeGroundedSources([
    { uri: 'https://arxiv.org/abs/2401.00001', title: 'Retrieval Paper' },
  ]);
  const article = mapAiDraftToArticle({
    draft: {
      locale: 'bn',
      title: 'তথ্যসূত্র ভিত্তিক এআই গবেষণা',
      slug: 'grounded-ai-research-bn',
      excerpt: 'বাংলা ভাষায় আধুনিক তথ্যসূত্র ভিত্তিক এআই গবেষণার বিস্তারিত বিশ্লেষণ।',
      tags: ['AI', 'Research'],
      sections: [
        {
          heading: 'মূল কাঠামো',
          paragraphs: ['প্রাথমিক নথির সাথে যাচাই করা হলে এআই মডেল নির্ভুল উত্তর দেয়।'],
        },
      ],
      keyTakeaways: ['প্রাথমিক উৎস যাচাই করা প্রয়োজন'],
      metaTitle: 'তথ্যসূত্র ভিত্তিক এআই গবেষণা | QORVIA',
      metaDescription: 'এআই গবেষণার বিস্তারিত বিশ্লেষণ।',
      verificationFlag: false,
      verificationNotes: '',
    },
    translationGroupId: 'grp-ai-test',
    categoryId: 'technology',
    subcategorySlug: 'artificial-intelligence',
    authorId: 'ananya-rahman',
    groundedSources: sources,
  });

  assert.equal(article.status, 'pending_review');
  assert.equal(article.translationGroupId, 'grp-ai-test');
  assert.equal(article.locale, 'bn');
  assert.match(article.slug, /^[a-z0-9-]+$/);
  assert.ok(article.contentBlocks.length >= 2);
  assert.equal(article.sources.length, 1);

  const autoPublished = mapAiDraftToArticle({
    draft: {
      locale: 'en',
      title: 'Top Search Tech Guide',
      slug: 'top-search-tech-guide',
      excerpt: 'Concise daily explainer generated from verified search trends.',
      tags: ['Tech', 'Search'],
      sections: [{ heading: 'Overview', paragraphs: ['Verified architectural summary.'] }],
      keyTakeaways: ['Key verified point'],
      metaTitle: 'Top Search Tech Guide | QORVIA',
      metaDescription: 'Concise daily explainer generated from verified search trends and primary docs.',
      verificationFlag: false,
      verificationNotes: '',
    },
    translationGroupId: 'grp-ai-autopub',
    categoryId: 'technology',
    subcategorySlug: 'artificial-intelligence',
    authorId: 'ananya-rahman',
    groundedSources: sources,
    publishImmediately: true,
  });
  assert.equal(autoPublished.status, 'published');
});

test('shouldRunDailyAutoPost and sanitizeSeoOptimizationPayload enforce schedule and blueprint bounds', async () => {
  const {
    DEFAULT_AI_AUTO_POST_CONFIG,
    sanitizeSeoOptimizationPayload,
    shouldRunDailyAutoPost,
  } = await import('./aiDraftMapper');

  assert.equal(shouldRunDailyAutoPost(DEFAULT_AI_AUTO_POST_CONFIG, '2026-11-24'), false);
  assert.equal(
    shouldRunDailyAutoPost(
      { ...DEFAULT_AI_AUTO_POST_CONFIG, enabled: true, lastRunDate: '2026-11-23' },
      '2026-11-24'
    ),
    true
  );
  assert.equal(
    shouldRunDailyAutoPost(
      { ...DEFAULT_AI_AUTO_POST_CONFIG, enabled: true, lastRunDate: '2026-11-24' },
      '2026-11-24'
    ),
    false
  );

  const sanitized = sanitizeSeoOptimizationPayload(
    {
      metaTitle: 'X'.repeat(250),
      metaDescription: 'Y'.repeat(400),
      tags: Array.from({ length: 20 }, (_, idx) => `tag-${idx}`),
      imageAlt: 'Z'.repeat(350),
    },
    {
      articleId: 'art-1',
      locale: 'en',
      slug: 'sample-article',
      title: 'Sample Article Title',
      excerpt: 'Sample article summary text for testing SEO bounds.',
      tags: ['Fallback'],
      featuredImage: { src: '/img.jpg', alt: 'Old alt', caption: '' },
      seo: { metaTitle: 'Old', metaDescription: 'Old desc', canonicalPath: '/en/article/sample' },
    }
  );
  assert.equal(sanitized.metaTitle.length, 180);
  assert.equal(sanitized.metaDescription.length, 320);
  assert.equal(sanitized.tags.length, 15);
  assert.equal(sanitized.imageAlt.length, 300);
});

