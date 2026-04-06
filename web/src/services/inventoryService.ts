import { api } from '../lib/api';
import { InventoryItem, InventoryItemInsert, InventoryItemUpdate, PaginatedResponse, PaginationParams } from '../types/entities';

export const inventoryService = {
  async getPage(params: PaginationParams = {}): Promise<PaginatedResponse<InventoryItem>> {
    return api.get<PaginatedResponse<InventoryItem>>('/inventory', {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
    });
  },
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
