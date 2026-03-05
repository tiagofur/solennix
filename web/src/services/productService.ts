import { api } from '../lib/api';
import { Product, ProductInsert, ProductUpdate } from '../types/entities';

export const productService = {
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

  async addIngredients(productId: string, ingredients: { inventoryId: string, quantityRequired: number }[]) {
    // Backend expects: { ingredients: [{ product_id, inventory_id, quantity_required }] }
    // We define the type locally or just pass objects
    const payload = ingredients.map(i => ({
      product_id: productId,
      inventory_id: i.inventoryId,
      quantity_required: i.quantityRequired
    }));
    return api.put(`/products/${productId}/ingredients`, { ingredients: payload });
  },

  async getIngredients(productId: string) {
    return api.get<any[]>(`/products/${productId}/ingredients`);
  },

  async getIngredientsForProducts(productIds: string[]) {
    if (productIds.length === 0) return [];
    return api.post<any[]>('/products/ingredients/batch', { product_ids: productIds });
  },

  async updateIngredients(productId: string, ingredients: { inventoryId: string, quantityRequired: number, capacity?: number | null }[]) {
    const payload = ingredients.map(i => ({
      product_id: productId,
      inventory_id: i.inventoryId,
      quantity_required: i.quantityRequired,
      capacity: i.capacity ?? null,
    }));
    return api.put(`/products/${productId}/ingredients`, { ingredients: payload });
  }
};
