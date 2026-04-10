package handlers

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func readOpenAPISpec(t *testing.T) string {
	t.Helper()

	content, err := os.ReadFile(filepath.Join("..", "..", "docs", "openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi spec: %v", err)
	}

	return string(content)
}

func TestOpenAPISpec_AuthContract(t *testing.T) {
	spec := readOpenAPISpec(t)

	tests := []struct {
		name     string
		fragment string
	}{
		{name: "bearer auth security scheme", fragment: "bearerAuth:"},
		{name: "register endpoint", fragment: "/api/auth/register:"},
		{name: "login endpoint", fragment: "/api/auth/login:"},
		{name: "refresh endpoint", fragment: "/api/auth/refresh:"},
		{name: "me endpoint", fragment: "/api/auth/me:"},
		{name: "change password endpoint", fragment: "/api/auth/change-password:"},
		{name: "register request schema", fragment: "RegisterRequest:"},
		{name: "login request schema", fragment: "LoginRequest:"},
		{name: "refresh request schema", fragment: "RefreshTokenRequest:"},
		{name: "auth success response schema", fragment: "AuthSuccessResponse:"},
		{name: "token pair schema", fragment: "TokenPair:"},
		{name: "register created response", fragment: "description: User registered"},
		{name: "login success response", fragment: "description: Authenticated successfully"},
		{name: "refresh invalid token response", fragment: "description: Invalid or expired token"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}
}

func TestOpenAPISpec_SubscriptionsContract(t *testing.T) {
	spec := readOpenAPISpec(t)

	tests := []struct {
		name     string
		fragment string
	}{
		{name: "subscription status endpoint", fragment: "/api/subscriptions/status:"},
		{name: "checkout session endpoint", fragment: "/api/subscriptions/checkout-session:"},
		{name: "portal session endpoint", fragment: "/api/subscriptions/portal-session:"},
		{name: "stripe webhook endpoint", fragment: "/api/subscriptions/webhook/stripe:"},
		{name: "revenuecat webhook endpoint", fragment: "/api/subscriptions/webhook/revenuecat:"},
		{name: "subscription status schema", fragment: "SubscriptionStatusResponse:"},
		{name: "subscription info schema", fragment: "SubscriptionInfo:"},
		{name: "checkout response schema", fragment: "CheckoutSessionResponse:"},
		{name: "stripe webhook invalid signature", fragment: "description: Invalid signature or payload"},
		{name: "portal no customer response", fragment: "description: No associated Stripe customer"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}
}

func TestOpenAPISpec_EventContract(t *testing.T) {
	spec := readOpenAPISpec(t)

	tests := []struct {
		name     string
		fragment string
	}{
		{name: "events collection endpoint", fragment: "/api/events:"},
		{name: "event by id endpoint", fragment: "/api/events/{id}:"},
		{name: "upcoming events endpoint", fragment: "/api/events/upcoming:"},
		{name: "event products endpoint", fragment: "/api/events/{id}/products:"},
		{name: "event extras endpoint", fragment: "/api/events/{id}/extras:"},
		{name: "event items endpoint", fragment: "/api/events/{id}/items:"},
		{name: "event equipment endpoint", fragment: "/api/events/{id}/equipment:"},
		{name: "event supplies endpoint", fragment: "/api/events/{id}/supplies:"},
		{name: "event equipment conflicts endpoint", fragment: "/api/events/equipment/conflicts:"},
		{name: "event equipment suggestions endpoint", fragment: "/api/events/equipment/suggestions:"},
		{name: "event supplies suggestions endpoint", fragment: "/api/events/supplies/suggestions:"},
		{name: "event checkout session endpoint", fragment: "/api/events/{id}/checkout-session:"},
		{name: "event payment session endpoint", fragment: "/api/events/{id}/payment-session:"},
		{name: "event schema", fragment: "Event:"},
		{name: "event upsert schema", fragment: "EventUpsertRequest:"},
		{name: "event items update schema", fragment: "EventItemsUpdateRequest:"},
		{name: "event product schema", fragment: "EventProduct:"},
		{name: "event extra schema", fragment: "EventExtra:"},
		{name: "event equipment schema", fragment: "EventEquipment:"},
		{name: "event supply schema", fragment: "EventSupply:"},
		{name: "equipment conflict schema", fragment: "EquipmentConflict:"},
		{name: "equipment suggestion schema", fragment: "EquipmentSuggestion:"},
		{name: "supply suggestion schema", fragment: "SupplySuggestion:"},
		{name: "event checkout session schema", fragment: "EventCheckoutSession:"},
		{name: "event payment session schema", fragment: "EventPaymentSession:"},
		{name: "event date field", fragment: "event_date:"},
		{name: "unprocessable entity response", fragment: "description: Unprocessable entity"},
		{name: "validation error response", fragment: "description: Validation error"},
		{name: "discount type enum", fragment: "enum: [percent, fixed]"},
		{name: "status enum", fragment: "enum: [quoted, confirmed, completed, cancelled]"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}
}

func TestOpenAPISpec_CoreCRUDContract(t *testing.T) {
	spec := readOpenAPISpec(t)

	tests := []struct {
		name     string
		fragment string
	}{
		{name: "clients collection endpoint", fragment: "/api/clients:"},
		{name: "client item endpoint", fragment: "/api/clients/{id}:"},
		{name: "products collection endpoint", fragment: "/api/products:"},
		{name: "product item endpoint", fragment: "/api/products/{id}:"},
		{name: "product ingredients endpoint", fragment: "/api/products/{id}/ingredients:"},
		{name: "batch product ingredients endpoint", fragment: "/api/products/ingredients/batch:"},
		{name: "inventory collection endpoint", fragment: "/api/inventory:"},
		{name: "inventory item endpoint", fragment: "/api/inventory/{id}:"},
		{name: "payments collection endpoint", fragment: "/api/payments:"},
		{name: "payment item endpoint", fragment: "/api/payments/{id}:"},
		{name: "client schema", fragment: "Client:"},
		{name: "product schema", fragment: "Product:"},
		{name: "product ingredient schema", fragment: "ProductIngredient:"},
		{name: "product ingredients update request schema", fragment: "ProductIngredientsUpdateRequest:"},
		{name: "product ingredients batch request schema", fragment: "ProductIngredientsBatchRequest:"},
		{name: "inventory schema", fragment: "InventoryItem:"},
		{name: "payment schema", fragment: "Payment:"},
		{name: "paginated clients schema", fragment: "PaginatedClientsResponse:"},
		{name: "paginated events schema", fragment: "PaginatedEventsResponse:"},
		{name: "paginated products schema", fragment: "PaginatedProductsResponse:"},
		{name: "paginated inventory schema", fragment: "PaginatedInventoryResponse:"},
		{name: "paginated payments schema", fragment: "PaginatedPaymentsResponse:"},
		{name: "client created response", fragment: "description: Client created"},
		{name: "product created response", fragment: "description: Product created"},
		{name: "inventory created response", fragment: "description: Inventory item created"},
		{name: "payment created response", fragment: "description: Payment created"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}
}

func TestOpenAPISpec_OperationalEndpointsContract(t *testing.T) {
	spec := readOpenAPISpec(t)

	tests := []struct {
		name     string
		fragment string
	}{
		{name: "unavailable dates endpoint", fragment: "/api/unavailable-dates:"},
		{name: "unavailable date item endpoint", fragment: "/api/unavailable-dates/{id}:"},
		{name: "devices register endpoint", fragment: "/api/devices/register:"},
		{name: "devices unregister endpoint", fragment: "/api/devices/unregister:"},
		{name: "live activity register endpoint", fragment: "/api/live-activities/register:"},
		{name: "live activity delete endpoint", fragment: "/api/live-activities/by-event/{eventId}:"},
		{name: "upload image endpoint", fragment: "/api/uploads/image:"},
		{name: "search endpoint", fragment: "/api/search:"},
		{name: "dashboard kpis endpoint", fragment: "/api/dashboard/kpis:"},
		{name: "dashboard revenue chart endpoint", fragment: "/api/dashboard/revenue-chart:"},
		{name: "dashboard events by status endpoint", fragment: "/api/dashboard/events-by-status:"},
		{name: "dashboard top clients endpoint", fragment: "/api/dashboard/top-clients:"},
		{name: "dashboard product demand endpoint", fragment: "/api/dashboard/product-demand:"},
		{name: "dashboard forecast endpoint", fragment: "/api/dashboard/forecast:"},
		{name: "unavailable date schema", fragment: "UnavailableDate:"},
		{name: "device token schema", fragment: "DeviceToken:"},
		{name: "live activity token schema", fragment: "LiveActivityToken:"},
		{name: "upload response schema", fragment: "UploadImageResponse:"},
		{name: "search response schema", fragment: "SearchResponse:"},
		{name: "dashboard kpis schema", fragment: "DashboardKPIs:"},
		{name: "revenue data point schema", fragment: "RevenueDataPoint:"},
		{name: "top client schema", fragment: "TopClient:"},
		{name: "product demand item schema", fragment: "ProductDemandItem:"},
		{name: "forecast data point schema", fragment: "ForecastDataPoint:"},
		{name: "invalid period response", fragment: "description: Invalid period"},
		{name: "upload image response", fragment: "description: Image uploaded"},
		{name: "device registered response", fragment: "description: Device registered"},
		{name: "search grouped results response", fragment: "description: Search results grouped by resource type"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}
}