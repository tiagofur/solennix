import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@tests/customRender';
import { ClientPortalShareCard } from './ClientPortalShareCard';

const mockUseEventPublicLink = vi.fn();
const mockUseCreateOrRotate = vi.fn();
const mockUseRevoke = vi.fn();
const mockAddToast = vi.fn();
const mockLogError = vi.fn();

vi.mock('../../../hooks/queries/useEventPublicLinkQueries', () => ({
  useEventPublicLink: (...args: unknown[]) => mockUseEventPublicLink(...args),
  useCreateOrRotateEventPublicLink: (...args: unknown[]) => mockUseCreateOrRotate(...args),
  useRevokeEventPublicLink: (...args: unknown[]) => mockUseRevoke(...args),
}));

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('../../../lib/errorHandler', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: { url?: string }) => {
      if (key === 'client_portal_share.share_message') {
        return `Comparti este enlace: ${vars?.url ?? ''}`;
      }
      return key;
    },
  }),
}));

describe('ClientPortalShareCard', () => {
  const createOrRotateMutateAsync = vi.fn();
  const revokeMutateAsync = vi.fn();
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: vi.fn(() => true),
    });

    Object.defineProperty(window, 'open', {
      writable: true,
      value: vi.fn(),
    });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText,
      },
    });

    mockUseEventPublicLink.mockReturnValue({
      data: null,
      isLoading: false,
    });

    createOrRotateMutateAsync.mockResolvedValue({});
    revokeMutateAsync.mockResolvedValue(undefined);

    mockUseCreateOrRotate.mockReturnValue({
      isPending: false,
      mutateAsync: createOrRotateMutateAsync,
    });

    mockUseRevoke.mockReturnValue({
      isPending: false,
      mutateAsync: revokeMutateAsync,
    });
  });

  function renderComponent() {
    return render(<ClientPortalShareCard eventId="event-1" />);
  }

  it('renders loading state', () => {
    mockUseEventPublicLink.mockReturnValue({
      data: null,
      isLoading: true,
    });

    renderComponent();

    expect(screen.getByText('client_portal_share.loading')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'client_portal_share.generate' })).not.toBeInTheDocument();
  });

  it('generates link and shows success toast', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.generate' }));

    await waitFor(() => {
      expect(createOrRotateMutateAsync).toHaveBeenCalledWith({});
    });

    expect(mockAddToast).toHaveBeenCalledWith('client_portal_share.toast_generate', 'success');
  });

  it('logs error when generate fails', async () => {
    createOrRotateMutateAsync.mockRejectedValueOnce(new Error('boom'));

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.generate' }));

    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith('ClientPortalShareCard:generate', expect.any(Error));
    });
  });

  it('copies link and toggles copied label', async () => {
    mockUseEventPublicLink.mockReturnValue({
      data: { url: 'https://example.com/public/event-1' },
      isLoading: false,
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.copy_link' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://example.com/public/event-1');
      expect(mockAddToast).toHaveBeenCalledWith('client_portal_share.toast_copy', 'success');
      expect(screen.getByRole('button', { name: 'client_portal_share.copied' })).toBeInTheDocument();
    });
  });

  it('logs error when copy fails', async () => {
    writeText.mockRejectedValueOnce(new Error('clipboard-failed'));
    mockUseEventPublicLink.mockReturnValue({
      data: { url: 'https://example.com/public/event-1' },
      isLoading: false,
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.copy_link' }));

    await waitFor(() => {
      expect(mockLogError).toHaveBeenCalledWith('ClientPortalShareCard:copy', expect.any(Error));
    });
  });

  it('opens whatsapp share url', () => {
    mockUseEventPublicLink.mockReturnValue({
      data: { url: 'https://example.com/public/event-1' },
      isLoading: false,
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.share_whatsapp' }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('rotates link only when confirmed', async () => {
    const confirmMock = vi.mocked(window.confirm);
    confirmMock.mockReturnValueOnce(false);

    mockUseEventPublicLink.mockReturnValue({
      data: { url: 'https://example.com/public/event-1' },
      isLoading: false,
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.rotate' }));
    expect(createOrRotateMutateAsync).not.toHaveBeenCalled();

    confirmMock.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.rotate' }));

    await waitFor(() => {
      expect(createOrRotateMutateAsync).toHaveBeenCalledWith({});
    });

    expect(mockAddToast).toHaveBeenCalledWith('client_portal_share.toast_rotate', 'success');
  });

  it('revokes link only when confirmed', async () => {
    const confirmMock = vi.mocked(window.confirm);
    confirmMock.mockReturnValueOnce(false);

    mockUseEventPublicLink.mockReturnValue({
      data: { url: 'https://example.com/public/event-1' },
      isLoading: false,
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.revoke' }));
    expect(revokeMutateAsync).not.toHaveBeenCalled();

    confirmMock.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'client_portal_share.revoke' }));

    await waitFor(() => {
      expect(revokeMutateAsync).toHaveBeenCalledWith(undefined);
    });

    expect(mockAddToast).toHaveBeenCalledWith('client_portal_share.toast_revoke', 'info');
  });

  it('disables actions when mutation is pending', () => {
    mockUseEventPublicLink.mockReturnValue({
      data: { url: 'https://example.com/public/event-1' },
      isLoading: false,
    });
    mockUseCreateOrRotate.mockReturnValue({
      isPending: true,
      mutateAsync: createOrRotateMutateAsync,
    });

    renderComponent();

    expect(screen.getByRole('button', { name: 'client_portal_share.copy_link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'client_portal_share.share_whatsapp' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'client_portal_share.rotate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'client_portal_share.revoke' })).toBeDisabled();
  });
});
