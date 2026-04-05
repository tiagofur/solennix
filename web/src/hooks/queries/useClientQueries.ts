import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type { ClientInsert, ClientUpdate } from '@/types/entities';

// ── Queries ──

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => clientService.getAll(),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => clientService.getById(id!),
    enabled: !!id,
  });
}

// ── Mutations ──

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['clients', 'create'],
    mutationFn: (data: ClientInsert) => clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
    },
    onError: (error) => {
      logError('Error creating client', error);
      addToast(getErrorMessage(error, 'Error al crear el cliente.'), 'error');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['clients', 'update'],
    mutationFn: ({ id, data }: { id: string; data: ClientUpdate }) =>
      clientService.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(id) });
    },
    onError: (error) => {
      logError('Error updating client', error);
      addToast(getErrorMessage(error, 'Error al actualizar el cliente.'), 'error');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['clients', 'delete'],
    mutationFn: (id: string) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
      addToast('Cliente eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting client', error);
      addToast(getErrorMessage(error, 'Error al eliminar el cliente.'), 'error');
    },
  });
}

export function useUploadClientPhoto() {
  return useMutation({
    mutationKey: ['clients', 'uploadPhoto'],
    mutationFn: (file: File) => clientService.uploadPhoto(file),
  });
}
