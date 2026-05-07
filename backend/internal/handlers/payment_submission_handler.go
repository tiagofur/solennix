package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
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

type PaymentSubmissionHandler struct {
	repo        *repository.PaymentSubmissionRepo
	paymentRepo *repository.PaymentRepo
	pool        *pgxpool.Pool
	uploadDir   string
}

func NewPaymentSubmissionHandler(repo *repository.PaymentSubmissionRepo, paymentRepo *repository.PaymentRepo, pool *pgxpool.Pool, uploadDir string) *PaymentSubmissionHandler {
	receiptsDir := filepath.Join(uploadDir, "receipts")
	if err := os.MkdirAll(receiptsDir, 0755); err != nil {
		// Non-fatal: log and continue; uploads will fail at runtime if dir missing.
		_ = err
	}
	return &PaymentSubmissionHandler{repo: repo, paymentRepo: paymentRepo, pool: pool, uploadDir: uploadDir}
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

	// Parse request body (multipart form for file upload)
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

	// Parse receipt file if provided (optional)
	var receiptFileURL *string
	file, fileHeader, fileErr := r.FormFile("receipt_file")
	if fileErr == nil {
		defer file.Close()

		// Validate MIME type by reading the first 512 bytes.
		buf := make([]byte, 512)
		n, err := file.Read(buf)
		if err != nil && err != io.EOF {
			writeError(w, http.StatusBadRequest, "Failed to read uploaded file")
			return
		}
		detectedMIME := http.DetectContentType(buf[:n])
		// Normalise: http.DetectContentType returns "image/jpeg" etc., but PDF
		// may be detected as "application/octet-stream" — fall back to extension.
		ext, mimeOK := allowedReceiptMIME[detectedMIME]
		if !mimeOK {
			// Try extension as secondary signal (e.g. PDF).
			lowerName := strings.ToLower(fileHeader.Filename)
			for mime, e := range allowedReceiptMIME {
				if strings.HasSuffix(lowerName, e) {
					ext = e
					_ = mime
					mimeOK = true
					break
				}
			}
		}
		if !mimeOK {
			writeError(w, http.StatusBadRequest, "receipt_file must be jpeg, png, webp, or pdf")
			return
		}

		// Validate size (already capped by ParseMultipartForm, but double-check header).
		if fileHeader.Size > 10<<20 {
			writeError(w, http.StatusBadRequest, "receipt_file must be 10 MB or smaller")
			return
		}

		// Save to {uploadDir}/receipts/{uuid}{ext}
		receiptsDir := filepath.Join(h.uploadDir, "receipts")
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		dstPath := filepath.Join(receiptsDir, filename)

		dst, err := os.Create(dstPath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to save receipt file")
			return
		}
		defer dst.Close()

		// Write the already-read buffer, then copy the rest.
		if _, err := dst.Write(buf[:n]); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to write receipt file")
			return
		}
		if _, err := io.Copy(dst, file); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to write receipt file")
			return
		}

		url := "/api/uploads/receipts/" + filename
		receiptFileURL = &url
	}

	// Validate event public link
	eventPublicLinkRepo := repository.NewEventPublicLinkRepo(h.pool)
	link, err := eventPublicLinkRepo.GetByToken(ctx, token)
	if err != nil {
		writeError(w, http.StatusNotFound, "Invalid or expired link")
		return
	}

	if link.Status != "active" {
		writeError(w, http.StatusGone, "Link is no longer active")
		return
	}

	// Verify event ID matches
	if link.EventID != eventID {
		writeError(w, http.StatusBadRequest, "Event ID mismatch")
		return
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

	if err := h.repo.Create(ctx, ps); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create submission")
		return
	}

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

	// Validate event public link
	eventPublicLinkRepo := repository.NewEventPublicLinkRepo(h.pool)
	link, err := eventPublicLinkRepo.GetByToken(ctx, token)
	if err != nil {
		writeError(w, http.StatusNotFound, "Invalid or expired link")
		return
	}

	if link.Status != "active" {
		writeError(w, http.StatusGone, "Link is no longer active")
		return
	}

	// Verify event ID matches
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

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": submissions})
}

// GetPendingOrganizerInbox handles GET /api/payment-submissions (organizer review inbox)
func (h *PaymentSubmissionHandler) GetPendingOrganizerInbox(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	submissions, err := h.repo.GetPendingByOrganizerID(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch submissions")
		return
	}

	if submissions == nil {
		submissions = make([]*models.PaymentSubmission, 0)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": submissions})
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

	ps, err := h.repo.GetByID(ctx, submissionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Submission not found")
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

	// If approved, create Payment row
	if req.Status == "approved" {
		eventRepo := repository.NewEventRepo(h.pool)
		_, err := eventRepo.GetByID(ctx, ps.UserID, ps.EventID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Event not found")
			return
		}

		payment := &models.Payment{
			EventID:       ps.EventID,
			UserID:        ps.UserID,
			Amount:        ps.Amount,
			PaymentDate:   time.Now().Format("2006-01-02"),
			PaymentMethod: "transfer", // Always "transfer" for submissions
			Notes:         ps.TransferRef,
		}

		if err := h.paymentRepo.Create(ctx, payment); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to create payment record")
			return
		}

		ps.LinkedPaymentID = &payment.ID

		// TODO: Emit notifications (client/organizer)
		// TODO: Update AuditLog
	}

	if err := h.repo.Update(ctx, ps); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update submission")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"data": ps})
}
