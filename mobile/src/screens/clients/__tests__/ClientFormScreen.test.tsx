import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ClientFormScreen from '../ClientFormScreen';
import { clientService } from '../../../services/clientService';
import { uploadService } from '../../../services/uploadService';

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
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../../services/uploadService', () => ({
  uploadService: {
    uploadImage: jest.fn(),
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

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 50,
}));

jest.mock('lucide-react-native', () => ({
  Save: 'Save',
  Camera: 'Camera',
}));

jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../../../hooks/useImagePicker', () => ({
  useImagePicker: () => ({
    pickFromCamera: jest.fn(),
    pickFromGallery: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../components/shared', () => {
  const React = require('react');
  const { View, Text, TextInput, TouchableOpacity } = require('react-native');
  return {
    LoadingSpinner: () => <View testID="loading-spinner" />,
    FormInput: React.forwardRef(({ label, error, ...props }: any, ref: any) => (
      <View>
        <Text>{label}</Text>
        <TextInput ref={ref} {...props} testID={props.testID || `input-${label}`} />
        {error && <Text>{error}</Text>}
      </View>
    )),
    Avatar: () => <View testID="mock-avatar" />,
    ConfirmDialog: () => null,
  };
});

// Provide a stable mock for Linking (inherited from jest.setup.js but explicitly here if needed)
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// --- TESTS ---

describe('ClientFormScreen', () => {
  const mockId = 'client-123';
  const mockClient = {
    id: mockId,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    address: '123 Main St',
    city: 'City',
    notes: 'Some notes',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "New Client" form by default', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ClientFormScreen 
        navigation={mockNavigation as any} 
        route={{ params: {} } as any} 
      />
    );

    expect(getByText('Nombre *')).toBeTruthy();
    expect(getByPlaceholderText('Nombre completo')).toBeTruthy();
    expect(getByText('Crear Cliente')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText, findByText } = render(
      <ClientFormScreen 
        navigation={mockNavigation as any} 
        route={{ params: {} } as any} 
      />
    );

    const submitBtn = getByText('Crear Cliente');
    fireEvent.press(submitBtn);

    expect(await findByText('El nombre debe tener al menos 2 caracteres')).toBeTruthy();
    expect(await findByText('El teléfono debe tener al menos 10 dígitos')).toBeTruthy();
  });

  it('creates a new client successfully', async () => {
    (clientService.create as jest.Mock).mockResolvedValue({ id: 'new-id' });

    const { getByText, getByPlaceholderText } = render(
      <ClientFormScreen 
        navigation={mockNavigation as any} 
        route={{ params: {} } as any} 
      />
    );

    fireEvent.changeText(getByPlaceholderText('Nombre completo'), 'Jane Doe');
    fireEvent.changeText(getByPlaceholderText('10 dígitos'), '0987654321');
    fireEvent.changeText(getByPlaceholderText('correo@ejemplo.com'), 'jane@example.com');

    const submitBtn = getByText('Crear Cliente');
    
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(clientService.create).toHaveBeenCalledWith({
      name: 'Jane Doe',
      phone: '0987654321',
      email: 'jane@example.com',
      address: null,
      city: null,
      notes: null,
      photo_url: null,
    });
    expect(mockAddToast).toHaveBeenCalledWith('Cliente creado', 'success');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('loads and updates an existing client', async () => {
    (clientService.getById as jest.Mock).mockResolvedValue(mockClient);
    (clientService.update as jest.Mock).mockResolvedValue({});

    const { getByText, getByDisplayValue, getByPlaceholderText } = render(
      <ClientFormScreen 
        navigation={mockNavigation as any} 
        route={{ params: { id: mockId } } as any} 
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(getByDisplayValue('John Doe')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('Nombre completo'), 'John Updated');
    
    const submitBtn = getByText('Guardar Cambios');
    
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(clientService.update).toHaveBeenCalledWith(mockId, expect.objectContaining({
      name: 'John Updated',
    }));
    expect(mockAddToast).toHaveBeenCalledWith('Cliente actualizado', 'success');
    expect(mockGoBack).toHaveBeenCalled();
  });
});
