/**
 * EventSummary — tests de la vista de fotos: render, empty state, grid,
 * lightbox, upload (success/oversized/error), remove (success/error), uploading state.
 *
 * Ver EventSummary.test.tsx (core) para contexto sobre el split.
 */

import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { logError } from '../../lib/errorHandler';
import { api } from '../../lib/api';
import { installEventSummaryMocks } from './__tests__/eventSummaryFixtures';

vi.mock('../../services/eventService', () => ({
  eventService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    getByDateRange: vi.fn().mockResolvedValue([]),
    getByClientId: vi.fn().mockResolvedValue([]),
    getUpcoming: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    getEquipment: vi.fn(),
    getSupplies: vi.fn(),
    getEventPhotos: vi.fn(),
    addEventPhoto: vi.fn(),
    deleteEventPhoto: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateItems: vi.fn(),
    delete: vi.fn(),
    checkEquipmentConflicts: vi.fn().mockResolvedValue([]),
    getEquipmentSuggestions: vi.fn().mockResolvedValue([]),
    getSupplySuggestions: vi.fn().mockResolvedValue([]),
    addProducts: vi.fn(),
    updateProducts: vi.fn(),
    updateExtras: vi.fn(),
  },
}));

vi.mock('../../services/paymentService', () => ({
  paymentService: {
    getAll: vi.fn().mockResolvedValue([]),
    getByEventId: vi.fn(),
    getByEventIds: vi.fn().mockResolvedValue([]),
    getByPaymentDateRange: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../services/productService', () => ({
  productService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    getIngredients: vi.fn().mockResolvedValue([]),
    getIngredientsForProducts: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadImage: vi.fn(),
    addIngredients: vi.fn(),
    updateIngredients: vi.fn(),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../services/clientService', () => ({
  clientService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

vi.mock('../../services/subscriptionService', () => ({
  subscriptionService: {
    getStatus: vi.fn().mockResolvedValue({ plan: 'pro', has_stripe_account: false }),
  },
}));

vi.mock('../../lib/pdfGenerator', () => ({
  generateBudgetPDF: vi.fn(),
  generateContractPDF: vi.fn(),
  generateInvoicePDF: vi.fn(),
  generateShoppingListPDF: vi.fn(),
  generatePaymentReportPDF: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'ana@example.com', plan: 'pro' }, profile: { name: 'Eventos Ana', business_name: 'Eventos Ana' } }),
}));

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({ isBasicPlan: false }),
}));

vi.mock('./components/Payments', () => ({
  Payments: () => <div>PAYMENTS_VIEW</div>,
}));

vi.mock('../../services/eventPaymentService', () => ({
  eventPaymentService: {
    createCheckoutSession: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback?: string) => fallback || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    postFormData: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'event-1' }), useNavigate: () => mockNavigate };
});

const mockedServices = { eventService, paymentService, productService } as any;
const setupMocks = (overrides: Record<string, any> = {}) =>
  installEventSummaryMocks(mockedServices, overrides);

describe('EventSummary — photos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('shows photos tab and empty state in photos view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    expect(screen.getByText('Fotos del Evento')).toBeInTheDocument();
    expect(screen.getByText('No hay fotos del evento.')).toBeInTheDocument();
    expect(screen.getByText('Agrega fotos para documentar tu trabajo.')).toBeInTheDocument();
    expect(screen.getByText('Agregar Fotos')).toBeInTheDocument();
  });

  it('renders photos fetched from the backend endpoint', async () => {
    // The Web no longer parses event.photos JSON — it calls
    // eventService.getEventPhotos(id) which returns EventPhoto[] directly.
    (eventService.getEventPhotos as any).mockResolvedValue([
      { id: 'photo-1', url: 'https://example.com/photo1.jpg', created_at: '2026-04-01T00:00:00Z' },
      { id: 'photo-2', url: 'https://example.com/photo2.jpg', created_at: '2026-04-01T00:00:00Z' },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    await waitFor(() => {
      expect(screen.getByAltText('Foto 1 del evento')).toBeInTheDocument();
    });
    expect(screen.getByAltText('Foto 2 del evento')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('opens lightbox when clicking a photo and closes it', async () => {
    (eventService.getEventPhotos as any).mockResolvedValue([
      { id: 'photo-1', url: 'https://example.com/photo1.jpg', created_at: '2026-04-01T00:00:00Z' },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    await waitFor(() => {
      expect(screen.getByAltText('Foto 1 del evento')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByAltText('Foto 1 del evento'));

    expect(screen.getByRole('dialog', { name: /Vista ampliada/i })).toBeInTheDocument();
    expect(screen.getByAltText('Foto ampliada del evento')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cerrar vista ampliada/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Vista ampliada/i })).not.toBeInTheDocument();
    });
  });

  it('closes lightbox by clicking the overlay', async () => {
    (eventService.getEventPhotos as any).mockResolvedValue([
      { id: 'photo-1', url: 'https://example.com/photo1.jpg', created_at: '2026-04-01T00:00:00Z' },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    await waitFor(() => {
      expect(screen.getByAltText('Foto 1 del evento')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByAltText('Foto 1 del evento'));

    fireEvent.click(screen.getByRole('dialog', { name: /Vista ampliada/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Vista ampliada/i })).not.toBeInTheDocument();
    });
  });

  it('uploads photos successfully', async () => {
    // Step 1: /uploads/image returns the persistent URL.
    (api.postFormData as any).mockResolvedValue({ url: 'https://example.com/uploaded.jpg' });
    // Step 2: POST /api/events/{id}/photos registers the photo on the event.
    (eventService.addEventPhoto as any).mockResolvedValue({
      id: 'new-photo-id',
      url: 'https://example.com/uploaded.jpg',
      created_at: '2026-04-01T00:00:00Z',
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo-data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.postFormData).toHaveBeenCalledWith('/uploads/image', expect.any(FormData));
    });

    await waitFor(() => {
      expect(eventService.addEventPhoto).toHaveBeenCalledWith('event-1', {
        url: 'https://example.com/uploaded.jpg',
      });
    });
    // The legacy path that serialized the array via eventService.update
    // with a JSON string is gone.
    expect(eventService.update).not.toHaveBeenCalled();
  });

  it('rejects oversized photos during upload', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(api.postFormData).not.toHaveBeenCalled();
    });
  });

  it('handles photo upload error', async () => {
    (api.postFormData as any).mockRejectedValue(new Error('upload failed'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error uploading event photos', expect.any(Error));
    });
  });

  it('removes a photo successfully', async () => {
    (eventService.getEventPhotos as any).mockResolvedValue([
      { id: 'photo-1', url: 'https://example.com/photo1.jpg', created_at: '2026-04-01T00:00:00Z' },
      { id: 'photo-2', url: 'https://example.com/photo2.jpg', created_at: '2026-04-01T00:00:00Z' },
    ]);
    (eventService.deleteEventPhoto as any).mockResolvedValue(undefined);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar foto 1/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar foto 1/i }));

    await waitFor(() => {
      expect(eventService.deleteEventPhoto).toHaveBeenCalledWith('event-1', 'photo-1');
    });
    expect(eventService.update).not.toHaveBeenCalled();
  });

  it('handles photo removal error', async () => {
    (eventService.getEventPhotos as any).mockResolvedValue([
      { id: 'photo-1', url: 'https://example.com/photo1.jpg', created_at: '2026-04-01T00:00:00Z' },
    ]);
    (eventService.deleteEventPhoto as any).mockRejectedValue(new Error('remove failed'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Eliminar foto 1/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Eliminar foto 1/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error removing photo', expect.any(Error));
    });
  });

  it('clicking "Agregar Fotos" triggers the file input', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByText('Agregar Fotos'));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('clicking the lightbox image does not close the lightbox (stopPropagation)', async () => {
    (eventService.getEventPhotos as any).mockResolvedValue([
      { id: 'photo-1', url: 'https://example.com/photo1.jpg', created_at: '2026-04-01T00:00:00Z' },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    await waitFor(() => {
      expect(screen.getByAltText('Foto 1 del evento')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByAltText('Foto 1 del evento'));

    expect(screen.getByRole('dialog', { name: /Vista ampliada/i })).toBeInTheDocument();

    fireEvent.click(screen.getByAltText('Foto ampliada del evento'));

    expect(screen.getByRole('dialog', { name: /Vista ampliada/i })).toBeInTheDocument();
  });

  it('shows uploading state when photo upload is in progress', async () => {
    let resolveUpload: (value: { url: string }) => void;
    (api.postFormData as any).mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Subiendo...')).toBeInTheDocument();
    });

    resolveUpload!({ url: 'https://example.com/uploaded.jpg' });
    (eventService.update as any).mockResolvedValue({});

    await waitFor(() => {
      expect(screen.queryByText('Subiendo...')).not.toBeInTheDocument();
    });
  });
});
