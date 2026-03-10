package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestCRUDHandler_Payments(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()

	t.Run("ListPayments_All", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		payments := []models.Payment{{ID: uuid.New(), Amount: 100}}
		mockRepo.On("GetAll", mock.Anything, userID).Return(payments, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/payments", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.ListPayments(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "100")
		mockRepo.AssertExpectations(t)
	})

	t.Run("ListPayments_ByEventID", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		payments := []models.Payment{{ID: uuid.New(), EventID: eventID, Amount: 200}}
		mockRepo.On("GetByEventID", mock.Anything, userID, eventID).Return(payments, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/payments?event_id="+eventID.String(), nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.ListPayments(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "200")
		mockRepo.AssertExpectations(t)
	})

	t.Run("ListPayments_ByDateRange", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		payments := []models.Payment{{ID: uuid.New(), Amount: 300}}
		mockRepo.On("GetByDateRange", mock.Anything, userID, "2026-01-01", "2026-01-31").Return(payments, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/payments?start=2026-01-01&end=2026-01-31", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.ListPayments(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "300")
		mockRepo.AssertExpectations(t)
	})

	t.Run("ListPayments_ByEventIDs", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		eventID2 := uuid.New()
		payments := []models.Payment{{ID: uuid.New(), EventID: eventID, Amount: 400}}
		mockRepo.On("GetByEventIDs", mock.Anything, userID, []uuid.UUID{eventID, eventID2}).Return(payments, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/payments?event_ids="+eventID.String()+","+eventID2.String(), nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.ListPayments(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "400")
		mockRepo.AssertExpectations(t)
	})

	t.Run("CreatePayment_Success", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		paymentBody := models.Payment{
			EventID:       eventID,
			Amount:        1500,
			PaymentMethod: "card",
		}
		mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(p *models.Payment) bool {
			return p.Amount == 1500 && p.UserID == userID
		})).Return(nil)

		body, _ := json.Marshal(paymentBody)
		req := httptest.NewRequest(http.MethodPost, "/api/payments", strings.NewReader(string(body)))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.CreatePayment(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		mockRepo.AssertExpectations(t)
	})

	t.Run("UpdatePayment_Success", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		paymentID := uuid.New()
		paymentBody := models.Payment{
			Amount:        2000,
			PaymentMethod: "transfer",
		}
		mockRepo.On("Update", mock.Anything, userID, mock.MatchedBy(func(p *models.Payment) bool {
			return p.ID == paymentID && p.Amount == 2000
		})).Return(nil)

		body, _ := json.Marshal(paymentBody)
		req := httptest.NewRequest(http.MethodPut, "/api/payments/"+paymentID.String(), strings.NewReader(string(body)))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", paymentID.String())
		rr := httptest.NewRecorder()
		h.UpdatePayment(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		mockRepo.AssertExpectations(t)
	})

	t.Run("DeletePayment_Success", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		paymentID := uuid.New()
		mockRepo.On("Delete", mock.Anything, paymentID, userID).Return(nil)

		req := httptest.NewRequest(http.MethodDelete, "/api/payments/"+paymentID.String(), nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", paymentID.String())
		rr := httptest.NewRecorder()
		h.DeletePayment(rr, req)

		assert.Equal(t, http.StatusNoContent, rr.Code)
		mockRepo.AssertExpectations(t)
	})
}

func TestCRUDHandler_Helpers(t *testing.T) {
	t.Run("normalizeDateParam", func(t *testing.T) {
		val, err := normalizeDateParam("2026-03-10T15:00:00Z")
		assert.NoError(t, err)
		assert.Equal(t, "2026-03-10", val)

		val, err = normalizeDateParam("2026-03-10")
		assert.NoError(t, err)
		assert.Equal(t, "2026-03-10", val)

		_, err = normalizeDateParam("invalid")
		assert.Error(t, err)
	})

	t.Run("splitCSV", func(t *testing.T) {
		res := splitCSV(" a, b ,c,,d ")
		assert.Equal(t, []string{"a", "b", "c", "d"}, res)
	})
}
