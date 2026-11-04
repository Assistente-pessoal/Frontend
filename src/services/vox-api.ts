import { API_BASE_URL, API_TIMEOUT_MS, connectionHint } from './api-config';
import { expireSessionIfCurrent, getAccessToken } from './auth-token';
import { HttpTransportError, requestJson } from './http-client';
import { apiErrorMessage } from '@/utils/api-errors';

export type VoxInterpretation = {
  id: string;
  text: string;
  title: string;
  date: string | null;
  time: string | null;
  domain: string;
  priority: string;
  message?: string;
};

// Mantém o nome público utilizado pelas telas; a configuração é compartilhada com auth.
export const VOX_API_BASE_URL = API_BASE_URL;

/** HTTP veio do servidor: a conexão existe, embora a operação possa ter falhado. */
export class VoxApiHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'VoxApiHttpError';
  }
}

function httpErrorMessage(status: number, payload: unknown, path: string): string {
  let fallback = `A Agenda API respondeu com HTTP ${status}.`;
  if (status === 401 || status === 403) {
    fallback = 'A API recusou a requisição. Entre novamente ou confira as permissões da conta.';
  } else if (status === 404) {
    fallback = path === '/api/vox/health'
      ? 'A verificação de conexão não está disponível neste servidor. Confira o endereço da API.'
      : 'O serviço de lembretes não está disponível neste servidor. Confira o endereço da API.';
  } else if (status === 502 || status === 503 || status === 504) {
    fallback = 'A API respondeu, mas um serviço necessário está indisponível. Tente novamente mais tarde.';
  }
  return apiErrorMessage(payload, fallback);
}

async function requestApi(path: string, init: RequestInit = {}): Promise<{ response: Response; payload: unknown }> {
  try {
    return await requestJson(`${API_BASE_URL}${path}`, init, { timeoutMs: API_TIMEOUT_MS });
  } catch (error) {
    if (error instanceof HttpTransportError && error.kind === 'timeout') {
      throw new Error(`A Agenda API não respondeu em 75 segundos (${API_BASE_URL}).`);
    }
    if (error instanceof HttpTransportError && error.kind === 'cancelled') throw error;
    throw new Error(`Não foi possível conectar à Agenda API (${API_BASE_URL}). ${connectionHint()}`);
  }
}

export async function checkVoxApiHealth(options: { signal?: AbortSignal } = {}): Promise<void> {
  const { response, payload } = await requestApi('/api/vox/health', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  });

  if (!response.ok) throw new VoxApiHttpError(response.status, httpErrorMessage(response.status, payload, '/api/vox/health'));
}

export async function createVoxReminder(text: string, options: { signal?: AbortSignal } = {}): Promise<VoxInterpretation> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('Digite ou transcreva um lembrete antes de enviar.');
  if (cleanText.length > 2000) throw new Error('O lembrete deve ter no máximo 2.000 caracteres.');

  const token = getAccessToken();
  if (!token) throw new VoxApiHttpError(401, 'Entre na sua conta para salvar lembretes.');

  const { response, payload } = await requestApi('/api/vox/transcriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // Only the reviewed text is sent; audio remains on the device.
    body: JSON.stringify({ text: cleanText }),
    signal: options.signal,
  });

  if (response.status === 401) {
    expireSessionIfCurrent(token);
    throw new VoxApiHttpError(401, 'Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok) throw new VoxApiHttpError(response.status, httpErrorMessage(response.status, payload, '/api/vox/transcriptions'));

  if (
    !payload || typeof payload !== 'object' || Array.isArray(payload) ||
    !('id' in payload) || typeof payload.id !== 'string' || !payload.id ||
    !('title' in payload) || typeof payload.title !== 'string' || !payload.title.trim()
  ) {
    throw new Error(
      'A agenda-api respondeu, mas o formato recebido é inválido. Confira se o backend e o frontend usam a mesma versão do contrato do Synapse.',
    );
  }

  const fields = payload as Record<string, unknown>;

  return {
    id: payload.id,
    text: typeof fields.text === 'string' ? fields.text : cleanText,
    title: payload.title,
    date: typeof fields.date === 'string' ? fields.date : null,
    time: typeof fields.time === 'string' ? fields.time : null,
    domain: typeof fields.domain === 'string' && fields.domain.trim() ? fields.domain : 'pessoal',
    priority: typeof fields.priority === 'string' && fields.priority.trim() ? fields.priority : 'média',
    message: typeof fields.message === 'string' ? fields.message : undefined,
  };
}
