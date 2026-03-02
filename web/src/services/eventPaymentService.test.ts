import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventPaymentService } from './eventPaymentService';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('eventPaymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('calls api.post with correct endpoint and empty body', async () => {
      const mockResponse = { session_id: 'sess_123', url: 'https://checkout.stripe.com/test' };
      (api.post as any).mockResolvedValue(mockResponse);

      const result = await eventPaymentService.createCheckoutSession('event-1');

      expect(api.post).toHaveBeenCalledWith('/events/event-1/checkout-session', {});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPaymentSession', () => {
    it('calls api.get with correct endpoint including session_id query param', async () => {
      const mockResponse = {
        session_id: 'sess_123',
        payment_status: 'paid',
        amount_total: 5000,
        customer_email: 'test@example.com',
      };
      (api.get as any).mockResolvedValue(mockResponse);

      const result = await eventPaymentService.getPaymentSession('event-1', 'sess_123');

      expect(api.get).toHaveBeenCalledWith('/events/event-1/payment-session?session_id=sess_123');
      expect(result).toEqual(mockResponse);
    });
  });
});
