/** Na web, o token fica apenas em memória: não colocá-lo em localStorage. */
let currentToken: string | null = null;
let onExpired: (() => void) | null = null;
export function getAccessToken(): string | null { return currentToken; }
export async function restoreAccessToken(): Promise<string | null> { return null; }
export async function saveAccessToken(token: string): Promise<void> { currentToken = token; }
export async function clearAccessToken(): Promise<void> { currentToken = null; }
export function subscribeSessionExpired(listener: () => void): () => void {
  onExpired = listener;
  return () => { if (onExpired === listener) onExpired = null; };
}
export function expireSessionIfCurrent(requestToken: string): void {
  if (!requestToken || currentToken !== requestToken) return;
  currentToken = null;
  onExpired?.();
}
