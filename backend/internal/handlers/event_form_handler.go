package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// EventFormLinkRepository defines the operations needed for event form links.
type EventFormLinkRepository interface {
	Create(ctx context.Context, link *models.EventFormLink) error
	GetByToken(ctx context.Context, token string) (*models.EventFormLink, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.EventFormLink, error)
	MarkUsedTx(ctx context.Context, tx pgx.Tx, linkID, eventID, clientID uuid.UUID) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	CountActiveByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	GetPool() *pgxpool.Pool
}

// EventFormHandler manages shareable event form links.
type EventFormHandler struct {
	linkRepo    EventFormLinkRepository
	productRepo ProductRepository
	userRepo    FullUserRepository
	frontendURL string
	pool        *pgxpool.Pool
}

// NewEventFormHandler creates a new EventFormHandler.
func NewEventFormHandler(
	linkRepo EventFormLinkRepository,
	productRepo ProductRepository,
	userRepo FullUserRepository,
	frontendURL string,
	pool *pgxpool.Pool,
) *EventFormHandler {
	return &EventFormHandler{
		linkRepo:    linkRepo,
		productRepo: productRepo,
		userRepo:    userRepo,
		frontendURL: frontendURL,
		pool:        pool,
	}
}

// --- Authenticated endpoints ---

// GenerateLink creates a new shareable event form link.
// POST /api/event-forms
func (h *EventFormHandler) GenerateLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Label   *string `json:"label"`
		TTLDays *int    `json:"ttl_days"`
	}
	if err := decodeJSON(r, &req); err != nil {
		// Allow empty body (all fields optional)
		req.Label = nil
		req.TTLDays = nil
	}

	// Validate TTL
	ttlDays := 7 // default
	if req.TTLDays != nil {
		ttlDays = *req.TTLDays
	}
	if ttlDays < 1 || ttlDays > 30 {
		writeError(w, http.StatusBadRequest, "ttl_days must be between 1 and 30")
		return
	}

	// Sanitize label
	label := sanitizeOptionalString(req.Label)
	if label != nil {
		if err := validateStringLength("label", *label, MaxNameLength); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	// Plan limits: basic users max 3 active links
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to get user", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	if user.Plan == "basic" {
		count, err := h.linkRepo.CountActiveByUserID(r.Context(), userID)
		if err != nil {
			slog.Error("Failed to count active links", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to check link limits")
			return
		}
		if count >= 3 {
			writePlanLimitError(w, "event_form_links", count, 3)
			return
		}
	}

	// Generate cryptographically random token
	token, err := generateFormToken()
	if err != nil {
		slog.Error("Failed to generate token", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate link")
		return
	}

	link := &models.EventFormLink{
		UserID:    userID,
		Token:     token,
		Label:     label,
		ExpiresAt: time.Now().UTC().Add(time.Duration(ttlDays) * 24 * time.Hour),
	}

	if err := h.linkRepo.Create(r.Context(), link); err != nil {
		slog.Error("Failed to create event form link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create link")
		return
	}

	link.URL = h.buildFormURL(link.Token)
	writeJSON(w, http.StatusCreated, link)
}

// ListLinks lists all event form links for the authenticated user.
// GET /api/event-forms
func (h *EventFormHandler) ListLinks(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	links, err := h.linkRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to list event form links", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to list links")
		return
	}

	for i := range links {
		links[i].URL = h.buildFormURL(links[i].Token)
	}

	writeJSON(w, http.StatusOK, links)
}

// DeleteLink revokes an event form link.
// DELETE /api/event-forms/{id}
func (h *EventFormHandler) DeleteLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid link ID")
		return
	}

	if err := h.linkRepo.Delete(r.Context(), id, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Link not found")
			return
		}
		slog.Error("Failed to delete event form link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to delete link")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Public endpoints (no auth) ---

// PublicProduct is a DTO that strips pricing info from products.
type PublicProduct struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Category string    `json:"category"`
	ImageURL *string   `json:"image_url,omitempty"`
}

// PublicOrganizer is a DTO with organizer branding only.
type PublicOrganizer struct {
	BusinessName *string `json:"business_name,omitempty"`
	LogoURL      *string `json:"logo_url,omitempty"`
	BrandColor   *string `json:"brand_color,omitempty"`
}

// GetFormData returns the organizer branding and product catalog (without prices) for a form link.
// GET /api/public/event-forms/{token}
func (h *EventFormHandler) GetFormData(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	link, err := h.linkRepo.GetByToken(r.Context(), token)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{
			"error":   "link_invalid",
			"message": "Este enlace ya no es válido o ha expirado.",
		})
		return
	}

	// Load organizer info for branding
	user, err := h.userRepo.GetByID(r.Context(), link.UserID)
	if err != nil {
		slog.Error("Failed to get organizer", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load form")
		return
	}

	// Load organizer's active products (without prices)
	products, err := h.productRepo.GetAll(r.Context(), link.UserID)
	if err != nil {
		slog.Error("Failed to get products", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load products")
		return
	}

	publicProducts := make([]PublicProduct, 0, len(products))
	for _, p := range products {
		if !p.IsActive {
			continue
		}
		publicProducts = append(publicProducts, PublicProduct{
			ID:       p.ID,
			Name:     p.Name,
			Category: p.Category,
			ImageURL: p.ImageURL,
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"organizer": PublicOrganizer{
			BusinessName: user.BusinessName,
			LogoURL:      user.LogoURL,
			BrandColor:   user.BrandColor,
		},
		"products":   publicProducts,
		"link_id":    link.ID,
		"expires_at": link.ExpiresAt,
	})
}

// EventFormSubmission is the request body for submitting a public event form.
type EventFormSubmission struct {
	ClientName  string  `json:"client_name"`
	ClientPhone string  `json:"client_phone"`
	ClientEmail *string `json:"client_email,omitempty"`
	EventDate   string  `json:"event_date"`
	ServiceType string  `json:"service_type"`
	NumPeople   int     `json:"num_people"`
	Location    *string `json:"location,omitempty"`
	City        *string `json:"city,omitempty"`
	Notes       *string `json:"notes,omitempty"`
	Products    []struct {
		ProductID string  `json:"product_id"`
		Quantity  float64 `json:"quantity"`
	} `json:"products"`
}

// SubmitForm processes a public event form submission.
// Creates a Client + Event + EventProducts in a single transaction, then marks the link as used.
// POST /api/public/event-forms/{token}
func (h *EventFormHandler) SubmitForm(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	link, err := h.linkRepo.GetByToken(r.Context(), token)
	if err != nil {
		writeJSON(w, http.StatusGone, map[string]string{
			"error":   "link_invalid",
			"message": "Este enlace ya no es válido o ha expirado.",
		})
		return
	}

	var req EventFormSubmission
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate required fields
	if err := h.validateSubmission(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Sanitize inputs
	req.ClientName = sanitizeString(req.ClientName)
	req.ClientPhone = sanitizeString(req.ClientPhone)
	req.ClientEmail = sanitizeOptionalString(req.ClientEmail)
	req.ServiceType = sanitizeString(req.ServiceType)
	req.Location = sanitizeOptionalString(req.Location)
	req.City = sanitizeOptionalString(req.City)
	req.Notes = sanitizeOptionalString(req.Notes)

	// Parse product IDs
	productIDs := make([]uuid.UUID, 0, len(req.Products))
	for _, p := range req.Products {
		id, err := uuid.Parse(p.ProductID)
		if err != nil {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("Invalid product ID: %s", p.ProductID))
			return
		}
		productIDs = append(productIDs, id)
	}

	// Execute everything in a transaction
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		slog.Error("Failed to begin transaction", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to process form")
		return
	}
	defer tx.Rollback(r.Context())

	// Verify product ownership within transaction
	if len(productIDs) > 0 {
		if err := repository.VerifyProductOwnershipTx(r.Context(), tx, link.UserID, productIDs); err != nil {
			writeError(w, http.StatusBadRequest, "One or more selected products are not available")
			return
		}
	}

	// Fetch products to get base_price for event_products
	var productsMap map[uuid.UUID]models.Product
	if len(productIDs) > 0 {
		products, err := repository.GetProductsByUserIDTx(r.Context(), tx, link.UserID, productIDs)
		if err != nil {
			slog.Error("Failed to get products for pricing", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to process form")
			return
		}
		productsMap = make(map[uuid.UUID]models.Product, len(products))
		for _, p := range products {
			productsMap[p.ID] = p
		}
	}

	// Create client
	client := &models.Client{
		UserID: link.UserID,
		Name:   req.ClientName,
		Phone:  req.ClientPhone,
		Email:  req.ClientEmail,
	}
	if err := repository.CreateClientTx(r.Context(), tx, client); err != nil {
		slog.Error("Failed to create client", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to process form")
		return
	}

	// Create event (status: "quoted", amount: 0 — organizer sets later)
	formNotes := "Enviado desde formulario compartible"
	if req.Notes != nil && *req.Notes != "" {
		formNotes = *req.Notes + "\n\n— Enviado desde formulario compartible"
	}
	event := &models.Event{
		UserID:      link.UserID,
		ClientID:    client.ID,
		EventDate:   req.EventDate,
		ServiceType: req.ServiceType,
		NumPeople:   req.NumPeople,
		Status:      "quoted",
		Location:    req.Location,
		City:        req.City,
		Notes:       &formNotes,
	}
	if err := repository.CreateEventTx(r.Context(), tx, event); err != nil {
		slog.Error("Failed to create event", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to process form")
		return
	}

	// Create event products with organizer's base_price
	if len(req.Products) > 0 {
		eventProducts := make([]models.EventProduct, 0, len(req.Products))
		for _, rp := range req.Products {
			pid, _ := uuid.Parse(rp.ProductID)
			product, ok := productsMap[pid]
			if !ok {
				continue
			}
			eventProducts = append(eventProducts, models.EventProduct{
				EventID:   event.ID,
				ProductID: pid,
				Quantity:  rp.Quantity,
				UnitPrice: product.BasePrice,
				Discount:  0,
			})
		}
		if err := repository.CreateEventProductsTx(r.Context(), tx, event.ID, eventProducts); err != nil {
			slog.Error("Failed to create event products", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to process form")
			return
		}
	}

	// Update client stats
	if err := repository.UpdateClientStatsTx(r.Context(), tx, client.ID); err != nil {
		slog.Error("Failed to update client stats", "error", err)
		// Non-critical, continue
	}

	// Mark link as used (atomic — prevents double submission)
	if err := h.linkRepo.MarkUsedTx(r.Context(), tx, link.ID, event.ID, client.ID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeJSON(w, http.StatusConflict, map[string]string{
				"error":   "link_already_used",
				"message": "Este enlace ya fue utilizado.",
			})
			return
		}
		slog.Error("Failed to mark link as used", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to process form")
		return
	}

	// Commit transaction
	if err := tx.Commit(r.Context()); err != nil {
		slog.Error("Failed to commit transaction", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to process form")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"success":   true,
		"message":   "Gracias, tu solicitud ha sido enviada.",
		"event_id":  event.ID,
		"client_id": client.ID,
	})
}

// --- Helpers ---

func (h *EventFormHandler) validateSubmission(req *EventFormSubmission) error {
	if strings.TrimSpace(req.ClientName) == "" {
		return ValidationError{Field: "client_name", Message: "is required"}
	}
	if err := validateStringLength("client_name", req.ClientName, MaxNameLength); err != nil {
		return err
	}
	if strings.TrimSpace(req.ClientPhone) == "" {
		return ValidationError{Field: "client_phone", Message: "is required"}
	}
	if err := validateStringLength("client_phone", req.ClientPhone, MaxPhoneLength); err != nil {
		return err
	}
	if req.ClientEmail != nil {
		if err := validateStringLength("client_email", *req.ClientEmail, MaxEmailLength); err != nil {
			return err
		}
	}
	if strings.TrimSpace(req.EventDate) == "" {
		return ValidationError{Field: "event_date", Message: "is required"}
	}
	// Basic date format validation (YYYY-MM-DD)
	if len(req.EventDate) != 10 || req.EventDate[4] != '-' || req.EventDate[7] != '-' {
		return ValidationError{Field: "event_date", Message: "must be in YYYY-MM-DD format"}
	}
	if strings.TrimSpace(req.ServiceType) == "" {
		return ValidationError{Field: "service_type", Message: "is required"}
	}
	if err := validateStringLength("service_type", req.ServiceType, MaxServiceTypeLength); err != nil {
		return err
	}
	if req.NumPeople < 1 {
		return ValidationError{Field: "num_people", Message: "must be at least 1"}
	}
	if req.Location != nil {
		if err := validateStringLength("location", *req.Location, MaxLocationLength); err != nil {
			return err
		}
	}
	if req.City != nil {
		if err := validateStringLength("city", *req.City, MaxCityLength); err != nil {
			return err
		}
	}
	if req.Notes != nil {
		if err := validateStringLength("notes", *req.Notes, MaxNotesLength); err != nil {
			return err
		}
	}
	// Validate products
	for _, p := range req.Products {
		if strings.TrimSpace(p.ProductID) == "" {
			return ValidationError{Field: "products.product_id", Message: "is required"}
		}
		if p.Quantity < 1 {
			return ValidationError{Field: "products.quantity", Message: "must be at least 1"}
		}
	}
	return nil
}

func (h *EventFormHandler) buildFormURL(token string) string {
	return fmt.Sprintf("%s/form/%s", strings.TrimRight(h.frontendURL, "/"), token)
}

// generateFormToken creates a cryptographically random 64-character hex string (256 bits of entropy).
func generateFormToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return hex.EncodeToString(b), nil
}
