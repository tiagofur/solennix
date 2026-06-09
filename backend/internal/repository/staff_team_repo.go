package repository

import (
	"errors"
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// Sentinel errors so handlers can classify failures without parsing messages.
// ErrStaffTeamNotFound maps to 404; ErrInvalidTeamMember (bad staff_id or
// cross-tenant) maps to 400. Anything else is treated as 500 by the handler
// with a generic message (details stay in the server logs).
var (
	ErrStaffTeamNotFound  = errors.New("staff team not found")
	ErrInvalidTeamMember  = errors.New("invalid team member")
)

type StaffTeamRepo struct {
	pool *pgxpool.Pool
}

func NewStaffTeamRepo(pool *pgxpool.Pool) *StaffTeamRepo {
	return &StaffTeamRepo{pool: pool}
}

const staffTeamColumns = `id, user_id, name, role_label, notes, created_at, updated_at`

// GetAll returns all teams for the user, each with a cheap member_count but
// NO member rows — the list view only needs the count.
// Uses a LEFT JOIN + GROUP BY instead of a correlated subquery to avoid N+1.
func (r *StaffTeamRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.StaffTeam, error) {
	query := fmt.Sprintf(`SELECT t.id, t.user_id, t.name, t.role_label, t.notes,
			t.created_at, t.updated_at,
			COUNT(m.staff_id) AS member_count
		FROM staff_teams t
		LEFT JOIN staff_team_members m ON m.team_id = t.id
		WHERE t.user_id = $1
		GROUP BY t.id
		ORDER BY t.name
		LIMIT %d`, GetAllSafetyLimit)
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]models.StaffTeam, 0)
	for rows.Next() {
		var t models.StaffTeam
		var count int
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.RoleLabel, &t.Notes,
			&t.CreatedAt, &t.UpdatedAt, &count); err != nil {
			return nil, err
		}
		c := count
		t.MemberCount = &c
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate staff_teams: %w", err)
	}
	return out, nil
}

// GetByID returns a single team with its members (joined with staff info).
func (r *StaffTeamRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.StaffTeam, error) {
	t := &models.StaffTeam{}
	row := r.pool.QueryRow(ctx, fmt.Sprintf(`SELECT %s FROM staff_teams
		WHERE id = $1 AND user_id = $2`, staffTeamColumns), id, userID)
	if err := row.Scan(&t.ID, &t.UserID, &t.Name, &t.RoleLabel, &t.Notes,
		&t.CreatedAt, &t.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrStaffTeamNotFound
		}
		return nil, fmt.Errorf("get staff team: %w", err)
	}
	members, err := r.getMembers(ctx, t.ID)
	if err != nil {
		return nil, err
	}
	t.Members = members
	return t, nil
}

func (r *StaffTeamRepo) getMembers(ctx context.Context, teamID uuid.UUID) ([]models.StaffTeamMember, error) {
	query := `SELECT m.team_id, m.staff_id, m.is_lead, m.position, m.created_at,
			s.name, s.role_label, s.phone, s.email
		FROM staff_team_members m
		LEFT JOIN staff s ON s.id = m.staff_id
		WHERE m.team_id = $1
		ORDER BY m.position ASC, s.name ASC`
	rows, err := r.pool.Query(ctx, query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]models.StaffTeamMember, 0)
	for rows.Next() {
		var m models.StaffTeamMember
		if err := rows.Scan(&m.TeamID, &m.StaffID, &m.IsLead, &m.Position, &m.CreatedAt,
			&m.StaffName, &m.StaffRoleLabel, &m.StaffPhone, &m.StaffEmail); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate staff_team_members: %w", err)
	}
	return out, nil
}

// Create inserts the team and its initial members in a transaction.
func (r *StaffTeamRepo) Create(ctx context.Context, t *models.StaffTeam) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx, `INSERT INTO staff_teams (user_id, name, role_label, notes)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`,
		t.UserID, t.Name, t.RoleLabel, t.Notes).
		Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert staff_team: %w", err)
	}

	if err := upsertTeamMembers(ctx, tx, t.ID, t.UserID, t.Members); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// Update replaces the team's meta AND its member list atomically.
// Members are diffed via full replace (DELETE missing + UPSERT provided) —
// there's no per-member state to preserve, so this is safe.
func (r *StaffTeamRepo) Update(ctx context.Context, t *models.StaffTeam) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `UPDATE staff_teams
		SET name = $3, role_label = $4, notes = $5, updated_at = NOW()
		WHERE id = $1 AND user_id = $2`,
		t.ID, t.UserID, t.Name, t.RoleLabel, t.Notes)
	if err != nil {
		return fmt.Errorf("update staff_team: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrStaffTeamNotFound
	}

	if _, err := tx.Exec(ctx, `DELETE FROM staff_team_members WHERE team_id = $1`, t.ID); err != nil {
		return fmt.Errorf("delete old members: %w", err)
	}
	if err := upsertTeamMembers(ctx, tx, t.ID, t.UserID, t.Members); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func upsertTeamMembers(ctx context.Context, tx pgx.Tx, teamID, userID uuid.UUID, members []models.StaffTeamMember) error {
	if len(members) == 0 {
		return nil
	}

	// Batch-fetch staff ownership in a single query to avoid N+1 (one SELECT per
	// member). Build a map of staff_id → user_id for O(1) ownership validation.
	staffIDs := make([]uuid.UUID, len(members))
	for i, m := range members {
		staffIDs[i] = m.StaffID
	}

	rows, err := tx.Query(ctx, `SELECT id, user_id FROM staff WHERE id = ANY($1)`, staffIDs)
	if err != nil {
		return fmt.Errorf("batch fetch staff ownership: %w", err)
	}
	ownerByStaffID := make(map[uuid.UUID]uuid.UUID, len(staffIDs))
	for rows.Next() {
		var sid, uid uuid.UUID
		if err := rows.Scan(&sid, &uid); err != nil {
			rows.Close()
			return fmt.Errorf("scan staff ownership: %w", err)
		}
		ownerByStaffID[sid] = uid
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate staff ownership: %w", err)
	}

	for _, m := range members {
		ownerID, found := ownerByStaffID[m.StaffID]
		if !found {
			// Bad client input (unknown staff_id) — callers map to 400.
			return fmt.Errorf("%w: staff_id %s not found", ErrInvalidTeamMember, m.StaffID)
		}
		if ownerID != userID {
			return fmt.Errorf("%w: staff_id %s does not belong to this user", ErrInvalidTeamMember, m.StaffID)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO staff_team_members
			(team_id, staff_id, is_lead, position) VALUES ($1, $2, $3, $4)`,
			teamID, m.StaffID, m.IsLead, m.Position); err != nil {
			return fmt.Errorf("insert staff_team_member: %w", err)
		}
	}
	return nil
}

func (r *StaffTeamRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM staff_teams WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrStaffTeamNotFound
	}
	return nil
}

func (r *StaffTeamRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM staff_teams WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}
