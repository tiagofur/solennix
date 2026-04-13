package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// NotificationSender is an optional interface for sending push notifications.
// When nil, notifications are silently skipped (e.g., in tests).
type NotificationSender interface {
	SendPaymentReceived(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, amount float64) error
	SendEventConfirmed(ctx context.Context, userID uuid.UUID, event models.Event) error
}

type CRUDHandler struct {
	clientRepo      ClientRepository
	eventRepo       FullEventRepository
	productRepo     ProductRepository
	inventoryRepo   InventoryRepository
	paymentRepo     FullPaymentRepository
	userRepo        FullUserRepository
	unavailRepo     UnavailableDateRepository
	notifier        NotificationSender         // optional, may be nil
	emailService    *services.EmailService      // optional, may be nil
	liveActivitySvc LiveActivityNotifier        // optional, may be nil
}

// LiveActivityNotifier is the subset of services.LiveActivityService the handler needs.
// Defined here to keep the handler decoupled from the concrete service.
type LiveActivityNotifier interface {
	PushUpdate(ctx context.Context, eventID uuid.UUID, state services.LiveActivityContentState) error
}

func NewCRUDHandler(
	clientRepo ClientRepository,
	eventRepo FullEventRepository,
	productRepo ProductRepository,
	inventoryRepo InventoryRepository,
	paymentRepo FullPaymentRepository,
	userRepo FullUserRepository,
	unavailRepo UnavailableDateRepository,
) *CRUDHandler {
	return &CRUDHandler{
		clientRepo:    clientRepo,
		eventRepo:     eventRepo,
		productRepo:   productRepo,
		inventoryRepo: inventoryRepo,
		paymentRepo:   paymentRepo,
		userRepo:      userRepo,
		unavailRepo:   unavailRepo,
	}
}

// SetNotifier configures an optional push notification sender.
func (h *CRUDHandler) SetNotifier(n NotificationSender) {
	h.notifier = n
}

// SetEmailService configures an optional email service.
func (h *CRUDHandler) SetEmailService(e *services.EmailService) {
	h.emailService = e
}

// SetLiveActivityNotifier configures an optional Live Activity push notifier.
func (h *CRUDHandler) SetLiveActivityNotifier(s LiveActivityNotifier) {
	h.liveActivitySvc = s
}

// ===================
// CLIENTS
// ===================

var clientSortAllowlist = map[string]string{
	"name":         "name",
	"created_at":   "created_at",
	"total_events": "total_events",
	"total_spent":  "total_spent",
}

func (h *CRUDHandler) ListClients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	params := parsePaginationParams(r, clientSortAllowlist, "name")
	if params != nil {
		offset := (params.Page - 1) * params.Limit
		clients, total, err := h.clientRepo.GetAllPaginated(r.Context(), userID, offset, params.Limit, params.Sort, params.Order)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch clients")
			return
		}
		if clients == nil {
			clients = []models.Client{}
		}
		writePaginatedJSON(w, http.StatusOK, clients, total, params)
		return
	}

	clients, err := h.clientRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch clients")
		return
	}
	writeJSON(w, http.StatusOK, clients)
}

func (h *CRUDHandler) GetClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client ID")
		return
	}
	client, err := h.clientRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Client not found")
		return
	}
	writeJSON(w, http.StatusOK, client)
}

func (h *CRUDHandler) CreateClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var client models.Client
	if err := decodeJSON(r, &client); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateClient(&client); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		count, err := h.clientRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify client limits")
			return
		}
		if count >= 50 {
			writePlanLimitError(w, "clients", count, 50)
			return
		}
	}

	client.UserID = userID
	if err := h.clientRepo.Create(r.Context(), &client); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create client")
		return
	}
	writeJSON(w, http.StatusCreated, client)
}

func (h *CRUDHandler) UpdateClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client ID")
		return
	}
	var client models.Client
	if err := decodeJSON(r, &client); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateClient(&client); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	client.ID = id
	client.UserID = userID
	if err := h.clientRepo.Update(r.Context(), &client); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update client")
		return
	}
	writeJSON(w, http.StatusOK, client)
}

func (h *CRUDHandler) DeleteClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client ID")
		return
	}
	if err := h.clientRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Client not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===================
// EVENTS
// ===================

var eventSortAllowlist = map[string]string{
	"event_date":   "e.event_date",
	"created_at":   "e.created_at",
	"total_amount": "e.total_amount",
	"status":       "e.status",
	"num_people":   "e.num_people",
}

func (h *CRUDHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	clientID := r.URL.Query().Get("client_id")

	// Filtered queries don't support pagination (they return subsets already)
	if clientID != "" {
		cid, err := uuid.Parse(clientID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid client_id")
			return
		}
		events, err := h.eventRepo.GetByClientID(r.Context(), userID, cid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch events")
			return
		}
		writeJSON(w, http.StatusOK, events)
		return
	}

	if start != "" && end != "" {
		startDate, err := normalizeDateParam(start)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid start date")
			return
		}
		endDate, err := normalizeDateParam(end)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid end date")
			return
		}
		events, err := h.eventRepo.GetByDateRange(r.Context(), userID, startDate, endDate)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch events")
			return
		}
		writeJSON(w, http.StatusOK, events)
		return
	}

	// Unfiltered list: supports pagination
	params := parsePaginationParams(r, eventSortAllowlist, "e.event_date")
	if params != nil {
		offset := (params.Page - 1) * params.Limit
		events, total, err := h.eventRepo.GetAllPaginated(r.Context(), userID, offset, params.Limit, params.Sort, params.Order)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch events")
			return
		}
		if events == nil {
			events = []models.Event{}
		}
		writePaginatedJSON(w, http.StatusOK, events, total, params)
		return
	}

	events, err := h.eventRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch events")
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (h *CRUDHandler) GetUpcomingEvents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	limit := 5
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	// Cap limit to prevent abuse
	if limit > 50 {
		limit = 50
	}
	events, err := h.eventRepo.GetUpcoming(r.Context(), userID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch upcoming events")
		return
	}
	writeJSON(w, http.StatusOK, events)
}

// SearchEvents performs an advanced search on events with combinable filters.
// GET /api/events/search?q=text&status=confirmed&from=2026-01-01&to=2026-12-31&client_id=uuid
func (h *CRUDHandler) SearchEvents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	q := r.URL.Query()

	filters := repository.EventSearchFilters{
		Query:    q.Get("q"),
		Status:   q.Get("status"),
		FromDate: q.Get("from"),
		ToDate:   q.Get("to"),
	}

	// Validate status if provided
	if filters.Status != "" {
		validStatuses := map[string]bool{
			"quoted": true, "confirmed": true,
			"completed": true, "cancelled": true,
		}
		if !validStatuses[filters.Status] {
			writeError(w, http.StatusBadRequest, "Invalid status value")
			return
		}
	}

	// Parse client_id if provided
	if cidStr := q.Get("client_id"); cidStr != "" {
		cid, err := uuid.Parse(cidStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid client_id")
			return
		}
		filters.ClientID = &cid
	}

	// Validate date formats if provided
	if filters.FromDate != "" {
		if _, err := time.Parse("2006-01-02", filters.FromDate); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid 'from' date format (use YYYY-MM-DD)")
			return
		}
	}
	if filters.ToDate != "" {
		if _, err := time.Parse("2006-01-02", filters.ToDate); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid 'to' date format (use YYYY-MM-DD)")
			return
		}
	}

	// At least one filter must be provided
	if filters.Query == "" && filters.Status == "" && filters.FromDate == "" && filters.ToDate == "" && filters.ClientID == nil {
		writeError(w, http.StatusBadRequest, "At least one search filter is required (q, status, from, to, client_id)")
		return
	}

	events, err := h.eventRepo.SearchEventsAdvanced(r.Context(), userID, filters)
	if err != nil {
		slog.Error("Advanced event search failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to search events")
		return
	}

	writeJSON(w, http.StatusOK, events)
}

func (h *CRUDHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	event, err := h.eventRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	writeJSON(w, http.StatusOK, event)
}

func (h *CRUDHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var event models.Event
	if err := decodeJSON(r, &event); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateEvent(&event); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate event_date format
	if event.EventDate == "" {
		writeError(w, http.StatusBadRequest, "event_date is required")
		return
	}
	startReqStr := strings.Split(event.EventDate, "T")[0]
	if _, err := time.Parse("2006-01-02", startReqStr); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event_date format, expected YYYY-MM-DD")
		return
	}
	endReqStr := startReqStr

	unavailableDates, err := h.unavailRepo.GetByDateRange(r.Context(), userID, startReqStr, endReqStr)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to verify unavailable dates")
		return
	}
	if len(unavailableDates) > 0 {
		writeError(w, http.StatusBadRequest, "Date range overlaps with unavailable dates")
		return
	}

	// 1. Check user plan and limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		count, err := h.eventRepo.CountCurrentMonth(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify event limits")
			return
		}
		if count >= 3 {
			writePlanLimitError(w, "events", count, 3)
			return
		}
	}

	event.UserID = userID
	if err := h.eventRepo.Create(r.Context(), &event); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create event")
		return
	}
	// Update client stats
	if err := h.eventRepo.UpdateClientStats(r.Context(), event.ClientID); err != nil {
		slog.Warn("Failed to update client stats", "client_id", event.ClientID, "error", err)
	}
	writeJSON(w, http.StatusCreated, event)
}

func (h *CRUDHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	// Get existing to know old client_id
	existing, err := h.eventRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	oldClientID := existing.ClientID
	oldStatus := existing.Status
	oldEventDate := existing.EventDate

	// Decode into existing event to handle partial updates
	if err := decodeJSON(r, existing); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	// Ensure ID and UserID are not changed
	existing.ID = id
	existing.UserID = userID

	// Validate business rules
	if err := ValidateEvent(existing); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Validate unavailable dates (only if date changed)
	startReqStr := strings.Split(existing.EventDate, "T")[0]
	if _, err := time.Parse("2006-01-02", startReqStr); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event_date format, expected YYYY-MM-DD")
		return
	}

	// Only check unavailable dates if the event date actually changed
	oldDateStr := strings.Split(oldEventDate, "T")[0]
	if startReqStr != oldDateStr {
		endReqStr := startReqStr
		unavailableDates, err := h.unavailRepo.GetByDateRange(r.Context(), userID, startReqStr, endReqStr)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify unavailable dates")
			return
		}
		if len(unavailableDates) > 0 {
			writeError(w, http.StatusBadRequest, "Date range overlaps with unavailable dates")
			return
		}
	}

	if err := h.eventRepo.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update event")
		return
	}

	// Update client stats (old and new client if changed)
	if err := h.eventRepo.UpdateClientStats(r.Context(), existing.ClientID); err != nil {
		slog.Warn("Failed to update client stats", "client_id", existing.ClientID, "error", err)
	}
	if oldClientID != existing.ClientID {
		if err := h.eventRepo.UpdateClientStats(r.Context(), oldClientID); err != nil {
			slog.Warn("Failed to update client stats", "client_id", oldClientID, "error", err)
		}
	}

	// Deduct supply stock when event transitions to 'confirmed'
	if existing.Status == "confirmed" && oldStatus != "confirmed" {
		if err := h.eventRepo.DeductSupplyStock(r.Context(), id); err != nil {
			slog.Warn("Failed to deduct supply stock", "event_id", id, "error", err)
		}
		// Send push notification for event confirmation (fire-and-forget)
		if h.notifier != nil {
			go func() {
				_ = h.notifier.SendEventConfirmed(context.Background(), userID, *existing)
			}()
		}
	}

	// Push Live Activity update on any status change (fire-and-forget).
	// Reaches running iOS Activities so the Dynamic Island reflects the new state
	// even if the change came from another device or team member.
	if h.liveActivitySvc != nil && existing.Status != oldStatus {
		eventStart := parseEventStartTime(existing.EventDate, existing.StartTime)
		state := services.DeriveContentStateFromStatus(existing.Status, eventStart)
		go func() {
			if err := h.liveActivitySvc.PushUpdate(context.Background(), id, state); err != nil {
				slog.Warn("Failed to push live activity update", "event_id", id, "error", err)
			}
		}()
	}

	writeJSON(w, http.StatusOK, existing)
}

// parseEventStartTime combines event_date (YYYY-MM-DD or RFC3339) with optional
// start_time (HH:MM[:SS]) into a single Time. Falls back to "now" if parsing fails.
func parseEventStartTime(eventDate string, startTime *string) time.Time {
	dateStr := strings.Split(eventDate, "T")[0]
	timeStr := "09:00"
	if startTime != nil && *startTime != "" {
		timeStr = *startTime
		if len(timeStr) > 5 {
			timeStr = timeStr[:5]
		}
	}
	if t, err := time.ParseInLocation("2006-01-02 15:04", dateStr+" "+timeStr, time.Local); err == nil {
		return t
	}
	return time.Now()
}

func (h *CRUDHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Get event to know client_id for stats update
	event, err := h.eventRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	if err := h.eventRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	if err := h.eventRepo.UpdateClientStats(r.Context(), event.ClientID); err != nil {
		slog.Warn("Failed to update client stats", "client_id", event.ClientID, "error", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CRUDHandler) GetEventProducts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Verify event belongs to user
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	products, err := h.eventRepo.GetProducts(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch event products")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *CRUDHandler) GetEventExtras(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Verify event belongs to user
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	extras, err := h.eventRepo.GetExtras(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch event extras")
		return
	}
	writeJSON(w, http.StatusOK, extras)
}

func (h *CRUDHandler) UpdateEventItems(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Verify event belongs to user
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	var req struct {
		Products  []models.EventProduct    `json:"products"`
		Extras    []models.EventExtra      `json:"extras"`
		Equipment *[]models.EventEquipment `json:"equipment,omitempty"`
		Supplies  *[]models.EventSupply    `json:"supplies,omitempty"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate all products
	for i, product := range req.Products {
		if err := ValidateEventProduct(&product); err != nil {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("products[%d]: %s", i, err.Error()))
			return
		}
	}

	// Validate all extras
	for i, extra := range req.Extras {
		if err := ValidateEventExtra(&extra); err != nil {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("extras[%d]: %s", i, err.Error()))
			return
		}
	}

	// Validate all equipment (if provided)
	if req.Equipment != nil {
		for i, eq := range *req.Equipment {
			if err := ValidateEventEquipment(&eq); err != nil {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("equipment[%d]: %s", i, err.Error()))
				return
			}
		}
	}

	// Validate all supplies (if provided)
	if req.Supplies != nil {
		for i, s := range *req.Supplies {
			if err := ValidateEventSupply(&s); err != nil {
				writeError(w, http.StatusBadRequest, fmt.Sprintf("supplies[%d]: %s", i, err.Error()))
				return
			}
		}
	}

	if err := h.eventRepo.UpdateEventItems(r.Context(), eventID, req.Products, req.Extras, req.Equipment, req.Supplies); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update event items")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *CRUDHandler) GetEventEquipment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	equipment, err := h.eventRepo.GetEquipment(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch event equipment")
		return
	}
	writeJSON(w, http.StatusOK, equipment)
}

func (h *CRUDHandler) CheckEquipmentConflicts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		EventDate      string   `json:"event_date"`
		StartTime      *string  `json:"start_time,omitempty"`
		EndTime        *string  `json:"end_time,omitempty"`
		InventoryIDs   []string `json:"inventory_ids"`
		ExcludeEventID *string  `json:"exclude_event_id,omitempty"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.EventDate == "" || len(req.InventoryIDs) == 0 {
		writeJSON(w, http.StatusOK, []models.EquipmentConflict{})
		return
	}

	var inventoryUUIDs []uuid.UUID
	for _, idStr := range req.InventoryIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid inventory ID: "+idStr)
			return
		}
		inventoryUUIDs = append(inventoryUUIDs, id)
	}

	var excludeID *uuid.UUID
	if req.ExcludeEventID != nil && *req.ExcludeEventID != "" {
		parsed, err := uuid.Parse(*req.ExcludeEventID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid exclude_event_id")
			return
		}
		excludeID = &parsed
	}

	conflicts, err := h.eventRepo.CheckEquipmentConflicts(r.Context(), userID,
		req.EventDate, req.StartTime, req.EndTime, inventoryUUIDs, excludeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check equipment conflicts")
		return
	}
	if conflicts == nil {
		conflicts = []models.EquipmentConflict{}
	}
	writeJSON(w, http.StatusOK, conflicts)
}

// CheckEquipmentConflictsGET handles GET requests with query params (for mobile apps)
func (h *CRUDHandler) CheckEquipmentConflictsGET(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventDate := r.URL.Query().Get("event_date")
	inventoryIDsStr := r.URL.Query().Get("inventory_ids")
	excludeEventIDStr := r.URL.Query().Get("exclude_event_id")
	startTime := r.URL.Query().Get("start_time")
	endTime := r.URL.Query().Get("end_time")

	if eventDate == "" || inventoryIDsStr == "" {
		writeJSON(w, http.StatusOK, []models.EquipmentConflict{})
		return
	}

	var inventoryUUIDs []uuid.UUID
	for _, idStr := range splitCSV(inventoryIDsStr) {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid inventory ID: "+idStr)
			return
		}
		inventoryUUIDs = append(inventoryUUIDs, id)
	}

	var excludeID *uuid.UUID
	if excludeEventIDStr != "" {
		parsed, err := uuid.Parse(excludeEventIDStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid exclude_event_id")
			return
		}
		excludeID = &parsed
	}

	var startTimePtr, endTimePtr *string
	if startTime != "" {
		startTimePtr = &startTime
	}
	if endTime != "" {
		endTimePtr = &endTime
	}

	conflicts, err := h.eventRepo.CheckEquipmentConflicts(r.Context(), userID,
		eventDate, startTimePtr, endTimePtr, inventoryUUIDs, excludeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check equipment conflicts")
		return
	}
	if conflicts == nil {
		conflicts = []models.EquipmentConflict{}
	}
	writeJSON(w, http.StatusOK, conflicts)
}

func (h *CRUDHandler) GetEquipmentSuggestions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		Products []struct {
			ProductID string  `json:"product_id"`
			Quantity  float64 `json:"quantity"`
		} `json:"products"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(req.Products) == 0 {
		writeJSON(w, http.StatusOK, []models.EquipmentSuggestion{})
		return
	}

	var productQtys []repository.ProductQuantity
	for _, p := range req.Products {
		id, err := uuid.Parse(p.ProductID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid product ID: "+p.ProductID)
			return
		}
		qty := p.Quantity
		if qty <= 0 {
			qty = 1
		}
		productQtys = append(productQtys, repository.ProductQuantity{ID: id, Quantity: qty})
	}

	suggestions, err := h.eventRepo.GetEquipmentSuggestionsFromProducts(r.Context(), userID, productQtys)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch equipment suggestions")
		return
	}
	if suggestions == nil {
		suggestions = []models.EquipmentSuggestion{}
	}
	writeJSON(w, http.StatusOK, suggestions)
}

// GetEquipmentSuggestionsGET handles GET requests with query params (for mobile apps)
func (h *CRUDHandler) GetEquipmentSuggestionsGET(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	productIDsStr := r.URL.Query().Get("product_ids")

	if productIDsStr == "" {
		writeJSON(w, http.StatusOK, []models.EquipmentSuggestion{})
		return
	}

	var productQtys []repository.ProductQuantity
	for _, idStr := range splitCSV(productIDsStr) {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid product ID: "+idStr)
			return
		}
		productQtys = append(productQtys, repository.ProductQuantity{ID: id, Quantity: 1})
	}

	suggestions, err := h.eventRepo.GetEquipmentSuggestionsFromProducts(r.Context(), userID, productQtys)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch equipment suggestions")
		return
	}
	if suggestions == nil {
		suggestions = []models.EquipmentSuggestion{}
	}
	writeJSON(w, http.StatusOK, suggestions)
}

func (h *CRUDHandler) GetEventSupplies(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	supplies, err := h.eventRepo.GetSupplies(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch event supplies")
		return
	}
	if supplies == nil {
		supplies = []models.EventSupply{}
	}
	writeJSON(w, http.StatusOK, supplies)
}

func (h *CRUDHandler) GetSupplySuggestions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		Products []struct {
			ProductID string  `json:"product_id"`
			Quantity  float64 `json:"quantity"`
		} `json:"products"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(req.Products) == 0 {
		writeJSON(w, http.StatusOK, []models.SupplySuggestion{})
		return
	}

	var productQtys []repository.ProductQuantity
	for _, p := range req.Products {
		id, err := uuid.Parse(p.ProductID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid product ID: "+p.ProductID)
			return
		}
		productQtys = append(productQtys, repository.ProductQuantity{ID: id, Quantity: p.Quantity})
	}

	suggestions, err := h.eventRepo.GetSupplySuggestionsFromProducts(r.Context(), userID, productQtys)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch supply suggestions")
		return
	}
	if suggestions == nil {
		suggestions = []models.SupplySuggestion{}
	}
	writeJSON(w, http.StatusOK, suggestions)
}

// GetSupplySuggestionsGET handles GET requests with query params (for mobile apps)
func (h *CRUDHandler) GetSupplySuggestionsGET(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	productIDsStr := r.URL.Query().Get("product_ids")

	if productIDsStr == "" {
		writeJSON(w, http.StatusOK, []models.SupplySuggestion{})
		return
	}

	var productQtys []repository.ProductQuantity
	for _, idStr := range splitCSV(productIDsStr) {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid product ID: "+idStr)
			return
		}
		productQtys = append(productQtys, repository.ProductQuantity{ID: id, Quantity: 1})
	}

	suggestions, err := h.eventRepo.GetSupplySuggestionsFromProducts(r.Context(), userID, productQtys)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch supply suggestions")
		return
	}
	if suggestions == nil {
		suggestions = []models.SupplySuggestion{}
	}
	writeJSON(w, http.StatusOK, suggestions)
}

// ===================
// EVENT PHOTOS
// ===================

// GetEventPhotos handles GET /api/events/{id}/photos
func (h *CRUDHandler) GetEventPhotos(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	event, err := h.eventRepo.GetByID(r.Context(), eventID, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	photos := parseEventPhotos(event.Photos)
	writeJSON(w, http.StatusOK, photos)
}

// AddEventPhoto handles POST /api/events/{id}/photos
func (h *CRUDHandler) AddEventPhoto(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	event, err := h.eventRepo.GetByID(r.Context(), eventID, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	var req struct {
		URL          string  `json:"url"`
		ThumbnailURL *string `json:"thumbnail_url,omitempty"`
		Caption      *string `json:"caption,omitempty"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}

	photos := parseEventPhotos(event.Photos)

	newPhoto := models.EventPhoto{
		ID:           uuid.New(),
		URL:          req.URL,
		ThumbnailURL: req.ThumbnailURL,
		Caption:      req.Caption,
		CreatedAt:    time.Now(),
	}
	photos = append(photos, newPhoto)

	photosJSON, err := json.Marshal(photos)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to serialize photos")
		return
	}
	photosStr := string(photosJSON)
	event.Photos = &photosStr

	if err := h.eventRepo.Update(r.Context(), event); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to add photo")
		return
	}

	writeJSON(w, http.StatusCreated, newPhoto)
}

// DeleteEventPhoto handles DELETE /api/events/{id}/photos/{photoId}
func (h *CRUDHandler) DeleteEventPhoto(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	photoID, err := uuid.Parse(chi.URLParam(r, "photoId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid photo ID")
		return
	}

	event, err := h.eventRepo.GetByID(r.Context(), eventID, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	photos := parseEventPhotos(event.Photos)

	// Find and remove the photo
	found := false
	newPhotos := make([]models.EventPhoto, 0, len(photos))
	for _, p := range photos {
		if p.ID == photoID {
			found = true
			continue
		}
		newPhotos = append(newPhotos, p)
	}

	if !found {
		writeError(w, http.StatusNotFound, "Photo not found")
		return
	}

	photosJSON, err := json.Marshal(newPhotos)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to serialize photos")
		return
	}
	photosStr := string(photosJSON)
	event.Photos = &photosStr

	if err := h.eventRepo.Update(r.Context(), event); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete photo")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// parseEventPhotos parses the photos JSON string into a slice of EventPhoto
func parseEventPhotos(photosJSON *string) []models.EventPhoto {
	if photosJSON == nil || *photosJSON == "" || *photosJSON == "null" {
		return []models.EventPhoto{}
	}

	var photos []models.EventPhoto
	if err := json.Unmarshal([]byte(*photosJSON), &photos); err != nil {
		slog.Warn("Failed to parse event photos JSON", "error", err)
		return []models.EventPhoto{}
	}
	return photos
}

// ===================
// PRODUCTS
// ===================

var productSortAllowlist = map[string]string{
	"name":       "name",
	"created_at": "created_at",
	"base_price": "base_price",
	"category":   "category",
}

func (h *CRUDHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	params := parsePaginationParams(r, productSortAllowlist, "name")
	if params != nil {
		offset := (params.Page - 1) * params.Limit
		products, total, err := h.productRepo.GetAllPaginated(r.Context(), userID, offset, params.Limit, params.Sort, params.Order)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch products")
			return
		}
		if products == nil {
			products = []models.Product{}
		}
		writePaginatedJSON(w, http.StatusOK, products, total, params)
		return
	}

	products, err := h.productRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch products")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *CRUDHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	product, err := h.productRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

func (h *CRUDHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var product models.Product
	if err := decodeJSON(r, &product); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateProduct(&product); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		productCount, err := h.productRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify product limits")
			return
		}
		inventoryCount, err := h.inventoryRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify inventory limits")
			return
		}
		if productCount+inventoryCount >= 20 {
			writePlanLimitError(w, "catalog", productCount+inventoryCount, 20)
			return
		}
	}

	product.UserID = userID
	if err := h.productRepo.Create(r.Context(), &product); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create product")
		return
	}
	writeJSON(w, http.StatusCreated, product)
}

func (h *CRUDHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	var product models.Product
	if err := decodeJSON(r, &product); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateProduct(&product); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	product.ID = id
	product.UserID = userID
	if err := h.productRepo.Update(r.Context(), &product); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update product")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

func (h *CRUDHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	if err := h.productRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CRUDHandler) GetProductIngredients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	// Verify product belongs to user
	if _, err := h.productRepo.GetByID(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	ingredients, err := h.productRepo.GetIngredients(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch ingredients")
		return
	}
	writeJSON(w, http.StatusOK, ingredients)
}

func (h *CRUDHandler) UpdateProductIngredients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	// Verify product belongs to user
	if _, err := h.productRepo.GetByID(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	var req struct {
		Ingredients []models.ProductIngredient `json:"ingredients"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate all ingredients
	for i, ingredient := range req.Ingredients {
		if err := ValidateProductIngredient(&ingredient); err != nil {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("ingredients[%d]: %s", i, err.Error()))
			return
		}
	}

	if err := h.productRepo.UpdateIngredients(r.Context(), id, req.Ingredients); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update ingredients")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *CRUDHandler) GetBatchProductIngredients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		ProductIDs []string `json:"product_ids"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(req.ProductIDs) == 0 {
		writeJSON(w, http.StatusOK, []models.ProductIngredient{})
		return
	}
	if len(req.ProductIDs) > 100 {
		writeError(w, http.StatusBadRequest, "Too many product IDs (max 100)")
		return
	}

	// Parse all product IDs
	var productUUIDs []uuid.UUID
	for _, idStr := range req.ProductIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid product ID: "+idStr)
			return
		}
		productUUIDs = append(productUUIDs, id)
	}

	// Verify ownership of all products in a single query
	if err := h.productRepo.VerifyOwnership(r.Context(), productUUIDs, userID); err != nil {
		writeError(w, http.StatusNotFound, "One or more products not found")
		return
	}

	ingredients, err := h.productRepo.GetIngredientsForProducts(r.Context(), productUUIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch ingredients")
		return
	}
	writeJSON(w, http.StatusOK, ingredients)
}

// ===================
// INVENTORY
// ===================

var inventorySortAllowlist = map[string]string{
	"ingredient_name": "ingredient_name",
	"current_stock":   "current_stock",
	"unit_cost":       "unit_cost",
	"type":            "type",
	"last_updated":    "last_updated",
}

func (h *CRUDHandler) ListInventory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	params := parsePaginationParams(r, inventorySortAllowlist, "ingredient_name")
	if params != nil {
		offset := (params.Page - 1) * params.Limit
		items, total, err := h.inventoryRepo.GetAllPaginated(r.Context(), userID, offset, params.Limit, params.Sort, params.Order)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch inventory")
			return
		}
		if items == nil {
			items = []models.InventoryItem{}
		}
		writePaginatedJSON(w, http.StatusOK, items, total, params)
		return
	}

	items, err := h.inventoryRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch inventory")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *CRUDHandler) GetInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid inventory ID")
		return
	}
	item, err := h.inventoryRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Inventory item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *CRUDHandler) CreateInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var item models.InventoryItem
	if err := decodeJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateInventoryItem(&item); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		productCount, err := h.productRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify product limits")
			return
		}
		inventoryCount, err := h.inventoryRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify inventory limits")
			return
		}
		if productCount+inventoryCount >= 20 {
			writePlanLimitError(w, "catalog", productCount+inventoryCount, 20)
			return
		}
	}

	item.UserID = userID
	if err := h.inventoryRepo.Create(r.Context(), &item); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create inventory item")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *CRUDHandler) UpdateInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid inventory ID")
		return
	}
	var item models.InventoryItem
	if err := decodeJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidateInventoryItem(&item); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	item.ID = id
	item.UserID = userID
	if err := h.inventoryRepo.Update(r.Context(), &item); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update inventory item")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *CRUDHandler) DeleteInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid inventory ID")
		return
	}
	if err := h.inventoryRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Inventory item not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===================
// PAYMENTS
// ===================

var paymentSortAllowlist = map[string]string{
	"payment_date":   "payment_date",
	"created_at":     "created_at",
	"amount":         "amount",
	"payment_method": "payment_method",
}

func (h *CRUDHandler) GetPayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payment ID")
		return
	}

	payment, err := h.paymentRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Payment not found")
		return
	}

	writeJSON(w, http.StatusOK, payment)
}

func (h *CRUDHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID := r.URL.Query().Get("event_id")
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	eventIDs := r.URL.Query().Get("event_ids")

	// Filtered queries don't support pagination
	if eventID != "" {
		eid, err := uuid.Parse(eventID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid event_id")
			return
		}
		payments, err := h.paymentRepo.GetByEventID(r.Context(), userID, eid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		writeJSON(w, http.StatusOK, payments)
		return
	}

	if start != "" && end != "" {
		payments, err := h.paymentRepo.GetByDateRange(r.Context(), userID, start, end)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		writeJSON(w, http.StatusOK, payments)
		return
	}

	if eventIDs != "" {
		var ids []uuid.UUID
		for _, s := range splitCSV(eventIDs) {
			id, err := uuid.Parse(s)
			if err != nil {
				writeError(w, http.StatusBadRequest, "Invalid event_ids")
				return
			}
			ids = append(ids, id)
		}
		if len(ids) == 0 {
			writeError(w, http.StatusBadRequest, "Invalid event_ids")
			return
		}
		payments, err := h.paymentRepo.GetByEventIDs(r.Context(), userID, ids)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		writeJSON(w, http.StatusOK, payments)
		return
	}

	// Unfiltered list: supports pagination
	params := parsePaginationParams(r, paymentSortAllowlist, "payment_date")
	if params != nil {
		offset := (params.Page - 1) * params.Limit
		payments, total, err := h.paymentRepo.GetAllPaginated(r.Context(), userID, offset, params.Limit, params.Sort, params.Order)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		if payments == nil {
			payments = []models.Payment{}
		}
		writePaginatedJSON(w, http.StatusOK, payments, total, params)
		return
	}

	payments, err := h.paymentRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
		return
	}
	writeJSON(w, http.StatusOK, payments)
}

func (h *CRUDHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var payment models.Payment
	if err := decodeJSON(r, &payment); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidatePayment(&payment); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	payment.UserID = userID
	if err := h.paymentRepo.Create(r.Context(), &payment); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create payment")
		return
	}

	// Send push notification (fire-and-forget)
	if h.notifier != nil {
		go func() {
			_ = h.notifier.SendPaymentReceived(context.Background(), userID, payment.EventID, payment.Amount)
		}()
	}

	// Send payment receipt email (fire-and-forget, respects user preference)
	if h.emailService != nil {
		go func() {
			user, err := h.userRepo.GetByID(context.Background(), userID)
			if err != nil {
				return
			}
			if user.EmailPaymentReceipt != nil && !*user.EmailPaymentReceipt {
				return
			}
			eventName := "Evento"
			if event, err := h.eventRepo.GetByID(context.Background(), payment.EventID, userID); err == nil {
				eventName = event.ServiceType
			}
			_ = h.emailService.SendPaymentReceipt(
				user.Email, user.Name, eventName,
				fmt.Sprintf("$%.2f MXN", payment.Amount),
				payment.PaymentDate,
			)
		}()
	}

	writeJSON(w, http.StatusCreated, payment)
}

func (h *CRUDHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payment ID")
		return
	}
	var payment models.Payment
	if err := decodeJSON(r, &payment); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate business rules
	if err := ValidatePayment(&payment); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	payment.ID = id
	if err := h.paymentRepo.Update(r.Context(), userID, &payment); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update payment")
		return
	}
	writeJSON(w, http.StatusOK, payment)
}

func (h *CRUDHandler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payment ID")
		return
	}
	if err := h.paymentRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Payment not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Helper
func splitCSV(s string) []string {
	var result []string
	for _, part := range split(s, ",") {
		trimmed := trim(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func split(s, sep string) []string {
	return strings.Split(s, sep)
}

func trim(s string) string {
	return strings.TrimSpace(s)
}

func normalizeDateParam(value string) (string, error) {
	if value == "" {
		return "", nil
	}
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return t.Format("2006-01-02"), nil
	}
	if t, err := time.Parse("2006-01-02", value); err == nil {
		return t.Format("2006-01-02"), nil
	}
	return "", fmt.Errorf("invalid date format")
}
