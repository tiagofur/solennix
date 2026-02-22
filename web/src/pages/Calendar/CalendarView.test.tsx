import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CalendarView } from './CalendarView';
import { eventService } from '../../services/eventService';
import { logError } from '../../lib/errorHandler';

const mockNavigate = vi.fn();

vi.mock('../../services/eventService', () => ({
  eventService: {
    getByDateRange: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('react-day-picker', () => ({
  DayPicker: ({ onSelect, onMonthChange }: any) => (
    <div>
      <button onClick={() => onSelect?.(new Date(2024, 0, 2, 12))}>Select</button>
      <button onClick={() => onSelect?.(undefined)}>Clear</button>
      <button onClick={() => onMonthChange?.(new Date(2024, 1, 1, 12))}>Next</button>
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderCalendar = () =>
  render(
    <MemoryRouter>
      <CalendarView />
    </MemoryRouter>
  );

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders events for selected date', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      {
        id: '1',
        event_date: '2024-01-02',
        status: 'confirmed',
        service_type: 'Boda',
        num_people: 100,
        client: { name: 'Ana' },
      },
    ]);

    renderCalendar();

    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      expect(eventService.getByDateRange).toHaveBeenCalled();
    });
    expect(eventService.getByDateRange).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('navigates to edit on event click', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      {
        id: '1',
        event_date: '2024-01-02',
        status: 'confirmed',
        service_type: 'Boda',
        num_people: 100,
        client: { name: 'Ana' },
      },
    ]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      expect(eventService.getByDateRange).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Ana'));
    expect(mockNavigate).toHaveBeenCalledWith('/events/1/summary');
  });

  it('shows empty state when no events', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      expect(screen.getByText(/No hay eventos para este día/i)).toBeInTheDocument();
    });
  });

  it('clears selected date for new event link', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();

    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Nuevo Evento/i }).getAttribute('href')).toEqual('/events/new');
    });
  });

  it('logs errors when events fetch fails', async () => {
    (eventService.getByDateRange as any).mockRejectedValue(new Error('fail'));

    renderCalendar();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error fetching events', expect.any(Error));
    });
  });
});
