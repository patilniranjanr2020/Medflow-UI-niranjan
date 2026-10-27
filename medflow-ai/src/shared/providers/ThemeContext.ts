import { createContext, useContext } from 'react';
import type { AppThemePalette, ThemeMode } from '../../core/theme/theme';

export const THEME_STORAGE_KEY = 'medflow_theme';

export type { ThemeMode };

export interface ThemeContextValue {
  mode: ThemeMode;
  theme: AppThemePalette;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // Return fallback if localStorage is blocked
  }
  return 'light';
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
