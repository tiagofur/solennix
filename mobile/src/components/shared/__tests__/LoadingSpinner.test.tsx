import React from 'react';
import { render } from '@testing-library/react-native';
import LoadingSpinner from '../LoadingSpinner';
import { ThemeContext } from '../../../hooks/useTheme';

describe('LoadingSpinner', () => {
  it('renders correctly', () => {
    const mockThemeContext = { 
        isDark: false, 
        toggleTheme: jest.fn(), 
        theme: 'light' as const,
        preference: 'light' as const,
        loaded: true
    };
    const { getByTestId } = render(
      <ThemeContext.Provider value={mockThemeContext}>
        <LoadingSpinner testID="loading-spinner" />
      </ThemeContext.Provider>
    );
    const spinner = getByTestId('loading-spinner');
    expect(spinner).toBeTruthy();
  });
});
