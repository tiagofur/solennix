import { useContext } from 'react';
import { ThemeContext } from '@/contexts/ThemeContextInstance';

export function useTheme() {
  const { theme, toggleTheme, isDark } = useContext(ThemeContext);

  return {
    theme,
    toggleTheme,
    isDark
  };
}