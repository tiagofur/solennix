package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// PublicRequestService owns the business logic for structured quote requests:
// creation validation, the status state machine, conversion to an Event
// (reusing the EventFormLink flow), and the anti-spam cap.
//
// See PRD docs/PRD/15_MARKETPLACE_V2.md §3 and
// openspec/changes/add-public-request-flow/design.md.
//
// NG1 ratified: the requester is a visitor with a contact email, not a Solennix
// user. client_token lets them act on their own request without an account.
type PublicRequestService struct {
	requestRepo    PublicRequestStore
	profileRepo    PublicProfileLookup
	productRepo    PublicProductLookup
	userSlugLookup PublicUserSlugLookup
	pool           *pgxpool.Pool
	pendingCap     int // max pending requests per organizer before 429 (PRD §3.4)
}

// PublicRequestStore is the subset of *repository.PublicRequestRepo the service
// uses. Extracted as interface for testability (mock in unit tests).
type PublicRequestStore interface {
	Create(ctx context.Context, req *models.PublicRequest) error
	GetByID(ctx context.Context, id, organizerUserID uuid.UUID) (*models.PublicRequest, error)
	GetByIDAndToken(ctx context.Context, id uuid.UUID, clientToken uuid.UUID) (*models.PublicRequest, error)
	UpdateStatus(ctx context.Context, id, organizerUserID uuid.UUID, newStatus models.RequestStatus, declinedReason *string) error
	SetEventID(ctx context.Context, id, organizerUserID, eventID uuid.UUID) error
	MarkRead(ctx context.Context, id, organizerUserID uuid.UUID) error
	CountPendingByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error)
	CreateResponse(ctx context.Context, resp *models.PublicResponse) error
	ExpireStale(ctx context.Context, inactiveDays int) (int, error)
}

type PublicProfileLookup interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
}

type PublicProductLookup interface {
	ListPublicProfileServices(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
}

type PublicUserSlugLookup interface {
	GetByPublicSlug(ctx context.Context, slug string) (*models.User, error)
}

// NewPublicRequestService wires the service with its dependencies.
// pendingCap defaults to DefaultPendingRequestCap if <= 0.
//
// Note: a clientRepo (lookup-by-email) is intentionally NOT injected: conversion
// always creates a new Client (same as EventFormLink flow, design D5). Dedup by
// email is a future enhancement — add a PublicClientLookup interface then.
func NewPublicRequestService(
	requestRepo PublicRequestStore,
	profileRepo PublicProfileLookup,
	productRepo PublicProductLookup,
	userSlugLookup PublicUserSlugLookup,
	pool *pgxpool.Pool,
	pendingCap int,
) *PublicRequestService {
	if pendingCap <= 0 {
		pendingCap = DefaultPendingRequestCap
	}
	return &PublicRequestService{
		requestRepo:    requestRepo,
		profileRepo:    profileRepo,
		productRepo:    productRepo,
		userSlugLookup: userSlugLookup,
		pool:           pool,
		pendingCap:     pendingCap,
	}
}

// DefaultPendingRequestCap is the soft cap of pending requests per organizer
// before a new one is rejected with 429 (anti-spam, PRD §3.4).
const DefaultPendingRequestCap = 100

// Domain errors. The handler maps these to HTTP statuses (Phase 4).
var (
	// ErrPublicProfileDisabled: organizer has no public profile or it's disabled → 404.
	ErrPublicProfileDisabled = errors.New("public profile not available")
	// ErrInvalidServices: one or more requested services are not public/active → 400.
	ErrInvalidServices = errors.New("one or more selected services are not available")
	// ErrPendingCapExceeded: organizer inbox full of pending requests → 429.
	ErrPendingCapExceeded = errors.New("organizer inbox is full")
	// ErrRequestNotFound: request missing or belongs to another organizer → 404.
	ErrRequestNotFound = errors.New("public request not found")
	// ErrInvalidTransition: status transition not allowed from current state → 409.
	ErrInvalidTransition = errors.New("invalid status transition for this request")
	// ErrAlreadyConverted: request already linked to an event → 409 (idempotent).
	ErrAlreadyConverted = errors.New("request already converted to an event")
)

// CreatePublicRequestInput is the validated payload for creating a request.
type CreatePublicRequestInput struct {
	OrganizerSlug string
	ContactEmail  string
	ContactName   *string
	EventType     *string
	EventDate     *string
	Location      *string
	GuestCount    *int
	Budget        *float64
	Currency      string
	ServiceIDs    []uuid.UUID
	Message       *string
}

// CreatePublicRequest validates the organizer profile + services, enforces the
// pending cap, persists the request, and returns it with DB-populated fields.
func (s *PublicRequestService) CreatePublicRequest(ctx context.Context, in CreatePublicRequestInput) (*models.PublicRequest, error) {
	// Resolve organizer by slug.
	user, err := s.userSlugLookup.GetByPublicSlug(ctx, in.OrganizerSlug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPublicProfileDisabled
		}
		return nil, fmt.Errorf("resolve organizer slug: %w", err)
	}

	// Verify public profile enabled.
	profile, err := s.profileRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		if errors.Is(err, repository.ErrPublicProfileNotFound) {
			return nil, ErrPublicProfileDisabled
		}
		return nil, fmt.Errorf("lookup public profile: %w", err)
	}
	if !profile.IsEnabled {
		return nil, ErrPublicProfileDisabled
	}

	// Validate requested services against the organizer's public catalog and
	// build the JSONB snapshot (survives later catalog changes).
	snapshot, err := s.buildServicesSnapshot(ctx, user.ID, in.ServiceIDs)
	if err != nil {
		return nil, err
	}

	// Anti-spam cap on pending requests.
	pending, err := s.requestRepo.CountPendingByOrganizer(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("count pending requests: %w", err)
	}
	if pending >= s.pendingCap {
		return nil, ErrPendingCapExceeded
	}

	currency := in.Currency
	if currency == "" {
		currency = "MXN"
	}
	req := &models.PublicRequest{
		OrganizerUserID: user.ID,
		ContactEmail:    in.ContactEmail,
		ContactName:     in.ContactName,
		EventType:       in.EventType,
		EventDate:       in.EventDate,
		Location:        in.Location,
		GuestCount:      in.GuestCount,
		Budget:          in.Budget,
		Currency:        currency,
		Services:        snapshot,
		Message:         in.Message,
		Status:          models.RequestStatusPending,
	}
	if err := s.requestRepo.Create(ctx, req); err != nil {
		return nil, fmt.Errorf("create public request: %w", err)
	}
	return req, nil
}

// buildServicesSnapshot returns the JSONB snapshot for the requested service IDs,
// validating each belongs to the organizer's public catalog. Empty input is allowed.
func (s *PublicRequestService) buildServicesSnapshot(ctx context.Context, organizerUserID uuid.UUID, serviceIDs []uuid.UUID) ([]models.PublicRequestServiceSnapshot, error) {
	if len(serviceIDs) == 0 {
		return []models.PublicRequestServiceSnapshot{}, nil
	}
	public, err := s.productRepo.ListPublicProfileServices(ctx, organizerUserID)
	if err != nil {
		return nil, fmt.Errorf("list public services: %w", err)
	}
	byID := make(map[uuid.UUID]models.Product, len(public))
	for _, p := range public {
		byID[p.ID] = p
	}
	out := make([]models.PublicRequestServiceSnapshot, 0, len(serviceIDs))
	for _, id := range serviceIDs {
		p, ok := byID[id]
		if !ok {
			return nil, ErrInvalidServices
		}
		var price *float64
		if p.BasePrice > 0 {
			bp := p.BasePrice
			price = &bp
		}
		out = append(out, models.PublicRequestServiceSnapshot{
			ProductID:  p.ID,
			Name:       p.Name,
			Price:      price,
			IsFeatured: p.IsFeatured,
		})
	}
	return out, nil
}

// validTransitions defines the state machine. Each current status maps to the
// set of statuses it may move to. Enforced by the service (the DB CHECK only
// validates the value, not the transition).
var validTransitions = map[models.RequestStatus]map[models.RequestStatus]bool{
	models.RequestStatusPending: {
		models.RequestStatusInfoRequested:    true,
		models.RequestStatusResponded:        true,
		models.RequestStatusDeclinedProvider: true,
	},
	models.RequestStatusInfoRequested: {
		models.RequestStatusPending: true,
	},
	models.RequestStatusResponded: {
		models.RequestStatusAcceptedByClient: true,
		models.RequestStatusDeclinedClient:   true,
		models.RequestStatusBooked:           true,
	},
	models.RequestStatusAcceptedByClient: {
		models.RequestStatusBooked: true,
	},
}

// canTransition reports whether from→to is a service-allowed transition.
// The expiration job (ExpireStale) bypasses this (terminal-bound from any state).
func canTransition(from, to models.RequestStatus) bool {
	allowed, ok := validTransitions[from]
	if !ok {
		return false
	}
	return allowed[to]
}

// Respond records the organizer's quote and transitions the request to "responded".
func (s *PublicRequestService) Respond(ctx context.Context, requestID, organizerUserID uuid.UUID, resp *models.PublicResponse) error {
	req, err := s.requestRepo.GetByID(ctx, requestID, organizerUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRequestNotFound
		}
		return err
	}
	if !canTransition(req.Status, models.RequestStatusResponded) {
		return ErrInvalidTransition
	}
	resp.RequestID = req.ID
	resp.OrganizerUserID = organizerUserID
	if err := s.requestRepo.CreateResponse(ctx, resp); err != nil {
		return fmt.Errorf("create response: %w", err)
	}
	return s.requestRepo.UpdateStatus(ctx, requestID, organizerUserID, models.RequestStatusResponded, nil)
}

// RequestInfo transitions pending → info_requested (organizer asks for clarification).
func (s *PublicRequestService) RequestInfo(ctx context.Context, requestID, organizerUserID uuid.UUID) error {
	req, err := s.requestRepo.GetByID(ctx, requestID, organizerUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRequestNotFound
		}
		return err
	}
	if !canTransition(req.Status, models.RequestStatusInfoRequested) {
		return ErrInvalidTransition
	}
	return s.requestRepo.UpdateStatus(ctx, requestID, organizerUserID, models.RequestStatusInfoRequested, nil)
}

// Decline transitions pending → declined_provider with an optional reason.
func (s *PublicRequestService) Decline(ctx context.Context, requestID, organizerUserID uuid.UUID, reason *string) error {
	req, err := s.requestRepo.GetByID(ctx, requestID, organizerUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRequestNotFound
		}
		return err
	}
	if !canTransition(req.Status, models.RequestStatusDeclinedProvider) {
		return ErrInvalidTransition
	}
	return s.requestRepo.UpdateStatus(ctx, requestID, organizerUserID, models.RequestStatusDeclinedProvider, reason)
}

// MarkRead flags the request as read (no state-machine constraint).
func (s *PublicRequestService) MarkRead(ctx context.Context, requestID, organizerUserID uuid.UUID) error {
	if err := s.requestRepo.MarkRead(ctx, requestID, organizerUserID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRequestNotFound
		}
		return err
	}
	return nil
}

// ClientAction lets the visitor (identified by client_token) accept or decline
// a request that the organizer has responded to. action is "accept" | "decline".
func (s *PublicRequestService) ClientAction(ctx context.Context, requestID uuid.UUID, clientToken uuid.UUID, action string) error {
	req, err := s.requestRepo.GetByIDAndToken(ctx, requestID, clientToken)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrRequestNotFound
		}
		return err
	}
	var target models.RequestStatus
	switch action {
	case "accept":
		target = models.RequestStatusAcceptedByClient
	case "decline":
		target = models.RequestStatusDeclinedClient
	default:
		return fmt.Errorf("invalid client action: %q", action)
	}
	if !canTransition(req.Status, target) {
		return ErrInvalidTransition
	}
	return s.requestRepo.UpdateStatus(ctx, requestID, req.OrganizerUserID, target, nil)
}

// ConvertToEvent creates a Client + Event(status=quoted) from the request,
// reusing the EventFormLink transactional helpers. Idempotent: if the request
// already has an event_id, returns ErrAlreadyConverted.
//
// Note (design D5): a new Client is always created (same as EventFormLink
// flow). Dedup-by-email is a future enhancement.
func (s *PublicRequestService) ConvertToEvent(ctx context.Context, requestID, organizerUserID uuid.UUID) (*uuid.UUID, error) {
	req, err := s.requestRepo.GetByID(ctx, requestID, organizerUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrRequestNotFound
		}
		return nil, err
	}
	if req.EventID != nil {
		return req.EventID, ErrAlreadyConverted
	}

	// EventFormLink flow requires the request be at least accepted/forwarded.
	// We allow conversion from accepted_by_client or responded (organizer may
	// pre-emptively book). Pending is rejected.
	if req.Status != models.RequestStatusAcceptedByClient &&
		req.Status != models.RequestStatusResponded {
		return nil, ErrInvalidTransition
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Create client from contact info (always new — see design D5 note).
	clientEmail := req.ContactEmail
	client := &models.Client{
		UserID: organizerUserID,
		Name:   clientNameFromRequest(req),
		Email:  &clientEmail,
	}
	if err := repository.CreateClientTx(ctx, tx, client); err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	// Build event from request fields. Status quoted, total 0 (organizer sets later).
	notes := "Creado desde solicitud de cotización"
	event := &models.Event{
		UserID:      organizerUserID,
		ClientID:    client.ID,
		EventDate:   derefString(req.EventDate),
		ServiceType: derefString(req.EventType),
		Status:      "quoted",
		TotalAmount: 0,
		Location:    req.Location,
		Notes:       &notes,
	}
	if err := repository.CreateEventTx(ctx, tx, event); err != nil {
		return nil, fmt.Errorf("create event: %w", err)
	}

	// Populate event products from the request services snapshot (base price).
	if len(req.Services) > 0 {
		products := make([]models.EventProduct, 0, len(req.Services))
		for _, svc := range req.Services {
			price := 0.0
			if svc.Price != nil {
				price = *svc.Price
			}
			products = append(products, models.EventProduct{
				EventID:   event.ID,
				ProductID: svc.ProductID,
				Quantity:  1,
				UnitPrice: price,
				Discount:  0,
			})
		}
		if err := repository.CreateEventProductsTx(ctx, tx, event.ID, products); err != nil {
			return nil, fmt.Errorf("create event products: %w", err)
		}
	}

	if err := repository.UpdateClientStatsTx(ctx, tx, client.ID); err != nil {
		slog.WarnContext(ctx, "public_request: update client stats failed", "error", err)
		// Non-critical, continue.
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit convert tx: %w", err)
	}

	// Link request → event + status booked.
	if err := s.requestRepo.SetEventID(ctx, requestID, organizerUserID, event.ID); err != nil {
		slog.ErrorContext(ctx, "public_request: link event failed after commit",
			"request_id", requestID, "event_id", event.ID, "error", err)
		return nil, fmt.Errorf("link event to request: %w", err)
	}
	return &event.ID, nil
}

// ExpireStale is invoked by the daily job (Phase 5) to mark requests past the
// inactivity threshold as expired. Bypasses the state machine (terminal target).
func (s *PublicRequestService) ExpireStale(ctx context.Context) (int, error) {
	n, err := s.requestRepo.ExpireStale(ctx, DefaultExpiryDays)
	if err != nil {
		return 0, fmt.Errorf("expire stale requests: %w", err)
	}
	return n, nil
}

// DefaultExpiryDays is the inactivity window after which a request is expired.
const DefaultExpiryDays = 14

// --- helpers ---

func derefString(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func clientNameFromRequest(req *models.PublicRequest) string {
	if req.ContactName != nil && *req.ContactName != "" {
		return *req.ContactName
	}
	// Fall back to the local part of the contact email.
	email := req.ContactEmail
	for i := 0; i < len(email); i++ {
		if email[i] == '@' {
			return email[:i]
		}
	}
	return email
}

// Compile-time guard: ensure *repository.PublicRequestRepo satisfies the store
// interface. Catches signature drift at build time.
var _ PublicRequestStore = (*repository.PublicRequestRepo)(nil)

// time guard to avoid unused import if time ends up unused downstream.
var _ = time.Now
