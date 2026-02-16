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

  async getById(id: string): Promise<InventoryItem> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Ítem de inventario no encontrado');
    return data;
  },

  async create(item: InventoryInsert): Promise<InventoryItem> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('inventory')
      .insert({ ...item, user_id: userId } as any)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al crear el ítem de inventario');
    return data;
  },

  async update(id: string, item: InventoryUpdate): Promise<InventoryItem> {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Ítem de inventario no encontrado');
    }
    
    const { data, error } = await supabase
      .from('inventory')
      // @ts-ignore - Supabase type inference issue
      .update(item)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al actualizar el ítem de inventario');
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
