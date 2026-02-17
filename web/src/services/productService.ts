import { api } from '../lib/api';
import { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];
// type ProductIngredientInsert = Database['public']['Tables']['product_ingredients']['Insert']; // Not needed exposed

export const productService = {
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
    // Backend Implementation Gap: accessing ingredients for MULTIPLE products in one call?
    // My backend `crud_handler` does NOT have `GetIngredientsForProducts` (bulk).
    // It only has `GetProductIngredients` (single).
    // I can simulate it using Promise.all or just fail gracefully.
    // Given functionality, this is used for "Shopping List" maybe?
    // I'll implement with Promise.all for now.
    if (productIds.length === 0) return [];
    
    // Warning: N+1 problem on client side
    const promises = productIds.map(id => this.getIngredients(id));
    const results = await Promise.all(promises);
    return results.flat();
  },

  async updateIngredients(productId: string, ingredients: { inventoryId: string, quantityRequired: number }[]) {
      // Backend PUT /ingredients replaces all, so this is same as addIngredients logic above if I mapped it correctly.
      const payload = ingredients.map(i => ({
        product_id: productId,
        inventory_id: i.inventoryId,
        quantity_required: i.quantityRequired
     }));
     return api.put(`/products/${productId}/ingredients`, { ingredients: payload });
  }
};
