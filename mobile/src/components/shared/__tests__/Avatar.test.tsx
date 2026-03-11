import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar } from '../Avatar';
import { ThemeContext } from '../../../hooks/useTheme';

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

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View testID="expo-image" {...props} />
  };
});

describe('Avatar', () => {
  it('renders initials when no photoUrl is provided', () => {
    const { getByText } = renderWithTheme(<Avatar name="John Doe" />);
    expect(getByText('JD')).toBeTruthy();
  });

  it('renders single initial when only first name is provided', () => {
    const { getByText } = renderWithTheme(<Avatar name="Alice" />);
    expect(getByText('AL')).toBeTruthy();
  });

  it('renders initials properly with extra spaces', () => {
    const { getByText } = renderWithTheme(<Avatar name="  Bob   Smith  " />);
    expect(getByText('BS')).toBeTruthy();
  });

  it('renders an Image when photoUrl is provided', () => {
    const { getByTestId, queryByText } = renderWithTheme(<Avatar name="John Doe" photoUrl="https://example.com/photo.jpg" />);
    
    expect(getByTestId('expo-image')).toBeTruthy();
    expect(queryByText('JD')).toBeNull(); // Should not render initials
  });

  it('applies custom size correctly to initials avatar', () => {
    const size = 100;
    const { getByText, getByTestId } = renderWithTheme(<Avatar name="Large Avatar" size={size} />);
    
    expect(getByText('LA')).toBeTruthy();
    
    // Test that the container matches size constraints
    const container = getByTestId('avatar-container');
    expect(container.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: 100,
          height: 100,
          borderRadius: 50
        })
      ])
    );
  });
});
