import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
  initialSortKey?: keyof T | '';
  initialSortOrder?: 'asc' | 'desc';
}

export function usePagination<T>({
  data,
  itemsPerPage = 10,
  initialSortKey = '',
  initialSortOrder = 'asc',
}: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T | ''>(initialSortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortKey || !data) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === bValue) return 0;
      
      const isAsc = sortOrder === 'asc';
      
      // Handle strings
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return isAsc 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Handle numbers or other comparable types
      if (aValue > bValue) return isAsc ? 1 : -1;
      if (aValue < bValue) return isAsc ? -1 : 1;
      
      return 0;
    });
  }, [data, sortKey, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil((sortedData?.length || 0) / itemsPerPage);
  
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedData?.slice(start, end) || [];
  }, [sortedData, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New key, default ascending
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return {
    currentData,
    currentPage,
    totalPages,
    totalItems: data?.length || 0,
    sortKey,
    sortOrder,
    handlePageChange,
    handleSort,
    setSortKey,
    setSortOrder
  };
}
