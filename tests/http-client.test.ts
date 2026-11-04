import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpTransportError, requestJson } from '../src/services/http-client';

function responseWithBody(readBody: () => Promise<string>): Response {
  const response = new Response();
  response.text = readBody;
  return response;
}

test('HTTP timeout remains active while the response body is pending', async () => {
  let signal: AbortSignal | null = null;
  const fetchImpl: typeof fetch = async (_url, options) => {
    signal = options?.signal ?? null;
    return responseWithBody(() => new Promise<string>(() => {}));
  };
  await assert.rejects(requestJson('https://example.test/login', {}, { timeoutMs: 20, fetchImpl }),
    (error: unknown) => error instanceof HttpTransportError && error.kind === 'timeout');
  assert.equal((signal as AbortSignal | null)?.aborted, true);
});

test('caller cancellation also interrupts a pending body and never becomes a timeout', async () => {
  const controller = new AbortController();
  const fetchImpl: typeof fetch = async () => responseWithBody(() => new Promise<string>(() => {}));
  const request = requestJson('https://example.test/login', { signal: controller.signal }, { fetchImpl });
  const rejected = assert.rejects(request,
    (error: unknown) => error instanceof HttpTransportError && error.kind === 'cancelled');
  controller.abort();
  await rejected;
});

test('already cancelled requests never call fetch', async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const fetchImpl: typeof fetch = async () => { called = true; return new Response(); };
  await assert.rejects(requestJson('https://example.test', { signal: controller.signal }, { fetchImpl }),
    (error: unknown) => error instanceof HttpTransportError && error.kind === 'cancelled');
  assert.equal(called, false);
});

test('HTTP keeps status and parsed JSON without treating rejected credentials as a network failure', async () => {
  const fetchImpl: typeof fetch = async (_url, options) => {
    assert.equal(new Headers(options?.headers).get('Accept'), 'application/json');
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer synthetic-test-token');
    return new Response(JSON.stringify({ message: 'Credenciais inválidas.' }), { status: 401 });
  };
  const result = await requestJson('https://example.test/login',
    { headers: { Authorization: 'Bearer synthetic-test-token' } }, { fetchImpl });
  assert.equal(result.response.status, 401);
  assert.deepEqual(result.payload, { message: 'Credenciais inválidas.' });
});

test('empty and non-JSON responses remain distinguishable', async () => {
  const empty = await requestJson('https://example.test/logout', {},
    { fetchImpl: async () => new Response(null, { status: 204 }) });
  assert.equal(empty.payload, null);
  const html = await requestJson('https://example.test/login', {},
    { fetchImpl: async () => new Response('<html>proxy error</html>', { status: 502 }) });
  assert.equal(html.response.status, 502);
  assert.equal(html.payload, '<html>proxy error</html>');
});

test('connection and body-stream errors produce a controlled transport failure', async () => {
  for (const fetchImpl of [
    async () => { throw new TypeError('connection refused'); },
    async () => responseWithBody(async () => { throw new Error('body disconnected'); }),
  ] satisfies (typeof fetch)[]) {
    await assert.rejects(requestJson('https://example.test', {}, { fetchImpl }),
      (error: unknown) => error instanceof HttpTransportError && error.kind === 'network');
  }
});
