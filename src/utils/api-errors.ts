const genericMessages = new Set([
  'not found', 'unauthorized', 'forbidden', 'conflict', 'bad request',
  'internal server error', 'service unavailable', 'bad gateway',
]);

/** Preserva mensagens úteis sem mostrar HTML ou substituir contexto por rótulos HTTP. */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fallback;
  const record = payload as Record<string, unknown>;
  for (const key of ['message', 'detail', 'error', 'title']) {
    const candidate = record[key];
    if (typeof candidate !== 'string') continue;
    const message = candidate.trim();
    if (message && message.length <= 250 && !/[<>]/.test(message)
      && !genericMessages.has(message.toLowerCase())) return message;
  }
  return fallback;
}
