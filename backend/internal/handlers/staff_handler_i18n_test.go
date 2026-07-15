package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/i18n"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// makeStaffReqWithLocale builds a request carrying both the authenticated
// userID and an injected locale, mirroring the production middleware chain.
// Body may be empty ("").
func makeStaffReqWithLocale(method, path, body string, userID uuid.UUID, locale string) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	ctx = i18n.WithLocale(ctx, locale)
	return req.WithContext(ctx)
}

// TestStaffHandlerErrors_LocalizedToSpanish verifies that staff handler error
// messages render the user's locale (issue #1014). Covers a representative
// spread across handlers and HTTP status families (400/403/500/503).
func TestStaffHandlerErrors_LocalizedToSpanish(t *testing.T) {
	userID := uuid.New()

	t.Run("GetStaff invalid id returns Spanish message", func(t *testing.T) {
		h := NewStaffHandler(new(MockStaffRepo), nil)
		req := makeStaffReqWithLocale(http.MethodGet, "/api/staff/not-a-uuid", "", userID, "es")
		rr := httptest.NewRecorder()
		h.GetStaff(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "ID de personal invalido")
	})

	t.Run("GetStaffAvailability missing date returns Spanish message", func(t *testing.T) {
		h := NewStaffHandler(new(MockStaffRepo), nil)
		req := makeStaffReqWithLocale(http.MethodGet, "/api/staff/availability", "", userID, "es")
		rr := httptest.NewRecorder()
		h.GetStaffAvailability(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Se requiere date o (start,end)")
	})

	t.Run("GetStaffAvailability invalid start returns Spanish message", func(t *testing.T) {
		h := NewStaffHandler(new(MockStaffRepo), nil)
		req := makeStaffReqWithLocale(http.MethodGet, "/api/staff/availability?start=bad&end=2026-01-01", "", userID, "es")
		rr := httptest.NewRecorder()
		h.GetStaffAvailability(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "fecha inicial invalida")
	})

	t.Run("GetStaffAvailability end before start returns Spanish message", func(t *testing.T) {
		h := NewStaffHandler(new(MockStaffRepo), nil)
		req := makeStaffReqWithLocale(http.MethodGet, "/api/staff/availability?start=2026-01-31&end=2026-01-01", "", userID, "es")
		rr := httptest.NewRecorder()
		h.GetStaffAvailability(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "posterior o igual a la inicial")
	})

	t.Run("InviteStaffUser without authSvc returns Spanish message", func(t *testing.T) {
		h := NewStaffHandler(new(MockStaffRepo), nil) // authSvc nil
		req := makeStaffReqWithLocale(http.MethodPost, "/api/staff/"+uuid.New().String()+"/invite", "", userID, "es")
		rr := httptest.NewRecorder()
		h.InviteStaffUser(rr, req)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.Contains(t, rr.Body.String(), "no esta configurado")
	})

	t.Run("GetMyAssignments user fetch failure returns Spanish message", func(t *testing.T) {
		userRepo := new(MockUserRepo)
		userRepo.On("GetByID", mock.Anything, userID).Return((*models.User)(nil), errors.New("db error"))
		h := NewStaffHandler(new(MockStaffRepo), userRepo)

		req := makeStaffReqWithLocale(http.MethodGet, "/api/staff/my-assignments", "", userID, "es")
		rr := httptest.NewRecorder()
		h.GetMyAssignments(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "No se pudo obtener el usuario")
	})

	t.Run("GetMyAssignments non-team role returns Spanish message", func(t *testing.T) {
		userRepo := new(MockUserRepo)
		userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Role: "organizer"}, nil)
		h := NewStaffHandler(new(MockStaffRepo), userRepo)

		req := makeStaffReqWithLocale(http.MethodGet, "/api/staff/my-assignments", "", userID, "es")
		rr := httptest.NewRecorder()
		h.GetMyAssignments(rr, req)

		assert.Equal(t, http.StatusForbidden, rr.Code)
		assert.Contains(t, rr.Body.String(), "Se requiere acceso de miembro de equipo")
	})
}

// TestStaffHandlerErrors_EnglishFallback verifies that without an injected
// locale the staff handlers fall back to the English catalog (NoContextLocale).
func TestStaffHandlerErrors_EnglishFallback(t *testing.T) {
	userID := uuid.New()
	h := NewStaffHandler(new(MockStaffRepo), nil)

	// No locale in context → fallback to "en".
	req := makeReqWithUserID(http.MethodGet, "/api/staff/not-a-uuid", "", userID)
	rr := httptest.NewRecorder()
	h.GetStaff(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid staff ID")
}
