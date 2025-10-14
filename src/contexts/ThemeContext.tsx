import { createContext, useEffect, useMemo, type ReactNode } from 'react';

type Theme = 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDarkModeAvailable: boolean;
  effectiveTheme: Theme;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme: Theme = 'dark';
  const effectiveTheme: Theme = 'dark';
  const isDarkModeAvailable = true;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.add('dark');
  }, []);

  const setTheme = () => {
    // no-op: single dark theme
  };

  const toggleTheme = () => {
    // no-op: single dark theme
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDarkModeAvailable,
      effectiveTheme
    }),
    [theme, isDarkModeAvailable, effectiveTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
