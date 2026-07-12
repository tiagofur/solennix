import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ReviewsPage } from './ReviewsPage';
import eventReviewService from '@/services/eventReviewService';

let mockPlanLimits = { isBasicPlan: false };

vi.mock('@/hooks/usePlanLimits', () => ({
  usePlanLimits: () => mockPlanLimits,
}));

vi.mock('@/services/eventReviewService', () => ({
  default: {
    listOrganizerReviews: vi.fn(),
    updateOrganizerResponse: vi.fn(),
    updateVisibility: vi.fn(),
  },
}));

const review = {
  id: 'r1',
  client_name: 'Ana',
  event_label: 'Boda',
  submitted_at: '2026-07-01T12:00:00Z',
  rating: 5,
  comment: 'Genial',
  visibility: 'private' as const,
  organizer_response: null,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReviewsPage />
    </MemoryRouter>,
  );

describe('ReviewsPage plan gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlanLimits = { isBasicPlan: false };
    (eventReviewService.listOrganizerReviews as ReturnType<typeof vi.fn>).mockResolvedValue([review]);
  });

  it('shows mutation controls for non-basic plan', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Visibilidad')).toBeInTheDocument();
    });
    // Mutation controls present
    expect(screen.getByText('Guardar respuesta')).toBeInTheDocument();
  });

  it('gates mutations with upgrade banner for basic plan', async () => {
    mockPlanLimits = { isBasicPlan: true };
    renderPage();
    await waitFor(() => {
      // Review still renders, but mutation controls are replaced by the banner
      expect(screen.getByText('Genial')).toBeInTheDocument();
    });
    expect(screen.queryByText('Visibilidad')).not.toBeInTheDocument();
    expect(screen.queryByText('Guardar respuesta')).not.toBeInTheDocument();
  });
});
