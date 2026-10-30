import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidEmail, validateImageUpload } from '../server/security.ts';
import { store } from '../server/store.ts';
import { containsRtlScript, WRITING_TOOLS } from '../src/utils/i18n.ts';

test('Password hashing uses salted scrypt and rejects wrong passwords', () => {
  const hash = store.hashPassword('StrongPass!2026');
  assert.notEqual(hash, 'StrongPass!2026');
  assert.equal(store.verifyPassword('StrongPass!2026', hash), true);
  assert.equal(store.verifyPassword('WrongPass!2026', hash), false);
});

test('User registration, private conversation isolation, and admin privilege protection', () => {
  const suffix = Date.now().toString(36);
  const alice = store.createUser(`alice_${suffix}@example.com`, 'AliceSecret99', 'Alice Khan');
  const bob = store.createUser(`bob_${suffix}@example.com`, 'BobSecret99', 'Bob Ahmed');

  assert.equal(alice.role, 'user');
  assert.equal(bob.role, 'user');

  // Verify session token round-trip and revocation
  const token = store.issueSessionToken(alice.userId);
  const verified = store.verifySessionToken(token);
  assert.equal(verified?.userId, alice.userId);

  // Alice creates a private conversation
  const conv = store.createConversation(alice.userId, 'Urdu Poetry Notes');
  store.addMessage(alice.userId, conv.conversationId, 'user', 'سلام، کیسے ہیں؟');

  // Bob must NEVER be able to read, rename, or delete Alice's conversation
  assert.equal(store.getConversation(bob.userId, conv.conversationId), null);
  assert.equal(store.listMessages(bob.userId, conv.conversationId), null);
  assert.equal(store.renameConversation(bob.userId, conv.conversationId, 'Hacked'), null);
  assert.equal(store.deleteConversation(bob.userId, conv.conversationId), false);

  // Alice can access and delete her own conversation
  assert.equal(store.listMessages(alice.userId, conv.conversationId)?.length, 1);
  assert.equal(store.deleteConversation(alice.userId, conv.conversationId), true);

  // Logout revokes token
  store.revokeSessionToken(token);
  assert.equal(store.verifySessionToken(token), null);
});

test('Image upload validation enforces MIME allowlist and 4 MB boundary', () => {
  const validSmallPng = validateImageUpload('image/png', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
  assert.equal(validSmallPng.valid, true);

  const invalidSvg = validateImageUpload('image/svg+xml', 'PHN2Zz48L3N2Zz4=');
  assert.equal(invalidSvg.valid, false);

  const oversized = validateImageUpload('image/jpeg', 'A'.repeat(6 * 1024 * 1024));
  assert.equal(oversized.valid, false);
});

test('Email validation and Urdu RTL Unicode detection work accurately', () => {
  assert.equal(isValidEmail('student@university.edu'), true);
  assert.equal(isValidEmail('invalid-email'), false);

  assert.equal(containsRtlScript('آپ کیسے ہیں؟ یہ اردو متن ہے۔'), true);
  assert.equal(containsRtlScript('Hello world, how are you today?'), false);
  assert.equal(WRITING_TOOLS.length, 10);
});
