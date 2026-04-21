package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
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

// ---------------------------------------------------------------------------
// ValidateEventStaff — shift ordering (Ola 1)
// ---------------------------------------------------------------------------

func TestValidateEventStaff_ShiftOrdering(t *testing.T) {
	t0 := time.Date(2026, 5, 1, 18, 0, 0, 0, time.UTC)
	earlier := t0.Add(-2 * time.Hour)
	later := t0.Add(2 * time.Hour)

	tests := []struct {
		name       string
		shiftStart *time.Time
		shiftEnd   *time.Time
		wantErr    bool
		errField   string
	}{
		{"end before start rejected", &t0, &earlier, true, "shift_end"},
		{"end equal to start rejected", &t0, &t0, true, "shift_end"},
		{"end after start accepted", &t0, &later, false, ""},
		{"only shift_start accepted", &t0, nil, false, ""},
		{"only shift_end accepted", nil, &t0, false, ""},
		{"both nil accepted", nil, nil, false, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEventStaff(&models.EventStaff{
				StaffID:    uuid.New(),
				ShiftStart: tt.shiftStart,
				ShiftEnd:   tt.shiftEnd,
			})
			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errField)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// ValidateEventStaff — status enum (Ola 1)
// ---------------------------------------------------------------------------

func TestValidateEventStaff_StatusEnum(t *testing.T) {
	pending := models.AssignmentStatusPending
	confirmed := models.AssignmentStatusConfirmed
	declined := models.AssignmentStatusDeclined
	cancelled := models.AssignmentStatusCancelled
	empty := ""
	invalid := "foo"

	tests := []struct {
		name    string
		status  *string
		wantErr bool
	}{
		{"nil status accepted (preserve semantics)", nil, false},
		{"empty status accepted (preserve semantics)", &empty, false},
		{"pending accepted", &pending, false},
		{"confirmed accepted", &confirmed, false},
		{"declined accepted", &declined, false},
		{"cancelled accepted", &cancelled, false},
		{"unknown status rejected", &invalid, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEventStaff(&models.EventStaff{
				StaffID: uuid.New(),
				Status:  tt.status,
			})
			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "status")
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// GetStaffAvailability
// ---------------------------------------------------------------------------

func TestGetStaffAvailability_MissingParams_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "date or (start,end) is required")
	staffRepo.AssertNotCalled(t, "GetAvailability", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGetStaffAvailability_OnlyStart_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?start=2026-05-01", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	staffRepo.AssertNotCalled(t, "GetAvailability", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGetStaffAvailability_InvalidDateFormat_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?date=2026-13-40", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "invalid")
	staffRepo.AssertNotCalled(t, "GetAvailability", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGetStaffAvailability_InvalidEndDate_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?start=2026-05-01&end=not-a-date", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "invalid end date")
	staffRepo.AssertNotCalled(t, "GetAvailability", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGetStaffAvailability_EndBeforeStart_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?start=2026-05-10&end=2026-05-01", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "on or after start")
	staffRepo.AssertNotCalled(t, "GetAvailability", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGetStaffAvailability_SingleDate_Success(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)

	expected := []repository.StaffAvailability{
		{
			StaffID:   staffID,
			StaffName: "Maria Fotógrafa",
			Assignments: []repository.StaffAvailabilityAssignment{
				{
					EventID:   uuid.New(),
					EventName: "Boda Pérez",
					EventDate: "2026-05-01",
					Status:    "confirmed",
				},
			},
		},
	}
	staffRepo.On("GetAvailability", mock.Anything, userID, "2026-05-01", "2026-05-01").Return(expected, nil)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?date=2026-05-01", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var got []repository.StaffAvailability
	assert.NoError(t, json.NewDecoder(rr.Body).Decode(&got))
	assert.Len(t, got, 1)
	assert.Equal(t, staffID, got[0].StaffID)
	assert.Equal(t, "Maria Fotógrafa", got[0].StaffName)
	assert.Len(t, got[0].Assignments, 1)
	assert.Equal(t, "Boda Pérez", got[0].Assignments[0].EventName)
	staffRepo.AssertCalled(t, "GetAvailability", mock.Anything, userID, "2026-05-01", "2026-05-01")
}

func TestGetStaffAvailability_Range_Success(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	staffRepo.On("GetAvailability", mock.Anything, userID, "2026-05-01", "2026-05-07").Return(
		[]repository.StaffAvailability{}, nil,
	)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?start=2026-05-01&end=2026-05-07", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "[]\n", rr.Body.String())
	staffRepo.AssertCalled(t, "GetAvailability", mock.Anything, userID, "2026-05-01", "2026-05-07")
}

func TestGetStaffAvailability_DateOverridesStartEnd(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	// `date` should win over `start`/`end` per handler semantics.
	staffRepo.On("GetAvailability", mock.Anything, userID, "2026-05-15", "2026-05-15").Return(
		[]repository.StaffAvailability{}, nil,
	)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(
		http.MethodGet,
		"/api/staff/availability?date=2026-05-15&start=2026-01-01&end=2026-12-31",
		"", userID,
	)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	staffRepo.AssertCalled(t, "GetAvailability", mock.Anything, userID, "2026-05-15", "2026-05-15")
}

func TestGetStaffAvailability_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetAvailability", mock.Anything, userID, "2026-05-01", "2026-05-01").Return(nil, errTest)

	h := NewStaffHandler(staffRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?date=2026-05-01", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to fetch availability")
}
