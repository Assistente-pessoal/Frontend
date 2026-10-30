import { Text as NativeText, Platform, StyleSheet } from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import { useAppSettings } from '@/context/app-settings';
import { getAppPalette } from '@/constants/app-palette';

const fontFamilies = Platform.select({
  web: { serif: 'Georgia, "Times New Roman", serif', rounded: 'Trebuchet MS, Arial, sans-serif' },
  android: { serif: 'serif', rounded: 'sans-serif-rounded' },
  ios: { serif: 'Georgia', rounded: 'Avenir Next' },
  default: { serif: 'serif', rounded: 'sans-serif' },
})!;

const darkTextColors: Record<string, string> = {
  '#212421': '#F0F4F0',
  '#747A72': '#AEB9B0',
  '#245B46': '#B9D2C4',
  '#596B5E': '#C2D0C5',
  '#92988F': '#A4AEA5',
  '#858C82': '#AAB5AB',
  '#9AA097': '#ABB5AC',
  '#315D43': '#C3DCC9',
  '#6F3438': '#F0C4C6',
  '#946445': '#E2B998',
};

function isWhite(color?: string) {
  if (!color) return false;
  const normalized = color.trim().toLowerCase();
  return normalized === '#fff' || normalized === '#ffffff' || normalized === 'white' || normalized === 'rgb(255, 255, 255)';
}

export function AppText({ style, ...props }: TextProps) {
  const { settings, resolvedTheme } = useAppSettings();
  const palette = getAppPalette(settings);
  const flattened = (StyleSheet.flatten(style) || {}) as TextStyle;
  const fontSize = typeof flattened.fontSize === 'number' ? flattened.fontSize * settings.fontScale : undefined;
  const lineHeight = typeof flattened.lineHeight === 'number' ? flattened.lineHeight * settings.fontScale : undefined;
  const family = settings.fontFamily === 'system' ? undefined : fontFamilies[settings.fontFamily];
  const originalColor = typeof flattened.color === 'string' ? flattened.color.toUpperCase() : undefined;
  const explicitAccentForeground = originalColor === palette.onAccent.toUpperCase()
    || originalColor === palette.onAccentContainer.toUpperCase();
  const accessibleColor = settings.highContrast
    ? (explicitAccentForeground || (originalColor && isWhite(originalColor)) ? flattened.color : palette.text)
    : resolvedTheme === 'dark' && originalColor
      ? darkTextColors[originalColor] || flattened.color
      : !flattened.color
        ? palette.text
        : undefined;

  return (
    <NativeText
      {...props}
      allowFontScaling={props.allowFontScaling ?? true}
      style={[
        style,
        family ? { fontFamily: family } : undefined,
        {
          ...(fontSize ? { fontSize } : {}),
          ...(lineHeight ? { lineHeight } : {}),
          ...(accessibleColor ? { color: accessibleColor } : {}),
        },
      ]}
    />
  );
}
