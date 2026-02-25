import { api } from '../lib/api';
import { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

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

    async addIngredients(
        productId: string,
        ingredients: { inventoryId: string; quantityRequired: number }[],
    ) {
        const payload = ingredients.map((i) => ({
            product_id: productId,
            inventory_id: i.inventoryId,
            quantity_required: i.quantityRequired,
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

    async updateIngredients(
        productId: string,
        ingredients: { inventoryId: string; quantityRequired: number }[],
    ) {
        const payload = ingredients.map((i) => ({
            product_id: productId,
            inventory_id: i.inventoryId,
            quantity_required: i.quantityRequired,
        }));
        return api.put(`/products/${productId}/ingredients`, { ingredients: payload });
    },
};
