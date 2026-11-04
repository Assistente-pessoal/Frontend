export type HttpFailureKind = 'timeout' | 'cancelled' | 'network';

export class HttpTransportError extends Error {
  constructor(public readonly kind: HttpFailureKind) {
    super(kind === 'timeout' ? 'Tempo limite da requisição excedido.'
      : kind === 'cancelled' ? 'Requisição cancelada.' : 'Falha de comunicação com a API.');
    this.name = 'HttpTransportError';
  }
}

type HttpOptions = {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

/** Timeout e cancelamento cobrem tanto os headers quanto o corpo da resposta. */
export async function requestJson(
  url: string,
  init: RequestInit = {},
  { timeoutMs = 75_000, fetchImpl = fetch }: HttpOptions = {},
): Promise<{ response: Response; payload: unknown }> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort();
  let rejectOnAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectOnAbort = () => reject(new HttpTransportError(timedOut ? 'timeout' : 'cancelled'));
    controller.signal.addEventListener('abort', rejectOnAbort, { once: true });
  });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  init.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    if (init.signal?.aborted) throw new HttpTransportError('cancelled');
    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    const completed = (async () => {
      const response = await fetchImpl(url, { ...init, headers, signal: controller.signal });
      const raw = await response.text();
      let payload: unknown = null;
      if (raw) {
        try { payload = JSON.parse(raw); } catch { payload = raw; }
      }
      return { response, payload };
    })();
    return await Promise.race([completed, aborted]);
  } catch (error) {
    if (error instanceof HttpTransportError) throw error;
    if (controller.signal.aborted) throw new HttpTransportError(timedOut ? 'timeout' : 'cancelled');
    throw new HttpTransportError('network');
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abortFromCaller);
    controller.signal.removeEventListener('abort', rejectOnAbort);
  }
}
