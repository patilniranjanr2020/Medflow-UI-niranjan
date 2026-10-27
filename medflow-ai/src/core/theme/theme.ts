export const appThemeTokens = {
  light: {
    background: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF2F9',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    primary: '#0F4C81',
    primarySoft: '#DBEAFE',
    amber: '#F59E0B',
    coral: '#DC2626',
    green: '#10B981',
  },
  dark: {
    background: '#0B1220',
    surface: '#111A2C',
    surfaceMuted: '#16223A',
    border: '#243247',
    text: '#F2F5F9',
    textMuted: '#94A3B8',
    primary: '#5B93E8',
    primarySoft: '#123A72',
    amber: '#F0C36B',
    coral: '#F09981',
    green: '#64C89A',
  },
} as const;

export interface AppThemePalette {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  amber: string;
  coral: string;
  green: string;
}

export type ThemeMode = 'light' | 'dark';

export function getAppTheme(mode: ThemeMode = 'light'): AppThemePalette {
  return mode === 'dark' ? appThemeTokens.dark : appThemeTokens.light;
}
