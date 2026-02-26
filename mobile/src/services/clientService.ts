import { api } from '../lib/api';
import { Client, ClientInsert, ClientUpdate } from '../types/entities';

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
