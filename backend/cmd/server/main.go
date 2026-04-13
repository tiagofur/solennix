package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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
	unavailRepo := repository.NewUnavailableDateRepo(pool)
	deviceRepo := repository.NewDeviceRepo(pool)
	revokedTokenRepo := repository.NewRevokedTokenRepo(pool)
	refreshTokenRepo := repository.NewRefreshTokenRepo(pool)
	liveActivityRepo := repository.NewLiveActivityTokenRepo(pool)
	eventFormLinkRepo := repository.NewEventFormLinkRepo(pool)

	// Set persistent token blacklist (replaces in-memory sync.Map)
	mw.SetTokenBlacklist(revokedTokenRepo)

	// Initialize notification service
	notificationService := services.NewNotificationService(pushService, deviceRepo, pool)

	// Initialize Live Activity push service (iOS Dynamic Island updates)
	liveActivityService := services.NewLiveActivityService(liveActivityRepo, pushService)

	// Initialize handlers
	stripeService := &handlers.DefaultStripeService{}
	rcService := services.NewRevenueCatService(cfg.RevenueCatAPIKey)
	authHandler := handlers.NewAuthHandler(userRepo, authService, emailService, cfg)
	authHandler.SetRefreshTokenRepo(refreshTokenRepo)
	crudHandler := handlers.NewCRUDHandler(clientRepo, eventRepo, productRepo, inventoryRepo, paymentRepo, userRepo, unavailRepo)
	crudHandler.SetNotifier(notificationService)
	crudHandler.SetEmailService(emailService)
	crudHandler.SetLiveActivityNotifier(liveActivityService)
	subHandler := handlers.NewSubscriptionHandler(userRepo, subscriptionRepo, eventRepo, paymentRepo, stripeService, rcService, cfg)
	subHandler.SetEmailService(emailService)
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
	adminHandler := handlers.NewAdminHandler(adminRepo)
	auditHandler := handlers.NewAuditHandler(auditRepo)
	dashboardHandler := handlers.NewDashboardHandler(dashboardRepo)
	unavailHandler := handlers.NewUnavailableDateHandler(unavailRepo)
	deviceHandler := handlers.NewDeviceHandler(deviceRepo)
	liveActivityHandler := handlers.NewLiveActivityHandler(liveActivityRepo)
	eventFormHandler := handlers.NewEventFormHandler(eventFormLinkRepo, productRepo, userRepo, cfg.FrontendURL, pool)

	// Create router
	r := router.New(authHandler, crudHandler, subHandler, searchHandler, eventPaymentHandler, uploadHandler, adminHandler, dashboardHandler, auditHandler, unavailHandler, deviceHandler, liveActivityHandler, eventFormHandler, authService, userRepo, auditRepo, pool, cfg.CORSAllowedOrigins, cfg.UploadDir)

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

	// Background job: expire stale event form links.
	go func() {
		runExpiry := func() {
			count, err := eventFormLinkRepo.ExpireStale(context.Background())
			if err != nil {
				slog.Error("Failed to expire stale event form links", "error", err)
			} else if count > 0 {
				slog.Info("Expired stale event form links", "count", count)
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
