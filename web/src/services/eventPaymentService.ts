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
  /**
   * Create a Stripe checkout session for an event payment
   * @param eventId - The event ID to create payment for
   * @returns Checkout session with redirect URL
   */
  async createCheckoutSession(eventId: string): Promise<EventCheckoutSession> {
    return api.post<EventCheckoutSession>(`/events/${eventId}/checkout-session`, {});
  },

  /**
   * Get payment session details after successful payment
   * @param eventId - The event ID
   * @param sessionId - Stripe session ID from URL params
   * @returns Payment session details
   */
  async getPaymentSession(eventId: string, sessionId: string): Promise<EventPaymentSession> {
    return api.get<EventPaymentSession>(`/events/${eventId}/payment-session?session_id=${sessionId}`);
  },
};
