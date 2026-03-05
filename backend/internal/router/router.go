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
	adminHandler *handlers.AdminHandler,
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
			r.Use(mw.RateLimit(10, 1*time.Minute))
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/logout", authHandler.Logout) // Clear httpOnly cookie
			r.Post("/refresh", authHandler.RefreshToken)
			r.Post("/forgot-password", authHandler.ForgotPassword)
			r.Post("/reset-password", authHandler.ResetPassword) // Reset password with token

			// Protected auth routes
			r.Group(func(r chi.Router) {
				r.Use(mw.Auth(authService))
				r.Get("/me", authHandler.Me)
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

			// Uploads (authenticated)
			r.Post("/uploads/image", uploadHandler.UploadImage)

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
				// Equipment conflict detection & suggestions (no event ID needed)
				r.Post("/equipment/conflicts", crudHandler.CheckEquipmentConflicts)
				r.Post("/equipment/suggestions", crudHandler.GetEquipmentSuggestions)
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

			// Search — rate limited to prevent abuse
			r.Group(func(r chi.Router) {
				r.Use(mw.RateLimit(30, 1*time.Minute))
				r.Get("/search", searchHandler.SearchAll)
			})
		})

		// Admin routes — Auth + AdminOnly middleware
		r.Route("/admin", func(r chi.Router) {
			r.Use(mw.Auth(authService))
			r.Use(mw.AdminOnly(userRepo))

			r.Get("/stats", adminHandler.GetStats)
			r.Get("/users", adminHandler.ListUsers)
			r.Get("/users/{id}", adminHandler.GetUser)
			r.Put("/users/{id}/upgrade", adminHandler.UpgradeUser)
			r.Get("/subscriptions", adminHandler.GetSubscriptions)
		})
	})

	return r
}
