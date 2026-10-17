package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// PublicRequestHandler exposes the public quote-request endpoint and the
// authenticated organizer-facing inbox + response endpoints.
//
// The public endpoint (POST /api/public/organizers/{slug}/requests) accepts a
// visitor's structured quote request. The visitor later acts on their own
// request via the X-Request-Token header (no account, NG1 ratified).
//
// See openspec/changes/add-public-request-flow/specs/public-request/spec.md.
type PublicRequestHandler struct {
	svc             publicRequestService
	requestRepo     publicRequestInboxStore
	turnstileSecret string
}

// publicRequestService is the subset of *services.PublicRequestService the
// handler uses. Interface for testability.
type publicRequestService interface {
	CreatePublicRequest(ctx context.Context, in services.CreatePublicRequestInput) (*models.PublicRequest, error)
	CreateFromLink(ctx context.Context, token string, in services.CreatePublicRequestInput) (*models.PublicRequest, error)
	Respond(ctx context.Context, requestID, organizerUserID uuid.UUID, resp *models.PublicResponse) error
	RequestInfo(ctx context.Context, requestID, organizerUserID uuid.UUID) error
	Decline(ctx context.Context, requestID, organizerUserID uuid.UUID, reason *string) error
	MarkRead(ctx context.Context, requestID, organizerUserID uuid.UUID) error
	ClientAction(ctx context.Context, requestID uuid.UUID, clientToken uuid.UUID, action string) error
	ConvertToEvent(ctx context.Context, requestID, organizerUserID uuid.UUID) (*uuid.UUID, error)
}

// publicRequestInboxStore is the subset of *repository.PublicRequestRepo used
// directly by the handler for listing (the service owns state transitions).
type publicRequestInboxStore interface {
	ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID, f repository.PublicRequestListFilters) ([]models.PublicRequest, int, error)
	ListByOrganizerCursor(ctx context.Context, organizerUserID uuid.UUID, f repository.PublicRequestCursorFilters) ([]models.PublicRequest, *string, error)
	GetByID(ctx context.Context, id, organizerUserID uuid.UUID) (*models.PublicRequest, error)
	ListResponsesByRequest(ctx context.Context, requestID, organizerUserID uuid.UUID) ([]models.PublicResponse, error)
	CountUnreadByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error)
}

// CursorPaginatedResponse is the mobile-friendly keyset envelope (#1121).
// No total/count — clients stop when next_cursor is null.
type CursorPaginatedResponse struct {
	Data       interface{} `json:"data"`
	NextCursor *string     `json:"next_cursor"`
	HasMore    bool        `json:"has_more"`
	Limit      int         `json:"limit"`
}

func NewPublicRequestHandler(svc *services.PublicRequestService, requestRepo *repository.PublicRequestRepo, turnstileSecret string) *PublicRequestHandler {
	return &PublicRequestHandler{svc: svc, requestRepo: requestRepo, turnstileSecret: turnstileSecret}
}

// --- Public endpoint ---

// CreatePublicRequestRequest is the unauthenticated visitor payload.
type CreatePublicRequestRequest struct {
	ContactEmail string  `json:"contact_email"`
	ContactName  *string `json:"contact_name,omitempty"`
	ContactPhone *string `json:"contact_phone,omitempty"`
	EventType    *string `json:"event_type,omitempty"`
	EventDate    *string `json:"event_date,omitempty"`
	Location     *string `json:"location,omitempty"`
	City         *string `json:"city,omitempty"`
	GuestCount   *int    `json:"guest_count,omitempty"`
	Budget       *float64 `json:"budget,omitempty"`
	Currency     string   `json:"currency,omitempty"`
	// ServiceIDs is the legacy flat list (qty defaults to 1).
	ServiceIDs []string `json:"service_ids,omitempty"`
	// Services is the unified form body with optional qty per line item.
	Services []struct {
		ProductID string `json:"product_id"`
		Qty       int    `json:"qty"`
	} `json:"services,omitempty"`
	Message *string `json:"message,omitempty"`
	// Website is a honeypot anti-spam field. Real browsers leave it empty;
	// bots that autofill hidden fields get a fake 201 without persisting.
	Website string `json:"website,omitempty"`
	// TurnstileToken is the Cloudflare Turnstile client token. Required when
	// the server configures TURNSTILE_SECRET_KEY; ignored otherwise.
	TurnstileToken *string `json:"turnstile_token,omitempty"`
	// PackageID when set freezes a live package quote snapshot on the request.
	PackageID *string `json:"package_id,omitempty"`
}

// createPublicRequestResponse is the create-only DTO. client_token is returned
// exactly once so the visitor can act later via X-Request-Token; it is never
// serialized on organizer list/detail responses (model field is json:"-").
type createPublicRequestResponse struct {
	ID               string                               `json:"id"`
	ClientToken      string                               `json:"client_token"`
	ContactEmail     string                               `json:"contact_email"`
	ContactName      *string                              `json:"contact_name,omitempty"`
	ContactPhone     *string                              `json:"contact_phone,omitempty"`
	EventType        *string                              `json:"event_type,omitempty"`
	EventDate        *string                              `json:"event_date,omitempty"`
	Location         *string                              `json:"location,omitempty"`
	City             *string                              `json:"city,omitempty"`
	GuestCount       *int                                 `json:"guest_count,omitempty"`
	Budget           *float64                             `json:"budget,omitempty"`
	Currency         string                               `json:"currency"`
	Services         []models.PublicRequestServiceSnapshot `json:"services"`
	Message          *string                              `json:"message,omitempty"`
	PackageQuote     *models.PackageQuoteSnapshot         `json:"package_quote,omitempty"`
	Status           models.RequestStatus                 `json:"status"`
	Source           models.RequestSource                 `json:"source"`
	SubmitMode       models.SubmitMode                    `json:"submit_mode"`
	EventID          *uuid.UUID                           `json:"event_id,omitempty"`
	IsRead           bool                                 `json:"is_read"`
	LastStatusChange time.Time                            `json:"last_status_change"`
	CreatedAt        time.Time                            `json:"created_at"`
	UpdatedAt        time.Time                            `json:"updated_at"`
}

// CreatePublicRequest handles POST /api/public/organizers/{slug}/requests
func (h *PublicRequestHandler) CreatePublicRequest(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "Organizer slug is required")
		return
	}

	var req CreatePublicRequestRequest
	if err := decodeJSON(w, r, &req); err != nil {
		return
	}

	// Honeypot: filled field ⇒ silent success (no DB write, no signal to bots).
	if strings.TrimSpace(req.Website) != "" {
		writeJSON(w, http.StatusCreated, map[string]any{
			"data": map[string]any{
				"id":            uuid.New().String(),
				"client_token":  uuid.New().String(),
				"contact_email": normalizeEmail(req.ContactEmail),
				"status":        models.RequestStatusPending,
				"services":      []any{},
				"currency":      "MXN",
				"is_read":       false,
			},
		})
		return
	}

	// Turnstile: human proof for anonymous writes. Skipped when the server
	// has no TURNSTILE_SECRET_KEY (dev mode); enforced otherwise.
	token := ""
	if req.TurnstileToken != nil {
		token = *req.TurnstileToken
	}
	if err := verifyTurnstileToken(r.Context(), h.turnstileSecret, token, clientIP(r)); err != nil {
		writeError(w, http.StatusBadRequest, "captcha verification failed")
		return
	}

	in, ok := buildCreateInputFromRequest(w, slug, req)
	if !ok {
		return
	}

	created, err := h.svc.CreatePublicRequest(r.Context(), in)
	if err != nil {
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": toCreatePublicRequestResponse(created)})
}

// buildCreateInputFromRequest maps the visitor JSON body to the service input.
// On validation failure it writes the HTTP error and returns ok=false.
func buildCreateInputFromRequest(w http.ResponseWriter, slug string, req CreatePublicRequestRequest) (services.CreatePublicRequestInput, bool) {
	email := normalizeEmail(req.ContactEmail)
	// Profile path (slug set) still requires email; link path allows phone-only.
	if slug != "" {
		if email == "" {
			writeError(w, http.StatusBadRequest, "contact_email is required")
			return services.CreatePublicRequestInput{}, false
		}
	}
	if len(email) > 320 {
		writeError(w, http.StatusBadRequest, "contact_email too long")
		return services.CreatePublicRequestInput{}, false
	}

	serviceIDs, ok := parseServiceIDs(w, req.ServiceIDs)
	if !ok {
		return services.CreatePublicRequestInput{}, false
	}

	var selections []services.ServiceSelection
	if len(req.Services) > 0 {
		selections = make([]services.ServiceSelection, 0, len(req.Services))
		for _, s := range req.Services {
			id, err := uuid.Parse(strings.TrimSpace(s.ProductID))
			if err != nil {
				writeError(w, http.StatusBadRequest, "Invalid product_id: "+s.ProductID)
				return services.CreatePublicRequestInput{}, false
			}
			qty := s.Qty
			if qty <= 0 {
				qty = 1
			}
			selections = append(selections, services.ServiceSelection{ProductID: id, Qty: qty})
		}
	}

	var packageID *uuid.UUID
	if req.PackageID != nil && strings.TrimSpace(*req.PackageID) != "" {
		pid, err := uuid.Parse(strings.TrimSpace(*req.PackageID))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid package_id")
			return services.CreatePublicRequestInput{}, false
		}
		packageID = &pid
	}

	return services.CreatePublicRequestInput{
		OrganizerSlug: slug,
		ContactEmail:  email,
		ContactName:   trimStrPtr(req.ContactName),
		ContactPhone:  trimStrPtr(req.ContactPhone),
		EventType:     trimStrPtr(req.EventType),
		EventDate:     trimStrPtr(req.EventDate),
		Location:      trimStrPtr(req.Location),
		City:          trimStrPtr(req.City),
		GuestCount:    req.GuestCount,
		Budget:        req.Budget,
		Currency:      strings.TrimSpace(req.Currency),
		ServiceIDs:    serviceIDs,
		Services:      selections,
		Message:       trimStrPtr(req.Message),
		PackageID:     packageID,
	}, true
}

func toCreatePublicRequestResponse(created *models.PublicRequest) createPublicRequestResponse {
	servicesSnap := created.Services
	if servicesSnap == nil {
		servicesSnap = []models.PublicRequestServiceSnapshot{}
	}
	source := created.Source
	if source == "" {
		source = models.RequestSourcePublicProfile
	}
	mode := created.SubmitMode
	if mode == "" {
		mode = models.SubmitModeStandard
	}
	return createPublicRequestResponse{
		ID:               created.ID.String(),
		ClientToken:      created.ClientToken.String(),
		ContactEmail:     created.ContactEmail,
		ContactName:      created.ContactName,
		ContactPhone:     created.ContactPhone,
		EventType:        created.EventType,
		EventDate:        created.EventDate,
		Location:         created.Location,
		City:             created.City,
		GuestCount:       created.GuestCount,
		Budget:           created.Budget,
		Currency:         created.Currency,
		Services:         servicesSnap,
		Message:          created.Message,
		PackageQuote:     created.PackageQuote,
		Status:           created.Status,
		Source:           source,
		SubmitMode:       mode,
		EventID:          created.EventID,
		IsRead:           created.IsRead,
		LastStatusChange: created.LastStatusChange,
		CreatedAt:        created.CreatedAt,
		UpdatedAt:        created.UpdatedAt,
	}
}

// --- Organizer inbox (auth) ---

// ListRequests handles GET /api/organizers/me/requests
//
// Dual pagination (#1121):
//   - Cursor (mobile): pass `cursor` query key (empty on first page) → keyset
//     envelope { data, next_cursor, has_more, limit }.
//   - Offset (web): pass `page` → existing PaginatedResponse.
//
// When neither is present, defaults to offset page=1 (web backward-compatible).
func (h *PublicRequestHandler) ListRequests(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	q := r.URL.Query()
	status := strings.TrimSpace(q.Get("status"))
	fromDay := strings.TrimSpace(q.Get("from_date"))
	toDay := strings.TrimSpace(q.Get("to_date"))

	// Cursor mode when the client includes the cursor key (even empty) or
	// pagination=cursor. Mobile apps should use this; web keeps page/offset.
	if _, hasCursor := q["cursor"]; hasCursor || q.Get("pagination") == "cursor" {
		limit := 20
		if l := q.Get("limit"); l != "" {
			if n, err := strconv.Atoi(l); err == nil && n > 0 {
				limit = n
			}
		}
		if limit > 100 {
			limit = 100
		}
		order := "desc"
		if q.Get("order") == "asc" {
			order = "asc"
		}
		createdAt, cursorID, err := repository.DecodeRequestCursor(q.Get("cursor"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid cursor")
			return
		}
		items, next, err := h.requestRepo.ListByOrganizerCursor(r.Context(), userID, repository.PublicRequestCursorFilters{
			Status:          status,
			FromDay:         fromDay,
			ToDay:           toDay,
			Order:           order,
			Limit:           limit,
			CursorCreatedAt: createdAt,
			CursorID:        cursorID,
		})
		if err != nil {
			slog.Error("public_request: list organizer requests cursor failed", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to load requests")
			return
		}
		if items == nil {
			items = []models.PublicRequest{}
		}
		writeJSON(w, http.StatusOK, CursorPaginatedResponse{
			Data:       items,
			NextCursor: next,
			HasMore:    next != nil,
			Limit:      limit,
		})
		return
	}

	params := parsePaginationParams(r, publicRequestSortAllowlist, "created_at")
	if params == nil {
		// Backward-compatible flat response: default first page, limit 50.
		params = &PaginationParams{Page: 1, Limit: 50, Sort: "created_at", Order: "DESC"}
	}

	filters := repository.PublicRequestListFilters{
		Status:  status,
		FromDay: fromDay,
		ToDay:   toDay,
		SortBy:  params.Sort,
		Order:   params.Order,
		Limit:   params.Limit,
		Offset:  (params.Page - 1) * params.Limit,
	}
	items, total, err := h.requestRepo.ListByOrganizer(r.Context(), userID, filters)
	if err != nil {
		slog.Error("public_request: list organizer requests failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load requests")
		return
	}
	writePaginatedJSON(w, http.StatusOK, items, total, params)
}

// CountUnread handles GET /api/organizers/me/requests/unread-count
func (h *PublicRequestHandler) CountUnread(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	n, err := h.requestRepo.CountUnreadByOrganizer(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to count unread")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int{"count": n}})
}

// GetRequest handles GET /api/organizers/me/requests/{id} (request row + responses).
func (h *PublicRequestHandler) GetRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	req, err := h.requestRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Request not found")
			return
		}
		slog.Error("public_request: get request failed", "error", err, "id", id)
		writeError(w, http.StatusInternalServerError, "Failed to load request")
		return
	}
	responses, err := h.requestRepo.ListResponsesByRequest(r.Context(), id, userID)
	if err != nil {
		slog.Error("public_request: list responses failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load responses")
		return
	}
	if responses == nil {
		responses = []models.PublicResponse{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"request":   req,
			"responses": responses,
		},
	})
}

// MarkRead handles POST /api/organizers/me/requests/{id}/read
func (h *PublicRequestHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	if err := h.svc.MarkRead(r.Context(), id, userID); err != nil {
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]bool{"ok": true}})
}

// --- Organizer actions on a request (auth) ---

// RespondRequest handles POST /api/organizers/me/requests/{id}/responses
func (h *PublicRequestHandler) RespondRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	var body struct {
		QuoteAmount *float64 `json:"quote_amount"`
		Currency    string   `json:"currency,omitempty"`
		Inclusions  []string `json:"inclusions,omitempty"`
		ValidUntil  *string  `json:"valid_until,omitempty"`
		Message     *string  `json:"message,omitempty"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		return
	}
	if body.QuoteAmount == nil || *body.QuoteAmount < 0 {
		writeError(w, http.StatusBadRequest, "quote_amount must be a non-negative number")
		return
	}
	currency := strings.TrimSpace(body.Currency)
	if currency == "" {
		currency = "MXN"
	}
	resp := &models.PublicResponse{
		QuoteAmount: *body.QuoteAmount,
		Currency:    currency,
		Inclusions:  body.Inclusions,
		ValidUntil:  trimStrPtr(body.ValidUntil),
		Message:     trimStrPtr(body.Message),
	}
	if err := h.svc.Respond(r.Context(), id, userID, resp); err != nil {
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": resp})
}

// DeclineRequest handles POST /api/organizers/me/requests/{id}/decline
func (h *PublicRequestHandler) DeclineRequest(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	var body struct {
		Reason *string `json:"reason,omitempty"`
	}
	// Body optional — decline may carry no reason.
	_ = decodeJSON(w, r, &body)
	if err := h.svc.Decline(r.Context(), id, userID, trimStrPtr(body.Reason)); err != nil {
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]bool{"ok": true}})
}

// RequestInfo handles POST /api/organizers/me/requests/{id}/request-info
func (h *PublicRequestHandler) RequestInfo(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	if err := h.svc.RequestInfo(r.Context(), id, userID); err != nil {
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]bool{"ok": true}})
}

// ConvertToEvent handles POST /api/organizers/me/requests/{id}/convert-to-event
func (h *PublicRequestHandler) ConvertToEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	eventID, err := h.svc.ConvertToEvent(r.Context(), id, userID)
	if err != nil {
		// Idempotent: already converted returns 409 with the existing event_id.
		if errors.Is(err, services.ErrAlreadyConverted) {
			writeJSON(w, http.StatusConflict, map[string]any{
				"error":    "already_converted",
				"event_id": eventID,
			})
			return
		}
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": map[string]any{"event_id": eventID}})
}

// --- Visitor action (public, via X-Request-Token) ---

// ClientAction handles POST /api/public/requests/{id}/action
func (h *PublicRequestHandler) ClientAction(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request id")
		return
	}
	token, err := uuid.Parse(strings.TrimSpace(r.Header.Get("X-Request-Token")))
	if err != nil || token == uuid.Nil {
		writeError(w, http.StatusUnauthorized, "Missing or invalid X-Request-Token")
		return
	}
	var body struct {
		Action string `json:"action"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		return
	}
	action := strings.TrimSpace(body.Action)
	if action != "accept" && action != "decline" {
		writeError(w, http.StatusBadRequest, "action must be 'accept' or 'decline'")
		return
	}
	if err := h.svc.ClientAction(r.Context(), id, token, action); err != nil {
		writePublicRequestError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]bool{"ok": true}})
}

// --- helpers ---

var publicRequestSortAllowlist = map[string]string{
	"created_at": "created_at",
	"event_date": "event_date",
}

// parseServiceIDs converts the request's string slice to uuids, validating format.
// Writes the error response and returns ok=false on the first invalid ID.
func parseServiceIDs(w http.ResponseWriter, raw []string) ([]uuid.UUID, bool) {
	if len(raw) == 0 {
		return nil, true
	}
	out := make([]uuid.UUID, 0, len(raw))
	for _, s := range raw {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		id, err := uuid.Parse(s)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid service_id: "+s)
			return nil, false
		}
		out = append(out, id)
	}
	return out, true
}

// writePublicRequestError maps service domain errors to HTTP statuses.
func writePublicRequestError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrPublicProfileDisabled):
		writeError(w, http.StatusNotFound, "Profile not found")
	case errors.Is(err, services.ErrInvalidServices):
		writeError(w, http.StatusBadRequest, "One or more selected services are not available")
	case errors.Is(err, services.ErrPendingCapExceeded):
		writeJSON(w, http.StatusTooManyRequests, map[string]string{
			"error":   "inbox_full",
			"message": "This organizer's inbox is full. Please try again later.",
		})
	case errors.Is(err, services.ErrValidation):
		msg := err.Error()
		if i := strings.Index(msg, ": "); i >= 0 {
			msg = msg[i+2:]
		}
		writeError(w, http.StatusBadRequest, msg)
	case errors.Is(err, services.ErrLinkInvalid):
		writeJSON(w, http.StatusGone, map[string]string{
			"error":   "link_invalid",
			"message": "Este enlace ya no es válido o ha expirado.",
		})
	case errors.Is(err, services.ErrLinkNotFound):
		writeError(w, http.StatusNotFound, "Link not found")
	case errors.Is(err, services.ErrRequestNotFound):
		writeError(w, http.StatusNotFound, "Request not found")
	case errors.Is(err, services.ErrInvalidTransition):
		writeError(w, http.StatusConflict, "This action is not allowed for the current request state")
	case errors.Is(err, pgx.ErrNoRows):
		writeError(w, http.StatusNotFound, "Not found")
	default:
		slog.Error("public_request: unexpected service error", "error", err)
		writeError(w, http.StatusInternalServerError, "Something went wrong")
	}
}
