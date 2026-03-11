import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SortSelector } from '../SortSelector';
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

// Mock Lucide icons
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    ArrowUpDown: () => <View testID="icon-arrow-up-down" />,
    ChevronDown: () => <View testID="icon-chevron-down" />,
    ArrowUp: () => <View testID="icon-arrow-up" />,
    ArrowDown: () => <View testID="icon-arrow-down" />,
  };
});

// Mock AppBottomSheet because testing portals in React Native test renderer can be tricky
jest.mock('../AppBottomSheet', () => {
  const { View } = require('react-native');
  return {
    AppBottomSheet: ({ children, visible, testID = 'bottom-sheet' }: any) => {
      // the sheet's content is conditionally rendered based on visible prop
      if (!visible) return null;
      return <View testID={testID}>{children}</View>;
    }
  };
});

describe('SortSelector', () => {
  const mockOptions = [
    { key: 'date', label: 'Date' },
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' }
  ];

  it('renders correctly with current selected option label', () => {
    const { getByText } = renderWithTheme(
      <SortSelector 
        options={mockOptions} 
        sortKey="name" 
        sortOrder="asc" 
        onSort={jest.fn()} 
      />
    );
    expect(getByText('Name')).toBeTruthy();
  });

  it('shows arrow up icon when sorted ascending', () => {
    const { getByTestId } = renderWithTheme(
      <SortSelector 
        options={mockOptions} 
        sortKey="date" 
        sortOrder="asc" 
        onSort={jest.fn()} 
      />
    );
    expect(getByTestId('icon-arrow-up')).toBeTruthy();
  });

  it('shows arrow down icon when sorted descending', () => {
    const { getByTestId } = renderWithTheme(
      <SortSelector 
        options={mockOptions} 
        sortKey="date" 
        sortOrder="desc" 
        onSort={jest.fn()} 
      />
    );
    expect(getByTestId('icon-arrow-down')).toBeTruthy();
  });

  it('opens bottom sheet when trigger is pressed', () => {
    const { getByText, getByTestId } = renderWithTheme(
      <SortSelector 
        options={mockOptions} 
        sortKey="date" 
        sortOrder="desc" 
        onSort={jest.fn()} 
      />
    );
    
    expect(() => getByTestId('bottom-sheet')).toThrow(); // Sheet should be closed initially
    
    const trigger = getByText('Date');
    fireEvent.press(trigger);
    
    expect(getByTestId('bottom-sheet')).toBeTruthy(); // Sheet should now be open
    expect(getByText('Ordenar por')).toBeTruthy();    // Title is shown
  });

  it('swaps sortOrder when selecting the same currently active key', () => {
    const onSortMock = jest.fn();
    const { getByText, getAllByText } = renderWithTheme(
      <SortSelector 
        options={mockOptions} 
        sortKey="date" 
        sortOrder="asc" 
        onSort={onSortMock} 
      />
    );
    
    // open the sheet
    fireEvent.press(getByText('Date'));
    
    // Since 'Date' appears twice now (trigger, and list), grab all and click the second
    const dateOptions = getAllByText('Date');
    
    // The second one is in the bottom sheet
    fireEvent.press(dateOptions[1]);
    
    expect(onSortMock).toHaveBeenCalledWith('date', 'desc');
  });

  it('selects new key and defaults to asc order when selecting different key', () => {
    const onSortMock = jest.fn();
    const { getByText, getAllByText } = renderWithTheme(
      <SortSelector 
        options={mockOptions} 
        sortKey="date" 
        sortOrder="desc" 
        onSort={onSortMock} 
      />
    );
    
    // open the sheet
    fireEvent.press(getByText('Date'));
    
    // select 'Name'
    fireEvent.press(getByText('Name'));
    
    expect(onSortMock).toHaveBeenCalledWith('name', 'asc');
  });
});
