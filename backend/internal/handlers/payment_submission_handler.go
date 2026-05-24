package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// allowedReceiptMIME maps accepted content types to file extensions.
var allowedReceiptMIME = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

type paymentSubmissionReviewStore interface {
	GetSubmissionForUpdate(context.Context, uuid.UUID) (*models.PaymentSubmission, error)
	CreatePayment(context.Context, *models.Payment) error
	AutoConfirmQuotedEventIfDepositCovered(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	UpdateSubmission(context.Context, *models.PaymentSubmission) error
	Commit(context.Context) error
	Rollback(context.Context) error
}

type paymentSubmissionReviewStoreTx struct {
	tx             pgx.Tx
	submissionRepo *repository.PaymentSubmissionRepo
	paymentRepo    *repository.PaymentRepo
	eventRepo      *repository.EventRepo
}

func (s *paymentSubmissionReviewStoreTx) GetSubmissionForUpdate(ctx context.Context, id uuid.UUID) (*models.PaymentSubmission, error) {
	return s.submissionRepo.GetByIDForUpdateTx(ctx, s.tx, id)
}

func (s *paymentSubmissionReviewStoreTx) CreatePayment(ctx context.Context, payment *models.Payment) error {
	return s.paymentRepo.CreateTx(ctx, s.tx, payment)
}

func (s *paymentSubmissionReviewStoreTx) AutoConfirmQuotedEventIfDepositCovered(ctx context.Context, eventID, userID uuid.UUID) (bool, error) {
	return autoConfirmQuotedEventIfDepositCovered(ctx, txEventStatusRepo{repo: s.eventRepo, tx: s.tx}, txPaymentStatusRepo{repo: s.paymentRepo, tx: s.tx}, eventID, userID)
}

func (s *paymentSubmissionReviewStoreTx) UpdateSubmission(ctx context.Context, ps *models.PaymentSubmission) error {
	return s.submissionRepo.UpdateTx(ctx, s.tx, ps)
}

func (s *paymentSubmissionReviewStoreTx) Commit(ctx context.Context) error {
	return s.tx.Commit(ctx)
}

func (s *paymentSubmissionReviewStoreTx) Rollback(ctx context.Context) error {
	return s.tx.Rollback(ctx)
}

type PaymentSubmissionHandler struct {
	repo               *repository.PaymentSubmissionRepo
	paymentRepo        *repository.PaymentRepo
	userRepo           FullUserRepository
	pool               *pgxpool.Pool
	uploadDir          string
	privateReceiptsDir string

	lookupPublicLink func(context.Context, string) (*models.EventPublicLink, error)
	createSubmission func(context.Context, *models.PaymentSubmission) error
	getSubmission    func(context.Context, uuid.UUID) (*models.PaymentSubmission, error)
	beginReviewTx    func(context.Context) (paymentSubmissionReviewStore, error)
}

func NewPaymentSubmissionHandler(repo *repository.PaymentSubmissionRepo, paymentRepo *repository.PaymentRepo, userRepo FullUserRepository, pool *pgxpool.Pool, uploadDir string) *PaymentSubmissionHandler {
	privateReceiptsDir := paymentSubmissionPrivateReceiptsDir(uploadDir)
	if err := os.MkdirAll(privateReceiptsDir, 0o755); err != nil {
		slog.Warn("Failed to prepare private payment receipts directory", "path", privateReceiptsDir, "error", err)
	}
	handler := &PaymentSubmissionHandler{
		repo:               repo,
		paymentRepo:        paymentRepo,
		userRepo:           userRepo,
		pool:               pool,
		uploadDir:          uploadDir,
		privateReceiptsDir: privateReceiptsDir,
	}
	handler.beginReviewTx = func(ctx context.Context) (paymentSubmissionReviewStore, error) {
		tx, err := pool.Begin(ctx)
		if err != nil {
			return nil, err
		}
		return &paymentSubmissionReviewStoreTx{
			tx:             tx,
			submissionRepo: repo,
			paymentRepo:    paymentRepo,
			eventRepo:      repository.NewEventRepo(pool),
		}, nil
	}
	return handler
}

func paymentSubmissionPrivateReceiptsDir(uploadDir string) string {
	if strings.TrimSpace(uploadDir) == "" {
		return filepath.Join(os.TempDir(), "solennix-private-payment-receipts")
	}
	return filepath.Join(filepath.Dir(filepath.Clean(uploadDir)), "private-payment-receipts")
}

func normalizeReceiptFilename(locator string) string {
	trimmed := strings.TrimSpace(locator)
	if trimmed == "" {
		return ""
	}
	return filepath.Base(strings.TrimRight(trimmed, "/"))
}

func (h *PaymentSubmissionHandler) fetchPublicLink(ctx context.Context, token string) (*models.EventPublicLink, error) {
	if h.lookupPublicLink != nil {
		return h.lookupPublicLink(ctx, token)
	}
	return repository.NewEventPublicLinkRepo(h.pool).GetByToken(ctx, token)
}

func (h *PaymentSubmissionHandler) createPaymentSubmission(ctx context.Context, ps *models.PaymentSubmission) error {
	if h.createSubmission != nil {
		return h.createSubmission(ctx, ps)
	}
	return h.repo.Create(ctx, ps)
}

func (h *PaymentSubmissionHandler) fetchSubmission(ctx context.Context, id uuid.UUID) (*models.PaymentSubmission, error) {
	if h.getSubmission != nil {
		return h.getSubmission(ctx, id)
	}
	return h.repo.GetByID(ctx, id)
}

func (h *PaymentSubmissionHandler) receiptDownloadPath(ps *models.PaymentSubmission) *string {
	if ps == nil || ps.ReceiptFileURL == nil {
		return nil
	}
	filename := normalizeReceiptFilename(*ps.ReceiptFileURL)
	if filename == "" {
		return nil
	}
	path := fmt.Sprintf("/payment-submissions/%s/receipt/%s", ps.ID.String(), filename)
	return &path
}

func (h *PaymentSubmissionHandler) decorateSubmissionReceipt(ps *models.PaymentSubmission) {
	if ps == nil {
		return
	}
	ps.ReceiptFileURL = h.receiptDownloadPath(ps)
}

func (h *PaymentSubmissionHandler) decorateSubmissionReceipts(submissions []*models.PaymentSubmission) {
	for _, submission := range submissions {
		h.decorateSubmissionReceipt(submission)
	}
}

func (h *PaymentSubmissionHandler) resolveReceiptFile(locator string) (string, string, bool) {
	filename := normalizeReceiptFilename(locator)
	if filename == "" {
		return "", "", false
	}

	privatePath := filepath.Join(h.privateReceiptsDir, filename)
	if _, err := os.Stat(privatePath); err == nil {
		return privatePath, filename, true
	}

	legacyPath := filepath.Join(h.uploadDir, "receipts", filename)
	if _, err := os.Stat(legacyPath); err == nil {
		return legacyPath, filename, true
	}

	return "", filename, false
}

func isExpiredPublicLink(link *models.EventPublicLink) bool {
	return link != nil && link.ExpiresAt != nil && time.Now().After(*link.ExpiresAt)
}

func removeReceiptFile(path string) {
	if strings.TrimSpace(path) == "" {
		return
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		slog.Warn("Failed to remove orphaned payment receipt file", "path", path, "error", err)
	}
}

// CreatePublicRequest for client submitting payment from portal
type CreatePublicPaymentRequest struct {
	EventID     uuid.UUID `json:"event_id"`
	ClientID    uuid.UUID `json:"client_id"`
	Amount      float64   `json:"amount"`
	TransferRef *string   `json:"transfer_ref,omitempty"`
}

// CreatePublic handles POST /api/public/events/{token}/payment-submissions (client portal)
// Client submits transfer payment with optional receipt file via multipart form.
func (h *PaymentSubmissionHandler) CreatePublic(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := r.PathValue("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	// Validate the public link before any multipart parsing or receipt temp-file work.
	link, err := h.fetchPublicLink(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Invalid or expired link")
			return
		}
		slog.Error("Failed to look up payment submission public link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to validate link")
		return
	}

	if link.Status != "active" {
		writeError(w, http.StatusGone, "This link is no longer active")
		return
	}
	if isExpiredPublicLink(link) {
		writeError(w, http.StatusGone, "This link has expired")
		return
	}

	// Parse request body (multipart form for file upload) only after link validation succeeds.
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB limit
		writeError(w, http.StatusBadRequest, "Failed to parse form data")
		return
	}

	eventIDStr := r.FormValue("event_id")
	clientIDStr := r.FormValue("client_id")
	amount := r.FormValue("amount")
	transferRef := r.FormValue("transfer_ref")

	if eventIDStr == "" || clientIDStr == "" || amount == "" {
		writeError(w, http.StatusBadRequest, "event_id, client_id, and amount are required")
		return
	}

	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event_id")
		return
	}

	clientID, err := uuid.Parse(clientIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client_id")
		return
	}

	var amountFloat float64
	_, err = fmt.Sscanf(amount, "%f", &amountFloat)
	if err != nil || amountFloat <= 0 {
		writeError(w, http.StatusBadRequest, "amount must be a positive number")
		return
	}

	if link.EventID != eventID {
		writeError(w, http.StatusBadRequest, "Event ID mismatch")
		return
	}

	// Parse receipt file if provided (optional)
	var receiptFileURL *string
	var receiptFilePath string
	file, fileHeader, fileErr := r.FormFile("receipt_file")
	if fileErr == nil {
		defer file.Close()

		buf := make([]byte, 512)
		n, err := file.Read(buf)
		if err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, "Failed to read uploaded file")
			return
		}
		detectedMIME := http.DetectContentType(buf[:n])
		ext, mimeOK := allowedReceiptMIME[detectedMIME]
		if !mimeOK {
			lowerName := strings.ToLower(fileHeader.Filename)
			for _, candidateExt := range allowedReceiptMIME {
				if strings.HasSuffix(lowerName, candidateExt) {
					ext = candidateExt
					mimeOK = true
					break
				}
			}
		}
		if !mimeOK {
			writeError(w, http.StatusBadRequest, "receipt_file must be jpeg, png, webp, or pdf")
			return
		}

		if fileHeader.Size > 10<<20 {
			writeError(w, http.StatusBadRequest, "receipt_file must be 10 MB or smaller")
			return
		}

		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		dstPath := filepath.Join(h.privateReceiptsDir, filename)

		dst, err := os.Create(dstPath)
		receiptFilePath = dstPath
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to save receipt file")
			return
		}
		defer dst.Close()

		if _, err := dst.Write(buf[:n]); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to write receipt file")
			return
		}
		if _, err := io.Copy(dst, file); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to write receipt file")
			return
		}

		receiptFileURL = &filename
	}

	ps := &models.PaymentSubmission{
		EventID:        eventID,
		ClientID:       clientID,
		UserID:         link.UserID,
		Amount:         amountFloat,
		TransferRef:    &transferRef,
		ReceiptFileURL: receiptFileURL,
		Status:         "pending",
	}

	if err := h.createPaymentSubmission(ctx, ps); err != nil {
		removeReceiptFile(receiptFilePath)
		writeError(w, http.StatusInternalServerError, "Failed to create submission")
		return
	}

	h.decorateSubmissionReceipt(ps)

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"data": ps,
	})
}

// GetHistoryPublic handles GET /api/public/events/{token}/payment-submissions (client portal - history)
func (h *PaymentSubmissionHandler) GetHistoryPublic(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := r.PathValue("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	eventIDStr := r.URL.Query().Get("event_id")
	clientIDStr := r.URL.Query().Get("client_id")

	if eventIDStr == "" || clientIDStr == "" {
		writeError(w, http.StatusBadRequest, "event_id and client_id query params required")
		return
	}

	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event_id")
		return
	}

	clientID, err := uuid.Parse(clientIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client_id")
		return
	}

	link, err := h.fetchPublicLink(ctx, token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Invalid or expired link")
			return
		}
		slog.Error("Failed to look up payment submission history public link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to validate link")
		return
	}

	if link.Status != "active" {
		writeError(w, http.StatusGone, "This link is no longer active")
		return
	}
	if isExpiredPublicLink(link) {
		writeError(w, http.StatusGone, "This link has expired")
		return
	}

	if link.EventID != eventID {
		writeError(w, http.StatusBadRequest, "Event ID mismatch")
		return
	}

	submissions, err := h.repo.GetHistoryByClientEventID(ctx, clientID, eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch submissions")
		return
	}

	if submissions == nil {
		submissions = make([]*models.PaymentSubmission, 0)
	}

	h.decorateSubmissionReceipts(submissions)

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": submissions})
}

// GetPendingOrganizerInbox handles GET /api/payment-submissions (organizer review inbox)
func (h *PaymentSubmissionHandler) requireOrganizerReceiptAccess(w http.ResponseWriter, ctx context.Context, userID uuid.UUID) bool {
	organizer, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load organizer")
		return false
	}
	if !FeatureAvailable(organizer.Plan, "payment_submissions") || !IsPlanActive(organizer) {
		writeError(w, http.StatusForbidden, "This is a Pro-exclusive feature. Upgrade to review payment submissions.")
		return false
	}
	return true
}

func (h *PaymentSubmissionHandler) GetPendingOrganizerInbox(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if !h.requireOrganizerReceiptAccess(w, ctx, userID) {
		return
	}

	submissions, err := h.repo.GetPendingByOrganizerID(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch submissions")
		return
	}

	if submissions == nil {
		submissions = make([]*models.PaymentSubmission, 0)
	}

	h.decorateSubmissionReceipts(submissions)

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": submissions})
}

// GetReceipt handles GET /api/payment-submissions/{id}/receipt/{filename} (organizer-only access)
func (h *PaymentSubmissionHandler) GetReceipt(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	if !h.requireOrganizerReceiptAccess(w, ctx, userID) {
		return
	}

	submissionID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid submission ID")
		return
	}

	ps, err := h.fetchSubmission(ctx, submissionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Submission not found")
		return
	}

	if ps.UserID != userID {
		writeError(w, http.StatusForbidden, "You do not have permission to access this receipt")
		return
	}

	if ps.ReceiptFileURL == nil {
		writeError(w, http.StatusNotFound, "Receipt not found")
		return
	}

	filePath, filename, ok := h.resolveReceiptFile(*ps.ReceiptFileURL)
	if !ok {
		writeError(w, http.StatusNotFound, "Receipt not found")
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	http.ServeFile(w, r, filePath)
}

// ReviewRequest for approving/rejecting a submission
type ReviewRequest struct {
	Status          string  `json:"status"` // "approved" | "rejected"
	RejectionReason *string `json:"rejection_reason,omitempty"`
}

// ReviewSubmission handles PATCH /api/payment-submissions/{id} (approve/reject)
func (h *PaymentSubmissionHandler) ReviewSubmission(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	submissionID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid submission ID")
		return
	}

	var req ReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Status != "approved" && req.Status != "rejected" {
		writeError(w, http.StatusBadRequest, "status must be 'approved' or 'rejected'")
		return
	}
	if req.Status == "rejected" && (req.RejectionReason == nil || strings.TrimSpace(*req.RejectionReason) == "") {
		writeError(w, http.StatusBadRequest, "rejection_reason is required when rejecting a submission")
		return
	}
	if h.beginReviewTx == nil {
		writeError(w, http.StatusInternalServerError, "Failed to start review transaction")
		return
	}

	reviewStore, err := h.beginReviewTx(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to start review transaction")
		return
	}
	defer func() {
		_ = reviewStore.Rollback(ctx)
	}()

	ps, err := reviewStore.GetSubmissionForUpdate(ctx, submissionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Submission not found")
			return
		}
		slog.Error("Failed to lock payment submission for review", "submission_id", submissionID, "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load submission")
		return
	}

	// Verify organizer ownership
	if ps.UserID != userID {
		writeError(w, http.StatusForbidden, "You do not have permission to review this submission")
		return
	}

	// Idempotency guard: only pending submissions can be reviewed.
	if ps.Status != "pending" {
		writeError(w, http.StatusConflict, "Submission has already been reviewed")
		return
	}

	ps.Status = req.Status
	ps.ReviewedBy = &userID
	now := time.Now()
	ps.ReviewedAt = &now
	ps.RejectionReason = req.RejectionReason
	ps.LinkedPaymentID = nil

	// If approved, create Payment row and auto-confirm in the same transaction.
	if req.Status == "approved" {
		payment := &models.Payment{
			EventID:       ps.EventID,
			UserID:        ps.UserID,
			Amount:        ps.Amount,
			PaymentDate:   time.Now().Format("2006-01-02"),
			PaymentMethod: "transfer", // Always "transfer" for submissions
			Notes:         ps.TransferRef,
		}

		if err := reviewStore.CreatePayment(ctx, payment); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to create payment record")
			return
		}

		ps.LinkedPaymentID = &payment.ID

		if _, err := reviewStore.AutoConfirmQuotedEventIfDepositCovered(ctx, ps.EventID, ps.UserID); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to update event status")
			return
		}

		// TODO: Emit notifications (client/organizer)
		// TODO: Update AuditLog
	}

	if err := reviewStore.UpdateSubmission(ctx, ps); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update submission")
		return
	}

	if err := reviewStore.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to finalize submission review")
		return
	}

	h.decorateSubmissionReceipt(ps)

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": ps})
}
