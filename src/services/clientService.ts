import { supabase, getCurrentUserId } from '../lib/supabase';
import { Database } from '../types/supabase';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export const clientService = {
  async getAll() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Client> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Cliente no encontrado');
    return data;
  },

  async create(client: ClientInsert): Promise<Client> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...client, user_id: userId } as any)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al crear el cliente');
    return data;
  },

  async update(id: string, client: ClientUpdate): Promise<Client> {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Cliente no encontrado');
    }
    
    const { data, error } = await supabase
      .from('clients')
      // @ts-ignore - Supabase type inference issue
      .update(client)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al actualizar el cliente');
    return data;
  },

  async delete(id: string) {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Cliente no encontrado');
    }
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }
};
