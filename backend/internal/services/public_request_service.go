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

// PublicRequestNotifier is optional push fan-out after a visitor submits a
// request (#1124). Implementations must not block for long; the service fires
// it asynchronously after a successful Create.
type PublicRequestNotifier interface {
	SendPublicRequestCreated(ctx context.Context, organizerUserID uuid.UUID, req *models.PublicRequest) error
}

type PublicRequestService struct {
	requestRepo    PublicRequestStore
	linkRepo       PublicRequestLinkStore
	profileRepo    PublicProfileLookup
	productRepo    PublicProductLookup
	userSlugLookup PublicUserSlugLookup
	pool           *pgxpool.Pool
	pendingCap     int // max pending requests per organizer before 429 (PRD §3.4)
	notifier       PublicRequestNotifier
}

// PublicRequestStore is the subset of *repository.PublicRequestRepo the service
// uses. Extracted as interface for testability (mock in unit tests).
type PublicRequestStore interface {
	Create(ctx context.Context, req *models.PublicRequest) error
	CreateTx(ctx context.Context, tx pgx.Tx, req *models.PublicRequest) error
	GetByID(ctx context.Context, id, organizerUserID uuid.UUID) (*models.PublicRequest, error)
	GetByIDAndToken(ctx context.Context, id uuid.UUID, clientToken uuid.UUID) (*models.PublicRequest, error)
	UpdateStatus(ctx context.Context, id, organizerUserID uuid.UUID, newStatus models.RequestStatus, declinedReason *string) error
	UpdateStatusTx(ctx context.Context, tx pgx.Tx, id, organizerUserID uuid.UUID, newStatus models.RequestStatus, declinedReason *string) error
	SetEventID(ctx context.Context, id, organizerUserID, eventID uuid.UUID) error
	SetEventIDTx(ctx context.Context, tx pgx.Tx, id, organizerUserID, eventID uuid.UUID) error
	MarkRead(ctx context.Context, id, organizerUserID uuid.UUID) error
	CountPendingByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error)
	CreateResponse(ctx context.Context, resp *models.PublicResponse) error
	CreateResponseTx(ctx context.Context, tx pgx.Tx, resp *models.PublicResponse) error
	ExpireStale(ctx context.Context, inactiveDays int) (int, error)
}

// PublicRequestLinkStore is the subset of *repository.PublicRequestLinkRepo used
// by create-from-link flows.
type PublicRequestLinkStore interface {
	GetByToken(ctx context.Context, token string) (*models.PublicRequestLink, error)
	IncrementUseTx(ctx context.Context, tx pgx.Tx, id uuid.UUID) error
	ExpireStale(ctx context.Context) (int, error)
}

type PublicProfileLookup interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
}

type PublicProductLookup interface {
	ListPublicProfileServices(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
	ListActiveForPublicProfileSettings(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
}

type PublicUserSlugLookup interface {
	GetByPublicSlug(ctx context.Context, slug string) (*models.User, error)
}

// NewPublicRequestService wires the service with its dependencies.
// pendingCap defaults to DefaultPendingRequestCap if <= 0.
// linkRepo may be nil only if CreateFromLink is never called.
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

// SetLinkRepo wires public request link persistence (CreateFromLink + expire job).
func (s *PublicRequestService) SetLinkRepo(repo PublicRequestLinkStore) {
	s.linkRepo = repo
}

// SetNotifier wires push notifications for new public requests (#1124).
// Safe to call with nil (disables notify).
func (s *PublicRequestService) SetNotifier(n PublicRequestNotifier) {
	s.notifier = n
}

// DefaultPendingRequestCap is the soft cap of pending requests per organizer
// before a new one is rejected with 429 (anti-spam, PRD §3.4).
const DefaultPendingRequestCap = 100

// Domain errors. The handler maps these to HTTP statuses.
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
	// ErrLinkInvalid: shared link expired, used, revoked, or maxed out → 410.
	ErrLinkInvalid = errors.New("request link is not usable")
	// ErrLinkNotFound: token never existed → 404.
	ErrLinkNotFound = errors.New("request link not found")
	// ErrValidation: field validation failed → 400 (message via fmt.Errorf wrap).
	ErrValidation = errors.New("validation failed")
)

// CreatePublicRequestInput is the validated payload for creating a request
// (profile CTA or shared link).
type CreatePublicRequestInput struct {
	OrganizerSlug string
	ContactEmail  string
	ContactName   *string
	ContactPhone  *string
	EventType     *string
	EventDate     *string
	Location      *string
	City          *string
	GuestCount    *int
	Budget        *float64
	Currency      string
	// ServiceIDs is the legacy flat list (qty defaults to 1). Prefer Services.
	ServiceIDs []uuid.UUID
	// Services carries product_id + qty (unified form body).
	Services []ServiceSelection
	Message  *string
}

// selectionsFromInput merges Services and ServiceIDs into ServiceSelection list.
func selectionsFromInput(in CreatePublicRequestInput) []ServiceSelection {
	if len(in.Services) > 0 {
		return in.Services
	}
	out := make([]ServiceSelection, 0, len(in.ServiceIDs))
	for _, id := range in.ServiceIDs {
		out = append(out, ServiceSelection{ProductID: id, Qty: 1})
	}
	return out
}

// CreatePublicRequest is the profile CTA path (backward-compatible name).
// Equivalent to CreateFromProfile.
func (s *PublicRequestService) CreatePublicRequest(ctx context.Context, in CreatePublicRequestInput) (*models.PublicRequest, error) {
	return s.CreateFromProfile(ctx, in)
}

// CreateFromProfile validates the organizer profile + services, enforces the
// pending cap, persists the request as pending/standard, and returns it.
func (s *PublicRequestService) CreateFromProfile(ctx context.Context, in CreatePublicRequestInput) (*models.PublicRequest, error) {
	user, err := s.userSlugLookup.GetByPublicSlug(ctx, in.OrganizerSlug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPublicProfileDisabled
		}
		return nil, fmt.Errorf("resolve organizer slug: %w", err)
	}

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

	// Profile CTA: email is primary required field (visitor status page).
	if trimSpace(in.ContactEmail) == "" {
		return nil, fmt.Errorf("%w: contact_email is required", ErrValidation)
	}

	catalog, err := s.resolveCatalog(ctx, user.ID, CatalogEntryPublicProfile, true)
	if err != nil {
		return nil, err
	}
	snapshot, err := BuildServicesSnapshotFromCatalog(catalog, selectionsFromInput(in))
	if err != nil {
		return nil, err
	}

	if err := s.enforcePendingCap(ctx, user.ID); err != nil {
		return nil, err
	}

	currency := in.Currency
	if currency == "" {
		currency = "MXN"
	}
	req := &models.PublicRequest{
		OrganizerUserID: user.ID,
		ContactEmail:    in.ContactEmail,
		ContactName:     in.ContactName,
		ContactPhone:    in.ContactPhone,
		EventType:       in.EventType,
		EventDate:       in.EventDate,
		Location:        in.Location,
		City:            in.City,
		GuestCount:      in.GuestCount,
		Budget:          in.Budget,
		Currency:        currency,
		Services:        snapshot,
		Message:         in.Message,
		Status:          models.RequestStatusPending,
		Source:          models.RequestSourcePublicProfile,
		SubmitMode:      models.SubmitModeStandard,
	}
	if err := s.requestRepo.Create(ctx, req); err != nil {
		return nil, fmt.Errorf("create public request: %w", err)
	}

	s.notifyAsync(user.ID, req)
	return req, nil
}

// CreateFromLink resolves a shared link token and creates a request applying
// the link's submit_mode (standard | auto_quote | auto_event).
func (s *PublicRequestService) CreateFromLink(ctx context.Context, token string, in CreatePublicRequestInput) (*models.PublicRequest, error) {
	if s.linkRepo == nil {
		return nil, fmt.Errorf("link repo not configured")
	}
	link, err := s.linkRepo.GetByToken(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLinkNotFound
		}
		return nil, fmt.Errorf("get request link: %w", err)
	}
	if !IsRequestLinkUsable(link, time.Now().UTC()) {
		return nil, ErrLinkInvalid
	}

	// Contact rule: email or phone.
	if msg := ValidateContactRule(in.ContactEmail, in.ContactPhone); msg != "" {
		return nil, fmt.Errorf("%w: %s", ErrValidation, msg)
	}
	if link.SubmitMode == models.SubmitModeAutoEvent {
		if msg := ValidateAutoEventFields(in.ContactName, in.ContactPhone, in.EventDate, in.EventType, in.GuestCount); msg != "" {
			return nil, fmt.Errorf("%w: %s", ErrValidation, msg)
		}
	}

	// Catalog: if profile enabled → public items; else full active catalog.
	profileEnabled := false
	profile, err := s.profileRepo.GetByUserID(ctx, link.OrganizerUserID)
	if err == nil && profile != nil && profile.IsEnabled {
		profileEnabled = true
	} else if err != nil && !errors.Is(err, repository.ErrPublicProfileNotFound) && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("lookup public profile: %w", err)
	}

	catalog, err := s.resolveCatalog(ctx, link.OrganizerUserID, CatalogEntrySharedLink, profileEnabled)
	if err != nil {
		return nil, err
	}
	snapshot, err := BuildServicesSnapshotFromCatalog(catalog, selectionsFromInput(in))
	if err != nil {
		return nil, err
	}

	if err := s.enforcePendingCap(ctx, link.OrganizerUserID); err != nil {
		return nil, err
	}

	currency := in.Currency
	if currency == "" {
		currency = "MXN"
	}
	linkID := link.ID
	req := &models.PublicRequest{
		OrganizerUserID: link.OrganizerUserID,
		ContactEmail:    in.ContactEmail,
		ContactName:     in.ContactName,
		ContactPhone:    in.ContactPhone,
		EventType:       in.EventType,
		EventDate:       in.EventDate,
		Location:        in.Location,
		City:            in.City,
		GuestCount:      in.GuestCount,
		Budget:          in.Budget,
		Currency:        currency,
		Services:        snapshot,
		Message:         in.Message,
		Status:          models.RequestStatusPending,
		Source:          models.RequestSourceSharedLink,
		LinkID:          &linkID,
		SubmitMode:      link.SubmitMode,
	}

	if s.pool == nil {
		// Unit-test path without DB: create only (no auto modes / use increment).
		if err := s.requestRepo.Create(ctx, req); err != nil {
			return nil, fmt.Errorf("create public request: %w", err)
		}
		s.notifyAsync(link.OrganizerUserID, req)
		return req, nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if err := s.requestRepo.CreateTx(ctx, tx, req); err != nil {
		return nil, fmt.Errorf("create public request: %w", err)
	}

	switch link.SubmitMode {
	case models.SubmitModeStandard:
		// pending already set
	case models.SubmitModeAutoQuote:
		if err := s.applyAutoQuoteTx(ctx, tx, req); err != nil {
			return nil, err
		}
	case models.SubmitModeAutoEvent:
		if _, err := s.convertToEventInTx(ctx, tx, req); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("%w: unknown submit_mode %q", ErrValidation, link.SubmitMode)
	}

	if err := s.linkRepo.IncrementUseTx(ctx, tx, link.ID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLinkInvalid
		}
		return nil, fmt.Errorf("increment link use: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit create-from-link: %w", err)
	}

	s.notifyAsync(link.OrganizerUserID, req)
	return req, nil
}

func (s *PublicRequestService) applyAutoQuoteTx(ctx context.Context, tx pgx.Tx, req *models.PublicRequest) error {
	amount := SumSnapshotQuote(req.Services)
	resp := &models.PublicResponse{
		RequestID:       req.ID,
		OrganizerUserID: req.OrganizerUserID,
		QuoteAmount:     amount,
		Currency:        req.Currency,
		Inclusions:      SnapshotInclusionNames(req.Services),
	}
	if err := s.requestRepo.CreateResponseTx(ctx, tx, resp); err != nil {
		return fmt.Errorf("auto_quote create response: %w", err)
	}
	if err := s.requestRepo.UpdateStatusTx(ctx, tx, req.ID, req.OrganizerUserID, models.RequestStatusResponded, nil); err != nil {
		return fmt.Errorf("auto_quote update status: %w", err)
	}
	req.Status = models.RequestStatusResponded
	return nil
}

// resolveCatalog implements design D4.
func (s *PublicRequestService) resolveCatalog(ctx context.Context, organizerUserID uuid.UUID, entry CatalogEntry, profileEnabled bool) ([]models.Product, error) {
	switch entry {
	case CatalogEntryPublicProfile:
		// Caller already required profile enabled.
		products, err := s.productRepo.ListPublicProfileServices(ctx, organizerUserID)
		if err != nil {
			return nil, fmt.Errorf("list public services: %w", err)
		}
		return products, nil
	case CatalogEntrySharedLink:
		if profileEnabled {
			products, err := s.productRepo.ListPublicProfileServices(ctx, organizerUserID)
			if err != nil {
				return nil, fmt.Errorf("list public services: %w", err)
			}
			return products, nil
		}
		products, err := s.productRepo.ListActiveForPublicProfileSettings(ctx, organizerUserID)
		if err != nil {
			return nil, fmt.Errorf("list active products: %w", err)
		}
		return products, nil
	default:
		return nil, fmt.Errorf("unknown catalog entry: %s", entry)
	}
}

func (s *PublicRequestService) enforcePendingCap(ctx context.Context, organizerUserID uuid.UUID) error {
	pending, err := s.requestRepo.CountPendingByOrganizer(ctx, organizerUserID)
	if err != nil {
		return fmt.Errorf("count pending requests: %w", err)
	}
	if pending >= s.pendingCap {
		return ErrPendingCapExceeded
	}
	return nil
}

func (s *PublicRequestService) notifyAsync(organizerID uuid.UUID, req *models.PublicRequest) {
	if s.notifier == nil {
		return
	}
	created := *req
	go func() {
		nctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.notifier.SendPublicRequestCreated(nctx, organizerID, &created); err != nil {
			slog.WarnContext(nctx, "public_request: push notify failed",
				"error", err,
				"request_id", created.ID,
				"organizer_user_id", organizerID,
			)
		}
	}()
}

// buildServicesSnapshot is kept for older call sites / tests; uses public catalog only.
func (s *PublicRequestService) buildServicesSnapshot(ctx context.Context, organizerUserID uuid.UUID, serviceIDs []uuid.UUID) ([]models.PublicRequestServiceSnapshot, error) {
	sels := make([]ServiceSelection, 0, len(serviceIDs))
	for _, id := range serviceIDs {
		sels = append(sels, ServiceSelection{ProductID: id, Qty: 1})
	}
	catalog, err := s.productRepo.ListPublicProfileServices(ctx, organizerUserID)
	if err != nil {
		return nil, fmt.Errorf("list public services: %w", err)
	}
	return BuildServicesSnapshotFromCatalog(catalog, sels)
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
// reusing the convert transactional helpers. Idempotent: if the request
// already has an event_id, returns ErrAlreadyConverted.
//
// Field mapping (design D8): phone, guest_count→num_people, city, snapshot qty,
// notes include source.
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

	// Allow conversion from accepted_by_client or responded (organizer may
	// pre-emptively book). Pending is rejected for manual convert.
	if req.Status != models.RequestStatusAcceptedByClient &&
		req.Status != models.RequestStatusResponded {
		return nil, ErrInvalidTransition
	}

	if s.pool == nil {
		return nil, fmt.Errorf("pool required for convert")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	eventID, err := s.convertToEventInTx(ctx, tx, req)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit convert tx: %w", err)
	}
	return eventID, nil
}

// convertToEventInTx creates Client + Event + products and marks request booked.
// Used by manual ConvertToEvent and auto_event submit_mode.
func (s *PublicRequestService) convertToEventInTx(ctx context.Context, tx pgx.Tx, req *models.PublicRequest) (*uuid.UUID, error) {
	clientEmail := req.ContactEmail
	var emailPtr *string
	if trimSpace(clientEmail) != "" {
		emailPtr = &clientEmail
	}
	phone := ""
	if req.ContactPhone != nil {
		phone = *req.ContactPhone
	}
	client := &models.Client{
		UserID: req.OrganizerUserID,
		Name:   clientNameFromRequest(req),
		Phone:  phone,
		Email:  emailPtr,
		City:   req.City,
	}
	if err := repository.CreateClientTx(ctx, tx, client); err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	notes := ConvertNotes(req.Source, req.Message)
	numPeople := 0
	if req.GuestCount != nil {
		numPeople = *req.GuestCount
	}
	event := &models.Event{
		UserID:      req.OrganizerUserID,
		ClientID:    client.ID,
		EventDate:   derefString(req.EventDate),
		ServiceType: derefString(req.EventType),
		NumPeople:   numPeople,
		Status:      "quoted",
		TotalAmount: 0,
		Location:    req.Location,
		City:        req.City,
		Notes:       &notes,
	}
	if err := repository.CreateEventTx(ctx, tx, event); err != nil {
		return nil, fmt.Errorf("create event: %w", err)
	}

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
				Quantity:  float64(svc.SnapshotQty()),
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
	}

	if err := s.requestRepo.SetEventIDTx(ctx, tx, req.ID, req.OrganizerUserID, event.ID); err != nil {
		return nil, fmt.Errorf("link event to request: %w", err)
	}
	req.EventID = &event.ID
	req.Status = models.RequestStatusBooked
	return &event.ID, nil
}

// ExpireStale is invoked by the daily job to mark requests past the inactivity
// threshold as expired. Bypasses the state machine (terminal target).
func (s *PublicRequestService) ExpireStale(ctx context.Context) (int, error) {
	n, err := s.requestRepo.ExpireStale(ctx, DefaultExpiryDays)
	if err != nil {
		return 0, fmt.Errorf("expire stale requests: %w", err)
	}
	return n, nil
}

// ExpireStaleLinks marks active links past expires_at as expired (hourly job).
func (s *PublicRequestService) ExpireStaleLinks(ctx context.Context) (int, error) {
	if s.linkRepo == nil {
		return 0, nil
	}
	n, err := s.linkRepo.ExpireStale(ctx)
	if err != nil {
		return 0, fmt.Errorf("expire stale request links: %w", err)
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
	if email != "" {
		return email
	}
	if req.ContactPhone != nil && *req.ContactPhone != "" {
		return *req.ContactPhone
	}
	return "Cliente"
}

// Compile-time guard: ensure *repository.PublicRequestRepo satisfies the store
// interface. Catches signature drift at build time.
var _ PublicRequestStore = (*repository.PublicRequestRepo)(nil)
var _ PublicRequestLinkStore = (*repository.PublicRequestLinkRepo)(nil)
