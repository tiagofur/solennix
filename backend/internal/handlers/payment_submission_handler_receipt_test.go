package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type paymentSubmissionResponseEnvelope struct {
	Data models.PaymentSubmission `json:"data"`
}

func buildPaymentSubmissionMultipart(t *testing.T, eventID, clientID uuid.UUID, amount string, filename string, content []byte) (*bytes.Buffer, string) {
	t.Helper()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	require.NoError(t, writer.WriteField("event_id", eventID.String()))
	require.NoError(t, writer.WriteField("client_id", clientID.String()))
	require.NoError(t, writer.WriteField("amount", amount))
	require.NoError(t, writer.WriteField("transfer_ref", "SPEI-123"))

	part, err := writer.CreateFormFile("receipt_file", filename)
	require.NoError(t, err)
	_, err = part.Write(content)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	return body, writer.FormDataContentType()
}

func pngFixtureBytes() []byte {
	return []byte{
		0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n',
		0x00, 0x00, 0x00, 0x0d, 'I', 'H', 'D', 'R',
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 'w', 'S', 0xde,
	}
}

func TestPaymentSubmissionCreatePublicLookupFailureResponses(t *testing.T) {
	tests := []struct {
		name           string
		lookupErr      error
		expectedStatus int
	}{
		{name: "not found returns 404", lookupErr: fmt.Errorf("lookup failed: %w", pgx.ErrNoRows), expectedStatus: http.StatusNotFound},
		{name: "backend failure returns 500", lookupErr: errors.New("db unavailable"), expectedStatus: http.StatusInternalServerError},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			uploadDir := t.TempDir()
			handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
			handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
				return nil, tc.lookupErr
			}

			eventID := uuid.New()
			clientID := uuid.New()
			body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
			req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
			req.Header.Set("Content-Type", contentType)
			req.SetPathValue("token", "token-123")
			w := httptest.NewRecorder()

			handler.CreatePublic(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)

			entries, err := os.ReadDir(handler.privateReceiptsDir)
			require.NoError(t, err)
			assert.Empty(t, entries)
		})
	}
}

func TestPaymentSubmissionCreatePublicExpiredLinkReturnsGoneAndDoesNotWriteReceipt(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	organizerID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	expiredAt := time.Now().Add(-time.Hour)

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID:   eventID,
			UserID:    organizerID,
			Status:    "active",
			ExpiresAt: &expiredAt,
		}, nil
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	require.Equal(t, http.StatusGone, w.Code)
	entries, err := os.ReadDir(handler.privateReceiptsDir)
	require.NoError(t, err)
	assert.Empty(t, entries)
}

func TestPaymentSubmissionCreatePublicRevokedLinkReturnsGoneAndDoesNotWriteReceipt(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	clientID := uuid.New()

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "revoked",
		}, nil
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	require.Equal(t, http.StatusGone, w.Code)
	entries, err := os.ReadDir(handler.privateReceiptsDir)
	require.NoError(t, err)
	assert.Empty(t, entries)
}

func TestPaymentSubmissionCreatePublicEventMismatchReturnsBadRequest(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	otherEventID := uuid.New()
	clientID := uuid.New()

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: otherEventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
	entries, err := os.ReadDir(handler.privateReceiptsDir)
	require.NoError(t, err)
	assert.Empty(t, entries)
}

func TestPaymentSubmissionCreatePublicStoresReceiptPrivatelyAndReturnsProtectedPath(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	organizerID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	createdID := uuid.New()
	var storedReceipt string

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  organizerID,
			Status:  "active",
		}, nil
	}
	handler.createSubmission = func(_ context.Context, ps *models.PaymentSubmission) error {
		ps.ID = createdID
		ps.SubmittedAt = time.Now().UTC()
		ps.CreatedAt = ps.SubmittedAt
		ps.UpdatedAt = ps.SubmittedAt
		if ps.ReceiptFileURL != nil {
			storedReceipt = *ps.ReceiptFileURL
		}
		return nil
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	require.Equal(t, http.StatusCreated, w.Code)
	require.NotEmpty(t, storedReceipt)

	privatePath := filepath.Join(handler.privateReceiptsDir, storedReceipt)
	if _, err := os.Stat(privatePath); err != nil {
		t.Fatalf("expected private receipt at %s: %v", privatePath, err)
	}

	publicPath := filepath.Join(uploadDir, "receipts", storedReceipt)
	_, publicErr := os.Stat(publicPath)
	assert.Error(t, publicErr)
	assert.True(t, os.IsNotExist(publicErr))

	var envelope paymentSubmissionResponseEnvelope
	require.NoError(t, json.NewDecoder(w.Body).Decode(&envelope))
	if assert.NotNil(t, envelope.Data.ReceiptFileURL) {
		assert.Equal(t, "/payment-submissions/"+createdID.String()+"/receipt/"+storedReceipt, *envelope.Data.ReceiptFileURL)
	}
}

func TestPaymentSubmissionCreatePublicCreateFailureRemovesOrphanedReceipt(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	organizerID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	var storedReceipt string

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  organizerID,
			Status:  "active",
		}, nil
	}
	handler.createSubmission = func(_ context.Context, ps *models.PaymentSubmission) error {
		if ps.ReceiptFileURL != nil {
			storedReceipt = *ps.ReceiptFileURL
		}
		return errors.New("insert failed")
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	require.Equal(t, http.StatusInternalServerError, w.Code)
	require.NotEmpty(t, storedReceipt)
	_, err := os.Stat(filepath.Join(handler.privateReceiptsDir, storedReceipt))
	require.Error(t, err)
	assert.True(t, os.IsNotExist(err))
	entries, err := os.ReadDir(handler.privateReceiptsDir)
	require.NoError(t, err)
	assert.Empty(t, entries)
}

func TestPaymentSubmissionGetHistoryPublicLookupFailureResponses(t *testing.T) {
	tests := []struct {
		name           string
		lookupErr      error
		expectedStatus int
	}{
		{name: "not found returns 404", lookupErr: fmt.Errorf("lookup failed: %w", pgx.ErrNoRows), expectedStatus: http.StatusNotFound},
		{name: "backend failure returns 500", lookupErr: errors.New("db unavailable"), expectedStatus: http.StatusInternalServerError},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			uploadDir := t.TempDir()
			handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
			eventID := uuid.New()
			clientID := uuid.New()
			handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
				return nil, tc.lookupErr
			}

			req := httptest.NewRequest(http.MethodGet, "/api/public/events/token-123/payment-submissions?event_id="+eventID.String()+"&client_id="+clientID.String(), nil)
			req.SetPathValue("token", "token-123")
			w := httptest.NewRecorder()

			handler.GetHistoryPublic(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)
		})
	}
}

func TestPaymentSubmissionGetHistoryPublicExpiredLinkReturnsGone(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	organizerID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	expiredAt := time.Now().Add(-time.Hour)

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID:   eventID,
			UserID:    organizerID,
			Status:    "active",
			ExpiresAt: &expiredAt,
		}, nil
	}

	req := httptest.NewRequest(http.MethodGet, "/api/public/events/token-123/payment-submissions?event_id="+eventID.String()+"&client_id="+clientID.String(), nil)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.GetHistoryPublic(w, req)

	require.Equal(t, http.StatusGone, w.Code)
}

func TestPaymentSubmissionGetHistoryPublicRevokedLinkReturnsGone(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	clientID := uuid.New()

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "revoked",
		}, nil
	}

	req := httptest.NewRequest(http.MethodGet, "/api/public/events/token-123/payment-submissions?event_id="+eventID.String()+"&client_id="+clientID.String(), nil)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.GetHistoryPublic(w, req)

	require.Equal(t, http.StatusGone, w.Code)
}

func TestPaymentSubmissionGetHistoryPublicEventMismatchReturnsBadRequest(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	otherEventID := uuid.New()
	clientID := uuid.New()

	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: otherEventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}

	req := httptest.NewRequest(http.MethodGet, "/api/public/events/token-123/payment-submissions?event_id="+eventID.String()+"&client_id="+clientID.String(), nil)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.GetHistoryPublic(w, req)

	require.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPaymentSubmissionGetReceiptAuthorizationAndMissingFile(t *testing.T) {
	uploadDir := t.TempDir()
	ownerID := uuid.New()
	submissionID := uuid.New()
	storedReceipt := "receipt-proof.png"

	buildHandler := func(t *testing.T, organizer *models.User) (*PaymentSubmissionHandler, string) {
		t.Helper()
		userRepo := &MockFullUserRepo{}
		userRepo.On("GetByID", mock.Anything, mock.Anything).Return(organizer, nil)
		handler := NewPaymentSubmissionHandler(nil, nil, userRepo, nil, uploadDir)
		privatePath := filepath.Join(handler.privateReceiptsDir, storedReceipt)
		require.NoError(t, os.WriteFile(privatePath, pngFixtureBytes(), 0o644))
		handler.getSubmission = func(_ context.Context, id uuid.UUID) (*models.PaymentSubmission, error) {
			return &models.PaymentSubmission{
				ID:             id,
				UserID:         ownerID,
				ReceiptFileURL: &storedReceipt,
			}, nil
		}
		return handler, privatePath
	}

	activePro := &models.User{ID: ownerID, Plan: "pro"}
	expiredAt := time.Now().Add(-time.Hour)
	expiredPro := &models.User{ID: ownerID, Plan: "pro", PlanExpiresAt: &expiredAt}
	basicPlan := &models.User{ID: ownerID, Plan: "basic"}

	tests := []struct {
		name           string
		requestUserID  uuid.UUID
		organizer      *models.User
		removeFile     bool
		expectedStatus int
	}{
		{name: "owner with active pro plan can download", requestUserID: ownerID, organizer: activePro, expectedStatus: http.StatusOK},
		{name: "different organizer forbidden", requestUserID: uuid.New(), organizer: activePro, expectedStatus: http.StatusForbidden},
		{name: "missing file returns not found", requestUserID: ownerID, organizer: activePro, removeFile: true, expectedStatus: http.StatusNotFound},
		{name: "basic plan organizer forbidden", requestUserID: ownerID, organizer: basicPlan, expectedStatus: http.StatusForbidden},
		{name: "expired paid plan organizer forbidden", requestUserID: ownerID, organizer: expiredPro, expectedStatus: http.StatusForbidden},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			handler, privatePath := buildHandler(t, tc.organizer)
			if tc.removeFile {
				require.NoError(t, os.Remove(privatePath))
			} else if _, err := os.Stat(privatePath); errors.Is(err, os.ErrNotExist) {
				require.NoError(t, os.WriteFile(privatePath, pngFixtureBytes(), 0o644))
			}

			req := httptest.NewRequest(http.MethodGet, "/api/payment-submissions/"+submissionID.String()+"/receipt/"+storedReceipt, nil)
			req.SetPathValue("id", submissionID.String())
			req.SetPathValue("filename", storedReceipt)
			req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, tc.requestUserID))
			w := httptest.NewRecorder()

			handler.GetReceipt(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)
			if tc.expectedStatus == http.StatusOK {
				assert.Equal(t, "no-store", w.Header().Get("Cache-Control"))
				assert.Contains(t, w.Header().Get("Content-Disposition"), storedReceipt)
			}
		})
	}
}
