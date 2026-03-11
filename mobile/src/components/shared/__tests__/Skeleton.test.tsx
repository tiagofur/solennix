import React from 'react';
import { render } from '@testing-library/react-native';
import { SkeletonLine, SkeletonCircle, SkeletonCard, SkeletonList } from '../Skeleton';
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

// Mock `react-native-reanimated` for testing
jest.mock('react-native-reanimated', () => {
    const Reanimated = {
        default: { call: () => {} },
        useSharedValue: jest.fn(() => ({ value: 0 })),
        useAnimatedStyle: jest.fn((cb) => cb()),
        withRepeat: jest.fn((val) => val),
        withTiming: jest.fn((val) => val),
        interpolate: jest.fn(() => 0.5),
        View: require('react-native').View,
        Text: require('react-native').Text,
        Image: require('react-native').Image,
        ScrollView: require('react-native').ScrollView,
    };
    return Reanimated;
});

describe('Skeleton Components', () => {
  describe('SkeletonLine', () => {
    it('renders correctly with default props', () => {
      const { root } = renderWithTheme(<SkeletonLine testID="skeleton-line" />);
      expect(root).toBeTruthy();
    });
  });

  describe('SkeletonCircle', () => {
    it('renders correctly with size prop', () => {
      const { root } = renderWithTheme(<SkeletonCircle size={50} />);
      expect(root).toBeTruthy();
    });
  });

  describe('SkeletonCard', () => {
    it('renders with avatar when showAvatar is true', () => {
      const { root } = renderWithTheme(<SkeletonCard showAvatar={true} />);
      expect(root).toBeTruthy();
    });
    
    it('renders without avatar by default', () => {
      const { root } = renderWithTheme(<SkeletonCard />);
      expect(root).toBeTruthy();
    });
  });

  describe('SkeletonList', () => {
    it('renders multiple cards based on count prop', () => {
      const { getAllByTestId } = renderWithTheme(<SkeletonList count={3} />);
      
      const cards = getAllByTestId('skeleton-card');
      expect(cards.length).toBe(3);
    });
  });
});
