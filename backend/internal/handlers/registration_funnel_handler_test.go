package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/tiagofur/solennix-backend/internal/repository"
)

type mockRegistrationFunnelRepo struct {
	mu     sync.Mutex
	events []repository.RegistrationFunnelEvent
	err    error
}

func (m *mockRegistrationFunnelRepo) Record(_ context.Context, e repository.RegistrationFunnelEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.err != nil {
		return m.err
	}
	m.events = append(m.events, e)
	return nil
}

func TestRegistrationFunnelHandler_RecordAlways204(t *testing.T) {
	repo := &mockRegistrationFunnelRepo{}
	h := NewRegistrationFunnelHandler(repo)

	// Valid register_view
	req := httptest.NewRequest(http.MethodPost, "/api/public/registration-funnel",
		bytes.NewBufferString(`{"step":"register_view","method":"email"}`))
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0) Chrome/120")
	rr := httptest.NewRecorder()
	h.Record(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("valid step status=%d want 204", rr.Code)
	}
	if len(repo.events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(repo.events))
	}
	if repo.events[0].Step != "register_view" || repo.events[0].Method != "email" {
		t.Fatalf("unexpected event: %+v", repo.events[0])
	}
	if repo.events[0].VisitorHash == "" {
		t.Fatal("expected visitor_hash")
	}

	// Untrusted client step — still 204, not recorded
	req2 := httptest.NewRequest(http.MethodPost, "/api/public/registration-funnel",
		bytes.NewBufferString(`{"step":"registered","method":"email"}`))
	rr2 := httptest.NewRecorder()
	h.Record(rr2, req2)
	if rr2.Code != http.StatusNoContent {
		t.Fatalf("untrusted step status=%d want 204", rr2.Code)
	}
	if len(repo.events) != 1 {
		t.Fatalf("untrusted step should not record, events=%d", len(repo.events))
	}

	// Soft decode / empty body — still 204
	req3 := httptest.NewRequest(http.MethodPost, "/api/public/registration-funnel",
		bytes.NewBufferString(`not-json`))
	rr3 := httptest.NewRecorder()
	h.Record(rr3, req3)
	if rr3.Code != http.StatusNoContent {
		t.Fatalf("bad json status=%d want 204", rr3.Code)
	}

	// Nil handler / repo
	var nilH *RegistrationFunnelHandler
	rr4 := httptest.NewRecorder()
	nilH.Record(rr4, httptest.NewRequest(http.MethodPost, "/", nil))
	if rr4.Code != http.StatusNoContent {
		t.Fatalf("nil handler status=%d", rr4.Code)
	}
}
