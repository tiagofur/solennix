import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountingExportModal } from './AccountingExportModal';
import { downloadAccountingExport } from '@/services/reportService';
import { usePlanLimits } from '@/hooks/usePlanLimits';

vi.mock('@/services/reportService', () => ({
  downloadAccountingExport: vi.fn(),
}));

vi.mock('@/hooks/usePlanLimits', () => ({
  usePlanLimits: vi.fn(),
}));

const mockUsePlanLimits = vi.mocked(usePlanLimits);
const mockDownload = vi.mocked(downloadAccountingExport);

const renderModal = (isOpen = true, onClose = vi.fn()) =>
  render(
    <MemoryRouter>
      <AccountingExportModal isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  );

describe('AccountingExportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upgrade prompt when user is on basic plan', () => {
    mockUsePlanLimits.mockReturnValue({
      isBasicPlan: true,
    } as any);

    renderModal();

    expect(screen.getByRole('heading', { name: /Exportación Contable/i })).toBeInTheDocument();
    expect(screen.getByText(/Función de planes Pro y Business/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver planes Pro y Business/i })).toBeInTheDocument();
  });

  it('renders period presets and download button when user is on pro/business plan', () => {
    mockUsePlanLimits.mockReturnValue({
      isBasicPlan: false,
    } as any);

    renderModal();

    expect(screen.getByRole('heading', { name: /Exportación Contable/i })).toBeInTheDocument();
    expect(screen.getByText(/Período/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar Excel \(CSV\)/i })).toBeInTheDocument();
  });

  it('calls downloadAccountingExport when clicking download', async () => {
    mockUsePlanLimits.mockReturnValue({
      isBasicPlan: false,
    } as any);
    mockDownload.mockResolvedValueOnce();

    const onClose = vi.fn();
    renderModal(true, onClose);

    const downloadBtn = screen.getByRole('button', { name: /Descargar Excel \(CSV\)/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
