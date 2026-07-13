import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import { CATALOG_STALE_TIME } from '@/lib/queryClient';
import type { InventoryItemInsert, InventoryItemUpdate, PaginationParams } from '@/types/entities';
import { useTranslation } from 'react-i18next';

// ── Queries ──

export function useInventoryItems() {
  return useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: () => inventoryService.getAll(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useInventoryItemsPaginated(params: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.inventory.paginated(params.page, params.limit, params.sort, params.order),
    queryFn: () => inventoryService.getPage(params),
    placeholderData: keepPreviousData,
  });
}

export function useInventoryItem(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id!),
    queryFn: () => inventoryService.getById(id!),
    enabled: !!id,
  });
}

// ── Mutations ──

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('inventory');

  return useMutation({
    mutationKey: ['inventory', 'create'],
    mutationFn: (data: InventoryItemInsert) => inventoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
    },
    onError: (error) => {
      logError('Error creating inventory item', error);
      addToast(getErrorMessage(error, t('list.error_create')), 'error');
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('inventory');

  return useMutation({
    mutationKey: ['inventory', 'update'],
    mutationFn: ({ id, data }: { id: string; data: InventoryItemUpdate }) =>
      inventoryService.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.detail(id) });
    },
    onError: (error) => {
      logError('Error updating inventory item', error);
      addToast(getErrorMessage(error, t('list.error_update')), 'error');
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('inventory');

  return useMutation({
    mutationKey: ['inventory', 'delete'],
    mutationFn: (id: string) => inventoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
      addToast(t('list.item_deleted'), 'success');
    },
    onError: (error) => {
      logError('Error deleting inventory item', error);
      addToast(getErrorMessage(error, t('list.error_delete')), 'error');
    },
  });
}
