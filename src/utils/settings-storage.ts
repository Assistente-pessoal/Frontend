import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { AppSettings } from '@/context/app-settings';
import { createAsyncQueue } from './async-queue';

const SETTINGS_FILE_NAME = 'synapse-settings.json';
const WEB_STORAGE_KEY = 'synapse-app-settings-v1';
const enqueueWrite = createAsyncQueue();

export async function readAppSettings(): Promise<Partial<AppSettings> | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(WEB_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Partial<AppSettings>) : null;
    }

    const baseDirectory = FileSystem.documentDirectory;
    if (!baseDirectory) return null;
    const fileUri = `${baseDirectory}${SETTINGS_FILE_NAME}`;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(fileUri)) as Partial<AppSettings>;
  } catch {
    return null;
  }
}

export async function writeAppSettings(settings: AppSettings): Promise<void> {
  const serialized = JSON.stringify(settings);
  return enqueueWrite(async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(WEB_STORAGE_KEY, serialized);
        return;
      }

      const baseDirectory = FileSystem.documentDirectory;
      if (!baseDirectory) return;
      await FileSystem.writeAsStringAsync(`${baseDirectory}${SETTINGS_FILE_NAME}`, serialized);
    } catch {
      // Prefer keeping the current in-memory setting over interrupting app interaction.
    }
  });
}
