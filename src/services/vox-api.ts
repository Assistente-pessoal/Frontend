import { Platform } from 'react-native';
import { expireSessionIfCurrent, getAccessToken } from './auth-token';

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

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredUrlIsAndroidEmulatorAlias = /^https?:\/\/10\.0\.2\.2(?::|\/|$)/i.test(configuredApiUrl || '');
// Use o mesmo endpoint publicado configurado originalmente no eas.json.
// EXPO_PUBLIC_API_URL continua disponível para sobrescrever o destino em desenvolvimento local.
const DEFAULT_VOX_API_URL = 'https://vox-backend-latest.onrender.com';
const platformConfiguredUrl =
  Platform.OS !== 'android' && configuredUrlIsAndroidEmulatorAlias ? undefined : configuredApiUrl;

/**
 * Por padrão, o app se conecta à Agenda API publicada, sem exigir um .env.
 * Para testar um backend local, defina EXPO_PUBLIC_API_URL no arquivo .env.
 */
export const VOX_API_BASE_URL = (platformConfiguredUrl || DEFAULT_VOX_API_URL).replace(/\/+$/, '');

// Render pode demorar a retomar a instância em repouso; não classificar como offline após 20 s.
const API_TIMEOUT_MS = 75_000;

/** HTTP veio do servidor: a conexão existe, embora a operação possa ter falhado. */
export class VoxApiHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'VoxApiHttpError';
  }
}

type ApiPayload = Record<string, unknown> | string | null;

async function readPayload(response: Response): Promise<ApiPayload> {
  const rawBody = await response.text();
  if (!rawBody) return null;

  try {
    const parsed: unknown = JSON.parse(rawBody);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return rawBody;
  }
}

function payloadMessage(payload: ApiPayload): string | undefined {
  if (typeof payload === 'string') return payload.slice(0, 500);
  if (!payload || typeof payload !== 'object') return undefined;

  for (const key of ['message', 'detail', 'error', 'title']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function httpErrorMessage(status: number, payload: ApiPayload): string {
  const serverMessage = payloadMessage(payload);
  if (status === 401 || status === 403) {
    return serverMessage || 'A API recusou a requisição (401/403). Confira a configuração de segurança do backend.';
  }
  if (status === 404) {
    return serverMessage || 'A rota /api/vox/transcriptions não foi encontrada. Confira se a versão publicada da Agenda API contém o endpoint VOX.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return serverMessage || 'A API respondeu, mas o serviço de interpretação pode estar indisponível. Tente novamente ou verifique os logs do backend.';
  }
  return serverMessage || `A agenda-api respondeu com HTTP ${status}.`;
}

async function requestApi(path: string, init: RequestInit = {}): Promise<{ response: Response; payload: ApiPayload }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${VOX_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    const payload = await readPayload(response);
    return { response, payload };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`A agenda-api não respondeu em ${API_TIMEOUT_MS / 1000} segundos (${VOX_API_BASE_URL}).`);
    }

    const environmentHint = VOX_API_BASE_URL.startsWith('https://')
      ? 'Confira sua conexão com a internet, a disponibilidade do serviço hospedado e a política CORS do backend.'
      : Platform.OS === 'android'
        ? 'No emulador Android use http://10.0.2.2:8080; em celular físico use o IPv4 do computador.'
        : 'No navegador do mesmo computador, use http://localhost:8080 no arquivo .env.';

    throw new Error(
      `Não foi possível alcançar a Agenda API em ${VOX_API_BASE_URL}. ${environmentHint} Detalhe: ${detail}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkVoxApiHealth(): Promise<void> {
  const { response, payload } = await requestApi('/api/vox/health', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new VoxApiHttpError(response.status, httpErrorMessage(response.status, payload));
}

export async function createVoxReminder(text: string): Promise<VoxInterpretation> {
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
  });

  if (response.status === 401) {
    expireSessionIfCurrent(token);
    throw new VoxApiHttpError(401, 'Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok) throw new VoxApiHttpError(response.status, httpErrorMessage(response.status, payload));

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof payload.id !== 'string' ||
    typeof payload.title !== 'string'
  ) {
    throw new Error(
      'A agenda-api respondeu, mas o formato recebido é inválido. Confira se o backend e o frontend usam a mesma versão do contrato do Synapse.',
    );
  }

  return {
    id: payload.id,
    text: typeof payload.text === 'string' ? payload.text : cleanText,
    title: payload.title,
    date: typeof payload.date === 'string' ? payload.date : null,
    time: typeof payload.time === 'string' ? payload.time : null,
    domain: typeof payload.domain === 'string' ? payload.domain : 'pessoal',
    priority: typeof payload.priority === 'string' ? payload.priority : 'média',
    message: typeof payload.message === 'string' ? payload.message : undefined,
  };
}
