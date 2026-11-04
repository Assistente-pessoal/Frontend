import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppSettingsProvider, useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';
import { ReminderSessionProvider } from '@/context/reminder-session';
import { AuthSessionProvider, useAuthSession } from '@/context/auth-session';
import { AuthScreen } from '@/components/auth-screen';

SplashScreen.preventAutoHideAsync();

function ProtectedApp() {
  const { user, initializing } = useAuthSession();
  const { settings } = useAppSettings();
  const palette = getAppPalette(settings);
  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background }}>
        <ActivityIndicator size="large" color={palette.accent} accessibilityLabel="Verificando sessão" />
      </View>
    );
  }
  if (!user) return <AuthScreen />;
  // Desmonta composer e estado temporário ao mudar de conta.
  return <ReminderSessionProvider key={user.id}><AppTabs /></ReminderSessionProvider>;
}

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
