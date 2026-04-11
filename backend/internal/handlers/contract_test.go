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

func assertContainsInOrder(t *testing.T, text string, fragments ...string) {
	t.Helper()

	searchFrom := 0
	for _, fragment := range fragments {
		idx := strings.Index(text[searchFrom:], fragment)
		if idx < 0 {
			t.Fatalf("openapi spec missing ordered fragment %q", fragment)
		}
		searchFrom += idx + len(fragment)
	}
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
		{name: "logout endpoint", fragment: "/api/auth/logout:"},
		{name: "forgot password endpoint", fragment: "/api/auth/forgot-password:"},
		{name: "reset password endpoint", fragment: "/api/auth/reset-password:"},
		{name: "refresh endpoint", fragment: "/api/auth/refresh:"},
		{name: "me endpoint", fragment: "/api/auth/me:"},
		{name: "google auth endpoint", fragment: "/api/auth/google:"},
		{name: "apple auth endpoint", fragment: "/api/auth/apple:"},
		{name: "update profile endpoint", fragment: "/api/users/me:"},
		{name: "change password endpoint", fragment: "/api/auth/change-password:"},
		{name: "register request schema", fragment: "RegisterRequest:"},
		{name: "register operation", fragment: "operationId: register"},
		{name: "login operation", fragment: "operationId: login"},
		{name: "logout operation", fragment: "operationId: logout"},
		{name: "forgot password operation", fragment: "operationId: forgotPassword"},
		{name: "reset password operation", fragment: "operationId: resetPassword"},
		{name: "refresh token operation", fragment: "operationId: refreshToken"},
		{name: "me operation", fragment: "operationId: me"},
		{name: "google sign in operation", fragment: "operationId: googleSignIn"},
		{name: "apple sign in operation", fragment: "operationId: appleSignIn"},
		{name: "update profile operation", fragment: "operationId: updateProfile"},
		{name: "change password operation", fragment: "operationId: changePassword"},
		{name: "login request schema", fragment: "LoginRequest:"},
		{name: "forgot password request schema", fragment: "ForgotPasswordRequest:"},
		{name: "reset password request schema", fragment: "ResetPasswordRequest:"},
		{name: "refresh request schema", fragment: "RefreshTokenRequest:"},
		{name: "google auth request schema", fragment: "GoogleSignInRequest:"},
		{name: "apple auth request schema", fragment: "AppleSignInRequest:"},
		{name: "update profile request schema", fragment: "UpdateProfileRequest:"},
		{name: "auth success response schema", fragment: "AuthSuccessResponse:"},
		{name: "apple auth success response schema", fragment: "AppleAuthSuccessResponse:"},
		{name: "token pair schema", fragment: "TokenPair:"},
		{name: "register created response", fragment: "description: User registered"},
		{name: "login success response", fragment: "description: Authenticated successfully"},
		{name: "logout success response", fragment: "description: Logout processed"},
		{name: "forgot password success response", fragment: "description: Reset message accepted"},
		{name: "reset password success response", fragment: "description: Password updated"},
		{name: "google auth success response", fragment: "description: Authenticated with Google"},
		{name: "apple auth success response", fragment: "description: Authenticated with Apple"},
		{name: "update profile success response", fragment: "description: Profile updated"},
		{name: "reset password invalid request response", fragment: "description: Invalid or malformed request"},
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
		{name: "subscription status operation", fragment: "operationId: getSubscriptionStatus"},
		{name: "checkout session operation", fragment: "operationId: createCheckoutSession"},
		{name: "portal session operation", fragment: "operationId: createPortalSession"},
		{name: "stripe webhook operation", fragment: "operationId: stripeWebhook"},
		{name: "revenuecat webhook operation", fragment: "operationId: revenueCatWebhook"},
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
		{name: "events search endpoint", fragment: "/api/events/search:"},
		{name: "search events operation", fragment: "operationId: searchEvents"},
		{name: "upcoming events endpoint", fragment: "/api/events/upcoming:"},
		{name: "event products endpoint", fragment: "/api/events/{id}/products:"},
		{name: "event extras endpoint", fragment: "/api/events/{id}/extras:"},
		{name: "event photos endpoint", fragment: "/api/events/{id}/photos:"},
		{name: "event photo item endpoint", fragment: "/api/events/{id}/photos/{photoId}:"},
		{name: "event items endpoint", fragment: "/api/events/{id}/items:"},
		{name: "event equipment endpoint", fragment: "/api/events/{id}/equipment:"},
		{name: "event supplies endpoint", fragment: "/api/events/{id}/supplies:"},
		{name: "event equipment conflicts endpoint", fragment: "/api/events/equipment/conflicts:"},
		{name: "event equipment suggestions endpoint", fragment: "/api/events/equipment/suggestions:"},
		{name: "event supplies suggestions endpoint", fragment: "/api/events/supplies/suggestions:"},
		{name: "event checkout session endpoint", fragment: "/api/events/{id}/checkout-session:"},
		{name: "event payment session endpoint", fragment: "/api/events/{id}/payment-session:"},
		{name: "list events operation", fragment: "operationId: listEvents"},
		{name: "create event operation", fragment: "operationId: createEvent"},
		{name: "get event operation", fragment: "operationId: getEvent"},
		{name: "update event operation", fragment: "operationId: updateEvent"},
		{name: "delete event operation", fragment: "operationId: deleteEvent"},
		{name: "upcoming events operation", fragment: "operationId: getUpcomingEvents"},
		{name: "event products operation", fragment: "operationId: getEventProducts"},
		{name: "event extras operation", fragment: "operationId: getEventExtras"},
		{name: "event photos operation", fragment: "operationId: getEventPhotos"},
		{name: "add event photo operation", fragment: "operationId: addEventPhoto"},
		{name: "delete event photo operation", fragment: "operationId: deleteEventPhoto"},
		{name: "update event items operation", fragment: "operationId: updateEventItems"},
		{name: "event equipment operation", fragment: "operationId: getEventEquipment"},
		{name: "event supplies operation", fragment: "operationId: getEventSupplies"},
		{name: "equipment conflicts operation", fragment: "operationId: checkEquipmentConflicts"},
		{name: "equipment conflicts GET variant operation", fragment: "operationId: checkEquipmentConflictsGET"},
		{name: "equipment suggestions operation", fragment: "operationId: getEquipmentSuggestions"},
		{name: "equipment suggestions GET variant operation", fragment: "operationId: getEquipmentSuggestionsGET"},
		{name: "supply suggestions operation", fragment: "operationId: getSupplySuggestions"},
		{name: "supply suggestions GET variant operation", fragment: "operationId: getSupplySuggestionsGET"},
		{name: "event checkout operation", fragment: "operationId: createEventCheckoutSession"},
		{name: "event payment session operation", fragment: "operationId: getEventPaymentSession"},
		{name: "event schema", fragment: "Event:"},
		{name: "event upsert schema", fragment: "EventUpsertRequest:"},
		{name: "event items update schema", fragment: "EventItemsUpdateRequest:"},
		{name: "event product schema", fragment: "EventProduct:"},
		{name: "event extra schema", fragment: "EventExtra:"},
		{name: "event photo schema", fragment: "EventPhoto:"},
		{name: "event photo create request schema", fragment: "EventPhotoCreateRequest:"},
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
		{name: "event photo created response", fragment: "description: Event photo created"},
		{name: "event photo deleted response", fragment: "description: Event photo deleted"},
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
		{name: "list clients operation", fragment: "operationId: listClients"},
		{name: "get client operation", fragment: "operationId: getClient"},
		{name: "create client operation", fragment: "operationId: createClient"},
		{name: "update client operation", fragment: "operationId: updateClient"},
		{name: "delete client operation", fragment: "operationId: deleteClient"},
		{name: "list products operation", fragment: "operationId: listProducts"},
		{name: "get product operation", fragment: "operationId: getProduct"},
		{name: "create product operation", fragment: "operationId: createProduct"},
		{name: "update product operation", fragment: "operationId: updateProduct"},
		{name: "delete product operation", fragment: "operationId: deleteProduct"},
		{name: "list inventory operation", fragment: "operationId: listInventory"},
		{name: "get inventory operation", fragment: "operationId: getInventoryItem"},
		{name: "create inventory operation", fragment: "operationId: createInventory"},
		{name: "update inventory operation", fragment: "operationId: updateInventoryItem"},
		{name: "delete inventory operation", fragment: "operationId: deleteInventoryItem"},
		{name: "list payments operation", fragment: "operationId: listPayments"},
		{name: "create payment operation", fragment: "operationId: createPayment"},
		{name: "update payment operation", fragment: "operationId: updatePayment"},
		{name: "delete payment operation", fragment: "operationId: deletePayment"},
		{name: "get payment operation", fragment: "operationId: getPayment"},
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
		{name: "payment details response", fragment: "description: Payment details"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}

	t.Run("product create response includes schema payload", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/products:",
			"operationId: createProduct",
			"description: Product created",
			"content:",
			"application/json:",
			"$ref: \"#/components/schemas/Product\"",
			"\"400\":",
		)
	})

	t.Run("inventory create response includes schema payload", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/inventory:",
			"operationId: createInventory",
			"description: Inventory item created",
			"content:",
			"application/json:",
			"$ref: \"#/components/schemas/InventoryItem\"",
			"\"401\":",
		)
	})

	t.Run("payment create response includes schema payload", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/payments:",
			"operationId: createPayment",
			"description: Payment created",
			"content:",
			"application/json:",
			"$ref: \"#/components/schemas/Payment\"",
			"\"400\":",
		)
	})

	t.Run("list clients keeps array and paginated oneOf", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/clients:",
			"operationId: listClients",
			"oneOf:",
			"$ref: \"#/components/schemas/Client\"",
			"$ref: \"#/components/schemas/PaginatedClientsResponse\"",
		)
	})

	t.Run("list products keeps array and paginated oneOf", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/products:",
			"operationId: listProducts",
			"oneOf:",
			"$ref: \"#/components/schemas/Product\"",
			"$ref: \"#/components/schemas/PaginatedProductsResponse\"",
		)
	})

	t.Run("list inventory keeps array and paginated oneOf", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/inventory:",
			"operationId: listInventory",
			"oneOf:",
			"$ref: \"#/components/schemas/InventoryItem\"",
			"$ref: \"#/components/schemas/PaginatedInventoryResponse\"",
		)
	})

	t.Run("list payments keeps array and paginated oneOf", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/payments:",
			"operationId: listPayments",
			"oneOf:",
			"$ref: \"#/components/schemas/Payment\"",
			"$ref: \"#/components/schemas/PaginatedPaymentsResponse\"",
		)
	})
}

func TestOpenAPISpec_EventsListResponseShapes(t *testing.T) {
	spec := readOpenAPISpec(t)

	t.Run("list events keeps array and paginated oneOf", func(t *testing.T) {
		assertContainsInOrder(t, spec,
			"/api/events:",
			"operationId: listEvents",
			"oneOf:",
			"$ref: \"#/components/schemas/Event\"",
			"$ref: \"#/components/schemas/PaginatedEventsResponse\"",
		)
	})
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
		{name: "get unavailable dates operation", fragment: "operationId: getUnavailableDates"},
		{name: "create unavailable date operation", fragment: "operationId: createUnavailableDate"},
		{name: "delete unavailable date operation", fragment: "operationId: deleteUnavailableDate"},
		{name: "register device operation", fragment: "operationId: registerDevice"},
		{name: "unregister device operation", fragment: "operationId: unregisterDevice"},
		{name: "register live activity operation", fragment: "operationId: registerLiveActivity"},
		{name: "delete live activity operation", fragment: "operationId: deleteLiveActivityByEvent"},
		{name: "upload image operation", fragment: "operationId: uploadImage"},
		{name: "search operation", fragment: "operationId: searchAll"},
		{name: "dashboard kpis endpoint", fragment: "/api/dashboard/kpis:"},
		{name: "dashboard revenue chart endpoint", fragment: "/api/dashboard/revenue-chart:"},
		{name: "dashboard events by status endpoint", fragment: "/api/dashboard/events-by-status:"},
		{name: "dashboard top clients endpoint", fragment: "/api/dashboard/top-clients:"},
		{name: "dashboard product demand endpoint", fragment: "/api/dashboard/product-demand:"},
		{name: "dashboard forecast endpoint", fragment: "/api/dashboard/forecast:"},
		{name: "dashboard activity endpoint", fragment: "/api/dashboard/activity:"},
		{name: "dashboard kpis operation", fragment: "operationId: getDashboardKPIs"},
		{name: "dashboard revenue chart operation", fragment: "operationId: getRevenueChart"},
		{name: "dashboard events by status operation", fragment: "operationId: getEventsByStatus"},
		{name: "dashboard top clients operation", fragment: "operationId: getTopClients"},
		{name: "dashboard product demand operation", fragment: "operationId: getProductDemand"},
		{name: "dashboard forecast operation", fragment: "operationId: getForecast"},
		{name: "dashboard activity operation", fragment: "operationId: getActivityLog"},
		{name: "audit log schema", fragment: "AuditLog:"},
		{name: "paginated audit logs schema", fragment: "PaginatedAuditLogsResponse:"},
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

func TestOpenAPISpec_AdminContract(t *testing.T) {
	spec := readOpenAPISpec(t)

	tests := []struct {
		name     string
		fragment string
	}{
		{name: "admin stats endpoint", fragment: "/api/admin/stats:"},
		{name: "admin users endpoint", fragment: "/api/admin/users:"},
		{name: "admin user item endpoint", fragment: "/api/admin/users/{id}:"},
		{name: "admin user upgrade endpoint", fragment: "/api/admin/users/{id}/upgrade:"},
		{name: "admin subscriptions endpoint", fragment: "/api/admin/subscriptions:"},
		{name: "admin audit logs endpoint", fragment: "/api/admin/audit-logs:"},
		{name: "admin audit logs operation", fragment: "operationId: getAllAuditLogs"},
		{name: "admin audit logs forbidden response", fragment: "description: Forbidden — admin role required"},
		{name: "platform stats schema", fragment: "PlatformStats:"},
		{name: "admin stats operation", fragment: "operationId: getAdminStats"},
		{name: "admin list users operation", fragment: "operationId: listAdminUsers"},
		{name: "admin get user operation", fragment: "operationId: getAdminUser"},
		{name: "admin upgrade user operation", fragment: "operationId: upgradeAdminUser"},
		{name: "admin subscriptions operation", fragment: "operationId: getAdminSubscriptions"},
		{name: "admin user schema", fragment: "AdminUser:"},
		{name: "subscription overview schema", fragment: "SubscriptionOverview:"},
		{name: "admin upgrade request schema", fragment: "AdminUpgradeRequest:"},
		{name: "admin plan enum", fragment: "enum: [basic, pro, premium]"},
		{name: "admin stats failure response", fragment: "description: Failed to get platform stats"},
		{name: "admin users failure response", fragment: "description: Failed to list users"},
		{name: "admin invalid user response", fragment: "description: Invalid user ID"},
		{name: "admin paid subscription guard response", fragment: "description: Cannot downgrade a user with an active paid subscription"},
		{name: "admin update plan failure response", fragment: "description: Failed to update plan"},
		{name: "admin subscriptions failure response", fragment: "description: Failed to get subscription overview"},
		{name: "admin upgrade success message example", fragment: "example: Plan updated successfully"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if !strings.Contains(spec, tt.fragment) {
				t.Fatalf("openapi spec missing fragment %q", tt.fragment)
			}
		})
	}
}