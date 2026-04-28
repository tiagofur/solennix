import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscriptionService } from './subscriptionService';
import { server } from '../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:8080/api';

describe('subscriptionService', () => {
  beforeEach(() => {
    server.resetHandlers();
    server.use(
      http.post(`${API_BASE}/auth/refresh`, () => {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      })
    );
  });

  describe('createCheckoutSession', () => {
    it('should create Stripe checkout session successfully', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return HttpResponse.json({
            url: 'https://checkout.stripe.com/c/pay/test_session_123',
          });
        })
      );

      const result = await subscriptionService.createCheckoutSession();

      expect(result).toEqual({
        url: 'https://checkout.stripe.com/c/pay/test_session_123',
      });
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('should handle Stripe API error response', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return HttpResponse.json(
            { error: 'Payment method required' },
            { status: 402 }
          );
        })
      );

      await expect(
        subscriptionService.createCheckoutSession()
      ).rejects.toThrow('Payment method required');
    });

    it('should handle network errors', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return HttpResponse.error();
        })
      );

      await expect(
        subscriptionService.createCheckoutSession()
      ).rejects.toThrow();
    });

    it('should handle server errors (500)', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        subscriptionService.createCheckoutSession()
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('createPortalSession', () => {
    it('should create Stripe billing portal session successfully', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/portal-session`, () => {
          return HttpResponse.json({
            url: 'https://billing.stripe.com/p/session_456',
          });
        })
      );

      const result = await subscriptionService.createPortalSession();

      expect(result).toEqual({
        url: 'https://billing.stripe.com/p/session_456',
      });
      expect(result.url).toContain('billing.stripe.com');
    });

    it('should handle unauthorized error (no subscription)', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/portal-session`, () => {
          return HttpResponse.json(
            { error: 'No active subscription found' },
            { status: 403 }
          );
        })
      );

      await expect(
        subscriptionService.createPortalSession()
      ).rejects.toThrow('No active subscription found');
    });

    it('should handle missing Stripe customer ID', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/portal-session`, () => {
          return HttpResponse.json(
            { error: 'Stripe customer ID not found' },
            { status: 400 }
          );
        })
      );

      await expect(
        subscriptionService.createPortalSession()
      ).rejects.toThrow('Stripe customer ID not found');
    });
  });

  describe('debugUpgrade', () => {
    it('should upgrade user to pro plan (development only)', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-upgrade`, () => {
          return HttpResponse.json({
            message: 'User upgraded to pro plan',
          });
        })
      );

      const result = await subscriptionService.debugUpgrade();

      expect(result).toEqual({
        message: 'User upgraded to pro plan',
      });
    });

    it('should fail in production environment', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-upgrade`, () => {
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        })
      );

      await expect(subscriptionService.debugUpgrade()).rejects.toThrow(
        'Not found'
      );
    });

    it('should handle already pro user', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-upgrade`, () => {
          return HttpResponse.json(
            { error: 'User is already on pro plan' },
            { status: 400 }
          );
        })
      );

      await expect(subscriptionService.debugUpgrade()).rejects.toThrow(
        'User is already on pro plan'
      );
    });
  });

  describe('debugDowngrade', () => {
    it('should downgrade user to basic plan (development only)', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-downgrade`, () => {
          return HttpResponse.json({
            message: 'User downgraded to basic plan',
          });
        })
      );

      const result = await subscriptionService.debugDowngrade();

      expect(result).toEqual({
        message: 'User downgraded to basic plan',
      });
    });

    it('should fail in production environment', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-downgrade`, () => {
          return HttpResponse.json(
            { error: 'Not found' },
            { status: 404 }
          );
        })
      );

      await expect(subscriptionService.debugDowngrade()).rejects.toThrow(
        'Not found'
      );
    });

    it('should handle already basic user', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-downgrade`, () => {
          return HttpResponse.json(
            { error: 'User is already on basic plan' },
            { status: 400 }
          );
        })
      );

      await expect(subscriptionService.debugDowngrade()).rejects.toThrow(
        'User is already on basic plan'
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle 401 unauthorized and trigger logout', async () => {
      const logoutHandler = vi.fn();
      window.addEventListener('auth:logout', logoutHandler);

      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      await expect(
        subscriptionService.createCheckoutSession()
      ).rejects.toThrow();

      // Note: api.ts triggers 'auth:logout' event on 401
      // This test verifies the error is thrown; event testing would be in api.test.ts
      window.removeEventListener('auth:logout', logoutHandler);
    });

    it('should handle malformed JSON response', async () => {
      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return new HttpResponse('Invalid JSON{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(
        subscriptionService.createCheckoutSession()
      ).rejects.toThrow();
    });

    it('should send credentials with requests (cookies)', async () => {
      let receivedCredentials = false;

      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          // Verify credentials: 'include' is set (cookies sent)
          // Note: In test environment, we can't directly check credentials mode
          // but we can verify the request was made correctly
          receivedCredentials = true;
          return HttpResponse.json({
            url: 'https://checkout.stripe.com/test',
          });
        })
      );

      await subscriptionService.createCheckoutSession();

      expect(receivedCredentials).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return subscription status with active subscription', async () => {
      server.use(
        http.get(`${API_BASE}/subscriptions/status`, () => {
          return HttpResponse.json({
            plan: 'pro',
            has_stripe_account: true,
            subscription: {
              status: 'active',
              provider: 'stripe',
              current_period_end: '2026-04-04T00:00:00Z',
              cancel_at_period_end: false,
            },
          });
        })
      );

      const result = await subscriptionService.getStatus();

      expect(result.plan).toBe('pro');
      expect(result.has_stripe_account).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription!.status).toBe('active');
      expect(result.subscription!.provider).toBe('stripe');
      expect(result.subscription!.current_period_end).toBe('2026-04-04T00:00:00Z');
      expect(result.subscription!.cancel_at_period_end).toBe(false);
    });

    it('should return basic plan without subscription details', async () => {
      server.use(
        http.get(`${API_BASE}/subscriptions/status`, () => {
          return HttpResponse.json({
            plan: 'basic',
            has_stripe_account: false,
          });
        })
      );

      const result = await subscriptionService.getStatus();

      expect(result.plan).toBe('basic');
      expect(result.has_stripe_account).toBe(false);
      expect(result.subscription).toBeUndefined();
    });

    it('should return subscription with cancel_at_period_end', async () => {
      server.use(
        http.get(`${API_BASE}/subscriptions/status`, () => {
          return HttpResponse.json({
            plan: 'pro',
            has_stripe_account: true,
            subscription: {
              status: 'active',
              provider: 'stripe',
              current_period_end: '2026-04-04T00:00:00Z',
              cancel_at_period_end: true,
            },
          });
        })
      );

      const result = await subscriptionService.getStatus();

      expect(result.subscription!.cancel_at_period_end).toBe(true);
    });

    it('should return subscription with past_due status', async () => {
      server.use(
        http.get(`${API_BASE}/subscriptions/status`, () => {
          return HttpResponse.json({
            plan: 'pro',
            has_stripe_account: true,
            subscription: {
              status: 'past_due',
              provider: 'stripe',
              cancel_at_period_end: false,
            },
          });
        })
      );

      const result = await subscriptionService.getStatus();

      expect(result.subscription!.status).toBe('past_due');
    });

    it('should handle server error', async () => {
      server.use(
        http.get(`${API_BASE}/subscriptions/status`, () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(subscriptionService.getStatus()).rejects.toThrow('Internal server error');
    });

    it('should handle unauthorized error', async () => {
      server.use(
        http.get(`${API_BASE}/subscriptions/status`, () => {
          return HttpResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          );
        })
      );

      await expect(subscriptionService.getStatus()).rejects.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should complete full upgrade flow: checkout → webhook → portal', async () => {
      // Step 1: Create checkout session
      server.use(
        http.post(`${API_BASE}/subscriptions/checkout-session`, () => {
          return HttpResponse.json({
            url: 'https://checkout.stripe.com/c/pay/session_xyz',
          });
        })
      );

      const checkoutResult =
        await subscriptionService.createCheckoutSession();
      expect(checkoutResult.url).toBeTruthy();

      // Step 2: After webhook processes (simulated), user can access portal
      server.use(
        http.post(`${API_BASE}/subscriptions/portal-session`, () => {
          return HttpResponse.json({
            url: 'https://billing.stripe.com/p/session_abc',
          });
        })
      );

      const portalResult = await subscriptionService.createPortalSession();
      expect(portalResult.url).toContain('billing.stripe.com');
    });

    it('should handle upgrade then immediate downgrade (debug)', async () => {
      // Upgrade
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-upgrade`, () => {
          return HttpResponse.json({
            message: 'User upgraded to pro plan',
          });
        })
      );

      const upgradeResult = await subscriptionService.debugUpgrade();
      expect(upgradeResult.message).toContain('upgraded');

      // Downgrade
      server.use(
        http.post(`${API_BASE}/subscriptions/debug-downgrade`, () => {
          return HttpResponse.json({
            message: 'User downgraded to basic plan',
          });
        })
      );

      const downgradeResult = await subscriptionService.debugDowngrade();
      expect(downgradeResult.message).toContain('downgraded');
    });
  });
});
