import { useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'app_theme';

export function useTheme() {
    const systemScheme = useColorScheme();
    const [preference, setPreference] = useState<Theme>('system');
    const [loaded, setLoaded] = useState(false);

    // Load saved preference on mount
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

    return {
        theme: resolvedTheme,
        preference,
        toggleTheme,
        isDark: resolvedTheme === 'dark',
        loaded,
    };
}
