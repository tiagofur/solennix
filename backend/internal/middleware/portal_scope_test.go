package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

type fakePortalUsers struct {
	users map[uuid.UUID]*models.User
	err   error
}

func (f *fakePortalUsers) GetByID(_ context.Context, id uuid.UUID) (*models.User, error) {
	if f.err != nil {
		return nil, f.err
	}
	u, ok := f.users[id]
	if !ok {
		return nil, errors.New("user not found")
	}
	return u, nil
}

type fakePortalOwners struct {
	links map[uuid.UUID]uuid.UUID
	err   error
}

func (f *fakePortalOwners) FindOwnerByInvitedUserID(_ context.Context, invitedUserID uuid.UUID) (uuid.UUID, error) {
	if f.err != nil {
		return uuid.Nil, f.err
	}
	owner, ok := f.links[invitedUserID]
	if !ok {
		return uuid.Nil, repository.ErrStaffLinkNotFound
	}
	return owner, nil
}

func TestPortalOwnerScope_AssistantResolvesToOwner(t *testing.T) {
	assistantID := uuid.New()
	ownerID := uuid.New()
	users := &fakePortalUsers{users: map[uuid.UUID]*models.User{
		assistantID: {ID: assistantID, Role: "assistant"},
	}}
	owners := &fakePortalOwners{links: map[uuid.UUID]uuid.UUID{assistantID: ownerID}}

	var seen uuid.UUID
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = GetUserID(r.Context())
	})

	req := httptest.NewRequest(http.MethodGet, "/api/staff", nil)
	req = req.WithContext(WithUserID(req.Context(), assistantID))
	PortalOwnerScope(users, owners)(next).ServeHTTP(httptest.NewRecorder(), req)

	assert.Equal(t, ownerID, seen, "assistant must read the linked organizer's data")
}

func TestPortalOwnerScope_AssistantWithoutLink_FailsClosed(t *testing.T) {
	assistantID := uuid.New()
	users := &fakePortalUsers{users: map[uuid.UUID]*models.User{
		assistantID: {ID: assistantID, Role: "assistant"},
	}}
	owners := &fakePortalOwners{links: map[uuid.UUID]uuid.UUID{}}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })

	req := httptest.NewRequest(http.MethodGet, "/api/staff", nil)
	req = req.WithContext(WithUserID(req.Context(), assistantID))
	rr := httptest.NewRecorder()
	PortalOwnerScope(users, owners)(next).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.False(t, called, "assistant without a staff link must not reach the handler")
}

func TestPortalOwnerScope_OtherRolesPassThrough(t *testing.T) {
	for _, role := range []string{"organizer", "admin", "team_member", ""} {
		t.Run(role, func(t *testing.T) {
			callerID := uuid.New()
			users := &fakePortalUsers{users: map[uuid.UUID]*models.User{
				callerID: {ID: callerID, Role: role},
			}}
			owners := &fakePortalOwners{links: map[uuid.UUID]uuid.UUID{}}

			var seen uuid.UUID
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { seen = GetUserID(r.Context()) })

			req := httptest.NewRequest(http.MethodGet, "/api/events/upcoming", nil)
			req = req.WithContext(WithUserID(req.Context(), callerID))
			rr := httptest.NewRecorder()
			PortalOwnerScope(users, owners)(next).ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, callerID, seen, "non-assistant roles keep their own identity")
		})
	}
}

func TestPortalOwnerScope_CallerLookupFails_Returns500(t *testing.T) {
	callerID := uuid.New()
	users := &fakePortalUsers{err: errors.New("db down")}
	owners := &fakePortalOwners{links: map[uuid.UUID]uuid.UUID{}}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })

	req := httptest.NewRequest(http.MethodGet, "/api/staff", nil)
	req = req.WithContext(WithUserID(req.Context(), callerID))
	rr := httptest.NewRecorder()
	PortalOwnerScope(users, owners)(next).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.False(t, called)
}

func TestPortalOwnerScope_NilDeps_PassThrough(t *testing.T) {
	callerID := uuid.New()

	var seen uuid.UUID
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { seen = GetUserID(r.Context()) })

	req := httptest.NewRequest(http.MethodGet, "/api/staff", nil)
	req = req.WithContext(WithUserID(req.Context(), callerID))
	rr := httptest.NewRecorder()
	PortalOwnerScope(nil, nil)(next).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, callerID, seen)
}

func TestPortalOwnerScope_NoCallerInContext_PassThrough(t *testing.T) {
	users := &fakePortalUsers{users: map[uuid.UUID]*models.User{}}
	owners := &fakePortalOwners{links: map[uuid.UUID]uuid.UUID{}}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { called = true })

	PortalOwnerScope(users, owners)(next).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/staff", nil))

	assert.True(t, called, "unauthenticated requests flow to the auth middleware normally")
}
