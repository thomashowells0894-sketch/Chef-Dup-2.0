import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors as DarkColors, LightColors as ThemeLightColors, Shadows as DarkShadows, LightShadows } from '../constants/theme';

const STORAGE_KEY = '@fueliq_theme_preference';

type ThemePreference = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  isDark: boolean;
  preference: ThemePreference;
  setTheme: (pref: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
  colors: typeof DarkColors | typeof ThemeLightColors;
  shadows: typeof DarkShadows | typeof LightShadows;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme: ColorSchemeName = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setPreference(saved as ThemePreference);
      } catch (e) {}
      setIsLoading(false);
    })();
  }, []);

  const setTheme = useCallback(async (pref: ThemePreference) => {
    setPreference(pref);
    await AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const isDark = useMemo<boolean>(() => {
    if (preference === 'system') return systemScheme !== 'light';
    return preference === 'dark';
  }, [preference, systemScheme]);

  const toggleTheme = useCallback(async () => {
    const next: ThemePreference = isDark ? 'light' : 'dark';
    await setTheme(next);
  }, [isDark, setTheme]);

  const colors = useMemo(() => {
    return isDark ? DarkColors : ThemeLightColors;
  }, [isDark]);

  const shadows = useMemo(() => {
    return isDark ? DarkShadows : LightShadows;
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(() => ({
    isDark,
    preference,
    setTheme,
    toggleTheme,
    isLoading,
    colors,
    shadows,
  }), [isDark, preference, setTheme, toggleTheme, isLoading, colors, shadows]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) return {
    isDark: true,
    preference: 'dark',
    setTheme: async () => {},
    toggleTheme: async () => {},
    isLoading: false,
    colors: DarkColors as any,
    shadows: DarkShadows as any,
  };
  return context;
}

// Re-export light colors for direct import where needed
export { ThemeLightColors as LightColors };
export type { ThemePreference, ThemeContextValue };
