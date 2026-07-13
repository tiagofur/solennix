import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import { CATALOG_STALE_TIME } from '@/lib/queryClient';
import type { ProductInsert, ProductUpdate, PaginationParams } from '@/types/entities';
import { useTranslation } from 'react-i18next';

// ── Queries ──

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: () => productService.getAll(),
    staleTime: CATALOG_STALE_TIME,
  });
}

export function useProductsPaginated(params: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.products.paginated(params.page, params.limit, params.sort, params.order),
    queryFn: () => productService.getPage(params),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.detail(id!),
    queryFn: () => productService.getById(id!),
    enabled: !!id,
  });
}

export function useProductIngredients(productId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.products.ingredients(productId!),
    queryFn: () => productService.getIngredients(productId!),
    enabled: !!productId,
  });
}

// ── Mutations ──

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('products');

  return useMutation({
    mutationKey: ['products', 'create'],
    mutationFn: async ({ product, ingredients }: {
      product: ProductInsert;
      ingredients: { inventoryId: string; quantityRequired: number; capacity?: number | null; bringToEvent?: boolean }[];
    }) => {
      const created = await productService.create(product);
      if (ingredients.length > 0) {
        await productService.updateIngredients(created.id, ingredients);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
    },
    onError: (error) => {
      logError('Error creating product', error);
      addToast(getErrorMessage(error, t('error_create')), 'error');
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('products');

  return useMutation({
    mutationKey: ['products', 'update'],
    mutationFn: async ({ id, product, ingredients }: {
      id: string;
      product: ProductUpdate;
      ingredients: { inventoryId: string; quantityRequired: number; capacity?: number | null; bringToEvent?: boolean }[];
    }) => {
      await productService.update(id, product);
      await productService.updateIngredients(id, ingredients);
    },
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.ingredients(id) });
    },
    onError: (error) => {
      logError('Error updating product', error);
      addToast(getErrorMessage(error, t('error_update')), 'error');
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('products');

  return useMutation({
    mutationKey: ['products', 'delete'],
    mutationFn: (id: string) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
      addToast(t('success_delete'), 'success');
    },
    onError: (error) => {
      logError('Error deleting product', error);
      addToast(getErrorMessage(error, t('error_delete')), 'error');
    },
  });
}

export function useUploadProductImage() {
  return useMutation({
    mutationKey: ['products', 'uploadImage'],
    mutationFn: (file: File) => productService.uploadImage(file),
  });
}
