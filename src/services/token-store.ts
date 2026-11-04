import { createAsyncQueue } from '../utils/async-queue';

/** Serializes persistence while invalidating old async operations immediately. */
export type TokenStorage = {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  remove(): Promise<void>;
};

type ExpiredListener = (storageCleanup: Promise<void>) => void;

export function createTokenStore(storage: TokenStorage) {
  let currentToken: string | null = null;
  let revision = 0;
  const enqueue = createAsyncQueue();
  const listeners = new Set<ExpiredListener>();

  function clearAccessToken(): Promise<void> {
    revision += 1;
    currentToken = null;
    return enqueue(() => storage.remove());
  }

  return {
    getAccessToken: () => currentToken,
    restoreAccessToken(): Promise<string | null> {
      const expectedRevision = revision;
      return enqueue(async () => {
        const stored = await storage.read();
        if (revision === expectedRevision) currentToken = stored;
        return revision === expectedRevision ? stored : null;
      });
    },
    saveAccessToken(token: string): Promise<void> {
      const expectedRevision = ++revision;
      return enqueue(async () => {
        await storage.write(token);
        if (revision !== expectedRevision) throw new Error('A sessão foi encerrada antes de concluir o login.');
        currentToken = token;
      });
    },
    clearAccessToken,
    subscribeSessionExpired(listener: ExpiredListener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    expireSessionIfCurrent(requestToken: string): void {
      if (!requestToken || currentToken !== requestToken) return;
      const cleanup = clearAccessToken();
      // The provider reports failures; keep an unobserved native failure handled too.
      void cleanup.catch(() => undefined);
      for (const listener of listeners) listener(cleanup);
    },
  };
}
