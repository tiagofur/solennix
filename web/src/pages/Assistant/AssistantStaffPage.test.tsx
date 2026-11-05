import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { AssistantStaffPage } from './AssistantStaffPage';

const mockUseStaff = vi.fn();

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useStaff: (...args: unknown[]) => mockUseStaff(...args),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: 'es' },
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AssistantStaffPage />
    </MemoryRouter>,
  );
}

describe('AssistantStaffPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStaff.mockReturnValue({
      data: [
        {
          id: 's1',
          user_id: 'owner-1',
          name: 'María',
          role_label: 'Fotógrafa',
          email: 'maria@example.com',
          phone: '5551234567',
          notification_email_opt_in: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('renders the read-only staff directory', async () => {
    renderPage();
    expect(await screen.findByText('Directorio de personal')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.getByText('Fotógrafa')).toBeInTheDocument();
  });

  it('exposes no mutations: no invite, edit or delete actions', async () => {
    renderPage();
    await screen.findByText('Directorio de personal');
    expect(screen.queryByRole('button', { name: /invit|edit|elimin|delet/i })).not.toBeInTheDocument();
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^\/assistant/);
    }
  });

  it('renders empty state without staff', async () => {
    mockUseStaff.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(await screen.findByText('Todavía no hay personal registrado.')).toBeInTheDocument();
  });
});
