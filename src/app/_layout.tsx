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
import { AuthSessionProvider, useAuthSession } from '@/context/auth-session';
import { AuthScreen } from '@/components/auth-screen';
import { ActivityIndicator, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

function ProtectedApp() {
  const { user, initializing } = useAuthSession();
  const { settings } = useAppSettings();
  const palette = getAppPalette(settings);
  if (initializing) return (
    <View style={{ flex: 1, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={palette.accent} />
    </View>
  );
  if (!user) return <AuthScreen />;
  // Desmontar composer, histórico e estado temporário quando a conta é encerrada.
  return <ReminderSessionProvider key={user.id}><AppTabs /></ReminderSessionProvider>;
}

function AppShell() {
  const { settings } = useAppSettings();
  const palette = getAppPalette(settings);
  const baseTheme = settings.theme === 'dark' ? DarkTheme : DefaultTheme;
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
    document.documentElement.style.colorScheme = settings.theme;
    document.body.style.backgroundColor = palette.background;
    document.documentElement.style.setProperty('--synapse-surface', palette.surface);
    document.documentElement.style.setProperty('--synapse-text', palette.text);
  }, [palette.background, palette.surface, palette.text, settings.theme]);

  return (
    <ThemeProvider value={activeTheme}>
      <StatusBar style={settings.theme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <ProtectedApp />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppSettingsProvider>
      <AuthSessionProvider><AppShell /></AuthSessionProvider>
    </AppSettingsProvider>
  );
}
