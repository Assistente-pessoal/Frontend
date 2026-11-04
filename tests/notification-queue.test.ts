import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotificationQueue, scheduleForSession } from '../src/services/notification-queue';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((yes) => { resolve = yes; });
  return { promise, resolve };
}

test('logout waits for native scheduling and invalidates the old session guard', async () => {
  const queue = createNotificationQueue();
  const started = deferred();
  const nativeDone = deferred();
  const events: string[] = [];
  const scheduled = queue.run(() => true, async (isCurrent) => {
    started.resolve();
    await nativeDone.promise;
    events.push(isCurrent() ? 'unsafe-old-alert' : 'cancel-old-alert');
    return 'done';
  }, 'stale');
  await started.promise;
  const clear = queue.clear(async () => { events.push('clear-all'); });
  const nextAccount = queue.run(() => true, async () => { events.push('new-account-alert'); return 'done'; }, 'stale');
  nativeDone.resolve();
  await Promise.all([scheduled, clear, nextAccount]);
  assert.deepEqual(events, ['cancel-old-alert', 'clear-all', 'new-account-alert']);
});

test('queued old work never schedules after logout', async () => {
  const queue = createNotificationQueue();
  let scheduled = false;
  const old = queue.run(() => true, async () => { scheduled = true; return 'done'; }, 'stale');
  const clear = queue.clear(async () => {});
  assert.equal(await old, 'stale');
  await clear;
  assert.equal(scheduled, false);
});

test('session change without unmount invalidates permission-delayed work', async () => {
  const queue = createNotificationQueue();
  const started = deferred();
  const permission = deferred();
  let session = 'a';
  let scheduled = false;
  const old = queue.run(() => session === 'a', async (isCurrent) => {
    started.resolve();
    await permission.promise;
    if (!isCurrent()) return 'stale';
    scheduled = true;
    return 'scheduled';
  }, 'stale');
  await started.promise;
  session = 'b';
  permission.resolve();
  assert.equal(await old, 'stale');
  assert.equal(scheduled, false);
});

test('failed cleanup is reported and a retry still runs in order', async () => {
  const queue = createNotificationQueue();
  await assert.rejects(queue.clear(async () => { throw new Error('native failure'); }), /native failure/);
  let retried = false;
  await queue.clear(async () => { retried = true; });
  assert.equal(retried, true);
});


test('native ID returned after logout is canceled instead of becoming another account alert', async () => {
  const nativeDone = deferred();
  let current = true;
  const canceled: string[] = [];
  const result = scheduleForSession(() => current, async () => {
    await nativeDone.promise;
    return 'old-account-notification';
  }, async (id) => { canceled.push(id); });
  current = false;
  nativeDone.resolve();
  assert.equal(await result, false);
  assert.deepEqual(canceled, ['old-account-notification']);
});

test('expired session cannot invoke the native scheduler', async () => {
  let called = false;
  assert.equal(await scheduleForSession(() => false, async () => {
    called = true;
    return 'id';
  }, async () => {}), false);
  assert.equal(called, false);
});
