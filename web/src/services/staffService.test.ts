import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { staffService } from './staffService';
import { server } from '../../tests/mocks/server';

const API_BASE = 'http://localhost:8080/api';

describe('staffService', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe('getAll', () => {
    it('returns the staff catalog', async () => {
      server.use(
        http.get(`${API_BASE}/staff`, () =>
          HttpResponse.json([
            {
              id: 's1',
              user_id: 'u1',
              name: 'Maria',
              role_label: 'Fotógrafa',
              notification_email_opt_in: false,
              created_at: '2026-04-16T00:00:00Z',
              updated_at: '2026-04-16T00:00:00Z',
            },
          ]),
        ),
      );

      const result = await staffService.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Maria');
    });

    it('propagates 500 errors', async () => {
      server.use(
        http.get(`${API_BASE}/staff`, () =>
          HttpResponse.json({ error: 'boom' }, { status: 500 }),
        ),
      );
      await expect(staffService.getAll()).rejects.toThrow('boom');
    });
  });

  describe('getPage', () => {
    it('sends pagination params', async () => {
      let receivedURL = '';
      server.use(
        http.get(`${API_BASE}/staff`, ({ request }) => {
          receivedURL = request.url;
          return HttpResponse.json({ data: [], total: 0, page: 2, limit: 10, total_pages: 0 });
        }),
      );

      await staffService.getPage({ page: 2, limit: 10, sort: 'name', order: 'desc' });
      expect(receivedURL).toContain('page=2');
      expect(receivedURL).toContain('limit=10');
      expect(receivedURL).toContain('sort=name');
      expect(receivedURL).toContain('order=desc');
    });
  });

  describe('search', () => {
    it('sends q param', async () => {
      let receivedURL = '';
      server.use(
        http.get(`${API_BASE}/staff`, ({ request }) => {
          receivedURL = request.url;
          return HttpResponse.json([]);
        }),
      );

      await staffService.search('DJ');
      expect(receivedURL).toContain('q=DJ');
    });
  });

  describe('create', () => {
    it('posts the staff body', async () => {
      let receivedBody: unknown = null;
      server.use(
        http.post(`${API_BASE}/staff`, async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            id: 's1',
            user_id: 'u1',
            name: 'DJ Alejo',
            notification_email_opt_in: true,
            created_at: '2026-04-17T00:00:00Z',
            updated_at: '2026-04-17T00:00:00Z',
          });
        }),
      );

      const created = await staffService.create({
        name: 'DJ Alejo',
        role_label: 'DJ',
        notification_email_opt_in: true,
      });
      expect(created.id).toBe('s1');
      expect(receivedBody).toMatchObject({ name: 'DJ Alejo', notification_email_opt_in: true });
    });

    it('surfaces validation 400', async () => {
      server.use(
        http.post(`${API_BASE}/staff`, () =>
          HttpResponse.json({ error: 'name is required' }, { status: 400 }),
        ),
      );
      await expect(
        staffService.create({ name: '', notification_email_opt_in: false }),
      ).rejects.toThrow('name is required');
    });
  });

  describe('update + delete + getByEvent', () => {
    it('update sends PUT', async () => {
      let called = false;
      server.use(
        http.put(`${API_BASE}/staff/s1`, () => {
          called = true;
          return HttpResponse.json({
            id: 's1',
            user_id: 'u1',
            name: 'Maria Updated',
            notification_email_opt_in: false,
            created_at: '2026-04-17T00:00:00Z',
            updated_at: '2026-04-17T00:00:00Z',
          });
        }),
      );
      const r = await staffService.update('s1', { name: 'Maria Updated' });
      expect(called).toBe(true);
      expect(r.name).toBe('Maria Updated');
    });

    it('delete resolves on 204', async () => {
      let called = false;
      server.use(
        http.delete(`${API_BASE}/staff/s1`, () => {
          called = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await expect(staffService.delete('s1')).resolves.not.toThrow();
      expect(called).toBe(true);
    });

    it('getByEvent returns assignments with joined fields', async () => {
      server.use(
        http.get(`${API_BASE}/events/e1/staff`, () =>
          HttpResponse.json([
            {
              id: 'es1',
              event_id: 'e1',
              staff_id: 's1',
              fee_amount: 3000,
              staff_name: 'Maria',
              staff_role_label: 'Fotógrafa',
              created_at: '2026-04-17T00:00:00Z',
            },
          ]),
        ),
      );
      const assignments = await staffService.getByEvent('e1');
      expect(assignments).toHaveLength(1);
      expect(assignments[0].fee_amount).toBe(3000);
      expect(assignments[0].staff_name).toBe('Maria');
    });
  });
});
