package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// ListStaff
// ---------------------------------------------------------------------------

func TestListStaff_Empty_Returns200(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetAll", mock.Anything, userID).Return([]models.Staff{}, nil)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff", "", userID)
	rr := httptest.NewRecorder()
	h.ListStaff(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "[]\n", rr.Body.String())
}

func TestListStaff_WithResults_Returns200(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetAll", mock.Anything, userID).Return([]models.Staff{
		{ID: uuid.New(), UserID: userID, Name: "Maria Fotógrafa"},
	}, nil)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff", "", userID)
	rr := httptest.NewRecorder()
	h.ListStaff(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Maria Fotógrafa")
}

func TestListStaff_Search_HitsSearchRepo(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Search", mock.Anything, userID, "DJ").Return([]models.Staff{
		{ID: uuid.New(), UserID: userID, Name: "DJ Alejo"},
	}, nil)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff?q=DJ", "", userID)
	rr := httptest.NewRecorder()
	h.ListStaff(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "DJ Alejo")
	staffRepo.AssertCalled(t, "Search", mock.Anything, userID, "DJ")
	staffRepo.AssertNotCalled(t, "GetAll", mock.Anything, userID)
}

func TestListStaff_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetAll", mock.Anything, userID).Return(nil, errTest)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff", "", userID)
	rr := httptest.NewRecorder()
	h.ListStaff(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// GetStaff
// ---------------------------------------------------------------------------

func TestGetStaff_Success(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(
		&models.Staff{ID: staffID, UserID: userID, Name: "Test"},
		nil,
	)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/"+staffID.String(), "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetStaff(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Test")
}

func TestGetStaff_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(nil, errTest)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/"+staffID.String(), "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetStaff(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetStaff_InvalidID_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/bad", "", "bad", userID)
	rr := httptest.NewRecorder()
	h.GetStaff(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// ---------------------------------------------------------------------------
// CreateStaff
// ---------------------------------------------------------------------------

func TestCreateStaff_Success(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Staff")).Return(nil).Run(func(args mock.Arguments) {
		s := args.Get(1).(*models.Staff)
		s.ID = uuid.New()
	})

	h := NewStaffHandler(staffRepo)
	body := `{"name":"Maria","role_label":"Fotógrafa","email":"maria@example.com","notification_email_opt_in":true}`
	req := makeReqWithUserID(http.MethodPost, "/api/staff", body, userID)
	rr := httptest.NewRecorder()
	h.CreateStaff(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var created models.Staff
	assert.NoError(t, json.NewDecoder(rr.Body).Decode(&created))
	assert.Equal(t, "Maria", created.Name)
	assert.Equal(t, userID, created.UserID, "handler must overwrite user_id from auth context, not the body")
	assert.True(t, created.NotificationEmailOptIn)
}

func TestCreateStaff_MissingName_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	body := `{"role_label":"DJ"}`
	req := makeReqWithUserID(http.MethodPost, "/api/staff", body, userID)
	rr := httptest.NewRecorder()
	h.CreateStaff(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	staffRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestCreateStaff_InvalidEmail_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	body := `{"name":"Bad","email":"not-an-email"}`
	req := makeReqWithUserID(http.MethodPost, "/api/staff", body, userID)
	rr := httptest.NewRecorder()
	h.CreateStaff(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "invalid email")
}

func TestCreateStaff_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Staff")).Return(errTest)

	h := NewStaffHandler(staffRepo)
	body := `{"name":"Maria"}`
	req := makeReqWithUserID(http.MethodPost, "/api/staff", body, userID)
	rr := httptest.NewRecorder()
	h.CreateStaff(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// UpdateStaff
// ---------------------------------------------------------------------------

func TestUpdateStaff_Success(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Staff")).Return(nil)

	h := NewStaffHandler(staffRepo)
	body := `{"name":"Maria Updated","role_label":"Fotógrafa"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/"+staffID.String(), body, staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateStaff(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Maria Updated")
}

func TestUpdateStaff_InvalidID_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/bad", `{"name":"X"}`, "bad", userID)
	rr := httptest.NewRecorder()
	h.UpdateStaff(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

// ---------------------------------------------------------------------------
// DeleteStaff
// ---------------------------------------------------------------------------

func TestDeleteStaff_Success_Returns204(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Delete", mock.Anything, staffID, userID).Return(nil)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/"+staffID.String(), "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteStaff(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestDeleteStaff_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Delete", mock.Anything, staffID, userID).Return(errTest)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/"+staffID.String(), "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteStaff(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// ---------------------------------------------------------------------------
// Validation — exercised via the handler so the integration is tested
// ---------------------------------------------------------------------------

func TestValidateStaff_EmptyName_Rejected(t *testing.T) {
	err := ValidateStaff(&models.Staff{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "name")
}

func TestValidateStaff_LongName_Rejected(t *testing.T) {
	long := strings.Repeat("a", 300)
	err := ValidateStaff(&models.Staff{Name: long})
	assert.Error(t, err)
}

func TestValidateStaff_ValidEmail_Accepted(t *testing.T) {
	email := "test@example.com"
	err := ValidateStaff(&models.Staff{Name: "Test", Email: &email})
	assert.NoError(t, err)
}

func TestValidateEventStaff_NegativeFee_Rejected(t *testing.T) {
	fee := -10.0
	err := ValidateEventStaff(&models.EventStaff{StaffID: uuid.New(), FeeAmount: &fee})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "fee_amount")
}

func TestValidateEventStaff_MissingStaffID_Rejected(t *testing.T) {
	err := ValidateEventStaff(&models.EventStaff{})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "staff_id")
}

func TestValidateEventStaff_Valid_Accepted(t *testing.T) {
	err := ValidateEventStaff(&models.EventStaff{StaffID: uuid.New()})
	assert.NoError(t, err)
}
