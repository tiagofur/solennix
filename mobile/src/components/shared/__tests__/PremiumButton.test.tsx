import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumButton } from '../PremiumButton';
import { ThemeContext } from '../../../hooks/useTheme';
import { Text } from 'react-native';

const mockThemeContext = { 
    isDark: false, 
    toggleTheme: jest.fn(), 
    theme: 'light' as const,
    preference: 'light' as const,
    loaded: true
};

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeContext.Provider value={mockThemeContext}>
      {ui}
    </ThemeContext.Provider>
  );
};

describe('PremiumButton', () => {
  it('renders correctly with primary variant and label', () => {
    const { getByText } = renderWithTheme(<PremiumButton label="Click Me" variant="primary" />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('renders correctly with secondary variant and label', () => {
    const { getByText } = renderWithTheme(<PremiumButton label="Cancel" variant="secondary" />);
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('renders loading state text instead of label', () => {
    const { getByText, queryByText } = renderWithTheme(<PremiumButton label="Submit" loading={true} />);
    expect(getByText('Cargando...')).toBeTruthy();
    expect(queryByText('Submit')).toBeNull();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithTheme(<PremiumButton label="Press" onPress={onPressMock} />);
    const buttonElement = getByText('Press');
    
    fireEvent.press(buttonElement);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithTheme(<PremiumButton label="Disabled" onPress={onPressMock} disabled={true} />);
    const buttonElement = getByText('Disabled');
    
    fireEvent.press(buttonElement);
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPressMock = jest.fn();
    const { getByText } = renderWithTheme(<PremiumButton label="Loading" onPress={onPressMock} loading={true} />);
    const buttonElement = getByText('Cargando...');
    
    fireEvent.press(buttonElement);
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders icon when provided', () => {
    const { getByTestId } = renderWithTheme(
        <PremiumButton label="With Icon" icon={<Text testID="test-icon">icon</Text>} />
    );
    expect(getByTestId('test-icon')).toBeTruthy();
  });
});
