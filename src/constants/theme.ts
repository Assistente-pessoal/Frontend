/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#212421',
    background: '#F7F8F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7F0EB',
    textSecondary: '#747A72',
    tint: '#245B46',
  },
  dark: {
    text: '#F5F5F5',
    background: '#000000',
    backgroundElement: '#101010',
    backgroundSelected: '#1B1B1B',
    textSecondary: '#B6B6B6',
    tint: '#B9DCC7',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-rounded',
    mono: 'monospace',
  },
  web: {
    sans: 'system-ui',
    serif: 'Georgia, "Times New Roman", serif',
    rounded: 'Trebuchet MS, Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-rounded',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
