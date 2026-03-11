import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ClientListScreen from '../ClientListScreen';
import { clientService } from '../../../services/clientService';

// --- MINIMAL MOCKS ---

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  addListener: jest.fn((event, callback) => {
    if (event === 'focus') callback();
    return () => {};
  }),
  setOptions: jest.fn(),
};

jest.mock('../../../services/clientService', () => ({
  clientService: {
    getAll: jest.fn(),
    delete: jest.fn(),
  },
}));

// Better useToast mock for Zustand
const mockAddToast = jest.fn();
jest.mock('../../../hooks/useToast', () => ({
  useToast: (selector?: any) => {
    if (selector) return mockAddToast;
    return { addToast: mockAddToast };
  },
}));

jest.mock('../../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    canCreateClient: true,
    isBasicPlan: false,
    clientsCount: 5,
    clientLimit: 10,
  }),
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    default: { call: () => {} },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (cb: any) => cb(),
    createAnimatedComponent: (c: any) => c,
    FadeInDown: { delay: () => ({ springify: () => ({ duration: () => {} }) }) },
    View: View,
  };
});

jest.mock('lucide-react-native', () => ({
  Search: 'Search',
  Plus: 'Plus',
  Phone: 'Phone',
  Mail: 'Mail',
  MapPin: 'MapPin',
  ChevronRight: 'ChevronRight',
  Users: 'Users',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useFocusEffect: (cb: any) => {
      const React = require('react');
      React.useEffect(() => {
        console.log('useFocusEffect triggered');
        const cleanup = cb();
        return () => {
          if (typeof cleanup === 'function') cleanup();
        };
      }, []);
    },
  };
});

// Mock shared components to avoid dependencies
jest.mock('../../../components/shared', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    EmptyState: () => <View testID="mock-empty" />,
    ConfirmDialog: ({ visible, title, onConfirm, onCancel }: any) => {
      if (!visible) return null;
      return (
        <View testID="mock-confirm-dialog">
          <Text>{title}</Text>
          <TouchableOpacity onPress={onConfirm} testID="confirm-dialog-yes">
            <Text>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} testID="confirm-dialog-no">
            <Text>No</Text>
          </TouchableOpacity>
        </View>
      );
    },
    UpgradeBanner: () => <View testID="mock-upgrade" />,
    Avatar: () => <View testID="mock-avatar" />,
    SkeletonList: () => <View testID="mock-skeleton"><Text>Skeleton Loading...</Text></View>,
    SwipeableRow: ({ children, onEdit, onDelete }: any) => (
      <View testID="mock-swipeable-row">
        {children}
        <TouchableOpacity onPress={onEdit} testID="swipe-btn-edit"><Text>Edit</Text></TouchableOpacity>
        <TouchableOpacity onPress={onDelete} testID="swipe-btn-delete"><Text>Delete</Text></TouchableOpacity>
      </View>
    ),
    SortSelector: () => <View testID="mock-sort" />,
  };
});

// --- TESTS ---

describe('ClientListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (clientService.getAll as jest.Mock).mockReset();
  });

  const mockClients = [
    {
      id: 'client-1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '1234567890',
      total_events: 5,
      total_spent: 1000,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z',
    },
  ];

  it('renders loading skeleton', () => {
    (clientService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(
      <ClientListScreen navigation={mockNavigation as any} route={{} as any} />
    );
    expect(getByTestId('mock-skeleton')).toBeTruthy();
  });

  it('renders list of clients', async () => {
    (clientService.getAll as jest.Mock).mockResolvedValue(mockClients);
    
    const { getByText, queryByTestId, debug } = render(
      <ClientListScreen navigation={mockNavigation as any} route={{} as any} />
    );

    await waitFor(() => {
      expect(queryByTestId('mock-skeleton')).toBeNull();
    }, { timeout: 3000 });

    expect(getByText('Alice Johnson')).toBeTruthy();
  });

  it('searches for clients securely', async () => {
    (clientService.getAll as jest.Mock).mockResolvedValue(mockClients);
    
    const { getByPlaceholderText, getByText, queryByText, queryByTestId } = render(
      <ClientListScreen navigation={mockNavigation as any} route={{} as any} />
    );

    await waitFor(() => {
      expect(queryByTestId('mock-skeleton')).toBeNull();
    });

    const searchInput = getByPlaceholderText('Buscar clientes...');
    
    await act(async () => {
      fireEvent.changeText(searchInput, 'Alice');
    });

    expect(getByText('Alice Johnson')).toBeTruthy();
    expect(queryByText('Bob Smith')).toBeNull();
  });

  it('deletes a client', async () => {
    (clientService.getAll as jest.Mock).mockResolvedValue(mockClients);
    (clientService.delete as jest.Mock).mockResolvedValue({});
    
    const { getByText, queryByText, queryByTestId, getAllByTestId, getByTestId } = render(
      <ClientListScreen navigation={mockNavigation as any} route={{} as any} />
    );

    await waitFor(() => {
      expect(queryByTestId('mock-skeleton')).toBeNull();
    });

    const deleteBtns = getAllByTestId('swipe-btn-delete');
    
    await act(async () => {
      fireEvent.press(deleteBtns[0]); // Deletes Alice
    });

    // Check if ConfirmDialog is visible
    expect(getByTestId('mock-confirm-dialog')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('confirm-dialog-yes'));
    });

    await waitFor(() => {
      expect(queryByText('Alice Johnson')).toBeNull();
    });

    expect(clientService.delete).toHaveBeenCalledWith('client-1');
  });
});
