package handlers

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestExportAccountingCSV_BasicPlan_Returns403(t *testing.T) {
	userID := uuid.New()
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)

	h := &CRUDHandler{userRepo: userRepo}
	req := makeReqWithUserID(http.MethodGet, "/api/reports/accounting/export", "", userID)
	rr := httptest.NewRecorder()

	h.ExportAccountingCSV(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "Accounting export requires a paid plan")
}

func TestExportAccountingCSV_ProPlan_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	userRepo := new(MockFullUserRepo)
	eventRepo := new(MockFullEventRepo)
	paymentRepo := new(MockFullPaymentRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)

	nowStr := time.Now().Format("2006-01-02")
	events := []models.Event{
		{
			ID:          eventID,
			UserID:      userID,
			ClientID:    clientID,
			EventDate:   nowStr,
			ServiceType: "Banquete Premium",
			NumPeople:   120,
			TotalAmount: 25000.0,
			Currency:    "MXN",
			Status:      "confirmed",
			Client: &models.Client{
				Name:  "Carlos Gomez",
				Phone: "+52 55 1234 5678",
			},
		},
	}

	eventRepo.On("GetAll", mock.Anything, userID).Return(events, nil)
	paymentRepo.On("SumByEventID", mock.Anything, userID, eventID).Return(15000.0, nil)
	eventRepo.On("GetStaff", mock.Anything, eventID).Return([]models.EventStaff{}, nil)

	h := &CRUDHandler{
		userRepo:    userRepo,
		eventRepo:   eventRepo,
		paymentRepo: paymentRepo,
	}

	req := makeReqWithUserID(http.MethodGet, "/api/reports/accounting/export", "", userID)
	rr := httptest.NewRecorder()

	h.ExportAccountingCSV(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "text/csv; charset=utf-8", rr.Header().Get("Content-Type"))
	assert.Contains(t, rr.Header().Get("Content-Disposition"), "attachment; filename=\"solennix_contabilidad_")

	body := rr.Body.Bytes()
	// Must start with UTF-8 BOM \xEF\xBB\xBF
	assert.True(t, bytes.HasPrefix(body, []byte("\xEF\xBB\xBF")))

	bodyStr := string(body)
	assert.Contains(t, bodyStr, "Fecha,ID Evento,Servicio,Cliente")
	assert.Contains(t, bodyStr, "Banquete Premium")
	assert.Contains(t, bodyStr, "Carlos Gomez")
	assert.Contains(t, bodyStr, "25000.00")
	assert.Contains(t, bodyStr, "15000.00")
	assert.Contains(t, bodyStr, "10000.00")
	assert.Contains(t, bodyStr, "Parcial")
}

func TestExportAccountingCSV_WithDateRange(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	userRepo := new(MockFullUserRepo)
	eventRepo := new(MockFullEventRepo)
	paymentRepo := new(MockFullPaymentRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "business"}, nil)

	startDate := "2026-06-01"
	endDate := "2026-06-30"

	events := []models.Event{
		{
			ID:          eventID,
			UserID:      userID,
			EventDate:   "2026-06-15",
			ServiceType: "Graduación",
			NumPeople:   200,
			TotalAmount: 50000.0,
			Currency:    "MXN",
			Status:      "confirmed",
		},
	}

	eventRepo.On("GetByDateRange", mock.Anything, userID, startDate, endDate).Return(events, nil)
	paymentRepo.On("SumByEventID", mock.Anything, userID, eventID).Return(50000.0, nil)
	fee := 1200.0
	eventRepo.On("GetStaff", mock.Anything, eventID).Return([]models.EventStaff{
		{FeeAmount: &fee},
	}, nil)

	h := &CRUDHandler{
		userRepo:    userRepo,
		eventRepo:   eventRepo,
		paymentRepo: paymentRepo,
	}

	req := makeReqWithUserID(http.MethodGet, "/api/reports/accounting/export?start_date="+startDate+"&end_date="+endDate, "", userID)
	rr := httptest.NewRecorder()

	h.ExportAccountingCSV(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	bodyStr := rr.Body.String()
	assert.Contains(t, bodyStr, "Graduación")
	assert.Contains(t, bodyStr, "50000.00")
	assert.Contains(t, bodyStr, "1200.00") // staff cost
	assert.Contains(t, bodyStr, "Pagado")
	eventRepo.AssertCalled(t, "GetByDateRange", mock.Anything, userID, startDate, endDate)
}
