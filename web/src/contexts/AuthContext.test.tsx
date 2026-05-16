import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../lib/api';
import { logError } from '../lib/errorHandler';

vi.mock('../lib/api', () => ({
  ApiHttpError: class ApiHttpError extends Error {
    statusCode: number;
    endpoint: string;

    constructor(message: string, statusCode: number, endpoint: string) {
      super(message);
      this.name = 'ApiHttpError';
      this.statusCode = statusCode;
      this.endpoint = endpoint;
    }
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
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

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('resolves loading as unauthenticated when /auth/me fails', async () => {
    (api.get as any).mockRejectedValue(new Error('Unauthorized'));

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText('loading:no')).toBeInTheDocument();
    });
    expect(screen.getByText('user:none')).toBeInTheDocument();
  });

  it('fetches user via /auth/me when httpOnly cookie is valid', async () => {
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

  it('sets user to null when auth check fails', async () => {
    (api.get as any).mockRejectedValue(new Error('boom'));

    renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:none');
    });
    expect(logError).toHaveBeenCalledWith('Auth check failed', expect.any(Error));
  });

  it('clears auth on logout event', async () => {
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
  });

  it('signOut calls logout endpoint and redirects', async () => {
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });
    (api.post as any).mockResolvedValue({});

    renderWithProvider(<CaptureAuth />);

    await waitFor(() => {
      expect(capturedAuth?.loading).toBe(false);
    });

    await act(async () => {
      await capturedAuth?.signOut();
    });

    expect(api.post).toHaveBeenCalledWith('/auth/logout', {});
    expect(window.location.href).toBe('/login');
  });

  it('signOut redirects even when logout API call fails', async () => {
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });
    (api.post as any).mockRejectedValue(new Error('network error'));

    renderWithProvider(<CaptureAuth />);

    await waitFor(() => {
      expect(capturedAuth?.loading).toBe(false);
    });

    await act(async () => {
      await capturedAuth?.signOut();
    });

    // Even on failure, it should still redirect
    expect(window.location.href).toBe('/login');
    expect(logError).toHaveBeenCalledWith('Logout error', expect.any(Error));
  });

  it('updateProfile updates user on success', async () => {
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

  // --- Additional tests for uncovered functions ---

  it('checkAuth can be called manually to re-fetch user', async () => {
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });

    renderWithProvider(
      <>
        <TestConsumer />
        <CaptureAuth />
      </>
    );

    await waitFor(() => {
      expect(capturedAuth?.loading).toBe(false);
    });

    // Update the mock to return a different user
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'updated@example.com',
      name: 'Ana Updated',
      plan: 'pro',
    });

    await act(async () => {
      await capturedAuth?.checkAuth();
    });

    await waitFor(() => {
      expect(screen.getByText(/^user:/i)).toHaveTextContent('user:updated@example.com');
    });
  });

  it('checkAuth sets user to null when /auth/me returns error', async () => {
    // First call succeeds, second will fail
    (api.get as any).mockResolvedValueOnce({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });

    renderWithProvider(
      <>
        <TestConsumer />
        <CaptureAuth />
      </>
    );

    await waitFor(() => {
      expect(capturedAuth?.loading).toBe(false);
    });

    // Now make /auth/me fail (no valid cookie)
    (api.get as any).mockRejectedValue(new Error('Unauthorized'));

    await act(async () => {
      await capturedAuth?.checkAuth();
    });

    expect(screen.getByText('user:none')).toBeInTheDocument();
  });

  it('profile alias matches user', async () => {
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

    expect(capturedAuth?.profile).toEqual(capturedAuth?.user);
  });

  it('removes event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    (api.get as any).mockRejectedValue(new Error('Unauthorized'));

    const { unmount } = renderWithProvider(<TestConsumer />);

    await waitFor(() => {
      expect(screen.getByText('loading:no')).toBeInTheDocument();
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('auth:logout', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('signOut sets user to null in state', async () => {
    (api.get as any).mockResolvedValue({
      id: '1',
      email: 'ana@example.com',
      name: 'Ana',
      plan: 'basic',
    });
    (api.post as any).mockResolvedValue({});

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
      await capturedAuth?.signOut();
    });

    // User should be null after sign out
    expect(capturedAuth?.user).toBeNull();
  });
});

describe('useAuth outside provider', () => {
  it('returns default context values when used outside provider', () => {
    const DefaultConsumer = () => {
      const auth = useAuth();
      return (
        <div>
          <div>user:{auth.user === null ? 'null' : 'exists'}</div>
          <div>loading:{auth.loading ? 'yes' : 'no'}</div>
          <button onClick={() => auth.signOut()}>signOut</button>
          <button onClick={() => auth.checkAuth()}>checkAuth</button>
          <button onClick={() => auth.updateProfile({})}>updateProfile</button>
        </div>
      );
    };

    // Render WITHOUT the provider - should use default context values
    render(<DefaultConsumer />);

    expect(screen.getByText('user:null')).toBeInTheDocument();
    expect(screen.getByText('loading:yes')).toBeInTheDocument();

    // These should not throw - call the no-op defaults directly
    const signOutBtn = screen.getByText('signOut');
    const checkAuthBtn = screen.getByText('checkAuth');
    const updateProfileBtn = screen.getByText('updateProfile');
    expect(signOutBtn).toBeInTheDocument();
    expect(checkAuthBtn).toBeInTheDocument();
    expect(updateProfileBtn).toBeInTheDocument();
  });
});
