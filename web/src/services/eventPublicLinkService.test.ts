import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { eventPublicLinkService } from './eventPublicLinkService';
import { server } from '../../tests/mocks/server';

const API_BASE = 'http://localhost:8080/api';

function makeLink(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    event_id: 'e1',
    user_id: 'u1',
    token: 'tok-123',
    status: 'active',
    created_at: '2026-04-17T00:00:00Z',
    updated_at: '2026-04-17T00:00:00Z',
    url: 'https://solennix.com/client/tok-123',
    ...overrides,
  };
}

describe('eventPublicLinkService', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('getActive', () => {
    it('returns the active link', async () => {
      server.use(
        http.get(`${API_BASE}/events/e1/public-link`, () =>
          HttpResponse.json(makeLink()),
        ),
      );
      const link = await eventPublicLinkService.getActive('e1');
      expect(link.status).toBe('active');
      expect(link.url).toContain('/client/tok-123');
    });

    it('rejects on 404 so callers can treat it as empty state', async () => {
      server.use(
        http.get(`${API_BASE}/events/e1/public-link`, () =>
          HttpResponse.json({ error: 'not found' }, { status: 404 }),
        ),
      );
      await expect(eventPublicLinkService.getActive('e1')).rejects.toThrow();
    });
  });

  describe('createOrRotate', () => {
    it('POSTs with empty body when ttlDays is omitted', async () => {
      let receivedBody: unknown = null;
      server.use(
        http.post(`${API_BASE}/events/e1/public-link`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json(makeLink());
        }),
      );
      await eventPublicLinkService.createOrRotate('e1');
      expect(receivedBody).toEqual({});
    });

    it('POSTs ttl_days when provided', async () => {
      let receivedBody: unknown = null;
      server.use(
        http.post(`${API_BASE}/events/e1/public-link`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json(makeLink({ token: 'new-tok' }));
        }),
      );
      const link = await eventPublicLinkService.createOrRotate('e1', 30);
      expect(receivedBody).toEqual({ ttl_days: 30 });
      expect(link.token).toBe('new-tok');
    });
  });

  describe('revoke', () => {
    it('DELETEs and resolves on 204', async () => {
      let called = false;
      server.use(
        http.delete(`${API_BASE}/events/e1/public-link`, () => {
          called = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await expect(eventPublicLinkService.revoke('e1')).resolves.toBeUndefined();
      expect(called).toBe(true);
    });

    it('rejects on server error', async () => {
      server.use(
        http.delete(`${API_BASE}/events/e1/public-link`, () =>
          HttpResponse.json({ error: 'forbidden' }, { status: 403 }),
        ),
      );
      await expect(eventPublicLinkService.revoke('e1')).rejects.toThrow('forbidden');
    });
  });
});
