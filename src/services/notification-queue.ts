import { createAsyncQueue } from '../utils/async-queue';

/** Orders scheduling and logout cleanup, including native calls already in flight. */
export function createNotificationQueue() {
  let generation = 0;
  const enqueue = createAsyncQueue();

  return {
    run<T>(isCurrent: () => boolean, action: (isCurrent: () => boolean) => Promise<T>, stale: T): Promise<T> {
      const expectedGeneration = generation;
      const valid = () => generation === expectedGeneration && isCurrent();
      return enqueue(() => valid() ? action(valid) : Promise.resolve(stale));
    },
    clear(action: () => Promise<void>): Promise<void> {
      generation += 1;
      return enqueue(action);
    },
  };
}

/** Cancel a native result if logout happens while scheduling is awaiting its ID. */
export async function scheduleForSession(
  isCurrent: () => boolean,
  schedule: () => Promise<string>,
  cancel: (identifier: string) => Promise<void>,
): Promise<boolean> {
  if (!isCurrent()) return false;
  const identifier = await schedule();
  if (isCurrent()) return true;
  await cancel(identifier);
  return false;
}
