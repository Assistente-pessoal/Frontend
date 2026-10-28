import { VOX_API_BASE_URL } from './vox-api';
import { expireSessionIfCurrent } from './auth-token';

export type SynapseUser = { id: string; name: string; email: string };
export type AuthLoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: SynapseUser;
};

export class AuthApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function authRequest(path: string, init: RequestInit): Promise<unknown> {
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), 75_000);
  let response: Response;
  try {
    response = await fetch(`${VOX_API_BASE_URL}${path}`, {
      ...init,
      signal: abortController.signal,
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch (error) {
    const text = error instanceof Error && error.name === 'AbortError'
      ? 'A API demorou demais para responder. Tente novamente.'
      : 'Não foi possível conectar à Agenda API. Verifique a internet e o endereço do servidor.';
    throw new Error(text);
  } finally {
    clearTimeout(timer);
  }
  const raw = await response.text();
  let body: unknown = null;
  try { body = raw ? JSON.parse(raw) as unknown : null; } catch { body = null; }
  if (!response.ok) {
    const payloadMessage = body && typeof body === 'object'
      ? (body as { message?: unknown; error?: unknown }).message ?? (body as { error?: unknown }).error
      : null;
    const fallback = response.status === 401 ? 'E-mail ou senha inválidos, ou sessão expirada.'
      : response.status === 409 ? 'Este e-mail já foi cadastrado.'
        : response.status === 404 ? 'Servidor sem as rotas de autenticação. Atualize o backend antes de usar esta versão.'
          : `Não foi possível concluir a solicitação (HTTP ${response.status}).`;
    throw new AuthApiError(response.status, typeof payloadMessage === 'string' && payloadMessage.length < 250 ? payloadMessage : fallback);
  }
  return body;
}

function isUser(data: unknown): data is SynapseUser {
  return !!data && typeof data === 'object' &&
    typeof (data as SynapseUser).id === 'string' &&
    typeof (data as SynapseUser).name === 'string' &&
    typeof (data as SynapseUser).email === 'string';
}

export async function loginOnApi(email: string, password: string): Promise<AuthLoginResponse> {
  const data = await authRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!data || typeof data !== 'object') throw new Error('Resposta de autenticação inválida.');
  const result = data as Partial<AuthLoginResponse>;
  if (result.tokenType !== 'Bearer' || typeof result.accessToken !== 'string' ||
    !result.accessToken || typeof result.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(result.expiresAt)) || !isUser(result.user)) {
    throw new Error('O backend retornou um contrato de login inesperado.');
  }
  if (Date.parse(result.expiresAt) <= Date.now()) throw new Error('O backend retornou uma sessão já expirada.');
  return result as AuthLoginResponse;
}

export async function registerOnApi(name: string, email: string, password: string): Promise<void> {
  await authRequest('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
  });
}

export async function currentUserOnApi(token: string): Promise<SynapseUser> {
  try {
    const body = await authRequest('/auth/me', {
      method: 'GET', headers: { Authorization: `Bearer ${token}` },
    });
    if (!isUser(body)) throw new Error('Dados da conta inválidos.');
    return body;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) expireSessionIfCurrent(token);
    throw error;
  }
}

export async function logoutOnApi(token: string): Promise<void> {
  await authRequest('/auth/logout', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
}
