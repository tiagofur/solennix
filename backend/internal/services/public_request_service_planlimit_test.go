package services

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// --- fakes for the plan-gate conversion path (convertToEventInTx / autoEventConvertTx) ---
//
// pgx.Tx is embedded so only Exec/QueryRow need real behaviour; any other
// call panics loudly instead of silently succeeding.

type mockUserPlanLookup struct {
	user *models.User
	err  error
}

func (m *mockUserPlanLookup) GetByID(_ context.Context, _ uuid.UUID) (*models.User, error) {
	return m.user, m.err
}

// fakePlanGateTx answers the advisory-lock Exec and the two COUNT queries the
// gate issues, and records INSERT statements so tests can assert that a
// blocked conversion writes nothing.
type fakePlanGateTx struct {
	pgx.Tx
	eventCount  int
	clientCount int
	execErr     error
	countErr    error
	inserts     []string
	locks       int
}

func (t *fakePlanGateTx) Exec(_ context.Context, sql string, _ ...any) (pgconn.CommandTag, error) {
	if t.execErr != nil {
		return pgconn.CommandTag{}, t.execErr
	}
	if strings.Contains(sql, "pg_advisory_xact_lock") {
		t.locks++
	}
	return pgconn.NewCommandTag("SELECT 1"), nil
}

func (t *fakePlanGateTx) QueryRow(_ context.Context, sql string, _ ...any) pgx.Row {
	lower := strings.ToLower(sql)
	switch {
	case strings.Contains(lower, "insert into"):
		t.inserts = append(t.inserts, sql)
		return &fakePlanGateRow{}
	case strings.Contains(lower, "count("):
		if t.countErr != nil {
			return &fakePlanGateRow{err: t.countErr}
		}
		if strings.Contains(lower, "from events") {
			return &fakePlanGateRow{count: t.eventCount}
		}
		return &fakePlanGateRow{count: t.clientCount}
	}
	return &fakePlanGateRow{}
}

// fakePlanGateRow.Scan fills the RETURNING shapes of the client/event INSERT
// helpers, or the single int the COUNT queries scan into.
type fakePlanGateRow struct {
	count int
	err   error
}

func (r *fakePlanGateRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	for _, d := range dest {
		switch v := d.(type) {
		case *int:
			*v = r.count
		case *int32:
			*v = int32(r.count)
		case *int64:
			*v = int64(r.count)
		case *float64:
			*v = 0
		case *uuid.UUID:
			*v = uuid.New()
		case *time.Time:
			now := time.Now()
			*v = now
		case *string:
			*v = ""
		}
	}
	return nil
}

func gateTestRequest(orgID uuid.UUID) *models.PublicRequest {
	name := "Ana"
	email := "client@example.com"
	date := "2026-11-20"
	etype := "Boda"
	guests := 10
	return &models.PublicRequest{
		ID:              uuid.New(),
		OrganizerUserID: orgID,
		Status:          models.RequestStatusAcceptedByClient,
		ContactName:     &name,
		ContactEmail:    email,
		EventDate:       &date,
		EventType:       &etype,
		GuestCount:      &guests,
	}
}

func newGateSvc(t *testing.T, user *models.User) *PublicRequestService {
	t.Helper()
	svc := newSvc(t, &mockRequestStore{}, &mockProfileLookup{}, &mockProductLookup{}, &mockUserSlugLookup{})
	if user != nil {
		svc.SetUserLookup(&mockUserPlanLookup{user: user})
	}
	return svc
}

// --- convertToEventInTx (manual ConvertToEvent) ---

func TestConvertToEventInTx_BasicAtEventLimit_BlockedWithoutWrites(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{eventCount: 4, clientCount: 0}

	_, err := svc.convertToEventInTx(context.Background(), tx, gateTestRequest(org))

	var ple *PlanLimitError
	require.ErrorAs(t, err, &ple, "gate must return *PlanLimitError")
	assert.Equal(t, "events", ple.Resource)
	assert.Equal(t, 4, ple.Current)
	assert.Equal(t, 4, ple.Limit)
	assert.Empty(t, tx.inserts, "no client/event rows may be written when the gate blocks")
}

func TestConvertToEventInTx_BasicAtClientLimit_BlockedWithoutWrites(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{eventCount: 1, clientCount: 20}

	_, err := svc.convertToEventInTx(context.Background(), tx, gateTestRequest(org))

	var ple *PlanLimitError
	require.ErrorAs(t, err, &ple)
	assert.Equal(t, "clients", ple.Resource)
	assert.Equal(t, 20, ple.Current)
	assert.Equal(t, 20, ple.Limit)
	assert.Empty(t, tx.inserts)
}

func TestConvertToEventInTx_BasicUnderLimits_Converts(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{eventCount: 3, clientCount: 19}
	req := gateTestRequest(org)

	_, err := svc.convertToEventInTx(context.Background(), tx, req)

	require.NoError(t, err)
	require.Len(t, tx.inserts, 2, "client + event inserts expected")
	assert.Contains(t, tx.inserts[0], "INSERT INTO clients")
	assert.Contains(t, tx.inserts[1], "INSERT INTO events")
	assert.Equal(t, models.RequestStatusBooked, req.Status)
}

func TestConvertToEventInTx_PaidPlan_SkipsGate(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "pro"})
	tx := &fakePlanGateTx{eventCount: 4, clientCount: 20}

	_, err := svc.convertToEventInTx(context.Background(), tx, gateTestRequest(org))

	require.NoError(t, err)
	assert.Zero(t, tx.locks, "paid plans must not touch the advisory locks")
	require.Len(t, tx.inserts, 2)
}

func TestConvertToEventInTx_NilUserLookup_SkipsGate(t *testing.T) {
	// Backward-compatible default: lookup is optional (nil in unit tests that
	// never wire it). Production always wires it in main.go.
	org := uuid.New()
	svc := newGateSvc(t, nil)
	tx := &fakePlanGateTx{eventCount: 4, clientCount: 20}

	_, err := svc.convertToEventInTx(context.Background(), tx, gateTestRequest(org))

	require.NoError(t, err)
	assert.Zero(t, tx.locks)
}

func TestConvertToEventInTx_GateInfraError_WrappedAsGateFailure(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{countErr: assert.AnError}

	_, err := svc.convertToEventInTx(context.Background(), tx, gateTestRequest(org))

	require.ErrorIs(t, err, errConvertGateFailed, "gate infra failures must be distinguishable from conversion failures")
	assert.Empty(t, tx.inserts)
}

// --- autoEventConvertTx (auto_event submit mode) ---

func TestAutoEventConvertTx_AtEventLimit_FallsBackToPending(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{eventCount: 4, clientCount: 0}
	req := gateTestRequest(org)

	fellBack, err := svc.autoEventConvertTx(context.Background(), tx, req)

	require.NoError(t, err, "auto_event must never fail the visitor submission on a plan limit")
	assert.True(t, fellBack)
	assert.Empty(t, tx.inserts)
	assert.NotEqual(t, models.RequestStatusBooked, req.Status, "request must stay pending for manual convert after upgrade")
}

func TestAutoEventConvertTx_GateInfraError_FallsBackToPending(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{countErr: assert.AnError}
	req := gateTestRequest(org)

	fellBack, err := svc.autoEventConvertTx(context.Background(), tx, req)

	require.NoError(t, err, "an unverifiable gate must keep the lead, not drop it")
	assert.True(t, fellBack)
}

func TestAutoEventConvertTx_UnderLimit_Converts(t *testing.T) {
	org := uuid.New()
	svc := newGateSvc(t, &models.User{ID: org, Plan: "basic"})
	tx := &fakePlanGateTx{eventCount: 3, clientCount: 19}
	req := gateTestRequest(org)

	fellBack, err := svc.autoEventConvertTx(context.Background(), tx, req)

	require.NoError(t, err)
	assert.False(t, fellBack)
	require.Len(t, tx.inserts, 2)
}
