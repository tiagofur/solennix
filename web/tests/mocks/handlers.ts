import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:8080/api';

const mockStore = {
  clients: [
    {
      id: 'client-1',
      name: 'Juan Perez',
      email: 'juan@example.com',
      phone: '+1234567890',
      address: 'Calle 1',
      city: 'CDMX',
      notes: '',
      total_events: 2,
      total_spent: 1200,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  events: [
    {
      id: 'event-1',
      client_id: 'client-1',
      event_date: '2024-12-25',
      service_type: 'Catering',
      num_people: 50,
      status: 'confirmed',
      total_amount: 5000,
      requires_invoice: true,
      tax_rate: 16,
      tax_amount: 800,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  products: [
    {
      id: 'product-1',
      name: 'Paquete Basico',
      category: 'Catering',
      base_price: 100,
      is_active: true,
    },
  ],
  inventory: [
    {
      id: 'inv-1',
      ingredient_name: 'Harina',
      current_stock: 100,
      minimum_stock: 20,
      unit: 'kg',
      unit_cost: 2.5,
      type: 'ingredient',
      last_updated: '2024-01-01T00:00:00Z',
    },
  ],
  payments: [
    {
      id: 'pay-1',
      event_id: 'event-1',
      amount: 2500,
      payment_date: '2024-01-15',
      payment_method: 'cash',
      notes: 'Pago inicial',
      created_at: '2024-01-15T00:00:00Z',
    },
  ],
};

export const handlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        tokens: { access_token: 'token-123' },
      });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),
  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      plan: 'basic',
    });
  }),
  http.get(`${API_BASE}/clients`, () => HttpResponse.json(mockStore.clients)),
  http.get(`${API_BASE}/clients/:id`, ({ params }) => {
    const client = mockStore.clients.find((c) => c.id === params.id);
    if (!client) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(client);
  }),
  http.post(`${API_BASE}/clients`, async ({ request }) => {
    const body = await request.json();
    const created = {
      ...(body as any),
      id: 'client-new',
      total_events: 0,
      total_spent: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    mockStore.clients.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put(`${API_BASE}/clients/:id`, async ({ request, params }) => {
    const body = await request.json();
    const client = mockStore.clients.find((c) => c.id === params.id);
    if (!client) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    Object.assign(client, body, { updated_at: '2024-01-02T00:00:00Z' });
    return HttpResponse.json(client);
  }),
  http.delete(`${API_BASE}/clients/:id`, ({ params }) => {
    const idx = mockStore.clients.findIndex((c) => c.id === params.id);
    if (idx === -1) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    mockStore.clients.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API_BASE}/events`, () => HttpResponse.json(mockStore.events)),
  http.get(`${API_BASE}/events/upcoming`, () => HttpResponse.json(mockStore.events)),
  http.get(`${API_BASE}/inventory`, () => HttpResponse.json(mockStore.inventory)),
  http.get(`${API_BASE}/payments`, () => HttpResponse.json(mockStore.payments)),
  http.get(`${API_BASE}/unavailable-dates`, () => HttpResponse.json([])),
  http.get('http://localhost:8080/health', () => HttpResponse.json({ status: 'ok' })),
];
