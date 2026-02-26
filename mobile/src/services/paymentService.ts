import { api } from '../lib/api';
import { Payment, PaymentInsert, PaymentUpdate } from '../types/entities';

export const paymentService = {
    async getAll(): Promise<Payment[]> {
        return api.get<Payment[]>('/payments');
    },

    async getByEventId(eventId: string): Promise<Payment[]> {
        return api.get<Payment[]>('/payments', { event_id: eventId });
    },

    async getByPaymentDateRange(startDate: string, endDate: string): Promise<Payment[]> {
        return api.get<Payment[]>('/payments', { start: startDate, end: endDate });
    },

    async getByEventIds(eventIds: string[]): Promise<Payment[]> {
        if (eventIds.length === 0) return [];
        return api.get<Payment[]>('/payments', { event_ids: eventIds.join(',') });
    },

    async create(payment: PaymentInsert): Promise<Payment> {
        return api.post<Payment>('/payments', payment);
    },

    async update(id: string, payment: PaymentUpdate): Promise<Payment> {
        return api.put<Payment>(`/payments/${id}`, payment);
    },

    async delete(id: string): Promise<void> {
        return api.delete(`/payments/${id}`);
    },
};
