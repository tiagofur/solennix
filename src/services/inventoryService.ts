import { supabase, getCurrentUserId } from '../lib/supabase';
import { Database } from '../types/supabase';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];
type InventoryInsert = Database['public']['Tables']['inventory']['Insert'];
type InventoryUpdate = Database['public']['Tables']['inventory']['Update'];

export const inventoryService = {
  async getAll() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .order('ingredient_name');
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(item: InventoryInsert) {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('inventory')
      .insert({ ...item, user_id: userId } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, item: InventoryUpdate) {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Ítem de inventario no encontrado');
    }
    
    const { data, error } = await supabase
      .from('inventory')
      .update(item as any)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Ítem de inventario no encontrado');
    }
    
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }
};
