import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveApiBaseUrl, DEFAULT_API_URL } from '../src/utils/api-url';
import { apiErrorMessage } from '../src/utils/api-errors';

test('an explicit local API is preserved while absent configuration uses the published default', () => {
  assert.equal(resolveApiBaseUrl(' http://localhost:8080/// ', 'web'), 'http://localhost:8080');
  assert.equal(resolveApiBaseUrl(undefined, 'web'), DEFAULT_API_URL);
  assert.equal(resolveApiBaseUrl('http://10.0.2.2:8080', 'android'), 'http://10.0.2.2:8080');
});

test('invalid or emulator-only configuration cannot silently send web requests to production', () => {
  for (const url of ['/api', 'localhost:8080', 'ftp://example.test', 'http://user:secret@example.test',
    'https://example.test?token=secret', 'https://example.test#fragment', 'http://10.0.2.2:8080']) {
    assert.throws(() => resolveApiBaseUrl(url, 'web'));
  }
});

test('a generic Not Found label cannot hide the authentication/deployment diagnostic', () => {
  const fallback = 'Serviço de autenticação indisponível neste servidor.';
  assert.equal(apiErrorMessage({ error: 'Not Found', status: 404 }, fallback), fallback);
  assert.equal(apiErrorMessage({ message: 'E-mail já cadastrado.' }, fallback), 'E-mail já cadastrado.');
  assert.equal(apiErrorMessage({ error: 'Conflict', detail: 'E-mail já cadastrado.' }, fallback), 'E-mail já cadastrado.');
});

test('HTML, unexpected shapes and oversized messages are not shown as API feedback', () => {
  for (const payload of ['<html>proxy</html>', ['Not Found'], { message: '<script>bad</script>' },
    { message: 'x'.repeat(251) }, null]) {
    assert.equal(apiErrorMessage(payload, 'Falha na API.'), 'Falha na API.');
  }
});
