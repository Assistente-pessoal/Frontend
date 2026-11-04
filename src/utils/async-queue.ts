/** Execute async mutations in call order; a rejected task never blocks the next one. */
export function createAsyncQueue() {
  let pending: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = pending.then(action, action);
    pending = result.catch(() => undefined);
    return result;
  };
}
