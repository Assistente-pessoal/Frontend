import assert from 'node:assert/strict';
import test from 'node:test';
import { createTokenStore, type TokenStorage } from '../src/services/token-store';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function memoryStorage(): TokenStorage & { value: string | null } {
  return {
    value: null,
    async read() { return this.value; },
    async write(token) { this.value = token; },
    async remove() { this.value = null; },
  };
}

test('logout invalidates an in-flight secure save and removes the persisted token', async () => {
  const storage = memoryStorage();
  const writing = deferred<void>();
  storage.write = async (token) => { await writing.promise; storage.value = token; };
  const store = createTokenStore(storage);
  const saved = store.saveAccessToken('account-a');
  const rejected = assert.rejects(saved, /sessão foi encerrada/);
  const cleared = store.clearAccessToken();
  writing.resolve();
  await Promise.all([rejected, cleared]);
  assert.equal(store.getAccessToken(), null);
  assert.equal(storage.value, null);
});

test('a late restore cannot revive a token after logout', async () => {
  const reading = deferred<string | null>();
  const storage = memoryStorage();
  storage.value = 'old-account';
  storage.read = () => reading.promise;
  const store = createTokenStore(storage);
  const restored = store.restoreAccessToken();
  const cleared = store.clearAccessToken();
  reading.resolve('old-account');
  assert.equal(await restored, null);
  await cleared;
  assert.equal(store.getAccessToken(), null);
  assert.equal(storage.value, null);
});

test('an old request cannot expire a new account session', async () => {
  const store = createTokenStore(memoryStorage());
  await store.saveAccessToken('account-a');
  await store.clearAccessToken();
  await store.saveAccessToken('account-b');
  let expired = false;
  store.subscribeSessionExpired(() => { expired = true; });
  store.expireSessionIfCurrent('account-a');
  assert.equal(store.getAccessToken(), 'account-b');
  assert.equal(expired, false);
});

test('expiry immediately hides the token and reports persistence failures', async () => {
  const storage = memoryStorage();
  const store = createTokenStore(storage);
  await store.saveAccessToken('account-a');
  storage.remove = async () => { throw new Error('secure storage unavailable'); };
  let cleanup: Promise<void> | undefined;
  store.subscribeSessionExpired((pending) => { cleanup = pending; });
  store.expireSessionIfCurrent('account-a');
  assert.equal(store.getAccessToken(), null);
  assert.ok(cleanup);
  await assert.rejects(cleanup, /secure storage unavailable/);
  // Failed storage work must not poison subsequent retries or a new login.
  storage.remove = async () => { storage.value = null; };
  await store.clearAccessToken();
  await store.saveAccessToken('account-b');
  assert.equal(storage.value, 'account-b');
  assert.equal(store.getAccessToken(), 'account-b');
});

test('queued save/clear/save preserves only the final session', async () => {
  const storage = memoryStorage();
  const store = createTokenStore(storage);
  const first = assert.rejects(store.saveAccessToken('account-a'), /sessão foi encerrada/);
  const clear = store.clearAccessToken();
  const last = store.saveAccessToken('account-b');
  await Promise.all([first, clear, last]);
  assert.equal(store.getAccessToken(), 'account-b');
  assert.equal(storage.value, 'account-b');
});
