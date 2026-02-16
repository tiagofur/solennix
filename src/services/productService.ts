import { supabase, getCurrentUserId } from '../lib/supabase';
import { Database } from '../types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];
type ProductIngredientInsert = Database['public']['Tables']['product_ingredients']['Insert'];

export const productService = {
  async getAll() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Product> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Producto no encontrado');
    return data;
  },

  async create(product: ProductInsert): Promise<Product> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, user_id: userId } as any)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al crear el producto');
    return data;
  },

  async update(id: string, product: ProductUpdate): Promise<Product> {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Producto no encontrado');
    }
    
    const { data, error } = await supabase
      .from('products')
      // @ts-ignore - Supabase type inference issue
      .update(product)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al actualizar el producto');
    return data;
  },

  async delete(id: string) {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Producto no encontrado');
    }
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  async addIngredients(productId: string, ingredients: { inventoryId: string, quantityRequired: number }[]) {
    if (ingredients.length === 0) return;

    const records: ProductIngredientInsert[] = ingredients.map(i => ({
      product_id: productId,
      inventory_id: i.inventoryId,
      quantity_required: i.quantityRequired
    }));
    
    const { error } = await supabase
      .from('product_ingredients')
      .insert(records as any);
      
    if (error) throw error;
  },

  async getIngredients(productId: string) {
    const userId = await getCurrentUserId();
    // First verify ownership of the product
    const product = await this.getById(productId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }
    
    const { data, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory (ingredient_name, unit, unit_cost)
      `)
      .eq('product_id', productId);
      
    if (error) throw error;
    return data;
  },

  async getIngredientsForProducts(productIds: string[]) {
    if (productIds.length === 0) return [];

    const { data, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory (ingredient_name, unit, unit_cost)
      `)
      .in('product_id', productIds);

    if (error) throw error;
    return data || [];
  },

  async updateIngredients(productId: string, ingredients: { inventoryId: string, quantityRequired: number }[]) {
      // Delete existing ingredients for this product
      const { error: deleteError } = await supabase
        .from('product_ingredients')
        .delete()
        .eq('product_id', productId);
        
      if (deleteError) throw deleteError;
      
      // Add new ingredients
      return this.addIngredients(productId, ingredients);
  }
};
