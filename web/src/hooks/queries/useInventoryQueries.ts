import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type { InventoryItemInsert, InventoryItemUpdate } from '@/types/entities';

// ── Queries ──

export function useInventoryItems() {
  return useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: () => inventoryService.getAll(),
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

  return useMutation({
    mutationKey: ['inventory', 'create'],
    mutationFn: (data: InventoryItemInsert) => inventoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
    },
    onError: (error) => {
      logError('Error creating inventory item', error);
      addToast(getErrorMessage(error, 'Error al crear el ítem de inventario.'), 'error');
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

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
      addToast(getErrorMessage(error, 'Error al actualizar el ítem.'), 'error');
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['inventory', 'delete'],
    mutationFn: (id: string) => inventoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
      addToast('Ítem de inventario eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting inventory item', error);
      addToast(getErrorMessage(error, 'Error al eliminar el ítem de inventario.'), 'error');
    },
  });
}
