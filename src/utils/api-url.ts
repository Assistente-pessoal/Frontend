export const DEFAULT_API_URL = 'https://vox-backend-latest.onrender.com';

/** A configuração explícita nunca deve ser trocada silenciosamente pelo servidor publicado. */
export function resolveApiBaseUrl(configured: string | undefined, platform: string): string {
  const value = configured?.trim() || DEFAULT_API_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL deve ser uma URL absoluta, como http://localhost:8080.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL deve usar HTTP/HTTPS, sem credenciais, parâmetros ou fragmentos.');
  }
  if (url.hostname === '10.0.2.2' && platform !== 'android') {
    throw new Error('10.0.2.2 é exclusivo do emulador Android. No navegador, configure EXPO_PUBLIC_API_URL=http://localhost:8080.');
  }
  return url.toString().replace(/\/+$/, '');
}
