package handlers

import (
	"github.com/stripe/stripe-go/v81"
	stripeBilling "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/checkout/session"
	stripeSub "github.com/stripe/stripe-go/v81/subscription"
)

// DefaultStripeService is the production implementation of StripeService.
type DefaultStripeService struct{}

func (s *DefaultStripeService) NewCheckoutSession(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	return session.New(params)
}

func (s *DefaultStripeService) GetCheckoutSession(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	return session.Get(id, params)
}

func (s *DefaultStripeService) NewBillingPortalSession(params *stripe.BillingPortalSessionParams) (*stripe.BillingPortalSession, error) {
	return stripeBilling.New(params)
}

func (s *DefaultStripeService) GetSubscription(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
	return stripeSub.Get(id, params)
}
