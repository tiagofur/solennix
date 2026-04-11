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

	t.Run("GetPayment_Success", func(t *testing.T) {
		mockRepo := new(MockFullPaymentRepo)
		h := &CRUDHandler{paymentRepo: mockRepo}

		paymentID := uuid.New()
		payment := &models.Payment{ID: paymentID, EventID: eventID, Amount: 250, PaymentMethod: "card"}
		mockRepo.On("GetByID", mock.Anything, paymentID, userID).Return(payment, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/payments/"+paymentID.String(), nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", paymentID.String())
		rr := httptest.NewRecorder()
		h.GetPayment(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), paymentID.String())
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

func TestCreatePayment_InvalidJSON_Returns400(t *testing.T) {
	mockRepo := new(MockFullPaymentRepo)
	h := &CRUDHandler{paymentRepo: mockRepo}

	req := makeReqWithUserID(http.MethodPost, "/api/payments", `{invalid json`, uuid.New())
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestCreatePayment_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	mockRepo := new(MockFullPaymentRepo)
	h := &CRUDHandler{paymentRepo: mockRepo}

	mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(p *models.Payment) bool {
		return p.UserID == userID
	})).Return(errTest)

	body, _ := json.Marshal(models.Payment{EventID: eventID, Amount: 500, PaymentMethod: "cash"})
	req := makeReqWithUserID(http.MethodPost, "/api/payments", string(body), userID)
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create payment")
	mockRepo.AssertExpectations(t)
}

func TestGetPayment_InvalidUUID_Returns400(t *testing.T) {
	h := &CRUDHandler{}

	req := makeReqWithIDParam(http.MethodGet, "/api/payments/bad", "", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.GetPayment(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid payment ID")
}

func TestGetPayment_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	mockRepo := new(MockFullPaymentRepo)
	h := &CRUDHandler{paymentRepo: mockRepo}

	mockRepo.On("GetByID", mock.Anything, paymentID, userID).Return(nil, errTest)

	req := makeReqWithIDParam(http.MethodGet, "/api/payments/"+paymentID.String(), "", paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetPayment(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Payment not found")
	mockRepo.AssertExpectations(t)
}

func TestDeletePayment_InvalidUUID_Returns400(t *testing.T) {
	h := &CRUDHandler{}

	req := makeReqWithIDParam(http.MethodDelete, "/api/payments/bad", "", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.DeletePayment(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid payment ID")
}

func TestDeletePayment_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	mockRepo := new(MockFullPaymentRepo)
	h := &CRUDHandler{paymentRepo: mockRepo}

	mockRepo.On("Delete", mock.Anything, paymentID, userID).Return(errTest)

	req := makeReqWithIDParam(http.MethodDelete, "/api/payments/"+paymentID.String(), "", paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeletePayment(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Payment not found")
	mockRepo.AssertExpectations(t)
}

func TestCRUDHandler_Helpers(t *testing.T) {
	t.Run("normalizeDateParam_WithTimezone", func(t *testing.T) {
		val, err := normalizeDateParam("2026-03-10T15:00:00Z")
		assert.NoError(t, err)
		assert.Equal(t, "2026-03-10", val)
	})

	t.Run("normalizeDateParam_AlreadyDateOnly", func(t *testing.T) {
		val, err := normalizeDateParam("2026-01-01")
		assert.NoError(t, err)
		assert.Equal(t, "2026-01-01", val)
	})

	t.Run("normalizeDateParam_Invalid", func(t *testing.T) {
		_, err := normalizeDateParam("invalid")
		assert.Error(t, err)
	})

	t.Run("normalizeDateParam_Empty", func(t *testing.T) {
		val, err := normalizeDateParam("")
		assert.NoError(t, err)
		assert.Equal(t, "", val)
	})

	t.Run("splitCSV_Simple", func(t *testing.T) {
		res := splitCSV("a,b,c")
		assert.Equal(t, []string{"a", "b", "c"}, res)
	})

	t.Run("splitCSV_WithSpaces", func(t *testing.T) {
		res := splitCSV("a, b, c")
		assert.Equal(t, []string{"a", "b", "c"}, res)
	})

	t.Run("splitCSV_Empty", func(t *testing.T) {
		res := splitCSV("")
		assert.Empty(t, res)
	})

	t.Run("splitCSV_ComplexWithEmptyElements", func(t *testing.T) {
		res := splitCSV(" a, b ,c,,d ")
		assert.Equal(t, []string{"a", "b", "c", "d"}, res)
	})
}
