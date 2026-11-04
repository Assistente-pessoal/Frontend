import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { readAppSettings, writeAppSettings } from '@/utils/settings-storage';

export type AppTheme = 'system' | 'light' | 'dark';
export type AppAccent = 'green' | 'turquoise' | 'purple' | 'beige' | 'monochrome';
export type AppFontFamily = 'system' | 'serif' | 'rounded';

export type AppSettings = {
  fontScale: number;
  theme: AppTheme;
  accent: AppAccent;
  fontFamily: AppFontFamily;
  highContrast: boolean;
  animationsEnabled: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  fontScale: 1,
  theme: 'system',
  // Neutral is the default accent; the light/dark appearance still follows the device.
  accent: 'monochrome',
  fontFamily: 'system',
  highContrast: false,
  animationsEnabled: true,
};

type SettingsContextValue = {
  settings: AppSettings;
  animationsEnabled: boolean;
  ready: boolean;
  resolvedTheme: 'light' | 'dark';
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
};

const AppSettingsContext = createContext<SettingsContextValue | null>(null);

type LegacySettings = Omit<Partial<AppSettings>, 'fontFamily'> & { fontFamily?: AppFontFamily | 'sans' };

function normalizeSettings(value: LegacySettings | null | undefined): AppSettings {
  const fontScale = typeof value?.fontScale === 'number' && Number.isFinite(value.fontScale)
    ? Math.min(1.5, Math.max(0.85, value.fontScale))
    : DEFAULT_SETTINGS.fontScale;

  const accents: AppAccent[] = ['green', 'turquoise', 'purple', 'beige', 'monochrome'];
  const savedAccent = value?.accent;
  const accent: AppAccent = accents.includes(savedAccent as AppAccent) ? savedAccent as AppAccent : DEFAULT_SETTINGS.accent;
  const fontFamily: AppFontFamily = value?.fontFamily === 'serif' || value?.fontFamily === 'rounded'
    ? value.fontFamily
    : 'system';

  return {
    fontScale,
    theme: value?.theme === 'dark' || value?.theme === 'light' ? value.theme : 'system',
    accent,
    fontFamily,
    highContrast: typeof value?.highContrast === 'boolean' ? value.highContrast : false,
    animationsEnabled: typeof value?.animationsEnabled === 'boolean'
      ? value.animationsEnabled
      : DEFAULT_SETTINGS.animationsEnabled,
  };
}

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const systemTheme = useColorScheme();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = settings.animationsEnabled && !reducedMotion;
  const resolvedTheme: 'light' | 'dark' = settings.theme === 'system'
    ? (systemTheme === 'dark' ? 'dark' : 'light')
    : settings.theme;

  useEffect(() => {
    let active = true;
    readAppSettings()
      .then((saved) => {
        if (active && saved) setSettings(normalizeSettings(saved as LegacySettings));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void writeAppSettings(settings).catch(() => undefined);
  }, [ready, settings]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...updates }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(
    () => ({ settings, animationsEnabled, ready, resolvedTheme, updateSettings, resetSettings }),
    [settings, animationsEnabled, ready, resolvedTheme, updateSettings, resetSettings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) throw new Error('useAppSettings deve ser usado dentro de AppSettingsProvider.');
  return context;
}
