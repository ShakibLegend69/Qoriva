import test from 'node:test';
import assert from 'node:assert/strict';
import { EngagementStore } from './engagementStore';

test('EngagementStore records view/read deltas and deduplicates rapid repeats per visitor', () => {
  const store = new EngagementStore();
  const baseTime = 1_700_000_000_000;

  const firstView = store.recordEngagement({
    articleId: 'art-en-1',
    locale: 'en',
    event: 'view',
    visitorFingerprint: 'fp-1',
    nowMs: baseTime,
  });
  assert.equal(firstView.ok, true);
  assert.equal(firstView.counted, true);
  assert.equal(firstView.entry?.views, 1);
  assert.equal(firstView.entry?.scoreDelta, 1);

  const duplicateView = store.recordEngagement({
    articleId: 'art-en-1',
    locale: 'en',
    event: 'view',
    visitorFingerprint: 'fp-1',
    nowMs: baseTime + 5_000,
  });
  assert.equal(duplicateView.counted, false);
  assert.equal(duplicateView.entry?.scoreDelta, 1);

  const readComplete = store.recordEngagement({
    articleId: 'art-en-1',
    locale: 'en',
    event: 'read',
    visitorFingerprint: 'fp-1',
    nowMs: baseTime + 10_000,
  });
  assert.equal(readComplete.counted, true);
  assert.equal(readComplete.entry?.reads, 1);
  assert.equal(readComplete.entry?.scoreDelta, 4);
  assert.equal(store.getPublicScores()['art-en-1'], 4);
});

test('EngagementStore rejects malformed article IDs and validates newsletter/contact forms', () => {
  const store = new EngagementStore();

  const badId = store.recordEngagement({
    articleId: '../etc/passwd',
    locale: 'en',
    event: 'view',
    visitorFingerprint: 'fp-2',
  });
  assert.equal(badId.ok, false);

  const badEmail = store.subscribeNewsletter({ email: 'not-an-email', locale: 'en' });
  assert.equal(badEmail.ok, false);

  const goodEmail = store.subscribeNewsletter({ email: 'reader@qorvia.org', locale: 'bn' });
  assert.equal(goodEmail.ok, true);

  const badContact = store.submitContactInquiry({
    name: 'A',
    email: 'reader@qorvia.org',
    message: 'Too short',
    locale: 'en',
  });
  assert.equal(badContact.ok, false);

  const goodContact = store.submitContactInquiry({
    name: 'Tariq Hasan',
    email: 'tariq@qorvia.org',
    message: 'Requesting citation clarification on the retrieval benchmark section.',
    locale: 'en',
  });
  assert.equal(goodContact.ok, true);
  assert.equal(store.getAdminInsights().newsletterCount, 1);
  assert.equal(store.getAdminInsights().contactInquiries.length, 1);
});
