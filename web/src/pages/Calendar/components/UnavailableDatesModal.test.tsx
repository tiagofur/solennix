import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';

import { UnavailableDatesModal } from './UnavailableDatesModal';

const mockAddDates = vi.fn();
const mockRemoveDate = vi.fn();
const mockGetDates = vi.fn();

vi.mock('../../../services/unavailableDatesService', () => ({
  unavailableDatesService: {
    getDates: (...a: any[]) => mockGetDates(...a),
    addDates: (...a: any[]) => mockAddDates(...a),
    removeDate: (...a: any[]) => mockRemoveDate(...a),
  },
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../../../lib/errorHandler', () => ({ logError: vi.fn() }));

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  onDelete: vi.fn(),
};

// Strings now come from the i18n catalog (src/i18n/locales/es/calendar.json).
// Tests assert against the Spanish copy because setup.ts pins i18n to 'es'.
describe('UnavailableDatesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDates.mockResolvedValue([]);
  });

  it('does not render when closed', () => {
    render(<UnavailableDatesModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Fechas No Disponibles')).not.toBeInTheDocument();
  });

  it('renders modal title when open', async () => {
    render(<UnavailableDatesModal {...defaultProps} />);
    expect(screen.getByText('Fechas No Disponibles')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetDates).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(<UnavailableDatesModal {...defaultProps} onClose={onClose} />);
    await waitFor(() => {
      expect(mockGetDates).toHaveBeenCalled();
    });
    // Close (X) button — aria-label is t('action.cancel') = "Cancelar".
    // getAllBy because the footer Close button carries the same label.
    fireEvent.click(screen.getAllByLabelText('Cancelar')[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no blocks', async () => {
    render(<UnavailableDatesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('No hay fechas bloqueadas')).toBeInTheDocument();
    });
  });

  it('shows add block button', async () => {
    render(<UnavailableDatesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Agregar rango')).toBeInTheDocument();
    });
  });

  it('shows form when add block button clicked', async () => {
    render(<UnavailableDatesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Agregar rango')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Agregar rango'));
    // After clicking, the form appears with title "Bloquear rango de fechas"
    // and a submit button "Bloquear".
    expect(screen.getByText('Bloquear rango de fechas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloquear' })).toBeInTheDocument();
  });

  it('renders existing blocks', async () => {
    mockGetDates.mockResolvedValue([
      { id: 'b1', start_date: '2025-06-15', end_date: '2025-06-15', reason: 'Vacaciones' },
    ]);
    render(<UnavailableDatesModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Vacaciones')).toBeInTheDocument();
    });
  });
});
