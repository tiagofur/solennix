import { api } from '../lib/api';
import { Product, ProductInsert, ProductUpdate, PaginatedResponse, PaginationParams } from '../types/entities';
import type { components } from '../types/api';

/**
 * Shape that the /products/{id}/ingredients and /products/ingredients/batch
 * endpoints return at runtime: the ProductIngredient schema from the contract
 * plus a nested `inventory` join that the backend attaches but does not (yet)
 * declare in the OpenAPI spec. Declared locally so callers have a single
 * type to rely on; the backend's spec should eventually formalize this join.
 */
export type ProductIngredientWithInventory = components['schemas']['ProductIngredient'] & {
  inventory?: {
    id?: string;
    ingredient_name?: string | null;
    unit?: string | null;
    unit_cost?: number | null;
    current_stock?: number | null;
  } | null;
};

export const productService = {
  async getPage(params: PaginationParams = {}): Promise<PaginatedResponse<Product>> {
    return api.get<PaginatedResponse<Product>>('/products', {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
    });
  },
  async uploadImage(file: File): Promise<{ url: string; thumbnail_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.postFormData<{ url: string; thumbnail_url: string }>('/uploads/image', formData);
  },

  async getAll(): Promise<Product[]> {
    return api.get<Product[]>('/products');
  },

  async getById(id: string): Promise<Product> {
    return api.get<Product>(`/products/${id}`);
  },

  async create(product: ProductInsert): Promise<Product> {
    return api.post<Product>('/products', product);
  },

  async update(id: string, product: ProductUpdate): Promise<Product> {
    return api.put<Product>(`/products/${id}`, product);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/products/${id}`);
  },

  async getIngredients(productId: string): Promise<ProductIngredientWithInventory[]> {
    return api.get<ProductIngredientWithInventory[]>(`/products/${productId}/ingredients`);
  },

  async getIngredientsForProducts(productIds: string[]): Promise<ProductIngredientWithInventory[]> {
    if (productIds.length === 0) return [];
    return api.post<ProductIngredientWithInventory[]>('/products/ingredients/batch', { product_ids: productIds });
  },

  async updateIngredients(productId: string, ingredients: { inventoryId: string, quantityRequired: number, capacity?: number | null, bringToEvent?: boolean }[]) {
    const payload = ingredients.map(i => ({
      product_id: productId,
      inventory_id: i.inventoryId,
      quantity_required: i.quantityRequired,
      capacity: i.capacity ?? null,
      bring_to_event: i.bringToEvent ?? false,
    }));
    return api.put(`/products/${productId}/ingredients`, { ingredients: payload });
  }
};
