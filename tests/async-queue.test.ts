import assert from 'node:assert/strict';
import test from 'node:test';
import { createAsyncQueue } from '../src/utils/async-queue';

test('rapid mutations complete in call order even when the first write is delayed', async () => {
  const enqueue = createAsyncQueue();
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  const writes: string[] = [];
  const first = enqueue(async () => { await delayed; writes.push('old'); });
  const last = enqueue(async () => { writes.push('new'); });
  release();
  await Promise.all([first, last]);
  assert.deepEqual(writes, ['old', 'new']);
});

test('a failed storage mutation reports its failure while later writes can recover', async () => {
  const enqueue = createAsyncQueue();
  const first = assert.rejects(enqueue(async () => { throw new Error('write failed'); }), /write failed/);
  const last = enqueue(async () => 'latest preference');
  await first;
  assert.equal(await last, 'latest preference');
});
