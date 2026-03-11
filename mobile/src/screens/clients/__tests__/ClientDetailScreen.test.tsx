import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ClientDetailScreen from '../ClientDetailScreen';
import { clientService } from '../../../services/clientService';
import { eventService } from '../../../services/eventService';
import { Linking } from 'react-native';

// --- MOCKS ---

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: jest.fn(),
};

jest.mock('../../../services/clientService', () => ({
  clientService: {
    getById: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../services/eventService', () => ({
  eventService: {
    getByClientId: jest.fn(),
  },
}));

const mockAddToast = jest.fn();
jest.mock('../../../hooks/useToast', () => ({
  useToast: (selector?: any) => {
    if (selector) return mockAddToast;
    return { addToast: mockAddToast };
  },
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return {
    Phone: View,
    Mail: View,
    MapPin: View,
    Calendar: View,
    Edit2: View,
    Trash2: View,
    StickyNote: View,
    ChevronRight: View,
    DollarSign: View,
    Plus: View,
    TrendingUp: View,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../components/shared', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    LoadingSpinner: () => <View testID="loading-spinner" />,
    EmptyState: ({ title }: any) => <View testID="empty-state"><Text>{title}</Text></View>,
    Avatar: () => <View testID="mock-avatar" />,
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
  };
});

// React Native Linking and Safe Area are now mocked in jest.setup.js

// --- TESTS ---

describe('ClientDetailScreen', () => {
  const mockId = 'client-123';
  const mockClient = {
    id: mockId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    address: '123 Main St',
    city: 'City',
    notes: 'Some notes',
    total_events: 1,
    total_spent: 500,
  };

  const mockEvents = [
    {
      id: 'event-1',
      client_id: mockId,
      service_type: 'Boda',
      event_date: '2023-12-25T18:00:00Z',
      status: 'confirmed',
      num_people: 100,
      total_amount: 500,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders client details and event history', async () => {
    (clientService.getById as jest.Mock).mockResolvedValue(mockClient);
    (eventService.getByClientId as jest.Mock).mockResolvedValue(mockEvents);

    const { getByText, queryByTestId } = render(
      <ClientDetailScreen 
        navigation={mockNavigation as any} 
        route={{ params: { id: mockId } } as any} 
      />
    );

    expect(queryByTestId('loading-spinner')).toBeTruthy();

    await waitFor(() => {
      expect(queryByTestId('loading-spinner')).toBeNull();
    }, { timeout: 3000 });

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('1234567890')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
    expect(getByText('Boda')).toBeTruthy();
    expect(getByText('100 personas')).toBeTruthy();
  });

  it('handles client deletion', async () => {
    (clientService.getById as jest.Mock).mockResolvedValue(mockClient);
    (eventService.getByClientId as jest.Mock).mockResolvedValue(mockEvents);
    (clientService.delete as jest.Mock).mockResolvedValue({});

    const { getByText, getByTestId, queryByTestId } = render(
      <ClientDetailScreen 
        navigation={mockNavigation as any} 
        route={{ params: { id: mockId } } as any} 
      />
    );

    await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

    const deleteBtn = getByText('Eliminar');
    fireEvent.press(deleteBtn);

    expect(getByTestId('mock-confirm-dialog')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('confirm-dialog-yes'));
    });

    expect(clientService.delete).toHaveBeenCalledWith(mockId);
    expect(mockAddToast).toHaveBeenCalledWith('Cliente eliminado', 'success');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to edit form', async () => {
    (clientService.getById as jest.Mock).mockResolvedValue(mockClient);
    (eventService.getByClientId as jest.Mock).mockResolvedValue(mockEvents);

    const { getByText, queryByTestId } = render(
      <ClientDetailScreen 
        navigation={mockNavigation as any} 
        route={{ params: { id: mockId } } as any} 
      />
    );

    await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

    const editBtn = getByText('Editar');
    fireEvent.press(editBtn);

    expect(mockNavigate).toHaveBeenCalledWith('ClientForm', { id: mockId });
  });

  it('handles phone call action', async () => {
    (clientService.getById as jest.Mock).mockResolvedValue(mockClient);
    (eventService.getByClientId as jest.Mock).mockResolvedValue(mockEvents);

    const { getByText, queryByTestId } = render(
      <ClientDetailScreen 
        navigation={mockNavigation as any} 
        route={{ params: { id: mockId } } as any} 
      />
    );

    await waitFor(() => expect(queryByTestId('loading-spinner')).toBeNull());

    const phoneRow = getByText('1234567890');
    fireEvent.press(phoneRow);

    expect(Linking.openURL).toHaveBeenCalledWith('tel:1234567890');
  });
});
