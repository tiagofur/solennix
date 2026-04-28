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
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// ---------------------------------------------------------------------------
// TestNewStaffTeamHandler
// ---------------------------------------------------------------------------

func TestNewStaffTeamHandler(t *testing.T) {
	repo := new(MockStaffTeamRepo)
	h := NewStaffTeamHandler(repo)
	assert.NotNil(t, h)
}

// ---------------------------------------------------------------------------
// ListTeams
// ---------------------------------------------------------------------------

func TestListTeams_Empty_Returns200(t *testing.T) {
	userID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("GetAll", mock.Anything, userID).Return([]models.StaffTeam{}, nil)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/teams", "", userID)
	rr := httptest.NewRecorder()
	h.ListTeams(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	repo.AssertExpectations(t)
}

func TestListTeams_WithResults_Returns200(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	count := 3
	repo := new(MockStaffTeamRepo)
	repo.On("GetAll", mock.Anything, userID).Return([]models.StaffTeam{
		{ID: teamID, UserID: userID, Name: "Equipo Catering", MemberCount: &count},
	}, nil)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/teams", "", userID)
	rr := httptest.NewRecorder()
	h.ListTeams(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Equipo Catering")
	repo.AssertExpectations(t)
}

func TestListTeams_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("GetAll", mock.Anything, userID).Return(nil, errTest)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodGet, "/api/staff/teams", "", userID)
	rr := httptest.NewRecorder()
	h.ListTeams(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to fetch teams")
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// GetTeam
// ---------------------------------------------------------------------------

func TestGetTeam_Success(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("GetByID", mock.Anything, teamID, userID).Return(
		&models.StaffTeam{ID: teamID, UserID: userID, Name: "Team Alpha"},
		nil,
	)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/teams/"+teamID.String(), "", teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetTeam(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Team Alpha")
	repo.AssertExpectations(t)
}

func TestGetTeam_InvalidUUID_Returns400(t *testing.T) {
	userID := uuid.New()
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/teams/bad-id", "", "bad-id", userID)
	rr := httptest.NewRecorder()
	h.GetTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid team ID")
}

func TestGetTeam_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("GetByID", mock.Anything, teamID, userID).Return(nil, repository.ErrStaffTeamNotFound)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/teams/"+teamID.String(), "", teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetTeam(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Team not found")
	repo.AssertExpectations(t)
}

func TestGetTeam_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("GetByID", mock.Anything, teamID, userID).Return(nil, errTest)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/teams/"+teamID.String(), "", teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetTeam(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to fetch team")
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// CreateTeam
// ---------------------------------------------------------------------------

func TestCreateTeam_Success_Returns201(t *testing.T) {
	userID := uuid.New()
	body := `{"name":"Cuadrilla de Meseros"}`
	repo := new(MockStaffTeamRepo)
	repo.On("Create", mock.Anything, mock.MatchedBy(func(t *models.StaffTeam) bool {
		return t.Name == "Cuadrilla de Meseros" && t.UserID == userID
	})).Return(nil)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodPost, "/api/staff/teams", body, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateTeam(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), "Cuadrilla de Meseros")
	repo.AssertExpectations(t)
}

func TestCreateTeam_InvalidJSON_Returns400(t *testing.T) {
	userID := uuid.New()
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodPost, "/api/staff/teams", `{bad json`, userID)
	rr := httptest.NewRecorder()
	h.CreateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestCreateTeam_EmptyName_Returns400(t *testing.T) {
	userID := uuid.New()
	body := `{"name":""}`
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodPost, "/api/staff/teams", body, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "name")
}

func TestCreateTeam_InvalidMember_Returns400(t *testing.T) {
	userID := uuid.New()
	body := `{"name":"Team X"}`
	repo := new(MockStaffTeamRepo)
	repo.On("Create", mock.Anything, mock.Anything).Return(
		repository.ErrInvalidTeamMember,
	)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodPost, "/api/staff/teams", body, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "invalid team member")
	repo.AssertExpectations(t)
}

func TestCreateTeam_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	body := `{"name":"Team X"}`
	repo := new(MockStaffTeamRepo)
	repo.On("Create", mock.Anything, mock.Anything).Return(errTest)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodPost, "/api/staff/teams", body, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateTeam(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create team")
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// UpdateTeam
// ---------------------------------------------------------------------------

func TestUpdateTeam_Success_Returns200(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	body := `{"name":"Equipo Renovado"}`
	repo := new(MockStaffTeamRepo)
	repo.On("Update", mock.Anything, mock.MatchedBy(func(t *models.StaffTeam) bool {
		return t.ID == teamID && t.UserID == userID && t.Name == "Equipo Renovado"
	})).Return(nil)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/"+teamID.String(), body, teamID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Equipo Renovado")
	repo.AssertExpectations(t)
}

func TestUpdateTeam_InvalidUUID_Returns400(t *testing.T) {
	userID := uuid.New()
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/bad-id", `{"name":"X"}`, "bad-id", userID)
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid team ID")
}

func TestUpdateTeam_InvalidJSON_Returns400(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/"+teamID.String(), `{bad`, teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpdateTeam_EmptyName_Returns400(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/"+teamID.String(), `{"name":""}`, teamID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpdateTeam_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("Update", mock.Anything, mock.Anything).Return(repository.ErrStaffTeamNotFound)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/"+teamID.String(), `{"name":"X"}`, teamID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Team not found")
	repo.AssertExpectations(t)
}

func TestUpdateTeam_InvalidMember_Returns400(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("Update", mock.Anything, mock.Anything).Return(
		repository.ErrInvalidTeamMember,
	)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/"+teamID.String(), `{"name":"X"}`, teamID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "invalid team member")
	repo.AssertExpectations(t)
}

func TestUpdateTeam_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("Update", mock.Anything, mock.Anything).Return(errTest)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodPut, "/api/staff/teams/"+teamID.String(), `{"name":"X"}`, teamID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.UpdateTeam(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to update team")
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// DeleteTeam
// ---------------------------------------------------------------------------

func TestDeleteTeam_Success_Returns204(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("Delete", mock.Anything, teamID, userID).Return(nil)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/teams/"+teamID.String(), "", teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteTeam(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	repo.AssertExpectations(t)
}

func TestDeleteTeam_InvalidUUID_Returns400(t *testing.T) {
	userID := uuid.New()
	repo := new(MockStaffTeamRepo)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/teams/bad-id", "", "bad-id", userID)
	rr := httptest.NewRecorder()
	h.DeleteTeam(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid team ID")
}

func TestDeleteTeam_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("Delete", mock.Anything, teamID, userID).Return(repository.ErrStaffTeamNotFound)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/teams/"+teamID.String(), "", teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteTeam(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Team not found")
	repo.AssertExpectations(t)
}

func TestDeleteTeam_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	repo.On("Delete", mock.Anything, teamID, userID).Return(errTest)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/staff/teams/"+teamID.String(), "", teamID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteTeam(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to delete team")
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// Tenant scoping — team belongs to a different user (cross-tenant boundary)
// ---------------------------------------------------------------------------

func TestGetTeam_CrossTenant_Returns404(t *testing.T) {
	ownerID := uuid.New()
	attackerID := uuid.New()
	teamID := uuid.New()
	repo := new(MockStaffTeamRepo)
	// Repo enforces tenant scoping; returns not-found for a different userID.
	repo.On("GetByID", mock.Anything, teamID, attackerID).Return(nil, repository.ErrStaffTeamNotFound)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithIDParam(http.MethodGet, "/api/staff/teams/"+teamID.String(), "", teamID.String(), attackerID)
	rr := httptest.NewRecorder()
	h.GetTeam(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	_ = ownerID // referenced to document intent
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// CreateTeam — response body shape
// ---------------------------------------------------------------------------

func TestCreateTeam_ResponseContainsTeamFields(t *testing.T) {
	userID := uuid.New()
	roleLabel := "Coordinación"
	body := `{"name":"Coordinadores","role_label":"Coordinación"}`
	repo := new(MockStaffTeamRepo)
	repo.On("Create", mock.Anything, mock.Anything).Return(nil)

	h := NewStaffTeamHandler(repo)
	req := makeReqWithUserID(http.MethodPost, "/api/staff/teams", body, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateTeam(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	var resp models.StaffTeam
	err := json.Unmarshal(rr.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "Coordinadores", resp.Name)
	assert.NotNil(t, resp.RoleLabel)
	assert.Equal(t, roleLabel, *resp.RoleLabel)
	assert.Equal(t, userID, resp.UserID)
	repo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// Helpers — shared within this file
// ---------------------------------------------------------------------------

// makePublicReqWithParam builds a request with a named chi URL parameter
// but no authentication context (public endpoints).
func makePublicReqWithParam(method, path, paramName, paramValue, body string) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rctx := chiRouteCtxWithParam(paramName, paramValue)
	return req.WithContext(rctx)
}

// makePublicReqWithTokenParam is a convenience wrapper for the token param.
func makePublicReqWithTokenParam(method, path, token, body string) *http.Request {
	return makePublicReqWithParam(method, path, "token", token, body)
}
