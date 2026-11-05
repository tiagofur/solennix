package repository

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestStaffPendingInviteJoin_GuardsListDetailParity pins the shared pending
// invite lateral join: every staff read (GetAll, GetAllPaginated, Search,
// GetByID) must expose at most one 'pending' invite_status. If a future edit
// drifts one query away from the shared fragment, this fails without a DB.
func TestStaffPendingInviteJoin_GuardsListDetailParity(t *testing.T) {
	assert.Contains(t, staffPendingInviteJoin, "staff_invites")
	assert.Contains(t, staffPendingInviteJoin, "status = 'pending'")
	assert.Contains(t, staffPendingInviteJoin, "staff_id = s.id AND owner_user_id = s.user_id")
	assert.True(t, strings.Contains(strings.ToUpper(staffPendingInviteJoin), "LIMIT 1"),
		"join must expose at most one pending invite per staff row")
}

// seedStaffRow inserts a bare staff row owned by ownerID and returns its id.
func seedStaffRow(t *testing.T, pool *pgxpool.Pool, ownerID uuid.UUID, name string, email *string) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := pool.QueryRow(context.Background(),
		`INSERT INTO staff (user_id, name, email) VALUES ($1, $2, $3) RETURNING id`,
		ownerID, name, email,
	).Scan(&id)
	require.NoError(t, err, "seed staff row")
	return id
}

// seedInvite inserts a staff_invites row for the given staff/owner.
func seedInvite(t *testing.T, pool *pgxpool.Pool, staffID, ownerID uuid.UUID, email, tokenHash, status string) {
	t.Helper()
	_, err := pool.Exec(context.Background(),
		`INSERT INTO staff_invites (staff_id, owner_user_id, email, token_hash, target_role, status, expires_at)
		 VALUES ($1, $2, $3, $4, 'team_member', $5, NOW() + INTERVAL '7 days')`,
		staffID, ownerID, email, tokenHash, status)
	require.NoError(t, err, "seed invite with status %s", status)
}

// TestStaffInviteStatus_ListExposesPending is the S2 parity test: the staff
// listings must carry invite_status for rows with a pending invite (same as
// GetByID), and must NOT surface non-pending invites.
func TestStaffInviteStatus_ListExposesPending(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)
	ctx := context.Background()

	ownerID := seedUser(t, pool, "owner@example.com")
	repo := NewStaffRepo(pool)

	anaEmail := "ana@example.com"
	anaID := seedStaffRow(t, pool, ownerID, "Ana Pendiente", &anaEmail)
	seedInvite(t, pool, anaID, ownerID, anaEmail, "hash-pending-1", "pending")

	betoEmail := "beto@example.com"
	betoID := seedStaffRow(t, pool, ownerID, "Beto Revocado", &betoEmail)
	seedInvite(t, pool, betoID, ownerID, betoEmail, "hash-revoked-1", "revoked")

	seedStaffRow(t, pool, ownerID, "Ceci Sin Invite", nil)

	// GetAll (non-paginated listing).
	all, err := repo.GetAll(ctx, ownerID)
	require.NoError(t, err)
	require.Len(t, all, 3)
	got := make(map[string]*string, len(all))
	for _, s := range all {
		got[s.Name] = s.InviteStatus
	}
	require.NotNil(t, got["Ana Pendiente"], "GetAll must expose pending invite_status")
	assert.Equal(t, "pending", *got["Ana Pendiente"])
	assert.Nil(t, got["Beto Revocado"], "revoked invite must not surface as invite_status")
	assert.Nil(t, got["Ceci Sin Invite"], "staff without invite must have nil invite_status")

	// GetAllPaginated (paginated listing).
	paged, total, err := repo.GetAllPaginated(ctx, ownerID, 0, 20, "name", "ASC")
	require.NoError(t, err)
	assert.Equal(t, 3, total)
	require.Len(t, paged, 3)
	gotPaged := make(map[string]*string, len(paged))
	for _, s := range paged {
		gotPaged[s.Name] = s.InviteStatus
	}
	require.NotNil(t, gotPaged["Ana Pendiente"], "GetAllPaginated must expose pending invite_status")
	assert.Equal(t, "pending", *gotPaged["Ana Pendiente"])
	assert.Nil(t, gotPaged["Beto Revocado"])
	assert.Nil(t, gotPaged["Ceci Sin Invite"])

	// Search (?q= listing path).
	found, err := repo.Search(ctx, ownerID, "Ana")
	require.NoError(t, err)
	require.NotEmpty(t, found, "Search must find seeded staff")
	sawAna := false
	for _, s := range found {
		if s.Name == "Ana Pendiente" {
			sawAna = true
			require.NotNil(t, s.InviteStatus, "Search must expose pending invite_status")
			assert.Equal(t, "pending", *s.InviteStatus)
		}
	}
	assert.True(t, sawAna, "Search results must include Ana Pendiente")
}
