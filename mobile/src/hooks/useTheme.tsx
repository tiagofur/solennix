import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'app_theme';

interface ThemeContextValue {
    theme: 'light' | 'dark';
    preference: Theme;
    isDark: boolean;
    toggleTheme: () => void;
    loaded: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [preference, setPreference] = useState<Theme>('system');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        SecureStore.getItemAsync(THEME_KEY).then((saved) => {
            if (saved === 'light' || saved === 'dark' || saved === 'system') {
                setPreference(saved);
            }
            setLoaded(true);
        });
    }, []);

    const systemResolved = systemScheme === 'dark' ? 'dark' : 'light';
    const resolvedTheme: 'light' | 'dark' =
        preference === 'system' ? systemResolved : preference;

    const toggleTheme = useCallback(() => {
        const next: 'light' | 'dark' = resolvedTheme === 'light' ? 'dark' : 'light';
        setPreference(next);
        SecureStore.setItemAsync(THEME_KEY, next);
    }, [resolvedTheme]);

    return (
        <ThemeContext.Provider value={{
            theme: resolvedTheme,
            preference,
            isDark: resolvedTheme === 'dark',
            toggleTheme,
            loaded,
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
