package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

func TestSecurityIDOR_CreatePayment_RejectsForeignEvent(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	ownerID := seedHandlersUser(t, pool, "idor.payment.owner@test.dev")
	attackerID := seedHandlersUser(t, pool, "idor.payment.attacker@test.dev")

	clientID := seedIDORClient(t, pool, ownerID, "Owner Client")
	eventID := seedIDOREvent(t, pool, ownerID, clientID, "2026-09-01")

	h := newIDORCRUDHandler(t, pool)

	req := idorReq(http.MethodPost, "/api/payments",
		`{"event_id":"`+eventID.String()+`","amount":100,"payment_date":"2026-09-01","payment_method":"cash"}`,
		attackerID,
	)
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("create payment on foreign event status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func TestSecurityIDOR_CreateEvent_RejectsForeignClient(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	ownerID := seedHandlersUser(t, pool, "idor.event.owner@test.dev")
	attackerID := seedHandlersUser(t, pool, "idor.event.attacker@test.dev")

	clientID := seedIDORClient(t, pool, ownerID, "Owner Client")

	h := newIDORCRUDHandler(t, pool)

	req := idorReq(http.MethodPost, "/api/events",
		`{"client_id":"`+clientID.String()+`","event_date":"2026-09-02","service_type":"catering","num_people":25,"status":"quoted","discount":0,"requires_invoice":false,"tax_rate":16,"tax_amount":16,"total_amount":100}`,
		attackerID,
	)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("create event with foreign client status=%d body=%s", rr.Code, rr.Body.String())
	}
}

func newIDORCRUDHandler(t *testing.T, pool *pgxpool.Pool) *CRUDHandler {
	t.Helper()
	h := NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		repository.NewUserRepo(pool),
		repository.NewUnavailableDateRepo(pool),
	)
	h.SetPool(pool)
	return h
}

func idorReq(method, path, body string, userID uuid.UUID) *http.Request {
	req := httptest.NewRequest(method, path, bytes.NewReader([]byte(body)))
	return req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
}

func seedIDORClient(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	client := &models.Client{
		UserID: userID,
		Name:   name,
		Phone:  "555-0199",
	}
	if err := repository.NewClientRepo(pool).Create(context.Background(), client); err != nil {
		t.Fatalf("seed client: %v", err)
	}
	return client.ID
}

func seedIDOREvent(t *testing.T, pool *pgxpool.Pool, userID, clientID uuid.UUID, date string) uuid.UUID {
	t.Helper()
	var eventID uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO events (user_id, client_id, event_date, service_type, num_people, status, total_amount)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, userID, clientID, date, "catering", 25, "quoted", 1000).Scan(&eventID)
	if err != nil {
		t.Fatalf("seed event: %v", err)
	}
	return eventID
}