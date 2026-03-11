import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { api, getAuthToken, setAuthToken, setRefreshToken, clearAuthTokens } from '../../lib/api';
import { revenueCatService } from '../../services/revenueCatService';
import { Text } from 'react-native';

// Mock API and AsyncStorage dependencies
jest.mock('../../lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    setOnUnauthorized: jest.fn()
  },
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
  setRefreshToken: jest.fn(),
  clearAuthTokens: jest.fn()
}));

jest.mock('../../services/revenueCatService', () => ({
  revenueCatService: {
    initialize: jest.fn()
  }
}));

// Test component to access context values
const TestComponent = () => {
  const { user, loading, signIn, signUp, signOut, checkAuth } = useAuth();
  return (
    <>
      <Text testID="loading-state">{loading ? 'loading' : 'ready'}</Text>
      <Text testID="user-state">{user ? user.name : 'none'}</Text>
      <Text testID="signin-btn" onPress={() => signIn('test@test.com', 'password')}>SignIn</Text>
      <Text testID="signout-btn" onPress={() => signOut()}>SignOut</Text>
      <Text testID="checkauth-btn" onPress={() => checkAuth()}>CheckAuth</Text>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes as loading and goes to ready when no token exists', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // After mount, checkAuth runs. We need to wait for state updates.
    await act(async () => {
        // flush promises
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getByTestId('loading-state').props.children).toBe('ready');
    expect(getByTestId('user-state').props.children).toBe('none');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches user info on mount if token exists', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce('fake-token');
    (api.get as jest.Mock).mockResolvedValueOnce({ id: '1', name: 'John Doe', email: 'j@d.com' });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(getByTestId('user-state').props.children).toBe('John Doe');
    expect(revenueCatService.initialize).toHaveBeenCalledWith('1');
  });

  it('handles signIn successfully with standard token response', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce(null);
    const mockUser = { id: '2', name: 'Jane Doe', email: 'jane@d.com' };
    (api.post as jest.Mock).mockResolvedValueOnce({
      token: 'access-token-123',
      user: mockUser
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      getByTestId('signin-btn').props.onPress();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'password' });
    expect(setAuthToken).toHaveBeenCalledWith('access-token-123');
    expect(getByTestId('user-state').props.children).toBe('Jane Doe');
  });

  it('handles signOut successfully', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce('fake-token');
    (api.get as jest.Mock).mockResolvedValueOnce({ id: '1', name: 'John Doe', email: 'j@d.com' });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(getByTestId('user-state').props.children).toBe('John Doe');

    // Perform sign out
    (api.post as jest.Mock).mockResolvedValueOnce({});
    
    await act(async () => {
      getByTestId('signout-btn').props.onPress();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout', {});
    expect(clearAuthTokens).toHaveBeenCalled();
    expect(getByTestId('user-state').props.children).toBe('none');
  });

  it('clears user when auth check fails', async () => {
    (getAuthToken as jest.Mock).mockResolvedValueOnce('fake-token');
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(clearAuthTokens).toHaveBeenCalled();
    expect(getByTestId('user-state').props.children).toBe('none');
  });
});
