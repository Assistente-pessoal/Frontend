import type { VoxInterpretation } from './vox-api';

export type LocalReminderResult =
  | 'scheduled'
  | 'missing-date'
  | 'past-date'
  | 'permission-denied'
  | 'unsupported-platform';

/** Local native notifications are not available on web; keep browser/API tests usable. */
export async function scheduleLocalReminder(
  _reminder: VoxInterpretation,
): Promise<LocalReminderResult> {
  return 'unsupported-platform';
}

/** Web não mantém os agendamentos locais do expo-notifications. */
export async function clearScheduledReminders(): Promise<void> {}
