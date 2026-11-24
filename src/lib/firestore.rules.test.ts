import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  canAccessAdminDashboard,
  canManageAds,
  canManageUsersAndRoles,
  canPublishArticles,
  isValidDocumentId,
  resolveEffectiveRole,
  validateFirestorePayloadConstraints,
} from './rbac';

test('Dirty Dozen #3: Email spoofing without emailVerified=true is rejected', () => {
  const unverifiedAdmin = {
    uid: 'uid-spoof',
    email: BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
    emailVerified: false,
    role: 'superAdmin' as const,
    isActive: true,
  };
  assert.equal(canAccessAdminDashboard(unverifiedAdmin), false);
  assert.equal(canManageUsersAndRoles(unverifiedAdmin), false);
  assert.equal(canManageAds(unverifiedAdmin), false);
});

test('Verified sbgangster016@gmail.com resolves as superAdmin with full privileges', () => {
  const verifiedAdmin = {
    uid: 'uid-shakib',
    email: 'sbgangster016@gmail.com',
    emailVerified: true,
    role: 'reader' as const,
    isActive: true,
  };
  assert.equal(resolveEffectiveRole(verifiedAdmin), 'superAdmin');
  assert.equal(canAccessAdminDashboard(verifiedAdmin), true);
  assert.equal(canManageUsersAndRoles(verifiedAdmin), true);
  assert.equal(canManageAds(verifiedAdmin), true);
  assert.equal(canPublishArticles(verifiedAdmin), true);
});

test('Dirty Dozen #10 & #11: Least-privilege separation between editor, reviewer, adsManager, and reader', () => {
  const editor = {
    uid: 'uid-ed',
    email: 'editor@qorvia.org',
    emailVerified: true,
    role: 'editor' as const,
    isActive: true,
  };
  assert.equal(canAccessAdminDashboard(editor), true);
  assert.equal(canManageAds(editor), false);
  assert.equal(canPublishArticles(editor), false);
  assert.equal(canManageUsersAndRoles(editor), false);

  const adsMgr = {
    uid: 'uid-ads',
    email: 'ads@qorvia.org',
    emailVerified: true,
    role: 'adsManager' as const,
    isActive: true,
  };
  assert.equal(canManageAds(adsMgr), true);
  assert.equal(canPublishArticles(adsMgr), false);

  const inactiveStaff = { ...adsMgr, isActive: false };
  assert.equal(canAccessAdminDashboard(inactiveStaff), false);
  assert.equal(canManageAds(inactiveStaff), false);
});

test('Dirty Dozen #7 & #12: Document ID poisoning and unbounded arrays/strings are rejected', () => {
  assert.equal(isValidDocumentId('../etc/passwd'), false);
  assert.equal(isValidDocumentId('a'.repeat(129)), false);
  assert.equal(isValidDocumentId('campaign-monetag-01'), true);

  const overTagged = validateFirestorePayloadConstraints({
    id: 'art-1',
    title: 'Valid Title',
    tags: Array.from({ length: 16 }, (_, i) => `tag-${i}`),
  });
  assert.equal(overTagged.valid, false);

  const badZone = validateFirestorePayloadConstraints({
    id: 'camp-1',
    title: 'Monetag Zone',
    zoneId: 'alert(1)',
  });
  assert.equal(badZone.valid, false);
});
