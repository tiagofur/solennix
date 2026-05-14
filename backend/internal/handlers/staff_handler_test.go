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
	"github.com/tiagofur/solennix-backend/internal/services"
)

// ---------------------------------------------------------------------------
// ListStaff
// ---------------------------------------------------------------------------

func TestListStaff_Empty_Returns200(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetAll", mock.Anything, userID).Return([]models.Staff{}, nil)

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/"+staffID.String(), "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetStaff(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetStaff_InvalidID_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo, nil)
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

	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	staffRepo.On("CountByUserID", mock.Anything, userID).Return(0, nil)

	h := NewStaffHandler(staffRepo, userRepo)
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
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	staffRepo.On("CountByUserID", mock.Anything, userID).Return(0, nil)

	h := NewStaffHandler(staffRepo, userRepo)
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
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	staffRepo.On("CountByUserID", mock.Anything, userID).Return(0, nil)

	h := NewStaffHandler(staffRepo, userRepo)
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
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	staffRepo.On("CountByUserID", mock.Anything, userID).Return(0, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	body := `{"name":"Maria"}`
	req := makeReqWithUserID(http.MethodPost, "/api/staff", body, userID)
	rr := httptest.NewRecorder()
	h.CreateStaff(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestCreateStaff_ProPlanLimitReached_Returns403(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	staffRepo.On("CountByUserID", mock.Anything, userID).Return(2, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	body := `{"name":"Maria"}`
	req := makeReqWithUserID(http.MethodPost, "/api/staff", body, userID)
	rr := httptest.NewRecorder()
	h.CreateStaff(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "plan_limit_exceeded")
	assert.Contains(t, rr.Body.String(), "staff_seats")
	staffRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

// ---------------------------------------------------------------------------
// UpdateStaff
// ---------------------------------------------------------------------------

func TestUpdateStaff_Success(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Staff")).Return(nil)

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/"+staffID.String(), "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteStaff(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// ---------------------------------------------------------------------------
// InviteStaffUser
// ---------------------------------------------------------------------------

func TestInviteStaffUser_BusinessPlan_Returns201(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	email := "staff@example.com"

	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(&models.Staff{
		ID: staffID, UserID: userID, Name: "Carlos", Email: &email,
	}, nil)
	staffRepo.On("CreateInvite", mock.Anything, mock.AnythingOfType("*models.StaffInvite")).Return(nil).Run(func(args mock.Arguments) {
		inv := args.Get(1).(*models.StaffInvite)
		inv.ID = uuid.New()
		inv.CreatedAt = time.Now().UTC()
	})

	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "business", Name: "Owner"}, nil)

	authSvc := services.NewAuthService("test-secret", 24)
	h := NewStaffHandler(staffRepo, userRepo)
	h.SetInviteSupport(authSvc, nil, "https://app.solennix.com")

	req := makeReqWithIDParam(http.MethodPost, "/api/staff/"+staffID.String()+"/invite", "{}", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.InviteStaffUser(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), "accept_url")
	assert.Contains(t, rr.Body.String(), "team-invite")
}

func TestInviteStaffUser_ProPlan_Returns201(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	email := "staff@example.com"

	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(&models.Staff{
		ID: staffID, UserID: userID, Name: "Carlos", Email: &email,
	}, nil)
	staffRepo.On("CreateInvite", mock.Anything, mock.AnythingOfType("*models.StaffInvite")).Return(nil).Run(func(args mock.Arguments) {
		inv := args.Get(1).(*models.StaffInvite)
		inv.ID = uuid.New()
		inv.CreatedAt = time.Now().UTC()
	})

	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro", Name: "Owner"}, nil)

	authSvc := services.NewAuthService("test-secret", 24)
	h := NewStaffHandler(staffRepo, userRepo)
	h.SetInviteSupport(authSvc, nil, "https://app.solennix.com")

	req := makeReqWithIDParam(http.MethodPost, "/api/staff/"+staffID.String()+"/invite", "{}", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.InviteStaffUser(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), "accept_url")
	assert.Contains(t, rr.Body.String(), "team-invite")
}

func TestInviteStaffUser_ProPlan_AssistantRole_Returns403(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	email := "staff@example.com"

	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(&models.Staff{
		ID: staffID, UserID: userID, Name: "Carlos", Email: &email,
	}, nil)

	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro", Name: "Owner"}, nil)

	authSvc := services.NewAuthService("test-secret", 24)
	h := NewStaffHandler(staffRepo, userRepo)
	h.SetInviteSupport(authSvc, nil, "https://app.solennix.com")

	req := makeReqWithIDParam(http.MethodPost, "/api/staff/"+staffID.String()+"/invite", `{"target_role":"assistant"}`, staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.InviteStaffUser(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	staffRepo.AssertNotCalled(t, "CreateInvite", mock.Anything, mock.Anything)
}

func TestInviteStaffUser_BusinessPlan_AssistantRole_Returns201(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	email := "staff@example.com"

	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(&models.Staff{
		ID: staffID, UserID: userID, Name: "Carlos", Email: &email,
	}, nil)
	staffRepo.On("CreateInvite", mock.Anything, mock.AnythingOfType("*models.StaffInvite")).Return(nil).Run(func(args mock.Arguments) {
		inv := args.Get(1).(*models.StaffInvite)
		assert.Equal(t, "assistant", inv.TargetRole)
		inv.ID = uuid.New()
		inv.CreatedAt = time.Now().UTC()
	})

	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "business", Name: "Owner"}, nil)

	authSvc := services.NewAuthService("test-secret", 24)
	h := NewStaffHandler(staffRepo, userRepo)
	h.SetInviteSupport(authSvc, nil, "https://app.solennix.com")

	req := makeReqWithIDParam(http.MethodPost, "/api/staff/"+staffID.String()+"/invite", `{"target_role":"assistant"}`, staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.InviteStaffUser(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), `"target_role":"assistant"`)
}

func TestInviteStaffUser_BasicPlan_Returns403(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()

	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic", Name: "Owner"}, nil)

	authSvc := services.NewAuthService("test-secret", 24)
	h := NewStaffHandler(staffRepo, userRepo)
	h.SetInviteSupport(authSvc, nil, "https://app.solennix.com")

	req := makeReqWithIDParam(http.MethodPost, "/api/staff/"+staffID.String()+"/invite", "{}", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.InviteStaffUser(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	staffRepo.AssertNotCalled(t, "CreateInvite", mock.Anything, mock.Anything)
}

func TestRevokeStaffInvite_Success_Returns204(t *testing.T) {
	userID := uuid.New()
	staffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	staffRepo.On("GetByID", mock.Anything, staffID, userID).Return(&models.Staff{ID: staffID, UserID: userID, Name: "Carlos"}, nil)
	staffRepo.On("RevokeInvite", mock.Anything, staffID, userID).Return(nil)

	h := NewStaffHandler(staffRepo, nil)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/"+staffID.String()+"/invite", "", staffID.String(), userID)
	rr := httptest.NewRecorder()
	h.RevokeStaffInvite(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

// ---------------------------------------------------------------------------
// Team-member assignments (Phase 3.5)
// ---------------------------------------------------------------------------

func TestGetMyAssignments_Success(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "team_member"}, nil)
	staffRepo.On("ListMyAssignments", mock.Anything, userID).Return([]repository.TeamMemberAssignment{
		{
			EventStaffID: uuid.New(),
			EventID:      uuid.New(),
			EventName:    "Boda Sofia y Diego",
			EventDate:    "2026-06-20",
			Status:       models.AssignmentStatusPending,
		},
	}, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/my-assignments", "", userID)
	rr := httptest.NewRecorder()
	h.GetMyAssignments(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Boda Sofia y Diego")
	assert.Contains(t, rr.Body.String(), "pending")
}

func TestGetMyAssignments_OrganizerRole_Returns403(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "user"}, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/my-assignments", "", userID)
	rr := httptest.NewRecorder()
	h.GetMyAssignments(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	staffRepo.AssertNotCalled(t, "ListMyAssignments", mock.Anything, mock.Anything)
}

func TestRespondAssignment_Accept_Success(t *testing.T) {
	userID := uuid.New()
	eventStaffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "team_member"}, nil)
	staffRepo.On("RespondToAssignment", mock.Anything, userID, eventStaffID, "accept").Return(&repository.AssignmentResponseOutcome{
		EventStaffID:      eventStaffID,
		FinalStatus:       models.AssignmentStatusConfirmed,
		SeatsRemaining:    0,
		AutoDeclinedCount: 2,
	}, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/staff/assignments/"+eventStaffID.String()+"/respond", `{"response":"accept"}`, eventStaffID.String(), userID)
	rr := httptest.NewRecorder()
	h.RespondAssignment(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "confirmed")
	assert.Contains(t, rr.Body.String(), "auto_declined_count")
}

func TestRespondAssignment_OrganizerRole_Returns403(t *testing.T) {
	userID := uuid.New()
	eventStaffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "admin"}, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/staff/assignments/"+eventStaffID.String()+"/respond", `{"response":"accept"}`, eventStaffID.String(), userID)
	rr := httptest.NewRecorder()
	h.RespondAssignment(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	staffRepo.AssertNotCalled(t, "RespondToAssignment", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestRespondAssignment_OfferAlreadyFilled_Returns409(t *testing.T) {
	userID := uuid.New()
	eventStaffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "assistant"}, nil)
	staffRepo.On("RespondToAssignment", mock.Anything, userID, eventStaffID, "accept").Return((*repository.AssignmentResponseOutcome)(nil), repository.ErrOfferAlreadyFilled)

	h := NewStaffHandler(staffRepo, userRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/staff/assignments/"+eventStaffID.String()+"/respond", `{"response":"accept"}`, eventStaffID.String(), userID)
	rr := httptest.NewRecorder()
	h.RespondAssignment(rr, req)

	assert.Equal(t, http.StatusConflict, rr.Code)
	assert.Contains(t, rr.Body.String(), "Offer slot already taken")
}

func TestRespondAssignment_InvalidResponse_Returns400(t *testing.T) {
	userID := uuid.New()
	eventStaffID := uuid.New()
	staffRepo := new(MockStaffRepo)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "assistant"}, nil)

	h := NewStaffHandler(staffRepo, userRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/staff/assignments/"+eventStaffID.String()+"/respond", `{"response":"maybe"}`, eventStaffID.String(), userID)
	rr := httptest.NewRecorder()
	h.RespondAssignment(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	staffRepo.AssertNotCalled(t, "RespondToAssignment", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?start=2026-05-01", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	staffRepo.AssertNotCalled(t, "GetAvailability", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestGetStaffAvailability_InvalidDateFormat_Returns400(t *testing.T) {
	userID := uuid.New()
	staffRepo := new(MockStaffRepo)

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
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

	h := NewStaffHandler(staffRepo, nil)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/availability?date=2026-05-01", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaffAvailability(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to fetch availability")
}
