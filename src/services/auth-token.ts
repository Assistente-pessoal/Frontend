/** Fonte única de identidade da sessão ativa. Tokens nunca são persistidos em logs. */
import * as SecureStore from 'expo-secure-store';

const KEY = 'synapse_access_token_v1';
let currentToken: string | null = null;
let onExpired: (() => void) | null = null;
let pendingStorageChange: Promise<void> = Promise.resolve();

function serializeStorageChange(action: () => Promise<void>): Promise<void> {
  const next = pendingStorageChange.then(action, action);
  pendingStorageChange = next.catch(() => undefined);
  return next;
}

export function getAccessToken(): string | null {
  return currentToken;
}

export async function restoreAccessToken(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(KEY);
  currentToken = stored;
  return stored;
}

export async function saveAccessToken(token: string): Promise<void> {
  await serializeStorageChange(() => SecureStore.setItemAsync(KEY, token));
  currentToken = token;
}

export async function clearAccessToken(): Promise<void> {
  currentToken = null;
  await serializeStorageChange(() => SecureStore.deleteItemAsync(KEY));
}

export function subscribeSessionExpired(listener: () => void): () => void {
  onExpired = listener;
  return () => { if (onExpired === listener) onExpired = null; };
}

/** Não encerrar uma sessão nova por uma resposta 401 de uma requisição antiga. */
export function expireSessionIfCurrent(requestToken: string): void {
  if (!requestToken || currentToken !== requestToken) return;
  currentToken = null;
  onExpired?.();
  void serializeStorageChange(() => SecureStore.deleteItemAsync(KEY)).catch(() => undefined);
}
