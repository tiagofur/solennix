package router

import (
	"context"
	"net/http"
	"path"
	"strings"
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
	paymentSubmissionHandler *handlers.PaymentSubmissionHandler,
	reviewHandler *handlers.EventReviewHandler,
	publicProfileHandler *handlers.PublicProfileHandler,
	publicProfileConfigHandler *handlers.PublicProfileConfigHandler,
	publicProfilePortfolioHandler *handlers.PublicProfilePortfolioHandler,
	publicProfilePackagesHandler *handlers.PublicProfilePackagesHandler,
	publicProfileServicesHandler *handlers.PublicProfileServicesHandler,
	staffHandler *handlers.StaffHandler,
	staffTeamHandler *handlers.StaffTeamHandler,
	publicLeadHandler *handlers.PublicLeadHandler,
	publicRequestHandler *handlers.PublicRequestHandler,
	seoHandler *handlers.SEOHandler,
	pdfHandler *handlers.PDFHandler,
	authService *services.AuthService, userRepo *repository.UserRepo, auditRepo mw.AuditLogger, pool *pgxpool.Pool, corsOrigins []string, uploadDir string, environment string, trustProxy bool) http.Handler {

	deprecationPolicy := "https://github.com/tiagofur/solennix/wiki/API-Deprecation-Policy"
	sunsetDate := time.Date(2026, time.September, 30, 0, 0, 0, 0, time.UTC)
	deprecateMid := mw.Deprecate(sunsetDate, deprecationPolicy)

	r := chi.NewRouter()

	// Global middleware
	r.Use(mw.Recovery)  // Panic recovery — outermost so it catches the repanic from Sentry
	r.Use(mw.Sentry)    // Per-request Sentry hub; captures panics then repanics (no-op if Sentry DSN unset)
	r.Use(mw.RequestID) // X-Request-ID for tracing
	r.Use(mw.RedirectToHTTPS(environment, trustProxy))
	r.Use(mw.Localization())
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
			r.Post("/team-invite/accept", authHandler.AcceptTeamInvite)
			r.Post("/forgot-password", authHandler.ForgotPassword)
			r.Post("/reset-password", authHandler.ResetPassword)
			r.Get("/verify-email", authHandler.VerifyEmail)
			r.Post("/verify-email/resend", authHandler.ResendEmailVerification)
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

		// Session management — modest rate limit (10/min allows normal refresh-on-expiry
		// patterns while protecting against credential-stuffing on these endpoints).
		r.Group(func(r chi.Router) {
			r.Use(mw.RateLimit(10, 1*time.Minute))
			r.Post("/logout", authHandler.Logout)
			r.Post("/refresh", authHandler.RefreshToken)
		})

		// Protected auth routes (requires valid token)
		r.Group(func(r chi.Router) {
			r.Use(mw.Auth(authService))
			r.Use(mw.AccountStatusActive(userRepo))
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
	isReceiptUploadPath := func(requestPath string, prefix string) bool {
		trimmed := strings.TrimPrefix(requestPath, prefix)
		cleaned := path.Clean("/" + trimmed)
		return cleaned == "/receipts" || strings.HasPrefix(cleaned, "/receipts/")
	}
	corsOriginAllowed := func(origin string) bool {
		for _, allowed := range corsOrigins {
			if strings.TrimSpace(allowed) == origin {
				return true
			}
		}
		return false
	}
	setUploadCORSHeaders := func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" && corsOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
	}
	v1FileServer := http.StripPrefix("/api/v1/uploads/", http.FileServer(http.Dir(uploadDir)))
	legacyFileServer := http.StripPrefix("/api/uploads/", http.FileServer(http.Dir(uploadDir)))
	r.Get("/api/v1/uploads/*", func(w http.ResponseWriter, r *http.Request) {
		if isReceiptUploadPath(r.URL.Path, "/api/v1/uploads/") {
			http.NotFound(w, r)
			return
		}
		setUploadCORSHeaders(w, r)
		w.Header().Set("Cache-Control", "public, max-age=31536000")
		w.Header().Set("X-API-Version", "v1")
		v1FileServer.ServeHTTP(w, r)
	})
	r.Get("/api/uploads/*", func(w http.ResponseWriter, r *http.Request) {
		if isReceiptUploadPath(r.URL.Path, "/api/uploads/") {
			http.NotFound(w, r)
			return
		}
		setUploadCORSHeaders(w, r)
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

		// Payment submissions (client portal) — tokenized access
		r.Post("/{token}/payment-submissions", paymentSubmissionHandler.CreatePublic)
		r.Get("/{token}/payment-submissions", paymentSubmissionHandler.GetHistoryPublic)
	})

	apiRouter.Route("/public/reviews", func(r chi.Router) {
		r.Use(mw.RateLimit(10, 1*time.Minute))
		r.Get("/{token}", reviewHandler.GetPublicReviewRequest)
		r.Post("/{token}", reviewHandler.SubmitPublicReview)
	})

	apiRouter.Route("/public/organizers", func(r chi.Router) {
		r.Use(mw.RateLimit(20, 1*time.Minute))
		// Directory listing (v2.0, #1116). Declared before /{slug} so Chi matches
		// the static root; the param route never catches an empty path segment.
		r.Get("/", publicProfileHandler.SearchOrganizers)
		r.Get("/{slug}", publicProfileHandler.GetPublicProfile)
		r.Get("/{slug}/reviews", reviewHandler.ListPublicPortfolioReviews)
		// Per-profile social preview image (redirects to cover/logo or renders a branded PNG).
		r.Get("/{slug}/og-image", seoHandler.OGImage)
		// Tighter rate limit for lead submissions (form spam protection).
		r.With(mw.RateLimit(5, 1*time.Minute)).Post("/{slug}/leads", publicLeadHandler.SubmitPublicLead)
		// Structured quote requests (v2.0 inbound tooling, #1115). Same anti-spam
		// tightness as the legacy leads form; the service also enforces a per-organizer
		// pending cap.
		r.With(mw.RateLimit(5, 1*time.Minute)).Post("/{slug}/requests", publicRequestHandler.CreatePublicRequest)
	})

	// Crawler artifacts.
	apiRouter.Route("/public", func(r chi.Router) {
		r.Use(mw.RateLimit(30, 1*time.Minute))
		r.Get("/sitemap-profiles.xml", seoHandler.SitemapProfiles)
	})

	// Visitor action on their own request (v2.0, #1115). Public, identified by
	// the X-Request-Token header (NG1: visitor has no account). Tight rate limit
	// to resist token-guessing abuse.
	apiRouter.Route("/public/requests", func(r chi.Router) {
		r.Use(mw.RateLimit(10, 1*time.Minute))
		r.With(mw.RateLimit(5, 1*time.Minute)).Post("/{id}/action", publicRequestHandler.ClientAction)
	})

	// Protected routes
	apiRouter.Group(func(r chi.Router) {
		r.Use(mw.Auth(authService))
		r.Use(mw.ActivityTracker(userRepo))
		r.Use(mw.AccountStatusActive(userRepo))
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
		r.Delete("/users/me", authHandler.DeleteOwnAccount)
		r.Get("/users/me/public-profile", publicProfileConfigHandler.GetMyPublicProfile)
		r.Put("/users/me/public-profile", publicProfileConfigHandler.UpsertMyPublicProfile)
		r.Post("/users/me/public-profile/submit-for-review", publicProfileConfigHandler.SubmitForDirectoryReview)
		r.Get("/users/me/public-profile/services", publicProfileServicesHandler.ListMyPublicProfileServices)
		r.Put("/users/me/public-profile/services", publicProfileServicesHandler.SetMyPublicProfileServices)
		r.Get("/users/me/public-profile/portfolio", publicProfilePortfolioHandler.ListPortfolioItems)
		r.Post("/users/me/public-profile/portfolio", publicProfilePortfolioHandler.CreatePortfolioItem)
		r.Get("/users/me/public-profile/portfolio/candidates", publicProfilePortfolioHandler.ListPortfolioCandidates)
		r.Put("/users/me/public-profile/portfolio/{id}", publicProfilePortfolioHandler.UpdatePortfolioItem)
		r.Delete("/users/me/public-profile/portfolio/{id}", publicProfilePortfolioHandler.DeletePortfolioItem)

		// Packages / combos (Issue #1081)
		r.Get("/users/me/public-profile/packages", publicProfilePackagesHandler.ListPackages)
		r.Post("/users/me/public-profile/packages", publicProfilePackagesHandler.CreatePackage)
		r.Put("/users/me/public-profile/packages/{id}", publicProfilePackagesHandler.UpdatePackage)
		r.Delete("/users/me/public-profile/packages/{id}", publicProfilePackagesHandler.DeletePackage)

		// FAQ (Issue #1081)
		r.Get("/users/me/public-profile/faq", publicProfilePackagesHandler.ListFaq)
		r.Post("/users/me/public-profile/faq", publicProfilePackagesHandler.CreateFaqItem)
		r.Put("/users/me/public-profile/faq/{id}", publicProfilePackagesHandler.UpdateFaqItem)
		r.Delete("/users/me/public-profile/faq/{id}", publicProfilePackagesHandler.DeleteFaqItem)

		// Staff (Personal — collaborators catalog)
		r.Route("/staff", func(r chi.Router) {
			r.Get("/", staffHandler.ListStaff)
			r.Post("/", staffHandler.CreateStaff)
			r.Get("/my-assignments", staffHandler.GetMyAssignments)
			r.Get("/my-timeline", staffHandler.GetMyTimeline)
			r.Post("/my-timeline/read", staffHandler.MarkMyTimelineRead)
			r.Post("/assignments/{id}/respond", staffHandler.RespondAssignment)
			r.Get("/assignments/{id}/execution-state", staffHandler.GetExecutionState)
			r.Put("/assignments/{id}/execution-state", staffHandler.PutExecutionState)
			r.Post("/{id}/invite", staffHandler.InviteStaffUser)
			r.Delete("/{id}/invite", staffHandler.RevokeStaffInvite)
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
			r.Get("/search", crudHandler.SearchEvents)    // Advanced search — before /{id} to avoid conflict
			r.Get("/ical", crudHandler.GetCalendarExport) // iCal export — before /{id} to avoid conflict
			r.Post("/", crudHandler.CreateEvent)
			r.Get("/{id}", crudHandler.GetEvent)
			r.Put("/{id}", crudHandler.UpdateEvent)
			r.Delete("/{id}", crudHandler.DeleteEvent)
			r.Get("/{id}/products", crudHandler.GetEventProducts)
			r.Get("/{id}/extras", crudHandler.GetEventExtras)
			r.Get("/{id}/financials", crudHandler.GetEventFinancials)
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
			r.Get("/equipment/availability", crudHandler.GetEquipmentAvailabilityGET)
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

			// PDF downloads — one endpoint per document type
			r.Get("/{id}/pdf/budget", pdfHandler.GetBudgetPDF)
			r.Get("/{id}/pdf/payment-report", pdfHandler.GetPaymentReportPDF)
			r.Get("/{id}/pdf/contract", pdfHandler.GetContractPDF)
			r.Get("/{id}/pdf/shopping-list", pdfHandler.GetShoppingListPDF)
			r.Get("/{id}/pdf/checklist", pdfHandler.GetChecklistPDF)
			r.Get("/{id}/pdf/equipment-list", pdfHandler.GetEquipmentListPDF)
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

		// Quick Quotes
		r.Route("/quick-quotes", func(r chi.Router) {
			r.Post("/pdf", pdfHandler.GetQuickQuotePDF)
		})

		// Payment Submissions (organizer review inbox)
		r.Route("/payment-submissions", func(r chi.Router) {
			r.Get("/", paymentSubmissionHandler.GetPendingOrganizerInbox)
			r.Get("/{id}/receipt/{filename}", paymentSubmissionHandler.GetReceipt)
			r.Patch("/{id}", paymentSubmissionHandler.ReviewSubmission)
		})

		r.Route("/reviews", func(r chi.Router) {
			r.Get("/", reviewHandler.ListOrganizerReviews)
			r.Patch("/{id}/response", reviewHandler.UpdateOrganizerResponse)
			r.Patch("/{id}/visibility", reviewHandler.UpdateReviewVisibility)
		})

		// Public-profile leads (inquiries) inbox for the organizer.
		r.Route("/leads", func(r chi.Router) {
			r.Get("/", publicLeadHandler.ListLeads)
			r.Post("/{id}/read", publicLeadHandler.MarkLeadRead)
		})

		// Structured quote-request inbox + actions for the organizer (v2.0, #1115).
		r.Route("/organizers/me/requests", func(r chi.Router) {
			r.Get("/", publicRequestHandler.ListRequests)
			r.Get("/unread-count", publicRequestHandler.CountUnread)
			r.Get("/{id}", publicRequestHandler.GetRequest)
			r.Post("/{id}/read", publicRequestHandler.MarkRead)
			r.Post("/{id}/responses", publicRequestHandler.RespondRequest)
			r.Post("/{id}/decline", publicRequestHandler.DeclineRequest)
			r.Post("/{id}/request-info", publicRequestHandler.RequestInfo)
			r.Post("/{id}/convert-to-event", publicRequestHandler.ConvertToEvent)
		})

		// Backward-compatible alias for older organizer clients still calling the prefixed path.
		r.Route("/organizer/payment-submissions", func(r chi.Router) {
			r.Use(deprecateMid)
			r.Get("/", paymentSubmissionHandler.GetPendingOrganizerInbox)
			r.Get("/{id}/receipt/{filename}", paymentSubmissionHandler.GetReceipt)
			r.Patch("/{id}", paymentSubmissionHandler.ReviewSubmission)
		})

		// Unavailable Dates
		r.Route("/unavailable-dates", func(r chi.Router) {
			r.Get("/", unavailHandler.GetUnavailableDates)
			r.Post("/", unavailHandler.CreateUnavailableDate)
			r.Put("/{id}", unavailHandler.UpdateUnavailableDate)
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
			r.Get("/summary", dashboardHandler.GetSummary)
			r.Get("/revenue-chart", dashboardHandler.GetRevenueChart)
			r.Get("/events-by-status", dashboardHandler.GetEventsByStatus)
			r.Get("/top-clients", dashboardHandler.GetTopClients)
			r.Get("/product-demand", dashboardHandler.GetProductDemand)
			r.Get("/forecast", dashboardHandler.GetForecast)
			r.Get("/attention", dashboardHandler.GetAttention)
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
		r.Get("/users/inactive", adminHandler.GetInactiveUsers)
		r.Get("/users/empty-resources", adminHandler.GetUsersWithZeroResources)
		r.Get("/users", adminHandler.ListUsers)
		r.Get("/users/{id}", adminHandler.GetUser)
		r.Put("/users/{id}/block", adminHandler.BlockUser)
		r.Delete("/users/{id}", adminHandler.DeleteUser)
		r.Put("/users/{id}/upgrade", adminHandler.UpgradeUser)
		r.Post("/users/{id}/verify-email", adminHandler.VerifyUserEmail)
		r.Get("/subscriptions", adminHandler.GetSubscriptions)
		r.Get("/audit-logs", auditHandler.GetAllAuditLogs)
		// Listing moderation queue (#1130).
		r.Get("/listing-moderation", adminHandler.ListListingModeration)
		r.Post("/listing-moderation/{id}/approve", adminHandler.ApproveListing)
		r.Post("/listing-moderation/{id}/reject", adminHandler.RejectListing)
	})

	// Mount API subrouter under versioned prefix (canonical) and legacy prefix (backward compatible)
	r.Mount("/api/v1", apiRouter)
	r.Mount("/api", deprecateMid(apiRouter))

	return r
}
