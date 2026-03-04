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

	"github.com/tiagofur/eventosapp-backend/internal/config"
	"github.com/tiagofur/eventosapp-backend/internal/database"
	"github.com/tiagofur/eventosapp-backend/internal/handlers"
	"github.com/tiagofur/eventosapp-backend/internal/repository"
	"github.com/tiagofur/eventosapp-backend/internal/router"
	"github.com/tiagofur/eventosapp-backend/internal/services"
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

	// Initialize repositories
	userRepo := repository.NewUserRepo(pool)
	clientRepo := repository.NewClientRepo(pool)
	eventRepo := repository.NewEventRepo(pool)
	productRepo := repository.NewProductRepo(pool)
	inventoryRepo := repository.NewInventoryRepo(pool)
	paymentRepo := repository.NewPaymentRepo(pool)
	adminRepo := repository.NewAdminRepo(pool)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userRepo, authService, emailService)
	crudHandler := handlers.NewCRUDHandler(clientRepo, eventRepo, productRepo, inventoryRepo, paymentRepo, userRepo)
	subHandler := handlers.NewSubscriptionHandler(userRepo, eventRepo, paymentRepo, cfg)
	searchHandler := handlers.NewSearchHandler(clientRepo, productRepo, inventoryRepo, eventRepo)
	eventPaymentHandler := handlers.NewEventPaymentHandler(eventRepo, paymentRepo, cfg)
	uploadHandler := handlers.NewUploadHandler(cfg.UploadDir)
	adminHandler := handlers.NewAdminHandler(adminRepo)

	// Create router
	r := router.New(authHandler, crudHandler, subHandler, searchHandler, eventPaymentHandler, uploadHandler, adminHandler, authService, userRepo, cfg.CORSAllowedOrigins, cfg.UploadDir)

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
