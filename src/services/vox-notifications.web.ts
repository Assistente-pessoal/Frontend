import type { VoxInterpretation } from './vox-api';

export type LocalReminderResult =
  | 'scheduled'
  | 'missing-date'
  | 'past-date'
  | 'permission-denied'
  | 'unsupported-platform'
  | 'session-ended';

/** Local native notifications are not available on web; keep browser/API tests usable. */
export async function scheduleLocalReminder(
  _reminder: VoxInterpretation,
  sessionIsCurrent: () => boolean,
): Promise<LocalReminderResult> {
  return sessionIsCurrent() ? 'unsupported-platform' : 'session-ended';
}

/** Web não mantém os agendamentos locais do expo-notifications. */
export async function clearScheduledReminders(): Promise<void> {}
