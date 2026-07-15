import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { StaffList } from './StaffList';

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useStaff: vi.fn(() => ({ data: [], isLoading: false })),
  useStaffPaginated: vi.fn(() => ({
    data: { data: [], page: 1, total_pages: 1, total: 0 },
    isLoading: false,
  })),
  useDeleteStaff: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <StaffList />
    </MemoryRouter>,
  );

describe('StaffList smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page title without crashing', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument();
    });
  });

  it('renders empty state when no staff exist', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sin colaboradores todavía')).toBeInTheDocument();
    });
  });

  it('renders the add-staff button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Agregar colaborador/i }).length).toBeGreaterThan(0);
    });
  });
});
