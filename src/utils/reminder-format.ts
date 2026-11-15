import type { ApiReminder, ReminderPriority } from '@/services/reminders-api';

const PRIORITY_LABELS: Record<ReminderPriority, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

export function priorityLabel(priority: ReminderPriority): string {
  return PRIORITY_LABELS[priority];
}

/** Formata o instante no fuso do aparelho, sem depender de Intl (varia entre plataformas). */
export function formatRemindAt(iso: string | null): string {
  if (!iso) return 'Sem data definida';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sem data definida';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} às ${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function isOverdue(iso: string | null, now: number = Date.now()): boolean {
  if (!iso) return false;
  const time = Date.parse(iso);
  return !Number.isNaN(time) && time < now;
}

/** Com data primeiro (mais próxima antes); sem data depois, do mais novo para o mais antigo. */
export function sortReminders(list: ApiReminder[]): ApiReminder[] {
  return [...list].sort((a, b) => {
    if (a.remindAt && b.remindAt) return Date.parse(a.remindAt) - Date.parse(b.remindAt);
    if (a.remindAt) return -1;
    if (b.remindAt) return 1;
    return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  });
}