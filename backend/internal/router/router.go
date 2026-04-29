package router

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/handlers"
	mw "github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

func New(authHandler *handlers.AuthHandler, crudHandler *handlers.CRUDHandler, subHandler *handlers.SubscriptionHandler,
	searchHandler *handlers.SearchHandler, eventPaymentHandler *handlers.EventPaymentHandler, uploadHandler *handlers.UploadHandler,
	adminHandler *handlers.AdminHandler, dashboardHandler *handlers.DashboardHandler, auditHandler *handlers.AuditHandler, unavailHandler *handlers.UnavailableDateHandler, deviceHandler *handlers.DeviceHandler,
	liveActivityHandler *handlers.LiveActivityHandler, eventFormHandler *handlers.EventFormHandler,
	eventPublicLinkHandler *handlers.EventPublicLinkHandler,
	staffHandler *handlers.StaffHandler,
	staffTeamHandler *handlers.StaffTeamHandler,
	authService *services.AuthService, userRepo *repository.UserRepo, auditRepo mw.AuditLogger, pool *pgxpool.Pool, corsOrigins []string, uploadDir string) http.Handler {

	r := chi.NewRouter()

	// Global middleware
	r.Use(mw.Recovery)        // Panic recovery — outermost so it catches the repanic from Sentry
	r.Use(mw.Sentry)          // Per-request Sentry hub; captures panics then repanics (no-op if Sentry DSN unset)
	r.Use(mw.RequestID)       // X-Request-ID for tracing
	r.Use(mw.CORS(corsOrigins))
	r.Use(mw.SecurityHeaders) // Security headers (X-Frame-Options, CSP, HSTS, etc.)
	r.Use(mw.Logger)

	// Health check — verifies database connectivity
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if pool != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			if err := pool.Ping(ctx); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				w.Write([]byte(`{"status":"unhealthy","db":"disconnected"}`))
				return
			}
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"status":"ok","db":"connected"}`))
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Build API subrouter — mounted under both /api/v1 and /api for compatibility.
	apiRouter := chi.NewRouter()
	apiRouter.Use(mw.APIVersion("v1"))
	apiRouter.Use(mw.Timeout(30 * time.Second)) // Bounds downstream SQL queries
	apiRouter.Use(mw.CSRF)

	// Auth routes
	apiRouter.Route("/auth", func(r chi.Router) {
		// Public brute-force-sensitive routes — rate limited
		r.Group(func(r chi.Router) {
			r.Use(mw.RateLimit(5, 1*time.Minute))
			r.Post("/login", authHandler.Login)
			r.Post("/forgot-password", authHandler.ForgotPassword)
			r.Post("/reset-password", authHandler.ResetPassword)
			r.Post("/google", authHandler.GoogleSignIn)
			r.Post("/apple", authHandler.AppleSignIn)
			r.Get("/apple/init", authHandler.AppleInit)
			r.Post("/apple/callback", authHandler.AppleCallback)
			// /register has its own stricter limit (account creation abuse)
			r.Group(func(r chi.Router) {
				r.Use(mw.RateLimit(3, 15*time.Minute))
				r.Post("/register", authHandler.Register)
			})
		})

		// Session management — no aggressive rate limit
		// /me is called on every page load, /refresh on token expiry, /logout to clear session
		r.Post("/logout", authHandler.Logout)
		r.Post("/refresh", authHandler.RefreshToken)

		// Protected auth routes (requires valid token)
		r.Group(func(r chi.Router) {
			r.Use(mw.Auth(authService))
			r.Get("/me", authHandler.Me)
			r.Post("/change-password", authHandler.ChangePassword)
		})
	})

	// Subscriptions
	apiRouter.Route("/subscriptions", func(r chi.Router) {
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
	// Mounted on the main router (not the subrouter) because http.StripPrefix
	// needs the full original request path to strip correctly.
	v1FileServer := http.StripPrefix("/api/v1/uploads/", http.FileServer(http.Dir(uploadDir)))
	legacyFileServer := http.StripPrefix("/api/uploads/", http.FileServer(http.Dir(uploadDir)))
	r.Get("/api/v1/uploads/*", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("X-API-Version", "v1")
		v1FileServer.ServeHTTP(w, r)
	})
	r.Get("/api/uploads/*", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("X-API-Version", "v1")
		legacyFileServer.ServeHTTP(w, r)
	})

	// Public event form routes (no auth — validated by token)
	apiRouter.Route("/public/event-forms", func(r chi.Router) {
		r.Use(mw.RateLimit(10, 1*time.Minute))
		r.Get("/{token}", eventFormHandler.GetFormData)
		r.Post("/{token}", eventFormHandler.SubmitForm)
	})

	// Public client-portal route (PRD/12 feature A). Tokens are
	// cryptographically random; same rate limit as event-forms to keep the
	// abuse surface narrow.
	apiRouter.Route("/public/events", func(r chi.Router) {
		r.Use(mw.RateLimit(10, 1*time.Minute))
		r.Get("/{token}", eventPublicLinkHandler.GetPortalData)
	})

	// Protected routes
	apiRouter.Group(func(r chi.Router) {
		r.Use(mw.Auth(authService))
		r.Use(mw.ValidateUUID("id", "photoId"))
		planResolver := mw.NewCachedPlanResolver(userRepo, 5*time.Minute)
		r.Use(mw.UserRateLimit(planResolver, 1*time.Minute))
		r.Use(mw.Audit(auditRepo))

		// Uploads (authenticated, rate limited)
		r.Group(func(r chi.Router) {
			r.Use(mw.RateLimit(5, 1*time.Minute))
			r.Post("/uploads/image", uploadHandler.UploadImage)
			r.Post("/uploads/presign", uploadHandler.PresignImage)
			r.Post("/uploads/complete", uploadHandler.CompletePresignedUpload)
		})

		// Users
		r.Put("/users/me", authHandler.UpdateProfile)

		// Staff (Personal — collaborators catalog)
		r.Route("/staff", func(r chi.Router) {
			r.Get("/", staffHandler.ListStaff)
			r.Post("/", staffHandler.CreateStaff)
			// availability must be registered before /{id} so chi does not treat
			// "availability" as an id param.
			r.Get("/availability", staffHandler.GetStaffAvailability)
			// Teams (Ola 2) — static prefix wins over /{id} in chi's trie.
			// Guarded so router tests / future wiring can pass nil without
			// triggering a method-on-nil panic when a request hits /teams.
			if staffTeamHandler != nil {
				r.Route("/teams", func(r chi.Router) {
					r.Get("/", staffTeamHandler.ListTeams)
					r.Post("/", staffTeamHandler.CreateTeam)
					r.Get("/{id}", staffTeamHandler.GetTeam)
					r.Put("/{id}", staffTeamHandler.UpdateTeam)
					r.Delete("/{id}", staffTeamHandler.DeleteTeam)
				})
			}
			r.Get("/{id}", staffHandler.GetStaff)
			r.Put("/{id}", staffHandler.UpdateStaff)
			r.Delete("/{id}", staffHandler.DeleteStaff)
		})

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
			r.Get("/search", crudHandler.SearchEvents) // Advanced search — before /{id} to avoid conflict
			r.Post("/", crudHandler.CreateEvent)
			r.Get("/{id}", crudHandler.GetEvent)
			r.Put("/{id}", crudHandler.UpdateEvent)
			r.Delete("/{id}", crudHandler.DeleteEvent)
			r.Get("/{id}/products", crudHandler.GetEventProducts)
			r.Get("/{id}/extras", crudHandler.GetEventExtras)
			r.Put("/{id}/items", crudHandler.UpdateEventItems)
			r.Get("/{id}/equipment", crudHandler.GetEventEquipment)
			r.Get("/{id}/supplies", crudHandler.GetEventSupplies)
			r.Get("/{id}/staff", crudHandler.GetEventStaff)
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
			// Client-portal share link (PRD/12 feature A). Per-event CRUD
			// for the tokenized URL the organizer shares with the end client.
			r.Post("/{id}/public-link", eventPublicLinkHandler.CreateOrRotate)
			r.Get("/{id}/public-link", eventPublicLinkHandler.GetActive)
			r.Delete("/{id}/public-link", eventPublicLinkHandler.Revoke)
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
			r.Get("/{id}", crudHandler.GetPayment)
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

		// iOS Live Activity push tokens (Dynamic Island remote updates)
		r.Route("/live-activities", func(r chi.Router) {
			r.Post("/register", liveActivityHandler.Register)
			r.Delete("/by-event/{eventId}", liveActivityHandler.DeleteByEvent)
		})

		// Event form links (shareable forms for prospective clients)
		r.Route("/event-forms", func(r chi.Router) {
			r.Get("/", eventFormHandler.ListLinks)
			r.Post("/", eventFormHandler.GenerateLink)
			r.Delete("/{id}", eventFormHandler.DeleteLink)
		})

		// Search — rate limited to prevent abuse
		r.Group(func(r chi.Router) {
			r.Use(mw.RateLimit(30, 1*time.Minute))
			r.Get("/search", searchHandler.SearchAll)
		})

		// Dashboard analytics (user-scoped)
		r.Route("/dashboard", func(r chi.Router) {
			r.Get("/kpis", dashboardHandler.GetKPIs)
			r.Get("/revenue-chart", dashboardHandler.GetRevenueChart)
			r.Get("/events-by-status", dashboardHandler.GetEventsByStatus)
			r.Get("/top-clients", dashboardHandler.GetTopClients)
			r.Get("/product-demand", dashboardHandler.GetProductDemand)
			r.Get("/forecast", dashboardHandler.GetForecast)
			r.Get("/activity", auditHandler.GetActivity)
		})
	})

	// Admin routes — Auth + AdminOnly middleware + rate limited
	apiRouter.Route("/admin", func(r chi.Router) {
		r.Use(mw.Auth(authService))
		r.Use(mw.ValidateUUID("id"))
		r.Use(mw.AdminOnly(userRepo))
		r.Use(mw.RateLimit(30, 1*time.Minute))

		r.Get("/stats", adminHandler.GetStats)
		r.Get("/users", adminHandler.ListUsers)
		r.Get("/users/{id}", adminHandler.GetUser)
		r.Put("/users/{id}/upgrade", adminHandler.UpgradeUser)
		r.Get("/subscriptions", adminHandler.GetSubscriptions)
		r.Get("/audit-logs", auditHandler.GetAllAuditLogs)
	})

	// Mount API subrouter under versioned prefix (canonical) and legacy prefix (backward compatible)
	r.Mount("/api/v1", apiRouter)
	r.Mount("/api", apiRouter)

	return r
}
