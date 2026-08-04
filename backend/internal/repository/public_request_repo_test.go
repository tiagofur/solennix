package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// seedPublicRequest inserts a request row directly for setup, returning its id.
// Tests exercise the repo methods against these rows.
func seedPublicRequest(t *testing.T, pool *pgxpool.Pool, organizerUserID uuid.UUID, email string, status models.RequestStatus) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO public_requests (organizer_user_id, contact_email, status)
		VALUES ($1, $2, $3) RETURNING id`,
		organizerUserID, email, string(status)).Scan(&id)
	if err != nil {
		t.Fatalf("seed public request: %v", err)
	}
	return id
}

func TestPublicRequestRepoCreateAndGet(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.create@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()

	price := 1500.0
	req := &models.PublicRequest{
		OrganizerUserID: userID,
		ContactEmail:    "client@example.com",
		Currency:        "MXN",
		Status:          models.RequestStatusPending,
		Services: []models.PublicRequestServiceSnapshot{{
			ProductID: uuid.New(),
			Name:      "Banquete",
			Price:     &price,
		}},
	}
	if err := repo.Create(ctx, req); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if req.ID == uuid.Nil || req.ClientToken == uuid.Nil {
		t.Fatalf("Create() should populate id + client_token, got id=%v token=%v", req.ID, req.ClientToken)
	}
	if len(req.Services) != 1 {
		t.Fatalf("Services roundtrip = %d, want 1", len(req.Services))
	}

	// GetByID happy path.
	got, err := repo.GetByID(ctx, req.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.ContactEmail != "client@example.com" || got.Status != models.RequestStatusPending {
		t.Fatalf("GetByID() = %+v", got)
	}

	// GetByID foreign organizer → ErrNoRows (tenant isolation).
	other := uuid.New()
	if _, err := repo.GetByID(ctx, req.ID, other); err == nil {
		t.Fatal("GetByID() foreign organizer: want error, got nil")
	}

	// GetByIDAndToken happy path.
	gotByToken, err := repo.GetByIDAndToken(ctx, req.ID, req.ClientToken)
	if err != nil {
		t.Fatalf("GetByIDAndToken() error = %v", err)
	}
	if gotByToken.ID != req.ID {
		t.Fatalf("GetByIDAndToken() id mismatch")
	}

	// Wrong token → ErrNoRows.
	if _, err := repo.GetByIDAndToken(ctx, req.ID, uuid.New()); err == nil {
		t.Fatal("GetByIDAndToken() wrong token: want error, got nil")
	}
}

func TestPublicRequestRepoListPaginationAndFilters(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.list@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()

	// 5 pending, 3 responded — inserted out of order to check sorting.
	statuses := []models.RequestStatus{
		models.RequestStatusResponded, models.RequestStatusPending, models.RequestStatusPending,
		models.RequestStatusResponded, models.RequestStatusPending, models.RequestStatusPending,
		models.RequestStatusResponded, models.RequestStatusPending,
	}
	for i, s := range statuses {
		seedPublicRequest(t, pool, userID, "c"+string(rune('a'+i))+"@test.dev", s)
	}

	t.Run("all requests total + limit", func(t *testing.T) {
		items, total, err := repo.ListByOrganizer(ctx, userID, PublicRequestListFilters{Limit: 3})
		if err != nil {
			t.Fatalf("ListByOrganizer error = %v", err)
		}
		if total != 8 {
			t.Fatalf("total = %d, want 8", total)
		}
		if len(items) != 3 {
			t.Fatalf("items = %d, want 3 (limit)", len(items))
		}
	})

	t.Run("filter by status", func(t *testing.T) {
		items, total, err := repo.ListByOrganizer(ctx, userID, PublicRequestListFilters{
			Status: string(models.RequestStatusPending), Limit: 50,
		})
		if err != nil {
			t.Fatalf("ListByOrganizer(status) error = %v", err)
		}
		if total != 5 {
			t.Fatalf("pending total = %d, want 5", total)
		}
		for _, r := range items {
			if r.Status != models.RequestStatusPending {
				t.Fatalf("expected all pending, got %s", r.Status)
			}
		}
	})

	t.Run("offset advances without overlap", func(t *testing.T) {
		page1, _, err := repo.ListByOrganizer(ctx, userID, PublicRequestListFilters{Limit: 5, Offset: 0})
		if err != nil {
			t.Fatalf("page1 error = %v", err)
		}
		page2, _, err := repo.ListByOrganizer(ctx, userID, PublicRequestListFilters{Limit: 5, Offset: 5})
		if err != nil {
			t.Fatalf("page2 error = %v", err)
		}
		seen := map[uuid.UUID]bool{}
		for _, r := range page1 {
			seen[r.ID] = true
		}
		for _, r := range page2 {
			if seen[r.ID] {
				t.Fatalf("id %v appears in both pages (overlap)", r.ID)
			}
		}
	})

	t.Run("foreign organizer sees nothing", func(t *testing.T) {
		items, total, err := repo.ListByOrganizer(ctx, uuid.New(), PublicRequestListFilters{Limit: 50})
		if err != nil {
			t.Fatalf("foreign error = %v", err)
		}
		if total != 0 || len(items) != 0 {
			t.Fatalf("foreign organizer: total=%d items=%d, want 0/0", total, len(items))
		}
	})

	t.Run("cursor pages without overlap and has_more", func(t *testing.T) {
		page1, next1, err := repo.ListByOrganizerCursor(ctx, userID, PublicRequestCursorFilters{Limit: 3})
		if err != nil {
			t.Fatalf("cursor page1 error = %v", err)
		}
		if len(page1) != 3 {
			t.Fatalf("page1 len = %d, want 3", len(page1))
		}
		if next1 == nil {
			t.Fatal("expected next_cursor after full page")
		}
		createdAt, id, err := DecodeRequestCursor(*next1)
		if err != nil || createdAt == nil || id == nil {
			t.Fatalf("decode next_cursor: %v", err)
		}
		page2, next2, err := repo.ListByOrganizerCursor(ctx, userID, PublicRequestCursorFilters{
			Limit: 3, CursorCreatedAt: createdAt, CursorID: id,
		})
		if err != nil {
			t.Fatalf("cursor page2 error = %v", err)
		}
		if len(page2) != 3 {
			t.Fatalf("page2 len = %d, want 3", len(page2))
		}
		if next2 == nil {
			t.Fatal("expected next_cursor on page2 (8 total, 3+3 left)")
		}
		seen := map[uuid.UUID]bool{}
		for _, r := range page1 {
			seen[r.ID] = true
		}
		for _, r := range page2 {
			if seen[r.ID] {
				t.Fatalf("cursor overlap id %v", r.ID)
			}
		}
		// Drain remaining (2 left) — has_more false.
		createdAt2, id2, _ := DecodeRequestCursor(*next2)
		page3, next3, err := repo.ListByOrganizerCursor(ctx, userID, PublicRequestCursorFilters{
			Limit: 3, CursorCreatedAt: createdAt2, CursorID: id2,
		})
		if err != nil {
			t.Fatalf("cursor page3 error = %v", err)
		}
		if len(page3) != 2 {
			t.Fatalf("page3 len = %d, want 2", len(page3))
		}
		if next3 != nil {
			t.Fatalf("expected no next_cursor on last page, got %v", *next3)
		}
	})
}

func TestEncodeDecodeRequestCursor_RoundTrip(t *testing.T) {
	id := uuid.New()
	ts := time.Date(2026, 8, 3, 12, 30, 45, 123456789, time.UTC)
	tok := EncodeRequestCursor(ts, id)
	gotT, gotID, err := DecodeRequestCursor(tok)
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if gotID == nil || *gotID != id {
		t.Fatalf("id mismatch: got %v want %v", gotID, id)
	}
	if gotT == nil || !gotT.Equal(ts) {
		t.Fatalf("time mismatch: got %v want %v", gotT, ts)
	}
	if _, _, err := DecodeRequestCursor("!!!bad"); err == nil {
		t.Fatal("expected error for garbage cursor")
	}
	if t1, i1, err := DecodeRequestCursor(""); err != nil || t1 != nil || i1 != nil {
		t.Fatalf("empty cursor should be first page, got %v %v %v", t1, i1, err)
	}
}

func TestPublicRequestRepoStatusTransitionAndMarkRead(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.status@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()
	id := seedPublicRequest(t, pool, userID, "s@test.dev", models.RequestStatusPending)

	reason := "not available"
	if err := repo.UpdateStatus(ctx, id, userID, models.RequestStatusDeclinedProvider, &reason); err != nil {
		t.Fatalf("UpdateStatus() error = %v", err)
	}
	got, _ := repo.GetByID(ctx, id, userID)
	if got.Status != models.RequestStatusDeclinedProvider {
		t.Fatalf("status = %s, want declined_provider", got.Status)
	}
	if got.DeclinedReason == nil || *got.DeclinedReason != reason {
		t.Fatalf("declined_reason = %v, want %q", got.DeclinedReason, reason)
	}

	// UpdateStatus foreign organizer → ErrNoRows.
	if err := repo.UpdateStatus(ctx, id, uuid.New(), models.RequestStatusResponded, nil); err == nil {
		t.Fatal("UpdateStatus() foreign: want error, got nil")
	}

	// MarkRead on a fresh request.
	id2 := seedPublicRequest(t, pool, userID, "s2@test.dev", models.RequestStatusPending)
	if err := repo.MarkRead(ctx, id2, userID); err != nil {
		t.Fatalf("MarkRead() error = %v", err)
	}
	got2, _ := repo.GetByID(ctx, id2, userID)
	if !got2.IsRead {
		t.Fatal("IsRead = false, want true")
	}

	// Unread count.
	id3 := seedPublicRequest(t, pool, userID, "s3@test.dev", models.RequestStatusPending)
	_ = id3
	n, err := repo.CountUnreadByOrganizer(ctx, userID)
	if err != nil {
		t.Fatalf("CountUnread error = %v", err)
	}
	if n != 2 { // id2 marked read; id + id3 unread
		t.Fatalf("unread = %d, want 2", n)
	}
}

func TestPublicRequestRepoCountPendingAndCap(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.cap@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()

	seedPublicRequest(t, pool, userID, "p1@test.dev", models.RequestStatusPending)
	seedPublicRequest(t, pool, userID, "p2@test.dev", models.RequestStatusPending)
	seedPublicRequest(t, pool, userID, "p3@test.dev", models.RequestStatusResponded) // not pending

	n, err := repo.CountPendingByOrganizer(ctx, userID)
	if err != nil {
		t.Fatalf("CountPending error = %v", err)
	}
	if n != 2 {
		t.Fatalf("pending = %d, want 2", n)
	}
}

func TestPublicRequestRepoSetEventID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.event@test.dev")
	clientID := seedClient(t, pool, userID, "Event Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-09-01")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()
	id := seedPublicRequest(t, pool, userID, "e@test.dev", models.RequestStatusAcceptedByClient)

	if err := repo.SetEventID(ctx, id, userID, eventID); err != nil {
		t.Fatalf("SetEventID() error = %v", err)
	}
	got, _ := repo.GetByID(ctx, id, userID)
	if got.Status != models.RequestStatusBooked {
		t.Fatalf("status = %s, want booked", got.Status)
	}
	if got.EventID == nil || *got.EventID != eventID {
		t.Fatalf("event_id = %v, want %v", got.EventID, eventID)
	}
}

func TestPublicRequestRepoExpireStale(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.expire@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()

	// Pending request backdated 20 days (stale).
	staleID := seedPublicRequest(t, pool, userID, "old@test.dev", models.RequestStatusPending)
	if _, err := pool.Exec(ctx,
		`UPDATE public_requests SET last_status_change = NOW() - INTERVAL '20 days' WHERE id = $1`,
		staleID); err != nil {
		t.Fatalf("backdate stale: %v", err)
	}
	// Pending request recent (keep).
	seedPublicRequest(t, pool, userID, "new@test.dev", models.RequestStatusPending)

	n, err := repo.ExpireStale(ctx, 14)
	if err != nil {
		t.Fatalf("ExpireStale error = %v", err)
	}
	if n != 1 {
		t.Fatalf("expired = %d, want 1", n)
	}
	got, _ := repo.GetByID(ctx, staleID, userID)
	if got.Status != models.RequestStatusExpired {
		t.Fatalf("stale status = %s, want expired", got.Status)
	}
}

func TestPublicResponseRepoCreateAndList(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.resp@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()
	reqID := seedPublicRequest(t, pool, userID, "resp@test.dev", models.RequestStatusPending)

	msg := "includes setup"
	resp := &models.PublicResponse{
		RequestID:       reqID,
		OrganizerUserID: userID,
		QuoteAmount:     4500,
		Currency:        "MXN",
		Inclusions:      []string{"DJ", "Catering", "Decor"},
		Message:         &msg,
	}
	if err := repo.CreateResponse(ctx, resp); err != nil {
		t.Fatalf("CreateResponse error = %v", err)
	}
	if resp.ID == uuid.Nil {
		t.Fatal("CreateResponse should populate id")
	}

	list, err := repo.ListResponsesByRequest(ctx, reqID, userID)
	if err != nil {
		t.Fatalf("ListResponsesByRequest error = %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("responses = %d, want 1", len(list))
	}
	if list[0].QuoteAmount != 4500 || len(list[0].Inclusions) != 3 {
		t.Fatalf("response roundtrip mismatch: %+v", list[0])
	}

	// Foreign organizer sees nothing.
	foreign, err := repo.ListResponsesByRequest(ctx, reqID, uuid.New())
	if err != nil {
		t.Fatalf("foreign error = %v", err)
	}
	if len(foreign) != 0 {
		t.Fatalf("foreign responses = %d, want 0", len(foreign))
	}
}
