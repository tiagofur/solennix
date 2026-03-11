import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FormInput from '../FormInput';
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

describe('FormInput', () => {
  it('renders correctly with label', () => {
    const { getByText, getByPlaceholderText } = renderWithTheme(
        <FormInput label="Email" placeholder="Enter your email" />
    );
    expect(getByText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
  });

  it('displays error message when provided', () => {
    const { getByText } = renderWithTheme(
        <FormInput label="Password" error="Password is too short" />
    );
    expect(getByText('Password is too short')).toBeTruthy();
  });

  it('renders icon and rightElement when provided', () => {
    const { getByTestId } = renderWithTheme(
        <FormInput 
            label="Search" 
            icon={<Text testID="left-icon">🔍</Text>} 
            rightElement={<Text testID="right-icon">➡️</Text>} 
        />
    );
    expect(getByTestId('left-icon')).toBeTruthy();
    expect(getByTestId('right-icon')).toBeTruthy();
  });

  it('handles value changes from user input', () => {
    const onChangeTextMock = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
        <FormInput label="Name" placeholder="Name" onChangeText={onChangeTextMock} />
    );
    
    const input = getByPlaceholderText('Name');
    fireEvent.changeText(input, 'John Doe');
    
    expect(onChangeTextMock).toHaveBeenCalledWith('John Doe');
  });

  // Verify ref works (it's forwarded)
  it('forwards ref to TextInput', () => {
    const ref = React.createRef<any>();
    renderWithTheme(<FormInput label="Ref Test" ref={ref} />);
    
    // TextInput from React Native has `isFocused` method, verifying it's standard RNTextInput
    expect(ref.current).toBeDefined();
    expect(typeof ref.current.isFocused).toBe('function');
  });
});
