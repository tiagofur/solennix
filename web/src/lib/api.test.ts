import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

describe('api', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    window.localStorage.getItem = vi.fn().mockReturnValue('token');
    window.localStorage.removeItem = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('adds auth header and query params', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });

    await api.get('/clients', { q: 'ana' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/clients?q=ana',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      })
    );
  });

  it('dispatches logout on 401', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: 'unauthorized' }),
    });

    await expect(api.get('/secure')).rejects.toThrow('unauthorized');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(dispatchSpy).toHaveBeenCalled();
  });

  it('handles 204 no content', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    });

    const response = await api.delete('/clients/1');
    expect(response).toEqual({});
  });

  it('throws error from response payload', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'bad request' }),
    });

    await expect(api.post('/clients', { name: 'Ana' })).rejects.toThrow('bad request');
  });

  it('put sends correct method and body', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: '1', name: 'Updated' }),
    });

    const result = await api.put('/clients/1', { name: 'Updated' });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/clients/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      })
    );
    expect(result).toEqual({ id: '1', name: 'Updated' });
  });

  it('omits Authorization header when no token', async () => {
    (window.localStorage.getItem as any).mockReturnValue(null);
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true }),
    });

    await api.get('/public');

    const callArgs = (globalThis.fetch as any).mock.calls[0];
    expect(callArgs[1].headers).not.toHaveProperty('Authorization');
  });

  it('falls back to status message when error JSON parsing fails', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('parse fail')),
    });

    await expect(api.get('/broken')).rejects.toThrow('Request failed with status 500');
  });

  it('get works without params', async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([]),
    });

    await api.get('/clients');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/clients',
      expect.objectContaining({ method: 'GET' })
    );
  });
});
