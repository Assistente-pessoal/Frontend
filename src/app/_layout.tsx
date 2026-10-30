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
  const { settings, resolvedTheme } = useAppSettings();
  const palette = getAppPalette(settings);
  const baseTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
  // Keep React Navigation surfaces in sync with the OLED palette.
  const activeTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.outline,
      primary: palette.accent,
    },
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = palette.background;
    document.documentElement.style.colorScheme = resolvedTheme;
    document.body.style.backgroundColor = palette.background;
    document.documentElement.style.setProperty('--synapse-surface', palette.surface);
    document.documentElement.style.setProperty('--synapse-text', palette.text);
  }, [palette.background, palette.surface, palette.text, resolvedTheme]);

  return (
    <ThemeProvider value={activeTheme}>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
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
