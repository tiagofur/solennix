package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/database"
	"github.com/tiagofur/solennix-backend/internal/handlers"
	mw "github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/router"
	"github.com/tiagofur/solennix-backend/internal/services"
	"github.com/tiagofur/solennix-backend/internal/storage"
)

func main() {
	// Configure structured logging
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	// Load config
	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	// Set rate limiter trust proxy from config
	mw.TrustProxy = cfg.TrustProxy
	mw.PlanLimits["basic"] = cfg.UserRateLimitBasic
	mw.PlanLimits["pro"] = cfg.UserRateLimitPro
	mw.PlanLimits["business"] = cfg.UserRateLimitBusiness
	mw.PlanLimits["premium"] = cfg.UserRateLimitPremium

	// Sentry — panics + errors reporting. No-op if DSN is empty.
	if cfg.SentryDSN != "" {
		if err := sentry.Init(sentry.ClientOptions{
			Dsn:              cfg.SentryDSN,
			Environment:      cfg.Environment,
			TracesSampleRate: cfg.SentryTracesSampleRate,
			SendDefaultPII:   false,
		}); err != nil {
			slog.Error("Sentry init failed", "error", err)
		} else {
			defer sentry.Flush(2 * time.Second)
			slog.Info("Sentry initialized", "environment", cfg.Environment, "traces_sample_rate", cfg.SentryTracesSampleRate)
		}
	}

	slog.Info("Starting server", "environment", cfg.Environment, "port", cfg.Port)

	// Connect to database
	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Run migrations
	if err := database.Migrate(pool); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		os.Exit(1)
	}

	// Bootstrap admin user if specified
	if cfg.BootstrapAdminEmail != "" {
		slog.Info("Bootstrapping admin user", "email", cfg.BootstrapAdminEmail)
		_, err := pool.Exec(context.Background(), "UPDATE users SET role = 'admin' WHERE email = $1", cfg.BootstrapAdminEmail)
		if err != nil {
			slog.Error("Failed to bootstrap admin user", "error", err)
		}
	}

	// Initialize services
	authService := services.NewAuthService(cfg.JWTSecret, cfg.JWTExpiryHours)
	emailService := services.NewEmailService(cfg)
	pushService := services.NewPushService(cfg)

	// Initialize repositories
	userRepo := repository.NewUserRepo(pool)
	clientRepo := repository.NewClientRepo(pool)
	eventRepo := repository.NewEventRepo(pool)
	productRepo := repository.NewProductRepo(pool)
	inventoryRepo := repository.NewInventoryRepo(pool)
	paymentRepo := repository.NewPaymentRepo(pool)
	adminRepo := repository.NewAdminRepo(pool)
	auditRepo := repository.NewAuditRepo(pool)
	dashboardRepo := repository.NewDashboardRepo(pool)
	subscriptionRepo := repository.NewSubscriptionRepo(pool)
	processedWebhookRepo := repository.NewProcessedWebhookRepo(pool)
	unavailRepo := repository.NewUnavailableDateRepo(pool)
	deviceRepo := repository.NewDeviceRepo(pool)
	revokedTokenRepo := repository.NewRevokedTokenRepo(pool)
	refreshTokenRepo := repository.NewRefreshTokenRepo(pool)
	liveActivityRepo := repository.NewLiveActivityTokenRepo(pool)
	eventPublicLinkRepo := repository.NewEventPublicLinkRepo(pool)
	paymentSubmissionRepo := repository.NewPaymentSubmissionRepo(pool)
	reviewRepo := repository.NewEventReviewRepo(pool)
	publicProfileRepo := repository.NewPublicProfileRepo(pool)
	publicRequestRepo := repository.NewPublicRequestRepo(pool)
	publicRequestLinkRepo := repository.NewPublicRequestLinkRepo(pool)
	staffRepo := repository.NewStaffRepo(pool)
	staffTeamRepo := repository.NewStaffTeamRepo(pool)
	userCleanupRepo := repository.NewUserCleanupRepo(pool)

	// Set persistent token blacklist (replaces in-memory sync.Map)
	mw.SetTokenBlacklist(revokedTokenRepo)
	mw.SetSecurityAuditLogger(auditRepo)

	// Initialize notification service
	notificationService := services.NewNotificationService(pushService, deviceRepo, pool, emailService)
	userCleanupService := services.NewUserCleanupService(userCleanupRepo, emailService)

	// Initialize Live Activity push service (iOS Dynamic Island updates)
	liveActivityService := services.NewLiveActivityService(liveActivityRepo, pushService)

	// Initialize handlers
	stripeService := &handlers.DefaultStripeService{}
	rcService := services.NewRevenueCatService(cfg.RevenueCatAPIKey)
	authHandler := handlers.NewAuthHandler(userRepo, authService, emailService, cfg)
	authHandler.SetRefreshTokenRepo(refreshTokenRepo)
	crudHandler := handlers.NewCRUDHandler(clientRepo, eventRepo, productRepo, inventoryRepo, paymentRepo, userRepo, unavailRepo)
	crudHandler.SetPool(pool)
	crudHandler.SetNotifier(notificationService)
	crudHandler.SetEmailService(emailService)
	crudHandler.SetLiveActivityNotifier(liveActivityService)
	crudHandler.SetStaffTeamRepo(staffTeamRepo)
	if eventTZ, err := time.LoadLocation(cfg.DefaultTimezone); err != nil {
		slog.Warn("Invalid APP_TIMEZONE for event scheduling; falling back to UTC", "configured", cfg.DefaultTimezone, "error", err)
		crudHandler.SetEventTimezone(time.UTC)
	} else {
		crudHandler.SetEventTimezone(eventTZ)
	}
	subHandler := handlers.NewSubscriptionHandler(userRepo, subscriptionRepo, eventRepo, paymentRepo, stripeService, rcService, processedWebhookRepo, cfg)
	subHandler.SetEmailService(emailService)
	// Evict expired Stripe subscription cache entries to bound memory (M10).
	handlers.StartStripeSubCacheSweeper(context.Background())
	searchHandler := handlers.NewSearchHandler(clientRepo, productRepo, inventoryRepo, eventRepo)
	eventPaymentHandler := handlers.NewEventPaymentHandler(eventRepo, paymentRepo, stripeService, cfg)
	// Initialize storage provider
	var storageProvider storage.Provider
	switch cfg.StorageProvider {
	case "s3":
		s3Provider, err := storage.NewS3Provider(context.Background(), storage.S3Config{
			Bucket:   cfg.S3Bucket,
			Region:   cfg.S3Region,
			Prefix:   cfg.S3Prefix,
			Endpoint: cfg.S3Endpoint,
			CDNURL:   cfg.S3CDNURL,
		})
		if err != nil {
			slog.Error("Failed to initialize S3 storage, falling back to local", "error", err)
			storageProvider = storage.NewLocalProvider(cfg.UploadDir, "/api/v1/uploads")
		} else {
			storageProvider = s3Provider
		}
	default:
		storageProvider = storage.NewLocalProvider(cfg.UploadDir, "/api/v1/uploads")
	}

	uploadHandler := handlers.NewUploadHandler(cfg.UploadDir, userRepo)
	uploadHandler.SetStorageProvider(storageProvider)
	presignMac := hmac.New(sha256.New, []byte(cfg.JWTSecret))
	presignMac.Write([]byte("solennix-presign-v1"))
	uploadHandler.SetPresignSigningKey(hex.EncodeToString(presignMac.Sum(nil)))
	adminHandler := handlers.NewAdminHandler(adminRepo)
	adminHandler.SetListingModeration(publicProfileRepo)
	auditHandler := handlers.NewAuditHandler(auditRepo)
	dashboardHandler := handlers.NewDashboardHandler(dashboardRepo)
	unavailHandler := handlers.NewUnavailableDateHandler(unavailRepo)
	deviceHandler := handlers.NewDeviceHandler(deviceRepo)
	liveActivityHandler := handlers.NewLiveActivityHandler(liveActivityRepo)
	eventPublicLinkHandler := handlers.NewEventPublicLinkHandler(eventPublicLinkRepo, eventRepo, clientRepo, userRepo, paymentRepo, cfg.FrontendURL)
	paymentSubmissionHandler := handlers.NewPaymentSubmissionHandler(paymentSubmissionRepo, paymentRepo, userRepo, pool, cfg.UploadDir, cfg.DefaultTimezone)
	reviewHandler := handlers.NewEventReviewHandler(reviewRepo, userRepo, publicProfileRepo, emailService, cfg.FrontendURL)
	publicProfileHandler := handlers.NewPublicProfileHandler(userRepo, publicProfileRepo, productRepo, reviewRepo, eventRepo, cfg.FrontendURL)
	publicRequestService := services.NewPublicRequestService(publicRequestRepo, publicProfileRepo, productRepo, userRepo, pool, 0)
	publicRequestService.SetNotifier(notificationService) // #1124 push on new PublicRequest
	publicRequestService.SetLinkRepo(publicRequestLinkRepo)
	publicRequestHandler := handlers.NewPublicRequestHandler(publicRequestService, publicRequestRepo)
	requestLinkHandler := handlers.NewRequestLinkHandler(
		publicRequestLinkRepo, publicRequestService, productRepo, publicProfileRepo, userRepo, cfg.FrontendURL, pool,
	)
	seoHandler := handlers.NewSEOHandler(userRepo, publicProfileRepo, cfg.FrontendURL)
	geocodingService := services.NewGeocodingService("", "")
	publicProfileConfigHandler := handlers.NewPublicProfileConfigHandler(userRepo, publicProfileRepo, geocodingService, cfg.FrontendURL)
	publicProfilePortfolioHandler := handlers.NewPublicProfilePortfolioHandler(userRepo, publicProfileRepo, eventRepo)
	publicProfilePackagesHandler := handlers.NewPublicProfilePackagesHandler(userRepo, publicProfileRepo)
	publicProfileServicesHandler := handlers.NewPublicProfileServicesHandler(productRepo)
	staffHandler := handlers.NewStaffHandler(staffRepo, userRepo)
	staffHandler.SetPool(pool)
	staffHandler.SetInviteSupport(authService, emailService, cfg.FrontendURL)
	staffTeamHandler := handlers.NewStaffTeamHandler(staffTeamRepo)
	pdfHandler := handlers.NewPDFHandler(eventRepo, clientRepo, paymentRepo, userRepo, cfg.UploadDir)

	// Create router
	r := router.New(authHandler, crudHandler, subHandler, searchHandler, eventPaymentHandler, uploadHandler, adminHandler, dashboardHandler, auditHandler, unavailHandler, deviceHandler, liveActivityHandler, eventPublicLinkHandler, paymentSubmissionHandler, reviewHandler, publicProfileHandler, publicProfileConfigHandler, publicProfilePortfolioHandler, publicProfilePackagesHandler, publicProfileServicesHandler, staffHandler, staffTeamHandler, publicRequestHandler, requestLinkHandler, seoHandler, pdfHandler, authService, userRepo, auditRepo, pool, cfg.CORSAllowedOrigins, cfg.UploadDir, cfg.Environment, cfg.TrustProxy)

	// Background job: expire gifted plans that have passed their expiry date.
	// Runs once at startup then every hour.
	go func() {
		runExpiry := func() {
			count, err := adminRepo.ExpireGiftedPlans(context.Background())
			if err != nil {
				slog.Error("Failed to expire gifted plans", "error", err)
			} else if count > 0 {
				slog.Info("Expired gifted plans", "count", count)
			}
		}
		runExpiry()
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runExpiry()
		}
	}()

	// Background job: send push notification reminders for upcoming events.
	// Runs every 15 minutes.
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			notificationService.ProcessPendingReminders(context.Background())
		}
	}()

	// Background job: send review request emails 48h after events.
	// Runs once at startup and every 6 hours.
	go func() {
		runReviews := func() {
			reviewHandler.SendScheduledReviewRequests(context.Background())
		}
		runReviews()
		ticker := time.NewTicker(6 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runReviews()
		}
	}()

	// Background job: send weekly summary emails to users.
	// Runs every Monday at 9:00 AM UTC.
	go func() {
		sendWeeklySummary := func() {
			now := time.Now().UTC()
			nextMonday := time.Now().UTC()
			// Calculate next Monday at 9:00 AM
			daysUntilMonday := (time.Monday - now.Weekday() + 7) % 7
			if daysUntilMonday == 0 && now.Hour() >= 9 {
				daysUntilMonday = 7
			}
			nextMonday = now.AddDate(0, 0, int(daysUntilMonday))
			nextMonday = time.Date(nextMonday.Year(), nextMonday.Month(), nextMonday.Day(), 9, 0, 0, 0, time.UTC)

			timer := time.NewTimer(nextMonday.Sub(now))
			<-timer.C

			// First send, then schedule for every week
			notificationService.SendWeeklySummaryEmails(context.Background())
			ticker := time.NewTicker(7 * 24 * time.Hour)
			defer ticker.Stop()
			for range ticker.C {
				notificationService.SendWeeklySummaryEmails(context.Background())
			}
		}
		go sendWeeklySummary()
	}()

	// Background job: send marketing emails to users.
	// Runs every Friday at 9:00 AM UTC.
	go func() {
		sendMarketing := func() {
			now := time.Now().UTC()
			nextFriday := time.Now().UTC()
			// Calculate next Friday at 9:00 AM
			daysUntilFriday := (time.Friday - now.Weekday() + 7) % 7
			if daysUntilFriday == 0 && now.Hour() >= 9 {
				daysUntilFriday = 7
			}
			nextFriday = now.AddDate(0, 0, int(daysUntilFriday))
			nextFriday = time.Date(nextFriday.Year(), nextFriday.Month(), nextFriday.Day(), 9, 0, 0, 0, time.UTC)

			timer := time.NewTimer(nextFriday.Sub(now))
			<-timer.C

			// First send, then schedule for every week
			notificationService.SendMarketingEmails(context.Background())
			ticker := time.NewTicker(7 * 24 * time.Hour)
			defer ticker.Stop()
			for range ticker.C {
				notificationService.SendMarketingEmails(context.Background())
			}
		}
		go sendMarketing()
	}()

	// Background job: expire stale public request links.
	go func() {
		runExpiry := func() {
			linkCount, linkErr := publicRequestService.ExpireStaleLinks(context.Background())
			if linkErr != nil {
				slog.Error("Failed to expire stale public request links", "error", linkErr)
			} else if linkCount > 0 {
				slog.Info("Expired stale public request links", "count", linkCount)
			}
		}
		runExpiry()
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runExpiry()
		}
	}()

	// Background job: clean expired revoked tokens and refresh token families.
	// Runs once at startup then every hour.
	go func() {
		cleanup := func() {
			count, err := revokedTokenRepo.CleanupExpired(context.Background())
			if err != nil {
				slog.Error("Failed to cleanup expired tokens", "error", err)
			} else if count > 0 {
				slog.Info("Cleaned up expired revoked tokens", "count", count)
			}

			refreshCount, refreshErr := refreshTokenRepo.CleanupExpired(context.Background())
			if refreshErr != nil {
				slog.Error("Failed to cleanup expired refresh token families", "error", refreshErr)
			} else if refreshCount > 0 {
				slog.Info("Cleaned up expired refresh token families", "count", refreshCount)
			}
		}
		cleanup()
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			cleanup()
		}
	}()

	// Background job: run user cleanup lifecycle daily at 03:00 UTC.
	go func() {
		runCleanup := func() {
			slog.Info("Starting daily user cleanup lifecycle task...")
			res, err := userCleanupService.RunLifecycleCleanup(context.Background())
			if err != nil {
				slog.Error("Failed to execute user cleanup lifecycle", "error", err)
			} else {
				slog.Info("Completed user cleanup lifecycle task",
					"stage1", res.Stage1Count,
					"stage2", res.Stage2Count,
					"stage3", res.Stage3Count,
					"blocked", res.BlockedCount,
					"deleted", res.DeletedCount,
				)
			}
		}

		for {
			now := time.Now().UTC()
			next0300 := time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, time.UTC)
			if !next0300.After(now) {
				next0300 = next0300.Add(24 * time.Hour)
			}
			timer := time.NewTimer(time.Until(next0300))
			select {
			case <-timer.C:
				runCleanup()
			}
		}
	}()

	// Background job: expire stale public quote requests (#1115).
	// Marks requests with no activity for 14 days as "expired" (cleans the
	// organizer inbox and stops the visitor from acting on a stale quote).
	// Runs once at startup then daily.
	go func() {
		runExpiry := func() {
			count, err := publicRequestService.ExpireStale(context.Background())
			if err != nil {
				slog.Error("Failed to expire stale public requests", "error", err)
			} else if count > 0 {
				slog.Info("Expired stale public requests", "count", count)
			}
		}
		runExpiry()
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runExpiry()
		}
	}()

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	slog.Info("Server started", "addr", srv.Addr)

	<-done
	slog.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server shutdown failed", "error", err)
	}

	slog.Info("Server stopped")
}
