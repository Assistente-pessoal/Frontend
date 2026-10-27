import type { AppAccent, AppSettings, AppTheme } from '@/context/app-settings';

export type AppPalette = {
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  muted: string;
  outline: string;
  accent: string;
  onAccent: string;
  accentContainer: string;
  onAccentContainer: string;
  accentSoft: string;
  accentBorder: string;
};

type AccentPair = {
  light: { accent: string; onAccent: string; container: string; onContainer: string; soft: string; border: string };
  dark: { accent: string; onAccent: string; container: string; onContainer: string; soft: string; border: string };
};

const accents: Record<AppAccent, AccentPair> = {
  green: {
    light: { accent: '#245B46', onAccent: '#FFFFFF', container: '#DCEBE0', onContainer: '#173D2E', soft: '#EAF3ED', border: '#B8D3C1' },
    dark: { accent: '#B9DCC7', onAccent: '#10271B', container: '#294737', onContainer: '#DDF2E3', soft: '#22382B', border: '#476C56' },
  },
  turquoise: {
    light: { accent: '#006B70', onAccent: '#FFFFFF', container: '#BDECEF', onContainer: '#003F43', soft: '#E4F7F7', border: '#9CD9DC' },
    dark: { accent: '#82DDE0', onAccent: '#003638', container: '#16474A', onContainer: '#BDECEF', soft: '#19383A', border: '#39777B' },
  },
  purple: {
    light: { accent: '#6750A4', onAccent: '#FFFFFF', container: '#E9DDFF', onContainer: '#311B69', soft: '#F3EDFF', border: '#CDBBEF' },
    dark: { accent: '#D0BCFF', onAccent: '#24104F', container: '#49366F', onContainer: '#E9DDFF', soft: '#302447', border: '#716095' },
  },
  beige: {
    light: { accent: '#73552F', onAccent: '#FFFFFF', container: '#F1E2C7', onContainer: '#3E2B13', soft: '#FAF3E7', border: '#DEC69F' },
    dark: { accent: '#E5C99E', onAccent: '#3D2A12', container: '#51402A', onContainer: '#F1E2C7', soft: '#382F22', border: '#806A49' },
  },
  monochrome: {
    light: { accent: '#454B4D', onAccent: '#FFFFFF', container: '#E1E5E6', onContainer: '#1B2022', soft: '#F0F2F2', border: '#C5CBCC' },
    dark: { accent: '#D6DCDE', onAccent: '#202526', container: '#3C4446', onContainer: '#E1E5E6', soft: '#292F30', border: '#697477' },
  },
};

export function getAppPalette(settings: Pick<AppSettings, 'theme' | 'accent' | 'highContrast'> | { theme: AppTheme; accent: AppAccent; highContrast?: boolean }): AppPalette {
  const isDark = settings.theme === 'dark';
  const contrast = settings.highContrast === true;
  const pair = accents[settings.accent] ?? accents.green;
  const selected = isDark ? pair.dark : pair.light;

  return {
    background: contrast ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#151715' : '#F7F8F5'),
    surface: contrast ? (isDark ? '#080808' : '#FFFFFF') : (isDark ? '#202620' : '#FFFFFF'),
    surfaceVariant: contrast ? (isDark ? '#171717' : '#F0F0F0') : (isDark ? '#252D27' : '#F0F3EF'),
    text: contrast ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#F0F4F0' : '#212421'),
    muted: contrast ? (isDark ? '#EEEEEE' : '#111111') : (isDark ? '#B7C1B9' : '#68716A'),
    outline: contrast ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#455149' : '#DCE2DC'),
    accent: selected.accent,
    onAccent: selected.onAccent,
    accentContainer: selected.container,
    onAccentContainer: selected.onContainer,
    accentSoft: selected.soft,
    accentBorder: contrast ? (isDark ? '#FFFFFF' : '#000000') : selected.border,
  };
}

export const AccentOptions: { value: AppAccent; label: string; description: string; swatches: [string, string, string] }[] = [
  { value: 'green', label: 'Verde', description: 'Natural e equilibrado', swatches: ['#245B46', '#74A98C', '#DCEBE0'] },
  { value: 'turquoise', label: 'Turquesa', description: 'Fresco e vibrante', swatches: ['#006B70', '#38AEB3', '#BDECEF'] },
  { value: 'purple', label: 'Roxo', description: 'Expressivo e criativo', swatches: ['#6750A4', '#9A82CF', '#E9DDFF'] },
  { value: 'beige', label: 'Bege', description: 'Quente e discreto', swatches: ['#73552F', '#B58B55', '#F1E2C7'] },
  { value: 'monochrome', label: 'Neutro', description: 'Branco, preto e cinza', swatches: ['#17191A', '#858B8D', '#FFFFFF'] },
];
