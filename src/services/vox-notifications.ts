import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { VoxInterpretation } from './vox-api';
import { createNotificationQueue, scheduleForSession } from './notification-queue';

const operations = createNotificationQueue();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type LocalReminderResult = 'scheduled' | 'missing-date' | 'past-date' | 'permission-denied' | 'unsupported-platform' | 'session-ended';

/** Schedules an on-device notification when the interpretation contains a future date and time. */
export async function scheduleLocalReminder(
  reminder: VoxInterpretation,
  sessionIsCurrent: () => boolean,
): Promise<LocalReminderResult> {
  return operations.run<LocalReminderResult>(sessionIsCurrent, async (isCurrent) => {
    if (!reminder.date || !reminder.time) return 'missing-date';

    const [year, month, day] = reminder.date.split('-').map(Number);
    const [hour, minute] = reminder.time.split(':').map(Number);
    const triggerDate = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (
      !Number.isFinite(triggerDate.getTime()) ||
      triggerDate.getFullYear() !== year ||
      triggerDate.getMonth() !== month - 1 ||
      triggerDate.getDate() !== day ||
      triggerDate.getHours() !== hour ||
      triggerDate.getMinutes() !== minute
    ) {
      throw new Error('A data ou o horário retornado pela interpretação não é válido.');
    }

    if (triggerDate.getTime() <= Date.now()) return 'past-date';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vox-reminders', {
        name: 'Lembretes Synapse',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 250],
        sound: 'default',
      });
    }

    if (!isCurrent()) return 'session-ended';
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      if (!isCurrent()) return 'session-ended';
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (!isCurrent()) return 'session-ended';
    if (status !== 'granted') return 'permission-denied';

    const scheduled = await scheduleForSession(isCurrent, () => Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title || 'Lembrete Synapse',
        body: 'Está na hora do seu lembrete.',
        sound: 'default',
        data: { reminderId: reminder.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' ? { channelId: 'vox-reminders' } : {}),
      },
    }), Notifications.cancelScheduledNotificationAsync);
    return scheduled ? 'scheduled' : 'session-ended';
  }, 'session-ended');
}

/** Impede que alertas de uma conta continuem aparecendo após o logout. */
export async function clearScheduledReminders(): Promise<void> {
  return operations.clear(async () => {
    const results = await Promise.allSettled([
      Notifications.cancelAllScheduledNotificationsAsync(),
      Notifications.dismissAllNotificationsAsync(),
    ]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  });
}
