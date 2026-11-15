import { API_BASE_URL, API_TIMEOUT_MS, connectionHint } from './api-config';
import { expireSessionIfCurrent, getAccessToken } from './auth-token';
import { HttpTransportError, requestJson } from './http-client';
import { VoxApiHttpError } from './vox-api';
import { apiErrorMessage } from '@/utils/api-errors';

export type ReminderPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReminderRecurrence = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ReminderStatus = 'ACTIVE' | 'COMPLETED' | 'LOST';

export type ApiReminder = {
  id: string;
  title: string;
  description: string | null;
  remindAt: string | null;
  priority: ReminderPriority;
  recurrence: ReminderRecurrence;
  status: ReminderStatus;
  categoryIds: string[];
  createdAt: string;
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parseReminder(value: unknown): ApiReminder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string') return null;
  return {
    id: r.id,
    title: r.title,
    description: typeof r.description === 'string' ? r.description : null,
    remindAt: typeof r.remindAt === 'string' ? r.remindAt : null,
    priority: pick(r.priority, ['LOW', 'MEDIUM', 'HIGH'] as const, 'MEDIUM'),
    recurrence: pick(r.recurrence, ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const, 'ONCE'),
    status: pick(r.status, ['ACTIVE', 'COMPLETED', 'LOST'] as const, 'ACTIVE'),
    categoryIds: Array.isArray(r.categoryIds)
      ? r.categoryIds.filter((id): id is string => typeof id === 'string')
      : [],
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : '',
  };
}

export async function listReminders(
  status: ReminderStatus = 'ACTIVE',
  options: { signal?: AbortSignal } = {},
): Promise<ApiReminder[]> {
  const token = getAccessToken();
  if (!token) throw new VoxApiHttpError(401, 'Entre na sua conta para ver seus lembretes.');

  let result: Awaited<ReturnType<typeof requestJson>>;
  try {
    result = await requestJson(
      `${API_BASE_URL}/reminders?status=${status}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        signal: options.signal,
      },
      { timeoutMs: API_TIMEOUT_MS },
    );
  } catch (error) {
    if (error instanceof HttpTransportError && error.kind === 'cancelled') throw error;
    if (error instanceof HttpTransportError && error.kind === 'timeout') {
      throw new Error(`A Agenda API não respondeu a tempo (${API_BASE_URL}).`);
    }
    throw new Error(`Não foi possível conectar à Agenda API (${API_BASE_URL}). ${connectionHint()}`);
  }

  const { response, payload } = result;
  if (response.status === 401) {
    expireSessionIfCurrent(token);
    throw new VoxApiHttpError(401, 'Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok) {
    throw new VoxApiHttpError(
      response.status,
      apiErrorMessage(payload, `A Agenda API respondeu com HTTP ${response.status}.`),
    );
  }
  if (!Array.isArray(payload)) {
    throw new Error('A Agenda API respondeu, mas o formato da lista é inválido.');
  }
  return payload.map(parseReminder).filter((r): r is ApiReminder => r !== null);
}