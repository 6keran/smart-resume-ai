'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: string;
  resolvedTheme: 'light' | 'dark';
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: string) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<string>('light');

  const applyThemeToDom = useCallback((targetTheme: string) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    const isDark = targetTheme === 'dark';

    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
    if (body) {
      body.classList.toggle('dark', isDark);
      body.classList.toggle('light', !isDark);
      body.setAttribute('data-theme', isDark ? 'dark' : 'light');
      body.style.colorScheme = isDark ? 'dark' : 'light';
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    applyThemeToDom(theme);
  }, [applyThemeToDom, theme]);

  const setTheme = useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      applyThemeToDom(newTheme);
    },
    [applyThemeToDom]
  );

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  const isDark = theme === 'dark';

  const value: ThemeContextType = {
    theme,
    resolvedTheme: (theme === 'dark' ? 'dark' : 'light'),
    isDark,
    toggleTheme,
    setTheme,
    mounted,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      resolvedTheme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
      mounted: true,
    };
  }
  return context;
}
