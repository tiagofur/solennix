package router

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/handlers"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// uuidMustFromBytes converts a raw 16-byte uuid read from Postgres.
func uuidMustFromBytes(t *testing.T, raw []byte) uuid.UUID {
	t.Helper()
	id, err := uuid.FromBytes(raw)
	require.NoError(t, err)
	return id
}

// TestAPIIntegrationAssistantPortalScope covers the #1364 fix end to end:
// an assistant (Secretario) authenticates with its own user ID, but the
// portal scope middleware serves the linked organizer's agenda, staffing and
// directory on the read routes, while mutations stay rejected server-side.
func TestAPIIntegrationAssistantPortalScope(t *testing.T) {
	pool := openRouterTestPool(t)
	defer pool.Close()
	resetRouterTestDB(t, pool)

	authService := services.NewAuthService("test-secret", 24)
	userRepo := repository.NewUserRepo(pool)
	authHandler := handlers.NewAuthHandler(userRepo, authService, nil, &config.Config{})
	crudHandler := handlers.NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		userRepo,
		repository.NewUnavailableDateRepo(pool),
	)
	unavailHandler := handlers.NewUnavailableDateHandler(repository.NewUnavailableDateRepo(pool))
	staffHandler := handlers.NewStaffHandler(repository.NewStaffRepo(pool), userRepo)
	staffHandler.SetPool(pool)
	h := New(authHandler, crudHandler, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, unavailHandler, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, staffHandler, nil, nil, nil, nil, nil, nil, nil, authService, userRepo, &noopAuditLogger{}, nil, []string{"http://localhost:5173"}, t.TempDir(), "development", false)

	// Accounts via the API. Registration now requires email verification and
	// returns no tokens, so session tokens are minted directly from the auth
	// service once the rows exist.
	status, _ := performJSONRequest(t, h, http.MethodPost, "/api/auth/register", "", map[string]interface{}{
		"email":    "organizer.portal@test.dev",
		"password": "Portal2026!",
		"name":     "Organizer Portal",
	})
	require.Equal(t, http.StatusCreated, status)

	status, _ = performJSONRequest(t, h, http.MethodPost, "/api/auth/register", "", map[string]interface{}{
		"email":    "assistant.portal@test.dev",
		"password": "Portal2026!",
		"name":     "Secretario Portal",
	})
	require.Equal(t, http.StatusCreated, status)

	// Assistant promotion + staff link mirror the AcceptStaffInvite end state.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var organizerID, assistantID []byte
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, "organizer.portal@test.dev").Scan(&organizerID))
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, "assistant.portal@test.dev").Scan(&assistantID))
	_, err := pool.Exec(ctx, `UPDATE users SET role = 'assistant' WHERE id = $1`, assistantID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO staff (user_id, name, email, invited_user_id) VALUES ($1, 'Secretario Portal', $2, $3)`,
		organizerID, "assistant.portal@test.dev", assistantID)
	require.NoError(t, err)

	organizerPair, err := authService.GenerateTokenPair(uuidMustFromBytes(t, organizerID), "organizer.portal@test.dev")
	require.NoError(t, err)
	assistantPair, err := authService.GenerateTokenPair(uuidMustFromBytes(t, assistantID), "assistant.portal@test.dev")
	require.NoError(t, err)
	organizerToken := organizerPair.AccessToken
	assistantToken := assistantPair.AccessToken

	// Organizer client + event.
	status, body := performJSONRequest(t, h, http.MethodPost, "/api/clients", organizerToken, map[string]interface{}{
		"name":  "Cliente Portal",
		"phone": "555-0001",
	})
	require.Equal(t, http.StatusCreated, status, "create client: %s", string(body))
	clientID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/events", organizerToken, map[string]interface{}{
		"name":       "Boda Portal",
		"event_date": "2030-06-15",
		"num_people": 50,
		"status":     "confirmed",
		"client_id":  clientID,
	})
	require.Equal(t, http.StatusCreated, status, "create event: %s", string(body))
	eventID := extractID(t, body)

	// S1: assistant reads the organizer's staff catalog.
	status, body = performJSONRequest(t, h, http.MethodGet, "/api/staff", assistantToken, nil)
	require.Equal(t, http.StatusOK, status, "assistant GET /staff: %s", string(body))
	require.Contains(t, string(body), "Secretario Portal")

	// S2: assistant reads the organizer's upcoming agenda.
	status, body = performJSONRequest(t, h, http.MethodGet, "/api/events/upcoming", assistantToken, nil)
	require.Equal(t, http.StatusOK, status, "assistant GET /events/upcoming: %s", string(body))
	require.Contains(t, string(body), "Cliente Portal", "agenda must show the organizer's events")

	// S3: assistant reads the event staffing (previously 404 for a foreign event).
	status, body = performJSONRequest(t, h, http.MethodGet, "/api/events/"+eventID+"/staff", assistantToken, nil)
	require.Equal(t, http.StatusOK, status, "assistant GET /events/{id}/staff: %s", string(body))

	// S4: mutations stay rejected server-side (read-only role).
	status, _ = performJSONRequest(t, h, http.MethodPost, "/api/staff/assignments/00000000-0000-0000-0000-000000000000/respond", assistantToken, map[string]interface{}{"response": "accept"})
	require.Equal(t, http.StatusForbidden, status)

	// S5: the organizer keeps full access to its own catalog.
	status, body = performJSONRequest(t, h, http.MethodGet, "/api/staff", organizerToken, nil)
	require.Equal(t, http.StatusOK, status, "organizer GET /staff: %s", string(body))
	require.Contains(t, string(body), "Secretario Portal")
}
