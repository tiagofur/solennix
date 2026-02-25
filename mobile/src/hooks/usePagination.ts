import { useState, useMemo } from 'react';

interface UsePaginationProps<T> {
    data: T[];
    itemsPerPage?: number;
    initialSortKey?: keyof T | '';
    initialSortOrder?: 'asc' | 'desc';
}

export function usePagination<T>({
    data,
    itemsPerPage = 20,
    initialSortKey = '',
    initialSortOrder = 'asc',
}: UsePaginationProps<T>) {
    const [sortKey, setSortKey] = useState<keyof T | ''>(initialSortKey);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
    const [visibleCount, setVisibleCount] = useState(itemsPerPage);

    // Sorting logic
    const sortedData = useMemo(() => {
        if (!sortKey || !data) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];

            if (aValue === bValue) return 0;

            const isAsc = sortOrder === 'asc';

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return isAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (aValue > bValue) return isAsc ? 1 : -1;
            if (aValue < bValue) return isAsc ? -1 : 1;

            return 0;
        });
    }, [data, sortKey, sortOrder]);

    // Infinite scroll: show first N items
    const currentData = useMemo(() => {
        return sortedData?.slice(0, visibleCount) || [];
    }, [sortedData, visibleCount]);

    const hasMore = (sortedData?.length || 0) > visibleCount;

    const loadMore = () => {
        if (hasMore) {
            setVisibleCount((prev) => prev + itemsPerPage);
        }
    };

    const reset = () => {
        setVisibleCount(itemsPerPage);
    };

    const handleSort = (key: keyof T) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
        reset();
    };

    return {
        currentData,
        totalItems: data?.length || 0,
        sortKey,
        sortOrder,
        hasMore,
        loadMore,
        reset,
        handleSort,
        setSortKey,
        setSortOrder,
    };
}
