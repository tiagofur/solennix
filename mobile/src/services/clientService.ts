import { api } from '../lib/api';
import { Database } from '../types/supabase';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type ClientUpdate = Database['public']['Tables']['clients']['Update'];

export const clientService = {
    async getAll(): Promise<Client[]> {
        return api.get<Client[]>('/clients');
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
};
