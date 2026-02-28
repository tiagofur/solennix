import { api } from '../lib/api';
import { InventoryItem, InventoryItemInsert, InventoryItemUpdate } from '../types/entities';

export const inventoryService = {
  async getAll(): Promise<InventoryItem[]> {
    const data = await api.get<InventoryItem[] | null>('/inventory');
    return data ?? [];
  },

  async getById(id: string): Promise<InventoryItem> {
    return api.get<InventoryItem>(`/inventory/${id}`);
  },

  async create(item: InventoryItemInsert): Promise<InventoryItem> {
    return api.post<InventoryItem>('/inventory', item);
  },

  async update(id: string, item: InventoryItemUpdate): Promise<InventoryItem> {
    return api.put<InventoryItem>(`/inventory/${id}`, item);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/inventory/${id}`);
  }
};
