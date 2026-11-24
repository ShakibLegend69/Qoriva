import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFirebaseAuthError } from './authErrors';

test('formats auth/unauthorized-domain with hostname without leaking admin terms', () => {
  const msg = formatFirebaseAuthError(
    { code: 'auth/unauthorized-domain', message: 'Firebase: Error (auth/unauthorized-domain).' },
    'qoriva.vercel.app'
  );
  assert.ok(msg.includes('qoriva.vercel.app'));
  assert.ok(msg.includes('auth/unauthorized-domain'));
  assert.equal(msg.toLowerCase().includes('admin'), false);
});

test('formats auth/unauthorized-domain when matched via message string', () => {
  const msg = formatFirebaseAuthError(new Error('Firebase: Error (auth/unauthorized-domain).'));
  assert.ok(msg.includes('auth/unauthorized-domain'));
});

test('formats popup-blocked and popup-closed errors cleanly', () => {
  assert.ok(
    formatFirebaseAuthError({ code: 'auth/popup-blocked' }).toLowerCase().includes('popup')
  );
  assert.ok(
    formatFirebaseAuthError({ code: 'auth/popup-closed-by-user' }).toLowerCase().includes('closed')
  );
});

test('falls back cleanly for unknown errors', () => {
  assert.equal(formatFirebaseAuthError(new Error('Custom failure')), 'Custom failure');
  assert.equal(formatFirebaseAuthError(null), 'Google Sign-In failed.');
});
