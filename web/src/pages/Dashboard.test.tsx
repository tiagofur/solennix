import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { eventService } from '../services/eventService';
import { inventoryService } from '../services/inventoryService';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../lib/errorHandler';

vi.mock('../services/eventService');
vi.mock('../services/inventoryService');
vi.mock('../services/paymentService');
vi.mock('../contexts/AuthContext');
vi.mock('../lib/errorHandler');

const renderDashboard = () =>
  render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ profile: { name: 'Test User' } });
    (eventService.getByDateRange as any).mockResolvedValue([]);
    (eventService.getUpcoming as any).mockResolvedValue([]);
    (inventoryService.getAll as any).mockResolvedValue([]);
    (paymentService.getByEventIds as any).mockResolvedValue([]);
    (paymentService.getByPaymentDateRange as any).mockResolvedValue([]);
  });

  it('renders greeting header', async () => {
    renderDashboard();
    expect(await screen.findByText(/hola/i)).toBeInTheDocument();
  });

  it('renders empty states when no data', async () => {
    renderDashboard();

    expect(await screen.findByText(/no hay eventos próximos/i)).toBeInTheDocument();
    expect(screen.getByText(/no hay datos suficientes para graficar/i)).toBeInTheDocument();
    expect(screen.getByText(/todo en orden/i)).toBeInTheDocument();
  });

  it('shows data cards and upcoming events when present', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      {
        id: 'event-1',
        status: 'confirmed',
        total_amount: 1000,
        tax_amount: 160,
        requires_invoice: true,
        event_date: '2024-01-20',
        client: { name: 'Ana' },
        service_type: 'Boda',
        num_people: 100,
      },
    ]);
    (eventService.getUpcoming as any).mockResolvedValue([
      {
        id: 'event-2',
        event_date: '2024-01-25',
        clients: { name: 'Luis' },
        service_type: 'XV',
        num_people: 80,
      },
    ]);
    (inventoryService.getAll as any).mockResolvedValue([
      { id: 'i1', current_stock: 0, minimum_stock: 2 },
    ]);
    (paymentService.getByEventIds as any).mockResolvedValue([
      { event_id: 'event-1', amount: 500 },
    ]);
    (paymentService.getByPaymentDateRange as any).mockResolvedValue([
      { amount: 200 },
    ]);

    renderDashboard();

    expect(await screen.findByText(/eventos este mes/i)).toBeInTheDocument();
    expect(screen.getByText(/Reponer Inventario \(Crítico\)/i)).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(screen.getByText(/XV/i)).toBeInTheDocument();
  });

  it('logs error when month events fail', async () => {
    (eventService.getByDateRange as any).mockRejectedValue(new Error('boom'));

    renderDashboard();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error loading month events', expect.any(Error));
    });
  });

  it('logs error when inventory fails', async () => {
    (inventoryService.getAll as any).mockRejectedValue(new Error('inv')); 

    renderDashboard();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error loading inventory', expect.any(Error));
    });
  });

  it('surfaces error when upcoming events fail', async () => {
    (eventService.getUpcoming as any).mockRejectedValue(new Error('oops'));

    renderDashboard();

    expect(
      await screen.findByText(/Error de conexión o permisos/i)
    ).toBeInTheDocument();
  });

  it('retries when refresh is clicked', async () => {
    renderDashboard();

    const refresh = screen.getByTitle('Recargar datos');
    fireEvent.click(refresh);

    await waitFor(() => {
      expect(eventService.getByDateRange).toHaveBeenCalledTimes(2);
      expect(eventService.getUpcoming).toHaveBeenCalledTimes(2);
      expect(inventoryService.getAll).toHaveBeenCalledTimes(2);
    });
  });
});
