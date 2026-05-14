package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

var (
	ErrAssignmentNotFound   = errors.New("assignment not found")
	ErrAssignmentForbidden  = errors.New("assignment does not belong to current user")
	ErrAssignmentNotPending = errors.New("assignment is not pending")
	ErrOfferAlreadyFilled   = errors.New("offer slots are already filled")
)

type StaffRepo struct {
	pool *pgxpool.Pool
}

func NewStaffRepo(pool *pgxpool.Pool) *StaffRepo {
	return &StaffRepo{pool: pool}
}

func (r *StaffRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM staff WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}

const staffColumns = `id, user_id, name, role_label, phone, email, notes,
	notification_email_opt_in, invited_user_id, created_at, updated_at`

func scanStaff(rows interface {
	Scan(...any) error
}, s *models.Staff) error {
	return rows.Scan(&s.ID, &s.UserID, &s.Name, &s.RoleLabel, &s.Phone, &s.Email,
		&s.Notes, &s.NotificationEmailOptIn, &s.InvitedUserID, &s.CreatedAt, &s.UpdatedAt)
}

func scanStaffWithInvite(row interface {
	Scan(...any) error
}, s *models.Staff) error {
	var inviteStatus sql.NullString
	if err := row.Scan(&s.ID, &s.UserID, &s.Name, &s.RoleLabel, &s.Phone, &s.Email,
		&s.Notes, &s.NotificationEmailOptIn, &s.InvitedUserID, &s.CreatedAt, &s.UpdatedAt, &inviteStatus); err != nil {
		return err
	}
	if inviteStatus.Valid {
		s.InviteStatus = &inviteStatus.String
	} else {
		s.InviteStatus = nil
	}
	return nil
}

func (r *StaffRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Staff, error) {
	query := fmt.Sprintf(`SELECT %s FROM staff WHERE user_id = $1 ORDER BY name LIMIT %d`,
		staffColumns, GetAllSafetyLimit)
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]models.Staff, 0)
	for rows.Next() {
		var s models.Staff
		if err := scanStaff(rows, &s); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating staff: %w", err)
	}
	return result, nil
}

var staffAllowedSortCols = []string{"name", "created_at", "role_label"}

func (r *StaffRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Staff, int, error) {
	sortCol = safeSortColumn(sortCol, staffAllowedSortCols, "name")
	order = safeSortOrder(order)

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM staff WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count staff: %w", err)
	}

	query := fmt.Sprintf(`SELECT %s FROM staff WHERE user_id = $1
		ORDER BY %s %s LIMIT $2 OFFSET $3`, staffColumns, sortCol, order)
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	result := make([]models.Staff, 0)
	for rows.Next() {
		var s models.Staff
		if err := scanStaff(rows, &s); err != nil {
			return nil, 0, err
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating paginated staff: %w", err)
	}
	return result, total, nil
}

func (r *StaffRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Staff, error) {
	s := &models.Staff{}
	query := fmt.Sprintf(`SELECT %s, i.status
		FROM staff s
		LEFT JOIN LATERAL (
			SELECT status
			FROM staff_invites
			WHERE staff_id = s.id AND owner_user_id = s.user_id AND status = 'pending'
			ORDER BY created_at DESC
			LIMIT 1
		) i ON TRUE
		WHERE s.id = $1 AND s.user_id = $2`, staffColumns)
	row := r.pool.QueryRow(ctx, query, id, userID)
	if err := scanStaffWithInvite(row, s); err != nil {
		return nil, fmt.Errorf("staff not found: %w", err)
	}
	return s, nil
}

func (r *StaffRepo) Create(ctx context.Context, s *models.Staff) error {
	query := `INSERT INTO staff (user_id, name, role_label, phone, email, notes, notification_email_opt_in)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		s.UserID, s.Name, s.RoleLabel, s.Phone, s.Email, s.Notes, s.NotificationEmailOptIn,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *StaffRepo) Update(ctx context.Context, s *models.Staff) error {
	query := `UPDATE staff SET name=$3, role_label=$4, phone=$5, email=$6, notes=$7,
		notification_email_opt_in=$8, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		s.ID, s.UserID, s.Name, s.RoleLabel, s.Phone, s.Email, s.Notes, s.NotificationEmailOptIn,
	).Scan(&s.CreatedAt, &s.UpdatedAt)
}

func (r *StaffRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM staff WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("staff not found")
	}
	return nil
}

// Search performs a fuzzy search on staff using ILIKE + pg_trgm similarity.
func (r *StaffRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Staff, error) {
	sqlQuery := fmt.Sprintf(`SELECT %s FROM staff
		WHERE user_id = $1
		AND (
			name ILIKE '%%' || $2 || '%%' OR
			role_label ILIKE '%%' || $2 || '%%' OR
			email ILIKE '%%' || $2 || '%%' OR
			phone ILIKE '%%' || $2 || '%%' OR
			similarity(name, $2) > 0.3
		)
		ORDER BY similarity(name, $2) DESC, created_at DESC
		LIMIT 10`, staffColumns)

	rows, err := r.pool.Query(ctx, sqlQuery, userID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]models.Staff, 0)
	for rows.Next() {
		var s models.Staff
		if err := scanStaff(rows, &s); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating staff search: %w", err)
	}
	return result, nil
}

// StaffAvailabilityAssignment is a single assignment for a staff member inside a
// date window, used to surface "who is busy" in the event form.
type StaffAvailabilityAssignment struct {
	EventID    uuid.UUID `json:"event_id"`
	EventName  string    `json:"event_name"`
	EventDate  string    `json:"event_date"`
	ShiftStart *string   `json:"shift_start,omitempty"`
	ShiftEnd   *string   `json:"shift_end,omitempty"`
	Status     string    `json:"status"`
}

// StaffAvailability groups assignments per staff inside a date window.
// Staff without assignments in the window are NOT included (they are free).
type StaffAvailability struct {
	StaffID     uuid.UUID                     `json:"staff_id"`
	StaffName   string                        `json:"staff_name"`
	Assignments []StaffAvailabilityAssignment `json:"assignments"`
}

// TeamMemberAssignment is the team-member portal projection of an event_staff row.
type TeamMemberAssignment struct {
	EventStaffID   uuid.UUID  `json:"event_staff_id"`
	EventID        uuid.UUID  `json:"event_id"`
	EventName      string     `json:"event_name"`
	EventDate      string     `json:"event_date"`
	StaffID        uuid.UUID  `json:"staff_id"`
	Status         string     `json:"status"`
	FeeAmount      *float64   `json:"fee_amount,omitempty"`
	RoleOverride   *string    `json:"role_override,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	ShiftStart     *string    `json:"shift_start,omitempty"`
	ShiftEnd       *string    `json:"shift_end,omitempty"`
	OfferGroupID   *uuid.UUID `json:"offer_group_id,omitempty"`
	OfferSlots     *int       `json:"offer_slots,omitempty"`
	Notification   *string    `json:"notification_last_result,omitempty"`
	NotificationAt *string    `json:"notification_sent_at,omitempty"`
}

// AssignmentResponseOutcome returns the resolved state after accept/decline.
type AssignmentResponseOutcome struct {
	EventStaffID      uuid.UUID `json:"event_staff_id"`
	FinalStatus       string    `json:"final_status"`
	SeatsRemaining    int       `json:"seats_remaining"`
	AutoDeclinedCount int       `json:"auto_declined_count"`
}

// GetAvailability returns busy staff for the user in [start, end] inclusive.
// Dates are YYYY-MM-DD strings matching events.event_date. Only staff with at
// least one assignment in the window are returned; the UI infers "free" from
// absence.
func (r *StaffRepo) GetAvailability(ctx context.Context, userID uuid.UUID, start, end string) ([]StaffAvailability, error) {
	query := `
		SELECT s.id, s.name, e.id, e.service_type, e.event_date,
			es.shift_start, es.shift_end, es.status
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		JOIN events e ON e.id = es.event_id
		WHERE s.user_id = $1
			AND e.event_date BETWEEN $2::date AND $3::date
			AND es.status IN ('pending', 'confirmed')
		ORDER BY s.name, e.event_date`

	rows, err := r.pool.Query(ctx, query, userID, start, end)
	if err != nil {
		return nil, fmt.Errorf("query staff availability: %w", err)
	}
	defer rows.Close()

	byStaff := make(map[uuid.UUID]*StaffAvailability)
	order := make([]uuid.UUID, 0)
	for rows.Next() {
		var (
			staffID    uuid.UUID
			staffName  string
			eventID    uuid.UUID
			eventName  string
			eventDate  time.Time
			shiftStart *time.Time
			shiftEnd   *time.Time
			status     string
		)
		if err := rows.Scan(&staffID, &staffName, &eventID, &eventName, &eventDate,
			&shiftStart, &shiftEnd, &status); err != nil {
			return nil, err
		}
		entry, ok := byStaff[staffID]
		if !ok {
			entry = &StaffAvailability{
				StaffID:     staffID,
				StaffName:   staffName,
				Assignments: []StaffAvailabilityAssignment{},
			}
			byStaff[staffID] = entry
			order = append(order, staffID)
		}
		a := StaffAvailabilityAssignment{
			EventID:   eventID,
			EventName: eventName,
			EventDate: eventDate.Format("2006-01-02"),
			Status:    status,
		}
		if shiftStart != nil {
			s := shiftStart.UTC().Format(time.RFC3339)
			a.ShiftStart = &s
		}
		if shiftEnd != nil {
			s := shiftEnd.UTC().Format(time.RFC3339)
			a.ShiftEnd = &s
		}
		entry.Assignments = append(entry.Assignments, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate staff availability: %w", err)
	}

	out := make([]StaffAvailability, 0, len(order))
	for _, id := range order {
		out = append(out, *byStaff[id])
	}
	return out, nil
}

// ListMyAssignments returns event assignments for the authenticated team-member.
func (r *StaffRepo) ListMyAssignments(ctx context.Context, invitedUserID uuid.UUID) ([]TeamMemberAssignment, error) {
	query := `
		SELECT es.id, es.event_id, e.service_type, e.event_date, es.staff_id,
			COALESCE(es.status, 'confirmed'), es.fee_amount, es.role_override, es.notes,
			es.shift_start, es.shift_end, es.offer_group_id, es.offer_slots,
			es.notification_last_result, es.notification_sent_at
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		JOIN events e ON e.id = es.event_id
		WHERE s.invited_user_id = $1
		ORDER BY e.event_date ASC, e.service_type ASC`

	rows, err := r.pool.Query(ctx, query, invitedUserID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "42703" {
			return r.listMyAssignmentsLegacy(ctx, invitedUserID)
		}
		return nil, fmt.Errorf("query my assignments: %w", err)
	}
	defer rows.Close()

	return scanMyAssignments(rows)
}

func scanMyAssignments(rows pgx.Rows) ([]TeamMemberAssignment, error) {

	items := make([]TeamMemberAssignment, 0)
	for rows.Next() {
		var (
			item               TeamMemberAssignment
			eventDate          time.Time
			shiftStart         *time.Time
			shiftEnd           *time.Time
			notificationSentAt *time.Time
		)
		if err := rows.Scan(
			&item.EventStaffID,
			&item.EventID,
			&item.EventName,
			&eventDate,
			&item.StaffID,
			&item.Status,
			&item.FeeAmount,
			&item.RoleOverride,
			&item.Notes,
			&shiftStart,
			&shiftEnd,
			&item.OfferGroupID,
			&item.OfferSlots,
			&item.Notification,
			&notificationSentAt,
		); err != nil {
			return nil, fmt.Errorf("scan my assignment: %w", err)
		}
		item.EventDate = eventDate.Format("2006-01-02")
		if shiftStart != nil {
			s := shiftStart.UTC().Format(time.RFC3339)
			item.ShiftStart = &s
		}
		if shiftEnd != nil {
			s := shiftEnd.UTC().Format(time.RFC3339)
			item.ShiftEnd = &s
		}
		if notificationSentAt != nil {
			s := notificationSentAt.UTC().Format(time.RFC3339)
			item.NotificationAt = &s
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate my assignments: %w", err)
	}

	return items, nil
}

func (r *StaffRepo) listMyAssignmentsLegacy(ctx context.Context, invitedUserID uuid.UUID) ([]TeamMemberAssignment, error) {
	query := `
		SELECT es.id, es.event_id, e.service_type, e.event_date, es.staff_id,
			es.fee_amount, es.role_override, es.notes
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		JOIN events e ON e.id = es.event_id
		WHERE s.invited_user_id = $1
		ORDER BY e.event_date ASC, e.service_type ASC`

	rows, err := r.pool.Query(ctx, query, invitedUserID)
	if err != nil {
		return nil, fmt.Errorf("query my assignments legacy: %w", err)
	}
	defer rows.Close()

	items := make([]TeamMemberAssignment, 0)
	for rows.Next() {
		var (
			item      TeamMemberAssignment
			eventDate time.Time
		)
		if err := rows.Scan(
			&item.EventStaffID,
			&item.EventID,
			&item.EventName,
			&eventDate,
			&item.StaffID,
			&item.FeeAmount,
			&item.RoleOverride,
			&item.Notes,
		); err != nil {
			return nil, fmt.Errorf("scan my assignment legacy: %w", err)
		}
		item.EventDate = eventDate.Format("2006-01-02")
		item.Status = models.AssignmentStatusConfirmed
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate my assignments legacy: %w", err)
	}

	return items, nil
}

// RespondToAssignment updates assignment status from the team-member portal.
// For grouped offers, acceptance is first-come-first-served and can auto-decline
// the remaining pending candidates when capacity is reached.
func (r *StaffRepo) RespondToAssignment(ctx context.Context, invitedUserID, eventStaffID uuid.UUID, response string) (*AssignmentResponseOutcome, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin respond assignment tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	var (
		status       string
		staffUserID  *uuid.UUID
		eventID      uuid.UUID
		offerGroupID *uuid.UUID
		offerSlots   *int
	)

	err = tx.QueryRow(ctx, `
		SELECT es.status, s.invited_user_id, es.event_id, es.offer_group_id, es.offer_slots
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		WHERE es.id = $1
		FOR UPDATE
	`, eventStaffID).Scan(&status, &staffUserID, &eventID, &offerGroupID, &offerSlots)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAssignmentNotFound
		}
		return nil, fmt.Errorf("load assignment for response: %w", err)
	}

	if staffUserID == nil || *staffUserID != invitedUserID {
		return nil, ErrAssignmentForbidden
	}

	if status != models.AssignmentStatusPending {
		return nil, ErrAssignmentNotPending
	}

	if response == "decline" {
		if _, err = tx.Exec(ctx,
			`UPDATE event_staff SET status = 'declined' WHERE id = $1`,
			eventStaffID,
		); err != nil {
			return nil, fmt.Errorf("decline assignment: %w", err)
		}

		if err = tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("commit decline assignment: %w", err)
		}

		return &AssignmentResponseOutcome{
			EventStaffID:      eventStaffID,
			FinalStatus:       models.AssignmentStatusDeclined,
			SeatsRemaining:    0,
			AutoDeclinedCount: 0,
		}, nil
	}

	seats := 1
	if offerSlots != nil && *offerSlots > 0 {
		seats = *offerSlots
	}

	if offerGroupID != nil {
		if _, err = tx.Exec(ctx,
			`SELECT 1 FROM event_staff WHERE event_id = $1 AND offer_group_id = $2 FOR UPDATE`,
			eventID,
			offerGroupID,
		); err != nil {
			return nil, fmt.Errorf("lock offer group rows: %w", err)
		}

		var confirmedCount int
		if err = tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM event_staff WHERE event_id = $1 AND offer_group_id = $2 AND status = 'confirmed'`,
			eventID,
			offerGroupID,
		).Scan(&confirmedCount); err != nil {
			return nil, fmt.Errorf("count confirmed in offer group: %w", err)
		}

		if confirmedCount >= seats {
			return nil, ErrOfferAlreadyFilled
		}
	}

	if _, err = tx.Exec(ctx,
		`UPDATE event_staff SET status = 'confirmed' WHERE id = $1`,
		eventStaffID,
	); err != nil {
		return nil, fmt.Errorf("accept assignment: %w", err)
	}

	result := &AssignmentResponseOutcome{
		EventStaffID: eventStaffID,
		FinalStatus:  models.AssignmentStatusConfirmed,
	}

	if offerGroupID != nil {
		var confirmedAfter int
		if err = tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM event_staff WHERE event_id = $1 AND offer_group_id = $2 AND status = 'confirmed'`,
			eventID,
			offerGroupID,
		).Scan(&confirmedAfter); err != nil {
			return nil, fmt.Errorf("count confirmed after accept: %w", err)
		}

		remaining := seats - confirmedAfter
		if remaining < 0 {
			remaining = 0
		}
		result.SeatsRemaining = remaining

		if remaining == 0 {
			tag, updErr := tx.Exec(ctx,
				`UPDATE event_staff
				 SET status = 'declined'
				 WHERE event_id = $1 AND offer_group_id = $2 AND status = 'pending'`,
				eventID,
				offerGroupID,
			)
			if updErr != nil {
				return nil, fmt.Errorf("auto decline remaining offer candidates: %w", updErr)
			}
			result.AutoDeclinedCount = int(tag.RowsAffected())
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit accept assignment: %w", err)
	}

	return result, nil
}

// CreateInvite revokes any existing pending invite for the same staff row and
// inserts a new pending invite atomically.
func (r *StaffRepo) CreateInvite(ctx context.Context, invite *models.StaffInvite) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx create invite: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	_, err = tx.Exec(ctx,
		`UPDATE staff_invites
			SET status='revoked', updated_at=NOW()
			WHERE staff_id=$1 AND owner_user_id=$2 AND status='pending'`,
		invite.StaffID, invite.OwnerUserID,
	)
	if err != nil {
		return fmt.Errorf("revoke existing pending invite: %w", err)
	}

	err = tx.QueryRow(ctx,
		`INSERT INTO staff_invites (staff_id, owner_user_id, email, token_hash, target_role, status, expires_at)
			VALUES ($1, $2, $3, $4, $5, 'pending', $6)
			RETURNING id, target_role, status, created_at, updated_at`,
		invite.StaffID,
		invite.OwnerUserID,
		invite.Email,
		invite.TokenHash,
		invite.TargetRole,
		invite.ExpiresAt,
	).Scan(&invite.ID, &invite.TargetRole, &invite.Status, &invite.CreatedAt, &invite.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert staff invite: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit create invite: %w", err)
	}
	return nil
}

// RevokeInvite marks the active pending invite for a staff member as revoked.
func (r *StaffRepo) RevokeInvite(ctx context.Context, staffID, ownerUserID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE staff_invites
			SET status='revoked', updated_at=NOW()
			WHERE staff_id=$1 AND owner_user_id=$2 AND status='pending'`,
		staffID, ownerUserID,
	)
	if err != nil {
		return fmt.Errorf("revoke staff invite: %w", err)
	}
	return nil
}
