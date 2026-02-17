import { api } from '../lib/api';
import { Database } from '../types/supabase';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];
type InventoryInsert = Database['public']['Tables']['inventory']['Insert'];
type InventoryUpdate = Database['public']['Tables']['inventory']['Update'];

export const inventoryService = {
  async getAll(): Promise<InventoryItem[]> {
    return api.get<InventoryItem[]>('/inventory');
  },

  async getById(id: string): Promise<InventoryItem> {
    return api.get<InventoryItem>(`/inventory/${id}`);
  },

  async create(item: InventoryInsert): Promise<InventoryItem> {
    return api.post<InventoryItem>('/inventory', item);
  },

  async update(id: string, item: InventoryUpdate): Promise<InventoryItem> {
    return api.put<InventoryItem>(`/inventory/${id}`, item);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/inventory/${id}`);
  }
};
