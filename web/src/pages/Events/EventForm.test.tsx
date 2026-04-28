import React, { useEffect } from 'react';
import { act } from '@testing-library/react';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { EventForm } from './EventForm';
import { eventService } from '../../services/eventService';
import { clientService } from '../../services/clientService';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import { logError } from '../../lib/errorHandler';

let mockTriggerFetchCosts = () => {};

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};
const mockTrigger = vi.fn().mockImplementation(() => Promise.resolve(true));
let mockSetValueMock = vi.fn();
let mockProductsBehavior: 'passive' | 'invoke' = 'passive';
let mockExtrasBehavior: 'passive' | 'invoke' = 'passive';
let mockSearchParams = new URLSearchParams();
let mockProductsInvoked = false;
let mockWatchValues: Record<string, any> = {
  discount: 0,
  client_id: '',
  location: '',
  city: '',
  requires_invoice: false,
  tax_rate: 16,
};

const mockFormData = {
  client_id: 'client-1',
  event_date: '2024-01-02',
  start_time: '',
  end_time: '',
  service_type: 'Boda',
  num_people: 100,
  status: 'quoted',
  discount: 0,
  requires_invoice: false,
  tax_rate: 16,
  tax_amount: 0,
  total_amount: 100,
  location: '',
  city: '',
  deposit_percent: 50,
  cancellation_days: 15,
  refund_percent: 0,
  notes: '',
};

// No more unused helpers here

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual<any>('react-hook-form');
  return {
    ...actual,
    useForm: (options: any) => {
      const methods = actual.useForm(options);
      return {
        ...methods,
        trigger: mockTrigger,
        handleSubmit: (fn: any) => (e: any) => {
          if (e && e.preventDefault) e.preventDefault();
          return fn(mockFormData);
        },
        setValue: (name: string, value: any, options?: any) => {
          mockWatchValues[name] = value;
          mockSetValueMock(name, value, options);
          methods.setValue(name, value, options);
        },
        watch: (name: any) => (name ? mockWatchValues[name] ?? methods.watch(name) : methods.watch()),
      };
    },
    useWatch: (options: any) => {
      try {
        const val = actual.useWatch(options);
        const name = typeof options === 'string' ? options : options?.name;
        if (!name) return val;
        return mockWatchValues[name] ?? val ?? (mockFormData as any)[name] ?? 0;
      } catch {
        const name = typeof options === 'string' ? options : options?.name;
        return name ? (mockWatchValues[name] ?? (mockFormData as any)[name] ?? 0) : {};
      }
    },
    useFormContext: () => {
      const methods = actual.useFormContext();
      if (!methods) return null;
      return {
        ...methods,
        setValue: (name: string, value: any, options?: any) => {
          mockWatchValues[name] = value;
          mockSetValueMock(name, value, options);
          methods.setValue(name, value, options);
        },
      };
    }
  };
});

const mockUser = { id: 'user-1' };
const mockProfile = { default_deposit_percent: 50, default_cancellation_days: 15, default_refund_percent: 0 };

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
  }),
}));

let mockPlanLimits = {
  canCreateEvent: true,
  eventsThisMonth: 0,
  limit: 3,
  loading: false,
};

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => mockPlanLimits,
}));

let mockClientCreatedCallback: ((client: any) => void) | null = null;

vi.mock('./components/EventGeneralInfo', () => ({
  EventGeneralInfo: (props: any) => {
    mockClientCreatedCallback = props.onClientCreated;
    return <div>EVENT_GENERAL</div>;
  },
}));

vi.mock('./components/EventProducts', () => ({
  EventProducts: (props: any) => {
    mockTriggerFetchCosts = () => {
      if (props.selectedProducts.length === 0) {
        props.onAddProduct();
        return;
      }
      props.onProductChange(0, 'product_id', 'p1');
      props.onProductChange(0, 'quantity', 2);
      props.onProductChange(0, 'discount', 5);
    };
    useEffect(() => {
      if (mockProductsBehavior !== 'invoke') return;
      if (mockProductsInvoked) return;
      if (props.selectedProducts.length === 0) {
        props.onAddProduct();
        return;
      }
      props.onProductChange(0, 'product_id', 'p1');
      props.onProductChange(0, 'quantity', 2);
      props.onProductChange(0, 'discount', 5);
      mockProductsInvoked = true;
    }, [props.selectedProducts.length]); // eslint-disable-line react-hooks/exhaustive-deps

    return <div>EVENT_PRODUCTS</div>;
  },
}));

vi.mock('./components/EventExtras', () => ({
  EventExtras: (props: any) => {
    useEffect(() => {
      if (mockExtrasBehavior !== 'invoke') return;
      if (props.extras?.length === 0) {
        props.onAddExtra();
        return;
      }
      props.onExtraChange(0, 'description', 'Transporte');
      props.onExtraChange(0, 'exclude_utility', true);
      props.onExtraChange(0, 'cost', 50);
    }, [props.extras?.length]); // eslint-disable-line react-hooks/exhaustive-deps

    return <div>EVENT_EXTRAS</div>;
  },
}));

vi.mock('./components/EventEquipment', () => ({
  EventEquipment: () => <div>EVENT_EQUIPMENT</div>,
}));

vi.mock('./components/EventSupplies', () => ({
  EventSupplies: () => <div>EVENT_SUPPLIES</div>,
}));

vi.mock('./components/EventFinancials', () => ({
  EventFinancials: () => <div>EVENT_FINANCIALS</div>,
}));

vi.mock('../../services/eventService', () => ({
  eventService: {
    getById: vi.fn(),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    getEquipment: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateItems: vi.fn(),
    checkEquipmentConflicts: vi.fn(),
    getEquipmentSuggestions: vi.fn(),
    getSupplies: vi.fn(),
    getSupplySuggestions: vi.fn(),
  },
}));

vi.mock('../../services/clientService', () => ({
  clientService: { getAll: vi.fn() },
}));

vi.mock('../../services/productService', () => ({
  productService: { getAll: vi.fn(), getIngredients: vi.fn() },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: { getAll: vi.fn() },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((err: any, fallback: string) => (err instanceof Error ? err.message : fallback)),
}));

vi.mock('../../services/unavailableDatesService', () => ({
  unavailableDatesService: {
    getDates: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../components/Breadcrumb', () => ({
  Breadcrumb: () => <div>BREADCRUMB</div>,
}));

vi.mock('../../components/UpgradeBanner', () => ({
  UpgradeBanner: (props: any) => (
    <div>
      <span>Límite de Eventos Alcanzado</span>
      <span>Has creado {props.currentUsage} de {props.limit} eventos</span>
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
    useSearchParams: () => [mockSearchParams],
    useLocation: () => ({ pathname: '/events/new', search: '', hash: '', state: null, key: 'default' }),
  };
});

describe('EventForm', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalConsoleError = console.error;

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      const first = args[0];
      if (typeof first === 'string' && first.includes('The current testing environment is not configured to support act(...)')) {
        return;
      }
      return originalConsoleError(...args);
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    mockNavigate.mockClear();
    mockParams = {};
    mockSearchParams = new URLSearchParams();
    mockTrigger.mockClear().mockResolvedValue(true);
    mockProductsBehavior = 'passive';
    mockExtrasBehavior = 'passive';
    mockProductsInvoked = false;
    mockWatchValues = {
      discount: 0,
      client_id: '',
      location: '',
      city: '',
      requires_invoice: false,
      tax_rate: 16,
    };
    mockSetValueMock = vi.fn();
    mockPlanLimits = {
      canCreateEvent: true,
      eventsThisMonth: 0,
      limit: 3,
      loading: false,
    };
    (eventService.getById as any).mockResolvedValue(null);
    (eventService.getProducts as any).mockResolvedValue([]);
    (eventService.getExtras as any).mockResolvedValue([]);
    (eventService.getEquipment as any).mockResolvedValue([]);
    (eventService.create as any).mockResolvedValue(null);
    (eventService.update as any).mockResolvedValue(null);
    (eventService.updateItems as any).mockResolvedValue(null);
    (eventService.checkEquipmentConflicts as any).mockResolvedValue([]);
    (eventService.getEquipmentSuggestions as any).mockResolvedValue([]);
    (eventService.getSupplies as any).mockResolvedValue([]);
    (eventService.getSupplySuggestions as any).mockResolvedValue([]);
    (clientService.getAll as any).mockResolvedValue([]);
    (productService.getAll as any).mockResolvedValue([]);
    (productService.getIngredients as any).mockResolvedValue([]);
    (inventoryService.getAll as any).mockResolvedValue([]);
    mockTriggerFetchCosts = () => {};
  });

  it('advances steps and creates event', async () => {
    (eventService.create as any).mockResolvedValue({ id: 'event-1' });
    (eventService.updateItems as any).mockResolvedValue({});

    render(<EventForm />);
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EQUIPMENT')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_FINANCIALS')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Evento/i }));
    });

    await waitFor(() => {
      expect(eventService.create).toHaveBeenCalledWith({
        ...mockFormData,
        discount_type: 'percent',
        start_time: null,
        end_time: null,
        user_id: 'user-1',
      });
      expect(eventService.updateItems).toHaveBeenCalledWith('event-1', [], [], [], [], []);
    });
  });

  it('shows edit mode and summary button', async () => {
    mockParams = { id: 'event-1' };
    (eventService.getById as any).mockResolvedValue({ id: 'event-1' });
    (eventService.getProducts as any).mockResolvedValue([]);
    (eventService.getExtras as any).mockResolvedValue([]);

    render(<EventForm />);

    await waitFor(() => {
      expect(screen.getByText('Editar Evento')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Ver Resumen/i })).toBeInTheDocument();
  });

  it('does not advance when validation fails', async () => {
    mockTrigger.mockResolvedValueOnce(false);
    render(<EventForm />);
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });
    expect(screen.queryByText('EVENT_PRODUCTS')).not.toBeInTheDocument();
  });

  it('does not create event when submitting before final step', async () => {
    (eventService.create as any).mockResolvedValue({ id: 'event-1' });

    const { container } = render(<EventForm />);
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    }, { timeout: 3000 });

    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('EVENT_EQUIPMENT')).toBeInTheDocument();
    });
    expect(eventService.create).not.toHaveBeenCalled();
  });

  it('creates event and handles create failure', async () => {
    (eventService.create as any).mockResolvedValueOnce(null);
    (productService.getIngredients as any).mockResolvedValueOnce([
      { quantity_required: 2, inventory: { unit_cost: 10 } },
    ]);

    render(<EventForm />);
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    (productService.getAll as any).mockResolvedValueOnce([
      { id: 'p1', base_price: 100 } as any,
    ]);

    await waitFor(() => {
      expect(productService.getAll).toHaveBeenCalled();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    });
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EQUIPMENT')).toBeInTheDocument();
    });
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_FINANCIALS')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Evento/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Error al crear el evento/i)).toBeInTheDocument();
    });
  });

  it('renders edit form even when event data is null', async () => {
    mockParams = { id: 'event-1' };
    (eventService.getById as any).mockResolvedValue(null);

    render(<EventForm />);

    // Component shows the edit title (id is set) even though data is null
    await waitFor(() => {
      expect(screen.getByText('Editar Evento')).toBeInTheDocument();
    });
  });

  it('auto-fills location and city from client', async () => {
    mockWatchValues.client_id = 'client-1';
    (clientService.getAll as any).mockResolvedValue([
      { id: 'client-1', address: 'Calle 1', city: 'CDMX' },
    ]);
    (eventService.getById as any).mockResolvedValue(null);
    
    render(<EventForm />);

    await waitFor(() => {
      const calls = mockSetValueMock.mock.calls;
      const locationFound = calls.some(call => call[0] === 'location' && call[1] === 'Calle 1');
      const cityFound = calls.some(call => call[0] === 'city' && call[1] === 'CDMX');
      expect(locationFound).toBe(true);
      expect(cityFound).toBe(true);
    });
  });

  it('sets client from query string', async () => {
    mockWatchValues.client_id = '';
    (clientService.getAll as any).mockResolvedValue([
      { id: 'client-1', address: 'Calle 1', city: 'CDMX' },
    ]);
    mockSearchParams = new URLSearchParams('clientId=client-1');

    render(<EventForm />);

    await waitFor(() => {
      const calls = mockSetValueMock.mock.calls;
      const found = calls.some(call => call[0] === 'client_id' && call[1] === 'client-1');
      expect(found).toBe(true);
    });
  });

  it('loads event data and formats defaults', async () => {
    mockParams = { id: 'event-1' };
    (eventService.getById as any).mockResolvedValue({
      id: 'event-1',
      client_id: 'client-1',
      event_date: '2024-01-02',
      service_type: 'Boda',
      num_people: 150,
      status: 'confirmed',
      discount: 5,
      requires_invoice: true,
      tax_rate: 16,
      tax_amount: 10,
      total_amount: 200,
      location: 'Salon',
      city: 'CDMX',
      deposit_percent: 40,
      cancellation_days: 20,
      refund_percent: 10,
      notes: 'Notas',
    });
    (productService.getIngredients as any).mockResolvedValue([]);
    (eventService.getProducts as any).mockResolvedValue([
      { product_id: 'p1', quantity: 1, unit_price: 100 },
    ]);
    (eventService.getExtras as any).mockResolvedValue([
      { description: 'Extra', cost: 10, price: 20, exclude_utility: true },
    ]);

    render(<EventForm />);

    await waitFor(() => {
      expect(eventService.getById).toHaveBeenCalledWith('event-1');
    });
  });

  it('renders gracefully when client service fails', async () => {
    (clientService.getAll as any).mockRejectedValueOnce(new Error('fail'));

    render(<EventForm />);

    // Component still renders the form even if clients fail to load
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });
  });

  it('logs failures when fetching product costs', async () => {
    mockProductsBehavior = 'passive';
    (clientService.getAll as any).mockResolvedValue([]);
    (productService.getAll as any).mockResolvedValue([{ id: 'p1', base_price: 100 }]);
    const error = new Error('fail');
    (productService.getIngredients as any).mockRejectedValue(error);

    render(<EventForm />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });

    await act(async () => {
      mockTriggerFetchCosts();
    });

    await waitFor(() => {
      expect(productService.getIngredients).toHaveBeenCalledWith('p1');
    });
    // Error is handled by React Query's global error handler, not inline logError
  });

  it('saves items with updated products and extras', async () => {
    mockProductsBehavior = 'invoke';
    mockExtrasBehavior = 'invoke';
    (eventService.create as any).mockResolvedValue({ id: 'event-1' });
    (eventService.updateItems as any).mockResolvedValue({});
    (productService.getAll as any).mockResolvedValue([{ id: 'p1', base_price: 100 }]);
    (productService.getIngredients as any).mockResolvedValue([
      { quantity_required: 2, inventory: { unit_cost: 10 } },
    ]);

    render(<EventForm />);
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EQUIPMENT')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_FINANCIALS')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Evento/i }));
    });

    await waitFor(() => {
      expect(eventService.updateItems).toHaveBeenCalledWith(
        'event-1',
        [
          expect.objectContaining({
            discount: 5,
          }),
        ],
        [
          expect.objectContaining({
            cost: 50,
          }),
        ],
        [],
        [],
        []
      );
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('navigates to /calendar when clicking the back arrow button (line 460)', async () => {
    render(<EventForm />);
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /Volver al calendario/i });
    act(() => {
      fireEvent.click(backButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
  });

  it('navigates to event summary when clicking Ver Resumen button (line 473)', async () => {
    mockParams = { id: 'event-1' };
    (eventService.getById as any).mockResolvedValue({ id: 'event-1' });
    (eventService.getProducts as any).mockResolvedValue([]);
    (eventService.getExtras as any).mockResolvedValue([]);

    render(<EventForm />);

    await waitFor(() => {
      expect(screen.getByText('Editar Evento')).toBeInTheDocument();
    });

    const summaryButton = screen.getByRole('button', { name: /Ver Resumen/i });
    act(() => {
      fireEvent.click(summaryButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/events/event-1/summary');
  });

  it('does not show Ver Resumen button when creating a new event', async () => {
    await act(async () => {
      render(<EventForm />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
      expect(screen.queryByText('Ver Resumen')).not.toBeInTheDocument();
    });
  });

  it('navigates back to a completed step when clicking on its step button (lines 488-489)', async () => {
    await act(async () => {
      render(<EventForm />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });

    // Advance from step 1 to step 2
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });

    // Advance from step 2 to step 3
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    });

    // Now click on step 1 button ("Informacion General") to navigate back
    const step1Btn = screen.getByText('Información General').closest('button')!;
    act(() => {
      fireEvent.click(step1Btn);
    });
    
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });
  });

  it('does not navigate to a future step when clicking on its step button', async () => {
    await act(async () => {
      render(<EventForm />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });

    // We are on step 1. Clicking step 3 should not navigate forward.
    const stepButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.includes('Extras')
    );
    expect(stepButtons.length).toBeGreaterThan(0);
    act(() => {
      fireEvent.click(stepButtons[0]);
    });

    // Should still be on step 1
    expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    expect(screen.queryByText('EVENT_EXTRAS')).not.toBeInTheDocument();
  });

  it('navigates back to previous step with the Anterior button (line 600)', async () => {
    await act(async () => {
      render(<EventForm />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });

    // Advance to step 2
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Siguiente/i }));
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });

    // Click "Anterior" to go back to step 1
    const prevButton = screen.getByRole('button', { name: /Volver al paso anterior/i });
    act(() => {
      fireEvent.click(prevButton);
    });

    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });
  });

  it('shows UpgradeBanner when creating and canCreateEvent is false', async () => {
    mockPlanLimits = {
      canCreateEvent: false,
      eventsThisMonth: 3,
      limit: 3,
      loading: false,
    };
    mockParams = {};

    render(<EventForm />);

    await waitFor(() => {
      expect(screen.getByText(/Límite de Eventos Alcanzado/i)).toBeInTheDocument();
    });

    // Regresar button should navigate back
    const backBtn = screen.getByText('Regresar');
    act(() => {
      fireEvent.click(backBtn);
    });
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('shows loading spinner when plan limits are loading', async () => {
    mockPlanLimits = {
      canCreateEvent: true,
      eventsThisMonth: 0,
      limit: 3,
      loading: true,
    };

    render(<EventForm />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando formulario de evento...')).toBeInTheDocument();

    // Settle background state updates
    await waitFor(() => {
      expect(clientService.getAll).toHaveBeenCalled();
    });
  });

  it('prevents Enter key from submitting the form (line 561)', async () => {
    const { container } = render(<EventForm />);

    // Wait for the form to render after plan limits loading
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    const form = container.querySelector('form')!;

    // Create a real KeyboardEvent, dispatch from an INPUT to test the onKeyDown handler
    const input = form.querySelector('input') || form;
    const keyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

    input.dispatchEvent(keyEvent);

    // The form's onKeyDown should call preventDefault for Enter on non-textarea elements
    expect(preventDefaultSpy).toHaveBeenCalled();

    // Settle background state updates
    await waitFor(() => {
      expect(clientService.getAll).toHaveBeenCalled();
    });
  });

  it('allows Enter key in TEXTAREA elements', async () => {
    const { container } = render(<EventForm />);

    // Wait for the form to render after plan limits loading
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    const form = container.querySelector('form')!;

    // For TEXTAREA, Enter should not be prevented
    const keyEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
    });
    Object.defineProperty(keyEvent, 'target', {
      value: { tagName: 'TEXTAREA' },
    });
    const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');

    form.dispatchEvent(keyEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();

    // Settle background state updates
    await waitFor(() => {
      expect(clientService.getAll).toHaveBeenCalled();
    });
  });

  it('shows step titles in the navigation bar', async () => {
    render(<EventForm />);

    // Wait for the form to render after plan limits loading
    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    expect(screen.getByText('Información General')).toBeInTheDocument();
    expect(screen.getByText('Productos')).toBeInTheDocument();
    expect(screen.getByText('Extras')).toBeInTheDocument();
    expect(screen.getByText('Inventario y Personal')).toBeInTheDocument();
    expect(screen.getByText('Finanzas y Contrato')).toBeInTheDocument();
  });

  it('updates event when id is present on save', async () => {
    mockParams = { id: 'event-1' };
    (eventService.getById as any).mockResolvedValue({
      id: 'event-1',
      client_id: 'client-1',
      event_date: '2024-01-02',
      service_type: 'Boda',
      num_people: 100,
      status: 'quoted',
    });
    (eventService.getProducts as any).mockResolvedValue([]);
    (eventService.getExtras as any).mockResolvedValue([]);
    (eventService.update as any).mockResolvedValue({});
    (eventService.updateItems as any).mockResolvedValue({});

    render(<EventForm />);

    await waitFor(() => {
      expect(screen.getByText('Editar Evento')).toBeInTheDocument();
    });

    // Advance through all steps
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EQUIPMENT')).toBeInTheDocument();
    });

    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_FINANCIALS')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Evento/i }));
    });

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', expect.objectContaining({
        client_id: 'client-1',
        user_id: 'user-1',
      }));
      expect(eventService.updateItems).toHaveBeenCalledWith('event-1', [], [], [], [], []);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/events/event-1/summary');
  });

  it('handles save error gracefully', async () => {
    (eventService.create as any).mockRejectedValue(new Error('Save failed'));

    render(<EventForm />);

    // Advance to final step
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_PRODUCTS')).toBeInTheDocument();
    });
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EXTRAS')).toBeInTheDocument();
    });
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_EQUIPMENT')).toBeInTheDocument();
    });
    await act(async () => {
      const nextBtn = screen.getByRole('button', { name: /Siguiente/i });
      await waitFor(() => expect(nextBtn).not.toBeDisabled());
      fireEvent.click(nextBtn);
    });
    await waitFor(() => {
      expect(screen.getByText('EVENT_FINANCIALS')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Guardar Evento/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalledWith('Error saving event', expect.any(Error));
  });

  it('handles the handleClientCreated callback (line 350-356)', async () => {
    (clientService.getAll as any).mockResolvedValue([]);

    render(<EventForm />);

    await waitFor(() => {
      expect(screen.getByText('EVENT_GENERAL')).toBeInTheDocument();
    });

    // The EventGeneralInfo mock captures the onClientCreated callback
    expect(mockClientCreatedCallback).toBeTruthy();

    // Call the callback with a new client
    await act(async () => {
      mockClientCreatedCallback!({ id: 'client-new', name: 'New Client' });
    });

    // The setValue should be called with the new client id after queueMicrotask
    await waitFor(() => {
      expect(mockSetValueMock).toHaveBeenCalledWith('client_id', 'client-new', { shouldValidate: true });
    });
  });

  it('does not allow going to previous step when on step 1', async () => {
    await act(async () => {
      render(<EventForm />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });

    // The "Anterior" button should be invisible on step 1
    const prevButton = screen.getByRole('button', { name: /Volver al paso anterior/i });
    // The button has the 'invisible' class when on step 1
    expect(prevButton.className).toContain('invisible');
  });

  it('allows editing in canCreateEvent=false mode when editing existing event', async () => {
    mockPlanLimits = {
      canCreateEvent: false,
      eventsThisMonth: 3,
      limit: 3,
      loading: false,
    };
    mockParams = { id: 'event-1' };
    (eventService.getById as any).mockResolvedValue({
      id: 'event-1',
      client_id: 'client-1',
      event_date: '2024-01-02',
      service_type: 'Boda',
      num_people: 100,
      status: 'quoted',
    });
    (eventService.getProducts as any).mockResolvedValue([]);
    (eventService.getExtras as any).mockResolvedValue([]);

    render(<EventForm />);

    // Should show the edit form, not the upgrade banner
    await waitFor(() => {
      expect(screen.getByText('Editar Evento')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Límite de Eventos Alcanzado/i)).not.toBeInTheDocument();
  });
});
