package handlers

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/pdf"
)

// eventCtx holds the resolved context for a PDF request.
type eventCtx struct {
	userID  uuid.UUID
	eventID uuid.UUID
	event   *models.Event
	client  *models.Client
	profile *models.User
}

// PDFHandler serves authenticated PDF downloads for all supported event document types.
// Endpoints are scoped to /events/{id}/pdf/{type} so ownership is enforced at the
// event level (the event belongs to the authenticated user).
type PDFHandler struct {
	eventRepo   FullEventRepository
	clientRepo  ClientRepository
	paymentRepo FullPaymentRepository
	userRepo    FullUserRepository
	uploadDir   string // base dir for local uploads (resolves relative logo URLs)
}

func NewPDFHandler(
	eventRepo FullEventRepository,
	clientRepo ClientRepository,
	paymentRepo FullPaymentRepository,
	userRepo FullUserRepository,
	uploadDir string,
) *PDFHandler {
	return &PDFHandler{
		eventRepo:   eventRepo,
		clientRepo:  clientRepo,
		paymentRepo: paymentRepo,
		userRepo:    userRepo,
		uploadDir:   uploadDir,
	}
}

// servePDF is a helper that writes PDF bytes as a download response.
func servePDF(w http.ResponseWriter, filename string, data []byte) {
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// fetchLogoBytes downloads logo bytes from a URL. Returns nil (no error) when
// the URL is empty or the download fails — logo is optional.
func fetchLogoBytes(logoURL string) []byte {
	if logoURL == "" {
		return nil
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(logoURL) //nolint:noctx
	if err != nil {
		slog.Warn("pdf: failed to fetch logo", "url", logoURL, "err", err)
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		slog.Warn("pdf: logo fetch non-200", "url", logoURL, "status", resp.StatusCode)
		return nil
	}
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Warn("pdf: failed to read logo body", "url", logoURL, "err", err)
		return nil
	}
	return b
}

// loadEventContext fetches the event + client + profile for the authenticated user.
// Returns (ctx, ok). Writes the error response on failure.
func (h *PDFHandler) loadEventContext(w http.ResponseWriter, r *http.Request) (eventCtx, bool) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return eventCtx{}, false
	}

	event, err := h.eventRepo.GetByID(r.Context(), eventID, userID)
	if err != nil {
		slog.Error("pdf: event not found", "event_id", eventID, "user_id", userID, "error", err)
		writeError(w, http.StatusNotFound, "Event not found")
		return eventCtx{}, false
	}

	var client *models.Client
	if event.Client != nil {
		client = event.Client
	} else {
		c, err := h.clientRepo.GetByID(r.Context(), event.ClientID, userID)
		if err == nil {
			client = c
		}
	}

	profile, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		slog.Error("pdf: profile not found", "user_id", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load profile")
		return eventCtx{}, false
	}

	return eventCtx{
		userID:  userID,
		eventID: eventID,
		event:   event,
		client:  client,
		profile: profile,
	}, true
}

// supplyToIngredients maps EventSupply records to ProductIngredient shape so the
// shopping list PDF generator can render them uniformly.
func supplyToIngredients(supplies []models.EventSupply) []models.ProductIngredient {
	out := make([]models.ProductIngredient, 0, len(supplies))
	for _, s := range supplies {
		ing := models.ProductIngredient{
			InventoryID:      s.InventoryID,
			QuantityRequired: s.Quantity,
			IngredientName:   s.SupplyName,
			Unit:             s.Unit,
		}
		out = append(out, ing)
	}
	return out
}

// safeFilename builds a safe ASCII filename from a service type and suffix.
func safeFilename(serviceType, suffix string) string {
	name := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		if r == ' ' {
			return '_'
		}
		return -1
	}, serviceType)
	if name == "" {
		name = "evento"
	}
	return name + "_" + suffix + ".pdf"
}

// GetBudgetPDF handles GET /events/{id}/pdf/budget
func (h *PDFHandler) GetBudgetPDF(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.loadEventContext(w, r)
	if !ok {
		return
	}

	products, err := h.eventRepo.GetProducts(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get products", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load event products")
		return
	}
	extras, err := h.eventRepo.GetExtras(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get extras", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load event extras")
		return
	}

	data, err := pdf.GenerateBudget(pdf.BudgetData{
		Event:     *ctx.event,
		Client:    ctx.client,
		Profile:   ctx.profile,
		Products:  products,
		Extras:    extras,
		LogoBytes: h.logoURLToBytes(ctx.profile),
	})
	if err != nil {
		slog.Error("pdf: generate budget", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	servePDF(w, safeFilename(ctx.event.ServiceType, "presupuesto"), data)
}

// GetPaymentReportPDF handles GET /events/{id}/pdf/payment-report
func (h *PDFHandler) GetPaymentReportPDF(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.loadEventContext(w, r)
	if !ok {
		return
	}

	payments, err := h.paymentRepo.GetByEventID(r.Context(), ctx.userID, ctx.eventID)
	if err != nil {
		slog.Error("pdf: get payments", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load payments")
		return
	}

	data, err := pdf.GeneratePaymentReport(pdf.PaymentReportData{
		Event:     *ctx.event,
		Client:    ctx.client,
		Profile:   ctx.profile,
		Payments:  payments,
		LogoBytes: h.logoURLToBytes(ctx.profile),
	})
	if err != nil {
		slog.Error("pdf: generate payment report", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	servePDF(w, safeFilename(ctx.event.ServiceType, "reporte_pagos"), data)
}

// GetContractPDF handles GET /events/{id}/pdf/contract
func (h *PDFHandler) GetContractPDF(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.loadEventContext(w, r)
	if !ok {
		return
	}

	products, err := h.eventRepo.GetProducts(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get products", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load event products")
		return
	}
	payments, err := h.paymentRepo.GetByEventID(r.Context(), ctx.userID, ctx.eventID)
	if err != nil {
		slog.Error("pdf: get payments", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load payments")
		return
	}

	data, err := pdf.GenerateContract(pdf.ContractData{
		Event:     *ctx.event,
		Client:    ctx.client,
		Profile:   ctx.profile,
		Products:  products,
		Payments:  payments,
		LogoBytes: h.logoURLToBytes(ctx.profile),
	})
	if err != nil {
		slog.Error("pdf: generate contract", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	servePDF(w, safeFilename(ctx.event.ServiceType, "contrato"), data)
}

// GetShoppingListPDF handles GET /events/{id}/pdf/shopping-list
func (h *PDFHandler) GetShoppingListPDF(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.loadEventContext(w, r)
	if !ok {
		return
	}

	supplies, err := h.eventRepo.GetSupplies(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get supplies", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load supplies")
		return
	}

	// Convert EventSupply to ProductIngredient shape for the PDF generator
	ingredients := supplyToIngredients(supplies)

	data, err := pdf.GenerateShoppingList(pdf.ShoppingListData{
		Event:       *ctx.event,
		Client:      ctx.client,
		Profile:     ctx.profile,
		Ingredients: ingredients,
		LogoBytes:   h.logoURLToBytes(ctx.profile),
	})
	if err != nil {
		slog.Error("pdf: generate shopping list", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	servePDF(w, safeFilename(ctx.event.ServiceType, "lista_insumos"), data)
}

// GetChecklistPDF handles GET /events/{id}/pdf/checklist
func (h *PDFHandler) GetChecklistPDF(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.loadEventContext(w, r)
	if !ok {
		return
	}

	products, err := h.eventRepo.GetProducts(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get products", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load event products")
		return
	}
	extras, err := h.eventRepo.GetExtras(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get extras", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load event extras")
		return
	}
	equipment, err := h.eventRepo.GetEquipment(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get equipment", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load equipment")
		return
	}
	supplies, err := h.eventRepo.GetSupplies(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get supplies", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load supplies")
		return
	}

	data, err := pdf.GenerateChecklist(pdf.ChecklistData{
		Event:     *ctx.event,
		Client:    ctx.client,
		Profile:   ctx.profile,
		Products:  products,
		Extras:    extras,
		Equipment: equipment,
		Supplies:  supplies,
		LogoBytes: h.logoURLToBytes(ctx.profile),
	})
	if err != nil {
		slog.Error("pdf: generate checklist", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	servePDF(w, safeFilename(ctx.event.ServiceType, "checklist"), data)
}

// GetEquipmentListPDF handles GET /events/{id}/pdf/equipment-list
func (h *PDFHandler) GetEquipmentListPDF(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.loadEventContext(w, r)
	if !ok {
		return
	}

	equipment, err := h.eventRepo.GetEquipment(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get equipment", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load equipment")
		return
	}

	data, err := pdf.GenerateEquipmentList(pdf.EquipmentListData{
		Event:     *ctx.event,
		Client:    ctx.client,
		Profile:   ctx.profile,
		Equipment: equipment,
		LogoBytes: h.logoURLToBytes(ctx.profile),
	})
	if err != nil {
		slog.Error("pdf: generate equipment list", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	servePDF(w, safeFilename(ctx.event.ServiceType, "lista_equipo"), data)
}

// logoURLToBytes resolves logo bytes from the profile's LogoURL.
// Handles both relative local paths (/api/uploads/... or /api/v1/uploads/...)
// and absolute URLs (S3/CDN). Returns nil when no logo is configured.
func (h *PDFHandler) logoURLToBytes(profile *models.User) []byte {
	if profile == nil || profile.LogoURL == nil || *profile.LogoURL == "" {
		return nil
	}
	logoURL := *profile.LogoURL

	// Relative URL → local filesystem (e.g. "/api/uploads/{userID}/file.jpg"
	// or "/api/v1/uploads/{userID}/file.jpg")
	for _, prefix := range []string{"/api/v1/uploads/", "/api/uploads/"} {
		if strings.HasPrefix(logoURL, prefix) {
			relPath := strings.TrimPrefix(logoURL, prefix)
			filePath := filepath.Join(h.uploadDir, relPath)
			b, err := os.ReadFile(filepath.Clean(filePath))
			if err != nil {
				slog.Warn("pdf: failed to read local logo", "path", filePath, "err", err)
				return nil
			}
			return b
		}
	}

	// Absolute URL (S3 / CDN) → HTTP GET
	return fetchLogoBytes(logoURL)
}
