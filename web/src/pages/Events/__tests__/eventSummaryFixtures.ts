/**
 * Fixtures compartidos para los test files de EventSummary.
 *
 * El componente tiene 1660 LOC e importa recharts + generadores PDF pesados.
 * Con 74 tests en un solo archivo, el worker de vitest hace OOM incluso con
 * heap de 6GB + --expose-gc + cleanup explícito. La solución estructural
 * fue dividir el archivo original en 3 archivos temáticos
 * (EventSummary.test.tsx, EventSummary.photos.test.tsx,
 * EventSummary.payments.test.tsx), cada uno con ~25 tests.
 *
 * Por limitaciones del hoisting de `vi.mock` (tiene que estar en el top del
 * archivo de test donde se importa el módulo mockeado), los 3 archivos
 * duplican los `vi.mock(...)` calls. Este fixture centraliza solo lo que SÍ
 * se puede compartir: el `baseEvent` y la factory `installEventSummaryMocks`
 * que configura los mock returns.
 */

export type EventFixture = {
  id: string;
  event_date: string;
  service_type: string;
  num_people: number;
  status: string;
  total_amount: number;
  tax_amount: number;
  requires_invoice: boolean;
  tax_rate: number;
  clients: {
    id?: string;
    name: string;
    phone: string | null;
    email: string;
    address?: string;
    city?: string;
  };
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  city: string | null;
  deposit_percent: number;
  cancellation_days: number;
  refund_percent: number;
  [key: string]: unknown;
};

export const baseEvent: EventFixture = {
  id: 'event-1',
  event_date: '2024-01-02',
  service_type: 'Boda',
  num_people: 100,
  status: 'confirmed',
  total_amount: 1000,
  tax_amount: 160,
  requires_invoice: true,
  tax_rate: 16,
  clients: {
    id: 'c1',
    name: 'Ana',
    phone: '555',
    email: 'ana@test.com',
    address: 'Calle 1',
    city: 'CDMX',
  },
  start_time: '10:00',
  end_time: '12:00',
  location: 'Salón Principal',
  city: 'CDMX',
  deposit_percent: 50,
  cancellation_days: 15,
  refund_percent: 0,
};

/**
 * Services que el helper necesita pre-mockeados por el caller.
 * El caller es responsable de haber llamado `vi.mock(...)` antes de importar
 * los services concretos — solo ese patrón hace que el mock tome efecto
 * gracias al hoisting de vitest.
 */
export interface EventSummaryMockedServices {
  eventService: {
    getById: { mockResolvedValue: (v: unknown) => void };
    getProducts: { mockResolvedValue: (v: unknown) => void };
    getExtras: { mockResolvedValue: (v: unknown) => void };
    getEquipment: { mockResolvedValue: (v: unknown) => void };
    getSupplies: { mockResolvedValue: (v: unknown) => void };
    getEventPhotos: { mockResolvedValue: (v: unknown) => void };
  };
  paymentService: {
    getByEventId: { mockResolvedValue: (v: unknown) => void };
  };
  productService: {
    getIngredientsForProducts: { mockResolvedValue: (v: unknown) => void };
  };
}

/**
 * Configura los mock returns estándar para un test. Se llama en beforeEach
 * de cada test file después de haber definido los `vi.mock(...)` al top.
 *
 * Acepta overrides parciales para el Event que se devuelve desde getById.
 */
export const installEventSummaryMocks = (
  services: EventSummaryMockedServices,
  eventOverrides: Record<string, unknown> = {},
): void => {
  services.eventService.getById.mockResolvedValue({ ...baseEvent, ...eventOverrides });
  services.eventService.getProducts.mockResolvedValue([
    { product_id: 'p1', quantity: 2, unit_price: 100, product_name: 'Churros' },
  ]);
  services.eventService.getExtras.mockResolvedValue([
    { description: 'Transporte', price: 50, cost: 20 },
  ]);
  services.eventService.getEquipment.mockResolvedValue([]);
  services.eventService.getSupplies.mockResolvedValue([]);
  services.eventService.getEventPhotos.mockResolvedValue([]);
  services.paymentService.getByEventId.mockResolvedValue([]);
  services.productService.getIngredientsForProducts.mockResolvedValue([
    {
      product_id: 'p1',
      inventory_id: 'i1',
      quantity_required: 1,
      ingredient_name: 'Harina',
      unit: 'kg',
      unit_cost: 2,
      type: 'ingredient',
    },
  ]);
};
