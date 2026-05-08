import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Paletas ─────────────────────────────────────────────────────────────────

/** KORA NOVA — fondo #121223, acentos #6C5CE7 / #FF6B8B / #A29BFE */
export const DARK_THEME = {
  isDark: true,
  bg: '#121223',
  surface: '#1A1A35',
  surface2: '#1E1E38',
  surfaceHigh: '#252548',
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.38)',
  textAccent: '#A29BFE',
  brandPurple: '#6C5CE7',
  brandPink: '#FF6B8B',
  border: 'rgba(162,155,254,0.22)',
  borderHigh: 'rgba(108,92,231,0.4)',
  tabBarBg: '#121223',
  tabBarBorder: 'rgba(108,92,231,0.2)',
  tabBarActive: '#FF6B8B',
  tabBarInactive: 'rgba(162,155,254,0.35)',
  inputBg: '#1E1E38',
  iconBg: 'rgba(108,92,231,0.14)',
  badgeLockOpacity: 0.38,
};

export const LIGHT_THEME = {
  isDark: false,
  bg: '#F2F0FA',
  surface: '#FFFFFF',
  surface2: '#EDE9FC',
  surfaceHigh: '#E5E0F8',
  text: '#121223',
  textSub: 'rgba(18,18,35,0.62)',
  textMuted: 'rgba(18,18,35,0.38)',
  textAccent: '#6C5CE7',
  brandPurple: '#6C5CE7',
  brandPink: '#FF6B8B',
  border: 'rgba(108,92,231,0.15)',
  borderHigh: 'rgba(108,92,231,0.3)',
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(108,92,231,0.12)',
  tabBarActive: '#6C5CE7',
  tabBarInactive: 'rgba(108,92,231,0.32)',
  inputBg: '#FFFFFF',
  iconBg: 'rgba(108,92,231,0.08)',
  badgeLockOpacity: 0.45,
};

export type Theme = typeof DARK_THEME;

// ─── Context ─────────────────────────────────────────────────────────────────

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DARK_THEME,
  isDark: true,
  toggleTheme: () => {},
});

const STORAGE_KEY = 'kora_theme';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  /** Valor inicial oscuro hasta leer AsyncStorage (evita parpadeo “solo claro”) */
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'light') setIsDark(false);
        else if (val === 'dark') setIsDark(true);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
