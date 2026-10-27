package handlers

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/netip"
	"net/url"
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

// logoDeniedPrefixes are non-routable or sensitive ranges that isPublicIP
// does not cover on its own (documentation, CGNAT, protocol assignments).
var logoDeniedPrefixes = []netip.Prefix{
	netip.MustParsePrefix("192.0.2.0/24"),
	netip.MustParsePrefix("198.51.100.0/24"),
	netip.MustParsePrefix("203.0.113.0/24"),
	netip.MustParsePrefix("2001:db8::/32"),
	netip.MustParsePrefix("100.64.0.0/10"),
	netip.MustParsePrefix("192.0.0.0/24"),
}

// isPublicIP reports whether ip is a globally reachable unicast address.
func isPublicIP(ip netip.Addr) bool {
	if !ip.IsValid() || ip.IsPrivate() || ip.IsLoopback() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() ||
		ip.IsMulticast() || ip.IsUnspecified() || ip.IsInterfaceLocalMulticast() {
		return false
	}
	for _, p := range logoDeniedPrefixes {
		if p.Contains(ip) {
			return false
		}
	}
	return true
}

// checkLogoFetchTarget enforces the fetch policy for a logo URL: http(s)
// scheme only, no embedded credentials, and a host that resolves exclusively
// to public addresses. The DNS check stops direct internal targets; a
// resolver race between check and connect (DNS rebinding) is out of scope.
func checkLogoFetchTarget(target *url.URL) error {
	if target == nil {
		return fmt.Errorf("empty logo URL")
	}
	if target.Scheme != "http" && target.Scheme != "https" {
		return fmt.Errorf("logo URL scheme %q is not allowed", target.Scheme)
	}
	if target.Host == "" {
		return fmt.Errorf("logo URL has no host")
	}
	if target.User != nil {
		return fmt.Errorf("logo URL must not embed credentials")
	}
	if logoFetchAllowPrivateHosts {
		return nil
	}
	host := target.Hostname()
	// Literal IP fast path (no DNS needed).
	if ip, err := netip.ParseAddr(host); err == nil {
		if !isPublicIP(ip) {
			return fmt.Errorf("logo URL host %q is not public", host)
		}
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	addrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil || len(addrs) == 0 {
		return fmt.Errorf("logo URL host %q does not resolve", host)
	}
	for _, a := range addrs {
		ip, _ := netip.AddrFromSlice(a.IP.To16())
		if !isPublicIP(ip.Unmap()) {
			return fmt.Errorf("logo URL host %q resolves to a non-public address", host)
		}
	}
	return nil
}

// fetchLogoBytes downloads logo bytes from a URL. Returns nil (no error) when
// the URL is empty or the download fails — logo is optional.
//
// logoFetchAllowPrivateHosts is a test-only hook: production must keep it
// false so the fetch can never reach loopback/private/link-local targets.
var logoFetchAllowPrivateHosts bool

// maxLogoFetchBytes caps a single remote logo download (memory DoS guard).
const maxLogoFetchBytes = 5 << 20

// maxLocalLogoBytes caps a single local logo read.
const maxLocalLogoBytes = 10 << 20

func fetchLogoBytes(logoURL string) []byte {
	if logoURL == "" {
		return nil
	}
	target, err := url.Parse(logoURL)
	if err != nil {
		slog.Warn("pdf: logo URL unparseable", "url", logoURL, "err", err)
		return nil
	}
	if err := checkLogoFetchTarget(target); err != nil {
		slog.Warn("pdf: logo URL rejected by fetch policy", "url", logoURL, "err", err)
		return nil
	}
	client := &http.Client{
		Timeout: 10 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return fmt.Errorf("stopped after 3 logo redirects")
			}
			return checkLogoFetchTarget(req.URL)
		},
	}
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
	b, err := io.ReadAll(io.LimitReader(resp.Body, maxLogoFetchBytes+1))
	if err != nil {
		slog.Warn("pdf: failed to read logo body", "url", logoURL, "err", err)
		return nil
	}
	if int64(len(b)) > maxLogoFetchBytes {
		slog.Warn("pdf: logo body exceeds size cap", "url", logoURL, "bytes", len(b))
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
	extras, err := h.eventRepo.GetExtras(r.Context(), ctx.eventID)
	if err != nil {
		slog.Error("pdf: get extras", "event_id", ctx.eventID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load event extras")
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
		Extras:    extras,
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

// GetQuickQuotePDF handles POST /quick-quotes/pdf
// The payload carries an ad-hoc quote assembled by the client; the backend
// recalculates totals and renders it through the shared budget generator.
func (h *PDFHandler) GetQuickQuotePDF(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req quickQuotePDFRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.Products) == 0 && len(req.Extras) == 0 {
		writeError(w, http.StatusBadRequest, "At least one product or extra is required")
		return
	}

	profile, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		slog.Error("pdf: quick quote profile not found", "user_id", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load profile")
		return
	}

	event, products, extras, client := req.toPDFData(userID)
	data, err := pdf.GenerateBudget(pdf.BudgetData{
		Event:     event,
		Client:    client,
		Profile:   profile,
		Products:  products,
		Extras:    extras,
		LogoBytes: h.logoURLToBytes(profile),
	})
	if err != nil {
		slog.Error("pdf: generate quick quote", "user_id", userID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}

	servePDF(w, safeFilename("cotizacion_rapida", "presupuesto"), data)
}

type quickQuotePDFRequest struct {
	Client          *quickQuotePDFClient   `json:"client"`
	Products        []quickQuotePDFProduct `json:"products"`
	Extras          []quickQuotePDFExtra   `json:"extras"`
	NumPeople       int                    `json:"num_people"`
	Discount        float64                `json:"discount"`
	DiscountType    string                 `json:"discount_type"`
	RequiresInvoice bool                   `json:"requires_invoice"`
	TaxRate         float64                `json:"tax_rate"`
}

type quickQuotePDFClient struct {
	Name  string  `json:"name"`
	Phone string  `json:"phone"`
	Email *string `json:"email,omitempty"`
}

type quickQuotePDFProduct struct {
	ProductID string  `json:"product_id,omitempty"`
	Name      string  `json:"name"`
	Quantity  float64 `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
	Discount  float64 `json:"discount"`
}

type quickQuotePDFExtra struct {
	Description    string  `json:"description"`
	Cost           float64 `json:"cost"`
	Price          float64 `json:"price"`
	ExcludeUtility bool    `json:"exclude_utility"`
}

func (req quickQuotePDFRequest) toPDFData(userID uuid.UUID) (models.Event, []models.EventProduct, []models.EventExtra, *models.Client) {
	now := time.Now()
	normalizedDiscountType := req.DiscountType
	if normalizedDiscountType != "percent" && normalizedDiscountType != "fixed" {
		normalizedDiscountType = "percent"
	}

	products := make([]models.EventProduct, 0, len(req.Products))
	productsSubtotal := 0.0
	for _, product := range req.Products {
		if product.Quantity <= 0 {
			continue
		}
		lineTotal := (product.UnitPrice - product.Discount) * product.Quantity
		name := product.Name
		products = append(products, models.EventProduct{
			ID:         uuid.Nil,
			EventID:    uuid.Nil,
			ProductID:  uuid.Nil,
			Quantity:   product.Quantity,
			UnitPrice:  product.UnitPrice,
			Discount:   product.Discount,
			TotalPrice: lineTotal,
			CreatedAt:  now,
			ProductName: func() *string {
				if name == "" {
					return nil
				}
				return &name
			}(),
		})
		productsSubtotal += lineTotal
	}

	extras := make([]models.EventExtra, 0, len(req.Extras))
	normalExtrasTotal := 0.0
	passThroughExtrasTotal := 0.0
	for _, extra := range req.Extras {
		if strings.TrimSpace(extra.Description) == "" {
			continue
		}
		extras = append(extras, models.EventExtra{
			ID:                 uuid.Nil,
			EventID:            uuid.Nil,
			Description:        extra.Description,
			Cost:               extra.Cost,
			Price:              extra.Price,
			ExcludeUtility:     extra.ExcludeUtility,
			IncludeInChecklist: false,
			CreatedAt:          now,
		})
		if extra.ExcludeUtility {
			passThroughExtrasTotal += extra.Price
		} else {
			normalExtrasTotal += extra.Price
		}
	}

	discountableBase := productsSubtotal + normalExtrasTotal
	discountAmount := req.Discount
	if normalizedDiscountType == "percent" {
		discountAmount = discountableBase * req.Discount / 100
	} else if discountAmount > discountableBase {
		discountAmount = discountableBase
	}

	baseTotal := (discountableBase - discountAmount) + passThroughExtrasTotal
	taxAmount := 0.0
	if req.RequiresInvoice {
		taxAmount = baseTotal * req.TaxRate / 100
	}

	var client *models.Client
	if req.Client != nil && strings.TrimSpace(req.Client.Name) != "" {
		client = &models.Client{
			ID:        uuid.Nil,
			UserID:    userID,
			Name:      req.Client.Name,
			Phone:     req.Client.Phone,
			Email:     req.Client.Email,
			CreatedAt: now,
			UpdatedAt: now,
		}
	}

	event := models.Event{
		ID:              uuid.Nil,
		UserID:          userID,
		ClientID:        uuid.Nil,
		EventDate:       now.Format("2006-01-02"),
		ServiceType:     "Cotizacion Rapida",
		NumPeople:       req.NumPeople,
		Status:          "quoted",
		Discount:        req.Discount,
		DiscountType:    normalizedDiscountType,
		RequiresInvoice: req.RequiresInvoice,
		TaxRate:         req.TaxRate,
		TaxAmount:       taxAmount,
		TotalAmount:     baseTotal + taxAmount,
		CreatedAt:       now,
		UpdatedAt:       now,
		Client:          client,
	}

	return event, products, extras, client
}

// logoURLToBytes resolves logo bytes from the profile's LogoURL.
// Handles both relative local paths (/api/uploads/... or /api/v1/uploads/...)
// and absolute URLs (S3/CDN). Returns nil when no logo is configured.
func (h *PDFHandler) logoURLToBytes(profile *models.User) []byte {
	if profile == nil || profile.LogoURL == nil || *profile.LogoURL == "" {
		slog.Info("pdf: logo debug — no logo_url on profile")
		return nil
	}
	logoURL := *profile.LogoURL
	slog.Info("pdf: logo debug — logo_url", "url", logoURL, "uploadDir", h.uploadDir)

	// Relative URL → local filesystem (e.g. "/api/uploads/{userID}/file.jpg"
	// or "/api/v1/uploads/{userID}/file.jpg")
	for _, prefix := range []string{"/api/v1/uploads/", "/api/uploads/"} {
		if strings.HasPrefix(logoURL, prefix) {
			relPath := strings.TrimPrefix(logoURL, prefix)
			filePath := filepath.Join(h.uploadDir, relPath)
			// Containment: the cleaned path must stay inside uploadDir —
			// Join+Cleans alone still escapes on "../" segments.
			absBase, errBase := filepath.Abs(h.uploadDir)
			absFile, errFile := filepath.Abs(filePath)
			if errBase != nil || errFile != nil || (absFile != absBase && !strings.HasPrefix(absFile, absBase+string(os.PathSeparator))) {
				slog.Warn("pdf: local logo path escapes upload dir", "url", logoURL)
				return nil
			}
			if st, err := os.Stat(absFile); err != nil || st.IsDir() || st.Size() > maxLocalLogoBytes {
				slog.Warn("pdf: local logo unavailable or oversized", "path", absFile, "err", err)
				return nil
			}
			b, err := os.ReadFile(absFile)
			if err != nil {
				slog.Warn("pdf: failed to read local logo", "path", absFile, "err", err)
				return nil
			}
			return b
		}
	}

	// Absolute URL (S3 / CDN) → HTTP GET
	slog.Info("pdf: logo debug — treating as absolute URL, fetching via HTTP")
	b := fetchLogoBytes(logoURL)
	slog.Info("pdf: logo debug — HTTP fetch result", "bytes_nil", b == nil, "bytes_len", len(b))
	return b
}
