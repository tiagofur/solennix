import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateBudgetPDF,
  generateContractPDF,
  generateShoppingListPDF,
  generateInvoicePDF,
  generatePaymentReportPDF,
} from './pdfGenerator';

const autoTableMock = vi.fn();
const jsPDFMock = vi.fn();

vi.mock('jspdf', () => ({
  jsPDF: function (...args: any[]) {
    return jsPDFMock(...args);
  },
}));

vi.mock('jspdf-autotable', () => ({
  default: (...args: any[]) => autoTableMock(...args),
}));

const createDocMock = () => ({
  internal: { pageSize: { width: 210, height: 297 } },
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  save: vi.fn(),
  splitTextToSize: vi.fn((text: string) => text.split('\n')),
  addImage: vi.fn(),
  addPage: vi.fn(),
  getImageProperties: vi.fn(() => ({ width: 100, height: 100, fileType: 'PNG' })),
  getTextWidth: vi.fn((text: string) => text.length * 2),
  lastAutoTable: { finalY: 60 },
});

// --------------- helpers to build test data ---------------

const makeEvent = (overrides: Record<string, any> = {}) => ({
  id: 'abc12345-6789',
  user_id: 'u1',
  client_id: 'c1',
  event_date: '2024-06-15',
  start_time: '14:00',
  end_time: '20:00',
  service_type: 'Banquete',
  num_people: 150,
  status: 'confirmed',
  discount: 0,
  requires_invoice: false,
  tax_rate: 16,
  tax_amount: 0,
  total_amount: 5000,
  location: 'Salón Imperial',
  city: 'Guadalajara',
  deposit_percent: 50,
  cancellation_days: 15,
  refund_percent: 80,
  notes: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  client: {
    id: 'c1',
    user_id: 'u1',
    name: 'María López',
    phone: '555-1234',
    email: 'maria@example.com',
    address: 'Calle Reforma 123',
    city: 'Guadalajara',
    notes: null,
    total_events: 3,
    total_spent: 15000,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  },
  ...overrides,
});

const makeProfile = (overrides: Record<string, any> = {}) => ({
  id: 'u1',
  email: 'negocio@example.com',
  name: 'Juan Eventos',
  business_name: 'Eventos Premium',
  logo_url: null,
  brand_color: '#3366CC',
  show_business_name_in_pdf: true,
  default_deposit_percent: 50,
  default_cancellation_days: 15,
  default_refund_percent: 80,
  plan: 'premium' as const,
  stripe_customer_id: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const makeProduct = (overrides: Record<string, any> = {}) => ({
  id: 'p1',
  event_id: 'e1',
  product_id: 'pr1',
  quantity: 10,
  unit_price: 200,
  discount: 20,
  total_price: 1800,
  created_at: '2024-01-01',
  products: { name: 'Platillo Principal' },
  ...overrides,
});

const makeExtra = (overrides: Record<string, any> = {}) => ({
  id: 'ex1',
  event_id: 'e1',
  description: 'Decoración floral',
  cost: 300,
  price: 500,
  exclude_utility: false,
  created_at: '2024-01-01',
  ...overrides,
});

const makePayment = (overrides: Record<string, any> = {}) => ({
  id: 'pay1',
  event_id: 'e1',
  user_id: 'u1',
  amount: 2500,
  payment_date: '2024-05-01',
  payment_method: 'transfer',
  notes: 'Anticipo',
  created_at: '2024-01-01',
  ...overrides,
});

describe('pdfGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoTableMock.mockImplementation((doc: any) => {
      doc.lastAutoTable = { finalY: 60 };
    });
  });

  // ===================================================================
  // generateBudgetPDF
  // ===================================================================
  describe('generateBudgetPDF', () => {
    it('generates budget with products and extras', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        {
          id: '1',
          event_date: '2024-01-02',
          service_type: 'Boda',
          num_people: 100,
          total_amount: 1000,
          tax_amount: 160,
          tax_rate: 16,
          requires_invoice: true,
          client: { name: 'Ana', phone: '555', email: 'ana@example.com' } as any,
        } as any,
        { name: 'Eventos Ana', business_name: 'Eventos Ana' } as any,
        [
          {
            products: { name: 'Menu' },
            quantity: 2,
            unit_price: 100,
            discount: 10,
          } as any,
        ],
        [{ description: 'Extra', price: 50 } as any]
      );

      expect(autoTableMock).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalledWith('Presupuesto_Ana.pdf');
    });

    it('generates budget with empty items', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        {
          id: '1',
          event_date: '2024-01-02',
          service_type: 'Boda',
          num_people: 100,
          total_amount: 500,
          requires_invoice: false,
          client: { name: 'Ana' } as any,
        } as any,
        null,
        [],
        []
      );

      expect(autoTableMock).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalledWith(
        'No hay productos o servicios registrados.',
        20,
        expect.any(Number)
      );
    });

    it('shows discount line when discount > 0', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent({ discount: 250, requires_invoice: false }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Descuento:');
    });

    it('shows IVA when requires_invoice is true', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent({ requires_invoice: true, tax_rate: 16, tax_amount: 800 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('IVA'))).toBe(true);
    });

    it('uses default brand color when profile is null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent({ client: null }) as any,
        null,
        [],
        []
      );

      expect(doc.save).toHaveBeenCalledWith('Presupuesto_Cliente.pdf');
    });

    it('renders products without name as "Producto"', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile() as any,
        [makeProduct({ products: null }) as any],
        []
      );

      expect(autoTableMock).toHaveBeenCalled();
      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.body[0][0]).toBe('Producto');
    });

    it('handles missing start_time and end_time gracefully', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent({ start_time: null, end_time: null, client: { name: 'Test' } }) as any,
        makeProfile() as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Por definir - Por definir');
    });
  });

  // ===================================================================
  // generateContractPDF
  // ===================================================================
  describe('generateContractPDF', () => {
    it('generates contract and saves pdf', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({ service_type: 'Boda', num_people: 100, total_amount: 2000 }) as any,
        makeProfile({ name: 'Eventos Ana', business_name: 'Eventos Ana' }) as any
      );

      expect(doc.save).toHaveBeenCalledWith('Contrato_María López.pdf');
      expect(doc.text).toHaveBeenCalled();
    });

    it('uses default values when deposit/cancellation/refund are null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({
          deposit_percent: null,
          cancellation_days: null,
          refund_percent: null,
        }) as any,
        makeProfile() as any
      );

      expect(doc.save).toHaveBeenCalledWith('Contrato_María López.pdf');
      const allText = doc.text.mock.calls.map((c: any) => String(c[0])).join(' ');
      expect(allText).toContain('50%');
      expect(allText).toContain('15');
    });

    it('renders refund percent as 0% when refund_percent is 0', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({ refund_percent: 0 }) as any,
        makeProfile() as any
      );

      const allText = doc.text.mock.calls.map((c: any) => String(c[0])).join(' ');
      expect(allText).toContain('0%');
    });

    it('uses event city for location text', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({ city: 'Monterrey' }) as any,
        makeProfile() as any
      );

      const allText = doc.text.mock.calls.map((c: any) => String(c[0])).join(' ');
      expect(allText).toContain('Monterrey');
    });

    it('falls back to profile business name for city when city is null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({ city: null }) as any,
        makeProfile({ business_name: 'Mi Negocio' }) as any
      );

      const allText = doc.text.mock.calls.map((c: any) => String(c[0])).join(' ');
      expect(allText).toContain('Mi Negocio');
    });

    it('uses defaults when profile is null and client is missing', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({ city: null, client: null }) as any,
        null
      );

      // With strict: false, missing tokens remain as placeholders in the text
      expect(doc.text).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalledWith('Contrato_Cliente.pdf');
    });

    it('handles event with location and time details', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({
          location: 'Hotel Marriott',
          start_time: '18:00',
          end_time: '23:00',
        }) as any,
        makeProfile() as any
      );

      const allText = doc.text.mock.calls.map((c: any) => String(c[0])).join(' ');
      expect(allText).toContain('Hotel Marriott');
      expect(allText).toContain('18:00');
    });

    it('handles missing location and times', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateContractPDF(
        makeEvent({ location: null, start_time: null, end_time: null }) as any,
        makeProfile() as any
      );

      // With strict: false, missing tokens remain as placeholders in the text
      expect(doc.text).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });
  });

  // ===================================================================
  // generateShoppingListPDF
  // ===================================================================
  describe('generateShoppingListPDF', () => {
    it('generates shopping list with ingredients', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      const ingredients = [
        { name: 'Arroz', quantity: 5, unit: 'kg' },
        { name: 'Pollo', quantity: 20, unit: 'kg' },
        { name: 'Aceite', quantity: 3, unit: 'lt' },
      ];

      generateShoppingListPDF(
        makeEvent() as any,
        makeProfile() as any,
        ingredients
      );

      expect(autoTableMock).toHaveBeenCalled();
      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.head).toEqual([['Insumo', 'Cantidad', 'Unidad']]);
      expect(callArgs.body).toHaveLength(3);
      expect(callArgs.body[0]).toEqual(['Arroz', '5.00', 'kg']);
      expect(callArgs.body[1]).toEqual(['Pollo', '20.00', 'kg']);
      expect(doc.save).toHaveBeenCalled();
      const saveArg = doc.save.mock.calls[0][0] as string;
      expect(saveArg).toContain('Insumos_Banquete_');
    });

    it('shows empty message when no ingredients', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateShoppingListPDF(
        makeEvent() as any,
        makeProfile() as any,
        []
      );

      expect(autoTableMock).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalledWith(
        'No hay insumos calculados.',
        20,
        expect.any(Number)
      );
    });

    it('uses default brand color with null profile', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateShoppingListPDF(
        makeEvent() as any,
        null,
        [{ name: 'Sal', quantity: 1, unit: 'kg' }]
      );

      expect(autoTableMock).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });

    it('displays event info (service_type, date, num_people)', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateShoppingListPDF(
        makeEvent({ service_type: 'Coctel', num_people: 80 }) as any,
        makeProfile() as any,
        [{ name: 'Queso', quantity: 2, unit: 'kg' }]
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Evento: Coctel');
      expect(textCalls).toContain('Personas: 80');
    });
  });

  // ===================================================================
  // generatePaymentReportPDF
  // ===================================================================
  describe('generatePaymentReportPDF', () => {
    it('generates payment report with payments', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      const payments = [
        makePayment({ amount: 2000, payment_method: 'cash', notes: 'Primer pago' }),
        makePayment({ amount: 1000, payment_method: 'transfer', notes: null }),
      ];

      generatePaymentReportPDF(
        makeEvent({ total_amount: 5000 }) as any,
        makeProfile() as any,
        payments as any
      );

      expect(autoTableMock).toHaveBeenCalled();
      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.head).toEqual([['Fecha', 'Método', 'Nota', 'Monto']]);
      expect(callArgs.body).toHaveLength(2);
      // First payment: cash => 'Efectivo'
      expect(callArgs.body[0][1]).toBe('Efectivo');
      // Second payment: transfer => 'Transferencia', null notes => '-'
      expect(callArgs.body[1][1]).toBe('Transferencia');
      expect(callArgs.body[1][2]).toBe('-');
      expect(doc.save).toHaveBeenCalled();
    });

    it('shows balance pendiente when total paid < total_amount', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generatePaymentReportPDF(
        makeEvent({ total_amount: 5000 }) as any,
        makeProfile() as any,
        [makePayment({ amount: 2000 })] as any
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Saldo Pendiente'))).toBe(true);
    });

    it('shows saldo completado when total paid >= total_amount', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generatePaymentReportPDF(
        makeEvent({ total_amount: 5000 }) as any,
        makeProfile() as any,
        [
          makePayment({ amount: 3000 }),
          makePayment({ amount: 2000 }),
        ] as any
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Saldo Favor / Completado'))).toBe(true);
    });

    it('shows empty message when no payments', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generatePaymentReportPDF(
        makeEvent() as any,
        makeProfile() as any,
        []
      );

      expect(autoTableMock).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalledWith(
        'No hay pagos registrados.',
        20,
        expect.any(Number)
      );
    });

    it('maps all payment method types correctly', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      const payments = [
        makePayment({ payment_method: 'cash' }),
        makePayment({ payment_method: 'transfer' }),
        makePayment({ payment_method: 'card' }),
        makePayment({ payment_method: 'check' }),
        makePayment({ payment_method: 'other' }),
        makePayment({ payment_method: 'unknown_method' }),
      ];

      generatePaymentReportPDF(
        makeEvent({ total_amount: 15000 }) as any,
        makeProfile() as any,
        payments as any
      );

      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.body[0][1]).toBe('Efectivo');
      expect(callArgs.body[1][1]).toBe('Transferencia');
      expect(callArgs.body[2][1]).toBe('Tarjeta');
      expect(callArgs.body[3][1]).toBe('Cheque');
      expect(callArgs.body[4][1]).toBe('Otro');
      expect(callArgs.body[5][1]).toBe('unknown_method');
    });

    it('uses profile business_name in footer', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generatePaymentReportPDF(
        makeEvent() as any,
        makeProfile({ business_name: 'Mi Catering' }) as any,
        [makePayment()] as any
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Mi Catering');
    });

    it('uses default footer text when profile is null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generatePaymentReportPDF(
        makeEvent() as any,
        null,
        [makePayment()] as any
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Recibido por');
    });

    it('handles client without name', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generatePaymentReportPDF(
        makeEvent({ client: null }) as any,
        makeProfile() as any,
        [makePayment()] as any
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Cliente: N/A');
    });
  });

  // ===================================================================
  // generateInvoicePDF
  // ===================================================================
  describe('generateInvoicePDF', () => {
    it('generates invoice with products and extras', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ requires_invoice: true, tax_amount: 800, discount: 100 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        [makeExtra() as any]
      );

      expect(autoTableMock).toHaveBeenCalled();
      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.head).toEqual([['Descripción', 'Cant.', 'Precio Unit.', 'Desc.', 'Subtotal']]);
      expect(callArgs.body).toHaveLength(2); // 1 product + 1 extra
      expect(doc.save).toHaveBeenCalled();
      const saveArg = doc.save.mock.calls[0][0] as string;
      expect(saveArg).toContain('Factura_');
      expect(saveArg).toContain('María López');
    });

    it('generates invoice number from event id', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ id: 'abc12345-rest-of-id' }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('INV-ABC12345');
    });

    it('shows empty message when no products and no extras', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile() as any,
        [],
        []
      );

      expect(autoTableMock).not.toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalledWith(
        'No hay conceptos registrados.',
        20,
        expect.any(Number)
      );
    });

    it('displays provider/emisor info from profile', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile({ business_name: 'Catering Deluxe', email: 'info@catering.com' }) as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('DATOS DEL EMISOR');
      expect(textCalls).toContain('Razón Social: Catering Deluxe');
      expect(textCalls).toContain('Email: info@catering.com');
    });

    it('displays receptor/client info', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('DATOS DEL RECEPTOR');
      expect(textCalls).toContain('Cliente: María López');
      expect(textCalls).toContain('Teléfono: 555-1234');
      expect(textCalls).toContain('Email: maria@example.com');
      expect(textCalls).toContain('Dirección: Calle Reforma 123');
    });

    it('omits optional client fields when not present', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({
          client: { name: 'Solo Nombre' },
        }) as any,
        makeProfile({ email: null }) as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Cliente: Solo Nombre');
      expect(textCalls).not.toContain(expect.stringContaining('Teléfono:'));
      expect(textCalls.filter((t: string) => typeof t === 'string' && t.startsWith('Email:')).length).toBe(0);
      expect(textCalls.filter((t: string) => typeof t === 'string' && t.startsWith('Dirección:')).length).toBe(0);
    });

    it('shows discount line when discount > 0', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ discount: 500 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Descuento:');
    });

    it('does not show discount when discount is 0', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ discount: 0 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).not.toContain('Descuento:');
    });

    it('shows IVA when requires_invoice is true', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ requires_invoice: true, tax_rate: 16, tax_amount: 800 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('IVA'))).toBe(true);
    });

    it('shows IVA when tax_amount is set even without requires_invoice', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ requires_invoice: false, tax_amount: 400 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('IVA'))).toBe(true);
    });

    it('shows event location when present', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ location: 'Jardín Botánico' }) as any,
        makeProfile() as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Ubicación: Jardín Botánico');
    });

    it('omits location when not present', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ location: null }) as any,
        makeProfile() as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls.filter((t: string) => typeof t === 'string' && t.startsWith('Ubicación:')).length).toBe(0);
    });

    it('renders product discount as $0.00 when no discount', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile() as any,
        [makeProduct({ discount: 0 }) as any],
        []
      );

      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.body[0][3]).toBe('$0.00');
    });

    it('renders product discount value when present', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile() as any,
        [makeProduct({ discount: 50 }) as any],
        []
      );

      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.body[0][3]).not.toBe('$0.00');
    });

    it('renders extra rows with $0.00 discount column', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile() as any,
        [],
        [makeExtra({ description: 'Sonido', price: 1500 }) as any]
      );

      const callArgs = autoTableMock.mock.calls[0][1];
      expect(callArgs.body[0][0]).toBe('Sonido');
      expect(callArgs.body[0][1]).toBe('1');
      expect(callArgs.body[0][3]).toBe('$0.00');
    });

    it('falls back to N/A for client name when null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ client: null }) as any,
        makeProfile() as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Cliente: N/A');
      const saveArg = doc.save.mock.calls[0][0] as string;
      expect(saveArg).toContain('Cliente');
    });

    it('falls back to profile name when business_name is null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent() as any,
        makeProfile({ business_name: null, name: 'Juan Personal' }) as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Razón Social: Juan Personal');
    });

    it('shows TOTAL line', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateInvoicePDF(
        makeEvent({ total_amount: 12000 }) as any,
        makeProfile() as any,
        [makeProduct() as any],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('TOTAL:');
      expect(textCalls).toContain('Forma de Pago: Pendiente de liquidar');
    });
  });

  // ===================================================================
  // addHeader — logo rendering
  // ===================================================================
  describe('addHeader with logo', () => {
    it('adds logo when profile has logo_url', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({ logo_url: 'data:image/png;base64,abc123' }) as any,
        [],
        []
      );

      expect(doc.getImageProperties).toHaveBeenCalledWith('data:image/png;base64,abc123');
      expect(doc.addImage).toHaveBeenCalled();
    });

    it('does not add logo when logo_url is null', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({ logo_url: null }) as any,
        [],
        []
      );

      expect(doc.addImage).not.toHaveBeenCalled();
    });

    it('handles logo error gracefully', () => {
      const doc = createDocMock();
      doc.getImageProperties.mockImplementation(() => {
        throw new Error('Invalid image');
      });
      jsPDFMock.mockReturnValue(doc);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({ logo_url: 'invalid-url' }) as any,
        [],
        []
      );

      expect(consoleSpy).toHaveBeenCalledWith('[Error adding logo to PDF]', expect.any(Error));
      expect(doc.save).toHaveBeenCalled(); // PDF still generated
      consoleSpy.mockRestore();
    });

    it('scales down large logo while preserving aspect ratio', () => {
      const doc = createDocMock();
      doc.getImageProperties.mockReturnValue({ width: 200, height: 100, fileType: 'JPEG' });
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({ logo_url: 'data:image/jpeg;base64,big' }) as any,
        [],
        []
      );

      expect(doc.addImage).toHaveBeenCalled();
      const addImageCall = doc.addImage.mock.calls[0];
      // Width should be scaled to max 30, height proportionally
      expect(addImageCall[4]).toBeLessThanOrEqual(30); // width
      expect(addImageCall[5]).toBeLessThanOrEqual(30); // height
    });

    it('does not scale logo smaller than max', () => {
      const doc = createDocMock();
      doc.getImageProperties.mockReturnValue({ width: 20, height: 15, fileType: 'PNG' });
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({ logo_url: 'data:image/png;base64,small' }) as any,
        [],
        []
      );

      expect(doc.addImage).toHaveBeenCalled();
      const addImageCall = doc.addImage.mock.calls[0];
      expect(addImageCall[4]).toBe(20); // original width
      expect(addImageCall[5]).toBe(15); // original height
    });

    it('hides business name when show_business_name_in_pdf is false and logo present', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({
          logo_url: 'data:image/png;base64,abc',
          show_business_name_in_pdf: false,
          business_name: 'Secret Brand',
        }) as any,
        [],
        []
      );

      // The business name should NOT appear in the header section
      // It calls text for the title but not the business name
      const textCalls = doc.text.mock.calls;
      const businessNameCalls = textCalls.filter(
        (c: any) => c[0] === 'Secret Brand'
      );
      expect(businessNameCalls.length).toBe(0);
    });

    it('shows business name when show_business_name_in_pdf is true', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({
          logo_url: 'data:image/png;base64,abc',
          show_business_name_in_pdf: true,
          business_name: 'Visible Brand',
        }) as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Visible Brand');
    });

    it('always shows business name when no logo_url', () => {
      const doc = createDocMock();
      jsPDFMock.mockReturnValue(doc);

      generateBudgetPDF(
        makeEvent() as any,
        makeProfile({
          logo_url: null,
          show_business_name_in_pdf: false,
          business_name: 'Always Visible',
        }) as any,
        [],
        []
      );

      const textCalls = doc.text.mock.calls.map((c: any) => c[0]);
      expect(textCalls).toContain('Always Visible');
    });
  });
});
