import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAppTheme, type AppThemePalette, type ThemeMode } from '../../core/theme/theme';
import {
  ThemeContext,
  getInitialThemeMode,
  THEME_STORAGE_KEY,
  type ThemeContextValue,
} from './ThemeContext';

export {
  ThemeContext,
  useTheme,
  THEME_STORAGE_KEY,
  getInitialThemeMode,
  type ThemeContextValue,
  type ThemeMode,
} from './ThemeContext';

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => defaultMode ?? getInitialThemeMode());
  const theme = useMemo<AppThemePalette>(() => getAppTheme(mode), [mode]);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage access blocked or unavailable
    }
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      theme,
      setMode,
      toggleTheme,
    }),
    [mode, theme, setMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        className="mf-theme-root"
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--mf-bg)',
          color: 'var(--mf-ink-900)',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
