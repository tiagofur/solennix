import { api } from '../lib/api';

export interface EventCheckoutSession {
    session_id: string;
    url: string;
}

export interface EventPaymentSession {
    session_id: string;
    payment_status: string;
    amount_total: number;
    customer_email: string;
}

export const eventPaymentService = {
    async createCheckoutSession(eventId: string): Promise<EventCheckoutSession> {
        return api.post<EventCheckoutSession>(`/events/${eventId}/checkout-session`, {});
    },

    async getPaymentSession(eventId: string, sessionId: string): Promise<EventPaymentSession> {
        return api.get<EventPaymentSession>(
            `/events/${eventId}/payment-session?session_id=${sessionId}`,
        );
    },
};
