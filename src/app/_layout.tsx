import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppSettingsProvider, useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';
import { ReminderSessionProvider } from '@/context/reminder-session';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { settings } = useAppSettings();
  const activeTheme = settings.theme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = getAppPalette(settings);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = palette.background;
    document.documentElement.style.colorScheme = settings.theme;
    document.body.style.backgroundColor = palette.background;
    document.documentElement.style.setProperty('--synapse-surface', palette.surface);
    document.documentElement.style.setProperty('--synapse-text', palette.text);
  }, [palette.background, palette.surface, palette.text, settings.theme]);

  return (
    <ThemeProvider value={activeTheme}>
      <StatusBar style={settings.theme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppSettingsProvider>
      <ReminderSessionProvider><AppShell /></ReminderSessionProvider>
    </AppSettingsProvider>
  );
}
