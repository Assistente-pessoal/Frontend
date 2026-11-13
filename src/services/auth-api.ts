import { API_BASE_URL, API_TIMEOUT_MS, connectionHint } from './api-config';
import { expireSessionIfCurrent } from './auth-token';
import { HttpTransportError, requestJson } from './http-client';
import { apiErrorMessage } from '@/utils/api-errors';
import { isSynapseUser, parseLoginResponse, type AuthLoginResponse, type SynapseUser } from '@/utils/auth-contract';

export type { AuthLoginResponse, SynapseUser };

export class AuthApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function authRequest(path: string, init: RequestInit, unauthorizedMessage?: string): Promise<unknown> {
  let response: Response;
  let body: unknown;
  try {
    ({ response, payload: body } = await requestJson(`${API_BASE_URL}${path}`, init, { timeoutMs: API_TIMEOUT_MS }));
  } catch (error) {
    if (error instanceof HttpTransportError && error.kind === 'timeout') {
      throw new Error(`A Agenda API demorou mais de 75 segundos para responder (${API_BASE_URL}).`);
    }
    if (error instanceof HttpTransportError && error.kind === 'cancelled') throw error;
    throw new Error(`Não foi possível conectar à Agenda API (${API_BASE_URL}). ${connectionHint()}`);
  }
  if (!response.ok) {
    const fallback = response.status === 401 ? unauthorizedMessage ?? 'E-mail ou senha inválidos, ou sessão expirada.'
      : response.status === 409 ? 'Este e-mail já foi cadastrado.'
        : response.status === 404 ? 'O serviço de autenticação não está disponível neste servidor. Verifique o endereço da API.'
          : `Não foi possível concluir a solicitação (HTTP ${response.status}).`;
    throw new AuthApiError(response.status, apiErrorMessage(body, fallback));
  }
  return body;
}

export async function loginOnApi(email: string, password: string): Promise<AuthLoginResponse> {
  const data = await authRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return parseLoginResponse(data);
}

export async function loginWithGoogleOnApi(idToken: string): Promise<AuthLoginResponse> {
  const data = await authRequest('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  }, 'Não foi possível validar sua conta Google. Tente novamente.');
  return parseLoginResponse(data);
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
    if (!isSynapseUser(body)) throw new Error('Dados da conta inválidos.');
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
