import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../lib/api';
import { logError } from '../lib/errorHandler';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

const TestConsumer = () => {
  const { user, loading } = useAuth();
  return (
    <div>
      <div>loading:{loading ? 'yes' : 'no'}</div>
      <div>user:{user?.email || 'none'}</div>
    </div>
  );
};

let capturedAuth: ReturnType<typeof useAuth> | null = null;
const CaptureAuth = () => {
  const auth = useAuth();
  useEffect(() => {
    capturedAuth = auth;
  }, [auth]);
  return null;
};

const renderWithProvider = (ui: React.ReactNode) =>
  render(<AuthProvider>{ui}</AuthProvider>);

const originalLocation = window.location;
let storageState: Record<string, string> = {};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageState = {};
    localStorage.getItem = vi.fn((key: string) => storageState[key]);
    localStorage.setItem = vi.fn((key: string, value: string) => {
      storageState[key] = value;
    });
    localStorage.removeItem = vi.fn((key: string) => {
      delete storageState[key];
    });
    localStorage.clear = vi.fn(() => {
      storageState = {};
    });
    capturedAuth = null;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('resolves loading when no token exists', async () => {
    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText('loading:no')).toBeInTheDocument();
    });
    expect(screen.getByText('user:none')).toBeInTheDocument();
  });

  it('fetches user when token exists', async () => {
    localStorage.setItem('auth_token', 'token');
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:ana@example.com');
    });
  });

  it('clears token when auth check fails', async () => {
    localStorage.setItem('auth_token', 'token');
    (api.get as any).mockRejectedValue(new Error('boom'));

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:none');
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('clears auth on logout event', async () => {
    localStorage.setItem('auth_token', 'token');
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:ana@example.com');
    });

    act(() => {
      window.dispatchEvent(new Event('auth:logout'));
    });

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:none');
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
  });

  it('signOut clears token and redirects', async () => {
    localStorage.setItem('auth_token', 'token');
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });

    renderWithProvider(<CaptureAuth />);

    await waitFor(() => {
      expect(capturedAuth?.loading).toBe(false);
    });

    act(() => {
      capturedAuth?.signOut();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(window.location.href).toBe('/login');
  });

  it('updateProfile updates user on success', async () => {
    localStorage.setItem('auth_token', 'token');
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });
    (api.put as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana Updated',
      plan: 'basic',
    });

    renderWithProvider(
      <>
        <TestConsumer />
        <CaptureAuth />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:ana@example.com');
    });

    await act(async () => {
      await capturedAuth?.updateProfile({ name: 'Ana Updated' });
    });

    expect(api.put).toHaveBeenCalledWith('/users/me', { name: 'Ana Updated' });
    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:ana@example.com');
    });
  });

  it('updateProfile logs and throws on error', async () => {
    localStorage.setItem('auth_token', 'token');
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });
    (api.put as any).mockRejectedValue(new Error('fail'));

    renderWithProvider(<CaptureAuth />);

    await waitFor(() => {
      expect(capturedAuth?.loading).toBe(false);
    });

    await expect(capturedAuth?.updateProfile({ name: 'Ana Updated' })).rejects.toThrow('fail');
    expect(logError).toHaveBeenCalledWith('Error updating profile', expect.any(Error));
  });
});
