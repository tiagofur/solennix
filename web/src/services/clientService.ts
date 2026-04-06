import { api } from '../lib/api';
import { Client, ClientInsert, ClientUpdate, PaginatedResponse, PaginationParams } from '../types/entities';

export const clientService = {
  async getAll(): Promise<Client[]> {
    return api.get<Client[]>('/clients');
  },

  async getPage(params: PaginationParams = {}): Promise<PaginatedResponse<Client>> {
    return api.get<PaginatedResponse<Client>>('/clients', {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
    });
  },

  async getById(id: string): Promise<Client> {
    return api.get<Client>(`/clients/${id}`);
  },

  async create(client: ClientInsert): Promise<Client> {
    return api.post<Client>('/clients', client);
  },

  async update(id: string, client: ClientUpdate): Promise<Client> {
    return api.put<Client>(`/clients/${id}`, client);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/clients/${id}`);
  },

  async uploadPhoto(file: File): Promise<{ url: string; thumbnail_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.postFormData<{ url: string; thumbnail_url: string }>('/uploads/image', formData);
  },
};
