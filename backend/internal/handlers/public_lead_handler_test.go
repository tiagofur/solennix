package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type mockPublicLeadRepo struct {
	created   []*models.PublicLead
	createErr error
	leads     []models.PublicLead
	listErr   error
	readErr   error
}

func (m *mockPublicLeadRepo) Create(ctx context.Context, lead *models.PublicLead) error {
	if m.createErr != nil {
		return m.createErr
	}
	lead.ID = uuid.New()
	lead.CreatedAt = time.Now()
	m.created = append(m.created, lead)
	return nil
}

func (m *mockPublicLeadRepo) ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID) ([]models.PublicLead, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.leads, nil
}

func (m *mockPublicLeadRepo) CountUnreadByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	return 0, nil
}

func (m *mockPublicLeadRepo) MarkRead(ctx context.Context, id, organizerUserID uuid.UUID) error {
	return m.readErr
}

type mockLeadUserRepo struct {
	user *models.User
	err  error
}

func (m *mockLeadUserRepo) GetByPublicSlug(ctx context.Context, slug string) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.user, nil
}

type mockLeadProfileRepo struct {
	profile *models.OrganizerPublicProfile
	err     error
}

func (m *mockLeadProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.profile, nil
}

func TestSubmitPublicLead_Success(t *testing.T) {
	now := time.Now()
	organizerID := uuid.New()
	leadRepo := &mockPublicLeadRepo{}
	userRepo := &mockLeadUserRepo{user: &models.User{ID: organizerID, EmailVerifiedAt: &now, AccountStatus: "active"}}
	profileRepo := &mockLeadProfileRepo{profile: &models.OrganizerPublicProfile{UserID: organizerID, IsEnabled: true}}

	handler := &PublicLeadHandler{leadRepo: leadRepo, userRepo: userRepo, profileRepo: profileRepo}

	body := `{"name":"Maria Gonzalez","contact":"maria@test.com","event_type":"wedding","num_guests":120}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/leads", strings.NewReader(body))
	req.SetPathValue("slug", "alice")
	rr := httptest.NewRecorder()

	handler.SubmitPublicLead(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d: %s", rr.Code, rr.Body.String())
	}

	if len(leadRepo.created) != 1 {
		t.Fatalf("expected 1 lead created, got %d", len(leadRepo.created))
	}
	created := leadRepo.created[0]
	if created.Name != "Maria Gonzalez" || created.Contact != "maria@test.com" || *created.EventType != "wedding" || *created.NumGuests != 120 {
		t.Errorf("unexpected created lead fields: %+v", created)
	}

	var res map[string]json.RawMessage
	if err := json.NewDecoder(rr.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if _, ok := res["data"]; !ok {
		t.Error("expected 'data' wrapper in response")
	}
}

func TestSubmitPublicLead_MissingFields(t *testing.T) {
	handler := &PublicLeadHandler{}

	body := `{"name":"","contact":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/leads", strings.NewReader(body))
	req.SetPathValue("slug", "alice")
	rr := httptest.NewRecorder()

	handler.SubmitPublicLead(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}

func TestSubmitPublicLead_ProfileNotFound(t *testing.T) {
	userRepo := &mockLeadUserRepo{err: pgx.ErrNoRows}
	handler := &PublicLeadHandler{userRepo: userRepo}

	body := `{"name":"Maria","contact":"m@test.com"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/ghost/leads", strings.NewReader(body))
	req.SetPathValue("slug", "ghost")
	rr := httptest.NewRecorder()

	handler.SubmitPublicLead(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", rr.Code)
	}
}
