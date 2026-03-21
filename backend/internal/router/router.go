package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/tiagofur/solennix-backend/internal/handlers"
	mw "github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

func New(authHandler *handlers.AuthHandler, crudHandler *handlers.CRUDHandler, subHandler *handlers.SubscriptionHandler,
	searchHandler *handlers.SearchHandler, eventPaymentHandler *handlers.EventPaymentHandler, uploadHandler *handlers.UploadHandler,
	adminHandler *handlers.AdminHandler, unavailHandler *handlers.UnavailableDateHandler, deviceHandler *handlers.DeviceHandler,
	authService *services.AuthService, userRepo *repository.UserRepo, corsOrigins []string, uploadDir string) http.Handler {

	r := chi.NewRouter()

	// Global middleware
	r.Use(mw.Recovery) // Panic recovery — must be first
	r.Use(mw.CORS(corsOrigins))
	r.Use(mw.SecurityHeaders) // Security headers (X-Frame-Options, CSP, HSTS, etc.)
	r.Use(mw.Logger)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// API routes
	r.Route("/api", func(r chi.Router) {

		// Auth routes (public) — rate limited to prevent brute-force attacks
		r.Route("/auth", func(r chi.Router) {
			r.Use(mw.RateLimit(5, 1*time.Minute))
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout) // Clear httpOnly cookie
			r.Post("/refresh", authHandler.RefreshToken)
			r.Post("/forgot-password", authHandler.ForgotPassword)
			r.Post("/reset-password", authHandler.ResetPassword) // Reset password with token
			r.Post("/google", authHandler.GoogleSignIn)          // Google OAuth sign-in
			r.Post("/apple", authHandler.AppleSignIn)            // Apple Sign In

			// Protected auth routes
			r.Group(func(r chi.Router) {
				r.Use(mw.Auth(authService))
				r.Get("/me", authHandler.Me)
				r.Post("/change-password", authHandler.ChangePassword)
			})
		})

		// Subscriptions
		r.Route("/subscriptions", func(r chi.Router) {
			// Public webhook endpoints (no auth — verified by signature)
			r.Post("/webhook/stripe", subHandler.StripeWebhook)
			r.Post("/webhook/revenuecat", subHandler.RevenueCatWebhook)

			// Protected subscription routes
			r.Group(func(r chi.Router) {
				r.Use(mw.Auth(authService))
				r.Get("/status", subHandler.GetSubscriptionStatus)
				r.Post("/checkout-session", subHandler.CreateCheckoutSession)
				r.Post("/portal-session", subHandler.CreatePortalSession)
			})

			// Debug routes — admin only (defense-in-depth: handler also checks Environment)
			r.Group(func(r chi.Router) {
				r.Use(mw.Auth(authService))
				r.Use(mw.AdminOnly(userRepo))
				r.Post("/debug-upgrade", subHandler.DebugUpgrade)
				r.Post("/debug-downgrade", subHandler.DebugDowngrade)
			})
		})

		// Serve uploaded files (public — images are accessible by URL)
		fileServer := http.StripPrefix("/api/uploads/", http.FileServer(http.Dir(uploadDir)))
		r.Get("/uploads/*", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "public, max-age=31536000")
			fileServer.ServeHTTP(w, r)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(mw.Auth(authService))

			// Uploads (authenticated, rate limited)
			r.Group(func(r chi.Router) {
				r.Use(mw.RateLimit(5, 1*time.Minute))
				r.Post("/uploads/image", uploadHandler.UploadImage)
			})

			// Users
			r.Put("/users/me", authHandler.UpdateProfile)

			// Clients
			r.Route("/clients", func(r chi.Router) {
				r.Get("/", crudHandler.ListClients)
				r.Post("/", crudHandler.CreateClient)
				r.Get("/{id}", crudHandler.GetClient)
				r.Put("/{id}", crudHandler.UpdateClient)
				r.Delete("/{id}", crudHandler.DeleteClient)
			})

			// Events
			r.Route("/events", func(r chi.Router) {
				r.Get("/", crudHandler.ListEvents)
				r.Get("/upcoming", crudHandler.GetUpcomingEvents)
				r.Post("/", crudHandler.CreateEvent)
				r.Get("/{id}", crudHandler.GetEvent)
				r.Put("/{id}", crudHandler.UpdateEvent)
				r.Delete("/{id}", crudHandler.DeleteEvent)
				r.Get("/{id}/products", crudHandler.GetEventProducts)
				r.Get("/{id}/extras", crudHandler.GetEventExtras)
				r.Put("/{id}/items", crudHandler.UpdateEventItems)
				r.Get("/{id}/equipment", crudHandler.GetEventEquipment)
				r.Get("/{id}/supplies", crudHandler.GetEventSupplies)
				// Event photos
				r.Get("/{id}/photos", crudHandler.GetEventPhotos)
				r.Post("/{id}/photos", crudHandler.AddEventPhoto)
				r.Delete("/{id}/photos/{photoId}", crudHandler.DeleteEventPhoto)
				// Equipment conflict detection & suggestions (no event ID needed)
				// POST for web (JSON body), GET for mobile (query params)
				r.Get("/equipment/conflicts", crudHandler.CheckEquipmentConflictsGET)
				r.Post("/equipment/conflicts", crudHandler.CheckEquipmentConflicts)
				r.Get("/equipment/suggestions", crudHandler.GetEquipmentSuggestionsGET)
				r.Post("/equipment/suggestions", crudHandler.GetEquipmentSuggestions)
				r.Get("/supplies/suggestions", crudHandler.GetSupplySuggestionsGET)
				r.Post("/supplies/suggestions", crudHandler.GetSupplySuggestions)
				// Event payment routes
				r.Post("/{id}/checkout-session", eventPaymentHandler.CreateEventCheckoutSession)
				r.Get("/{id}/payment-session", eventPaymentHandler.HandleEventPaymentSuccess)
			})

			// Products
			r.Route("/products", func(r chi.Router) {
				r.Get("/", crudHandler.ListProducts)
				r.Post("/", crudHandler.CreateProduct)
				r.Post("/ingredients/batch", crudHandler.GetBatchProductIngredients)
				r.Get("/{id}", crudHandler.GetProduct)
				r.Put("/{id}", crudHandler.UpdateProduct)
				r.Delete("/{id}", crudHandler.DeleteProduct)
				r.Get("/{id}/ingredients", crudHandler.GetProductIngredients)
				r.Put("/{id}/ingredients", crudHandler.UpdateProductIngredients)
			})

			// Inventory
			r.Route("/inventory", func(r chi.Router) {
				r.Get("/", crudHandler.ListInventory)
				r.Post("/", crudHandler.CreateInventoryItem)
				r.Get("/{id}", crudHandler.GetInventoryItem)
				r.Put("/{id}", crudHandler.UpdateInventoryItem)
				r.Delete("/{id}", crudHandler.DeleteInventoryItem)
			})

			// Payments
			r.Route("/payments", func(r chi.Router) {
				r.Get("/", crudHandler.ListPayments)
				r.Post("/", crudHandler.CreatePayment)
				r.Put("/{id}", crudHandler.UpdatePayment)
				r.Delete("/{id}", crudHandler.DeletePayment)
			})

			// Unavailable Dates
			r.Route("/unavailable-dates", func(r chi.Router) {
				r.Get("/", unavailHandler.GetUnavailableDates)
				r.Post("/", unavailHandler.CreateUnavailableDate)
				r.Delete("/{id}", unavailHandler.DeleteUnavailableDate)
			})

			// Device registration for push notifications
			r.Route("/devices", func(r chi.Router) {
				r.Post("/register", deviceHandler.RegisterDevice)
				r.Post("/unregister", deviceHandler.UnregisterDevice)
			})

			// Search — rate limited to prevent abuse
			r.Group(func(r chi.Router) {
				r.Use(mw.RateLimit(30, 1*time.Minute))
				r.Get("/search", searchHandler.SearchAll)
			})
		})

		// Admin routes — Auth + AdminOnly middleware + rate limited
		r.Route("/admin", func(r chi.Router) {
			r.Use(mw.Auth(authService))
			r.Use(mw.AdminOnly(userRepo))
			r.Use(mw.RateLimit(30, 1*time.Minute))

			r.Get("/stats", adminHandler.GetStats)
			r.Get("/users", adminHandler.ListUsers)
			r.Get("/users/{id}", adminHandler.GetUser)
			r.Put("/users/{id}/upgrade", adminHandler.UpgradeUser)
			r.Get("/subscriptions", adminHandler.GetSubscriptions)
		})
	})

	return r
}
