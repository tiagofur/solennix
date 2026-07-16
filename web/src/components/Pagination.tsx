import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10
}) => {
  const { t } = useTranslation('common');

  if (totalPages <= 1) return null;

  // Calculate generic page range to show (e.g. max 5 buttons)
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = startPage + maxPagesToShow - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-alt ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={t('pagination.go_previous')}
        >
          {t('pagination.previous')}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`relative ml-3 inline-flex items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-alt ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={t('pagination.go_next')}
        >
          {t('pagination.next')}
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            {t('pagination.showing')} <span className="font-medium">{startItem}</span> {t('pagination.to')} <span className="font-medium">{endItem}</span> {t('pagination.of')}{' '}
            <span className="font-medium">{totalItems}</span> {t('pagination.results')}
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs overflow-hidden" aria-label={t('a11y.pagination')}>
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-l-xl px-2 py-2 text-text-tertiary ring-1 ring-inset ring-border hover:bg-surface-alt focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={t('pagination.go_previous')}
            >
              <span className="sr-only">{t('pagination.previous')}</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            {pages.map(page => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-label={t('pagination.go_to_page', { page })}
                aria-current={currentPage === page ? 'page' : undefined}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                  currentPage === page
                    ? 'z-10 bg-primary text-white focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                    : 'text-text ring-1 ring-inset ring-border hover:bg-surface-alt'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-r-xl px-2 py-2 text-text-tertiary ring-1 ring-inset ring-border hover:bg-surface-alt focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={t('pagination.go_next')}
            >
              <span className="sr-only">{t('pagination.next')}</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};
