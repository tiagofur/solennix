import { render, screen, fireEvent } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ProductDemandWidget } from './ProductDemandWidget';
import { useProductDemand } from '@/hooks/queries/useDashboardQueries';
import { vi } from 'vitest';

vi.mock('@/hooks/queries/useDashboardQueries', () => ({
  useProductDemand: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProductDemandWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useProductDemand).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<ProductDemandWidget />);
    expect(screen.getByText('Demanda de productos')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    vi.mocked(useProductDemand).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<ProductDemandWidget />);
    expect(screen.getByText('Sin datos de productos aún')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useProductDemand).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<ProductDemandWidget />);
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
  });

  it('navigates to product details on click', () => {
    vi.mocked(useProductDemand).mockReturnValue({
      data: [
        { id: 'product-1', name: 'Premium Cupcake', times_used: 10, total_revenue: 500 },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(
      <MemoryRouter>
        <ProductDemandWidget />
      </MemoryRouter>
    );

    const productName = screen.getByText('Premium Cupcake');
    expect(productName).toBeInTheDocument();

    const productRow = productName.closest('.cursor-pointer');
    expect(productRow).toBeInTheDocument();

    fireEvent.click(productRow!);
    expect(mockNavigate).toHaveBeenCalledWith('/products/product-1');
  });
});
