import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: vi.fn(),
    totalItems: 50,
    itemsPerPage: 10,
  };

  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} totalItems={5} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when totalPages is 0', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={0} totalItems={0} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders pagination when totalPages > 1', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByLabelText('Pagination')).toBeInTheDocument();
  });

  it('displays correct item range text', () => {
    render(<Pagination {...defaultProps} currentPage={2} />);
    // Page 2: items 11 to 20 of 50
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('displays correct item range for last page with partial items', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={3}
        totalPages={3}
        totalItems={25}
        itemsPerPage={10}
      />
    );
    // Page 3: items 21 to 25 of 25 — "25" appears twice (endItem & totalItems)
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(2);
  });

  it('renders page number buttons', () => {
    render(<Pagination {...defaultProps} />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Ir a la página ${i}`)).toBeInTheDocument();
    }
  });

  it('marks current page with aria-current="page"', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    const currentButton = screen.getByLabelText('Ir a la página 3');
    expect(currentButton).toHaveAttribute('aria-current', 'page');

    // Other pages should not have aria-current
    const otherButton = screen.getByLabelText('Ir a la página 1');
    expect(otherButton).not.toHaveAttribute('aria-current');
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    // There are multiple "previous" buttons (mobile + desktop), check all
    const prevButtons = screen.getAllByLabelText('Ir a la página anterior');
    prevButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    const nextButtons = screen.getAllByLabelText('Ir a la página siguiente');
    nextButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('enables previous and next buttons on middle page', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    const prevButtons = screen.getAllByLabelText('Ir a la página anterior');
    const nextButtons = screen.getAllByLabelText('Ir a la página siguiente');
    prevButtons.forEach((btn) => expect(btn).not.toBeDisabled());
    nextButtons.forEach((btn) => expect(btn).not.toBeDisabled());
  });

  it('calls onPageChange with previous page when clicking previous button', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

    // Click the desktop previous button (inside the nav)
    const prevButtons = screen.getAllByLabelText('Ir a la página anterior');
    await user.click(prevButtons[0]);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with next page when clicking next button', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

    const nextButtons = screen.getAllByLabelText('Ir a la página siguiente');
    await user.click(nextButtons[0]);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange with correct page when clicking a page button', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination {...defaultProps} currentPage={1} onPageChange={onPageChange} />);

    await user.click(screen.getByLabelText('Ir a la página 4'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('renders mobile previous/next buttons', () => {
    render(<Pagination {...defaultProps} currentPage={3} />);
    // "Anterior"/"Siguiente" appear in mobile buttons and desktop sr-only spans
    expect(screen.getAllByText('Anterior').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Siguiente').length).toBeGreaterThanOrEqual(1);
  });

  it('shows max 5 page buttons for many pages', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        totalPages={20}
        totalItems={200}
      />
    );
    // Should show pages around current page (3,4,5,6,7)
    for (let i = 3; i <= 7; i++) {
      expect(screen.getByLabelText(`Ir a la página ${i}`)).toBeInTheDocument();
    }
    // Should not show page 1 or 2
    expect(screen.queryByLabelText('Ir a la página 1')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ir a la página 2')).not.toBeInTheDocument();
  });

  it('adjusts page range when near end of pages', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={19}
        totalPages={20}
        totalItems={200}
      />
    );
    // Should show pages 16-20 (adjusted so endPage does not exceed totalPages)
    for (let i = 16; i <= 20; i++) {
      expect(screen.getByLabelText(`Ir a la página ${i}`)).toBeInTheDocument();
    }
  });

  it('adjusts page range when near start of pages', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={2}
        totalPages={20}
        totalItems={200}
      />
    );
    // Should show pages 1-5
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Ir a la página ${i}`)).toBeInTheDocument();
    }
  });

  it('uses default itemsPerPage of 10 when not provided', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={vi.fn()}
        totalItems={50}
      />
    );
    // Page 2 with itemsPerPage=10: showing 11 to 20
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('handles totalItems not provided gracefully', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={vi.fn()}
      />
    );
    // endItem = Math.min(10, 0) = 0, startItem = 1
    // "1" also appears as page button, so use getAllByText
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles 2 total pages correctly', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={1}
        totalPages={2}
        totalItems={15}
      />
    );
    expect(screen.getByLabelText('Ir a la página 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir a la página 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ir a la página 3')).not.toBeInTheDocument();
  });
});
