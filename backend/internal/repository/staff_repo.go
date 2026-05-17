package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
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
	Location       *string    `json:"location,omitempty"`
	City           *string    `json:"city,omitempty"`
	ContactName    *string    `json:"contact_name,omitempty"`
	ContactPhone   *string    `json:"contact_phone,omitempty"`
	OrganizerNotes *string    `json:"organizer_notes,omitempty"`
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

type TeamMemberChangeEvent struct {
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"event_id"`
	EventStaffID uuid.UUID `json:"event_staff_id"`
	EventName    string    `json:"event_name"`
	EventDate    string    `json:"event_date"`
	ChangeType   string    `json:"change_type"`
	FieldName    string    `json:"field_name"`
	OldValue     *string   `json:"old_value,omitempty"`
	NewValue     *string   `json:"new_value,omitempty"`
	OccurredAt   string    `json:"occurred_at"`
	ReadAt       *string   `json:"read_at,omitempty"`
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

	// Include invited team-member blocked dates so organizers see them as
	// unavailable in assignment flows that consume this endpoint.
	blockedRows, err := r.pool.Query(ctx, `
		SELECT s.id, s.name, ud.id, ud.start_date, ud.reason
		FROM unavailable_dates ud
		JOIN staff s ON s.invited_user_id = ud.user_id
		WHERE s.user_id = $1
			AND ud.start_date <= $3::date
			AND ud.end_date >= $2::date
		ORDER BY s.name, ud.start_date`, userID, start, end)
	if err != nil {
		return nil, fmt.Errorf("query blocked staff availability: %w", err)
	}
	defer blockedRows.Close()

	for blockedRows.Next() {
		var (
			staffID   uuid.UUID
			staffName string
			blockID   uuid.UUID
			startDate time.Time
			reason    *string
		)
		if err := blockedRows.Scan(&staffID, &staffName, &blockID, &startDate, &reason); err != nil {
			return nil, fmt.Errorf("scan blocked staff availability: %w", err)
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

		eventName := "No disponible"
		if reason != nil && strings.TrimSpace(*reason) != "" {
			eventName = "No disponible: " + strings.TrimSpace(*reason)
		}

		entry.Assignments = append(entry.Assignments, StaffAvailabilityAssignment{
			EventID:   blockID,
			EventName: eventName,
			EventDate: startDate.Format("2006-01-02"),
			Status:    models.AssignmentStatusConfirmed,
		})
	}
	if err := blockedRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate blocked staff availability: %w", err)
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
			COALESCE(es.status, 'confirmed'), e.location, e.city, c.name, c.phone, e.notes,
			es.fee_amount, es.role_override, es.notes,
			es.shift_start, es.shift_end, es.offer_group_id, es.offer_slots,
			es.notification_last_result, es.notification_sent_at
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		JOIN events e ON e.id = es.event_id
		LEFT JOIN clients c ON c.id = e.client_id
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
			&item.Location,
			&item.City,
			&item.ContactName,
			&item.ContactPhone,
			&item.OrganizerNotes,
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
			e.location, e.city, c.name, c.phone, e.notes,
			es.fee_amount, es.role_override, es.notes
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		JOIN events e ON e.id = es.event_id
		LEFT JOIN clients c ON c.id = e.client_id
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
			&item.Location,
			&item.City,
			&item.ContactName,
			&item.ContactPhone,
			&item.OrganizerNotes,
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

type teamMemberSnapshot struct {
	EventStaffID uuid.UUID
	EventID      uuid.UUID
	Location     *string
	City         *string
	RoleOverride *string
	ShiftStart   *string
	ShiftEnd     *string
	Status       *string
}

func (r *StaffRepo) SyncTimelineSnapshots(ctx context.Context, invitedUserID uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin sync timeline tx: %w", err)
	}
	defer tx.Rollback(ctx)

	currentRows, err := tx.Query(ctx, `
		SELECT es.id, es.event_id, e.location, e.city, es.role_override,
			es.shift_start, es.shift_end, COALESCE(es.status, 'confirmed')
		FROM event_staff es
		JOIN staff s ON s.id = es.staff_id
		JOIN events e ON e.id = es.event_id
		WHERE s.invited_user_id = $1
	`, invitedUserID)
	if err != nil {
		return fmt.Errorf("query current timeline snapshot source: %w", err)
	}
	defer currentRows.Close()

	current := make(map[uuid.UUID]teamMemberSnapshot)
	for currentRows.Next() {
		var (
			rec        teamMemberSnapshot
			shiftStart *time.Time
			shiftEnd   *time.Time
			status     string
		)
		if err := currentRows.Scan(
			&rec.EventStaffID,
			&rec.EventID,
			&rec.Location,
			&rec.City,
			&rec.RoleOverride,
			&shiftStart,
			&shiftEnd,
			&status,
		); err != nil {
			return fmt.Errorf("scan current timeline snapshot source: %w", err)
		}
		if shiftStart != nil {
			s := shiftStart.UTC().Format(time.RFC3339)
			rec.ShiftStart = &s
		}
		if shiftEnd != nil {
			s := shiftEnd.UTC().Format(time.RFC3339)
			rec.ShiftEnd = &s
		}
		statusCopy := status
		rec.Status = &statusCopy
		current[rec.EventStaffID] = rec
	}
	if err := currentRows.Err(); err != nil {
		return fmt.Errorf("iterate current timeline snapshot source: %w", err)
	}

	snapRows, err := tx.Query(ctx, `
		SELECT event_staff_id, event_id, location, city, role_override,
			shift_start, shift_end, status
		FROM team_member_assignment_snapshots
		WHERE invited_user_id = $1
	`, invitedUserID)
	if err != nil {
		return fmt.Errorf("query timeline snapshots: %w", err)
	}
	defer snapRows.Close()

	snapshots := make(map[uuid.UUID]teamMemberSnapshot)
	for snapRows.Next() {
		var (
			rec        teamMemberSnapshot
			shiftStart *time.Time
			shiftEnd   *time.Time
		)
		if err := snapRows.Scan(
			&rec.EventStaffID,
			&rec.EventID,
			&rec.Location,
			&rec.City,
			&rec.RoleOverride,
			&shiftStart,
			&shiftEnd,
			&rec.Status,
		); err != nil {
			return fmt.Errorf("scan timeline snapshots: %w", err)
		}
		if shiftStart != nil {
			s := shiftStart.UTC().Format(time.RFC3339)
			rec.ShiftStart = &s
		}
		if shiftEnd != nil {
			s := shiftEnd.UTC().Format(time.RFC3339)
			rec.ShiftEnd = &s
		}
		snapshots[rec.EventStaffID] = rec
	}
	if err := snapRows.Err(); err != nil {
		return fmt.Errorf("iterate timeline snapshots: %w", err)
	}

	type changeField struct {
		changeType string
		field      string
		oldValue   *string
		newValue   *string
	}

	buildChanges := func(oldRec, newRec teamMemberSnapshot) []changeField {
		changes := make([]changeField, 0)
		if nullableString(oldRec.Location) != nullableString(newRec.Location) {
			changes = append(changes, changeField{changeType: "location_changed", field: "location", oldValue: oldRec.Location, newValue: newRec.Location})
		}
		if nullableString(oldRec.City) != nullableString(newRec.City) {
			changes = append(changes, changeField{changeType: "location_changed", field: "city", oldValue: oldRec.City, newValue: newRec.City})
		}
		if nullableString(oldRec.RoleOverride) != nullableString(newRec.RoleOverride) {
			changes = append(changes, changeField{changeType: "role_changed", field: "role_override", oldValue: oldRec.RoleOverride, newValue: newRec.RoleOverride})
		}
		if nullableString(oldRec.ShiftStart) != nullableString(newRec.ShiftStart) {
			changes = append(changes, changeField{changeType: "shift_changed", field: "shift_start", oldValue: oldRec.ShiftStart, newValue: newRec.ShiftStart})
		}
		if nullableString(oldRec.ShiftEnd) != nullableString(newRec.ShiftEnd) {
			changes = append(changes, changeField{changeType: "shift_changed", field: "shift_end", oldValue: oldRec.ShiftEnd, newValue: newRec.ShiftEnd})
		}
		if nullableString(oldRec.Status) != nullableString(newRec.Status) {
			changes = append(changes, changeField{changeType: "status_changed", field: "status", oldValue: oldRec.Status, newValue: newRec.Status})
		}
		return changes
	}

	insertEvent := func(eventStaffID, eventID uuid.UUID, changeType, field string, oldValue, newValue *string) error {
		rawHash := fmt.Sprintf("%s|%s|%s|%s|%s", eventStaffID.String(), field, nullableString(oldValue), nullableString(newValue), changeType)
		hash := sha256.Sum256([]byte(rawHash))
		sourceHash := hex.EncodeToString(hash[:])
		_, err := tx.Exec(ctx, `
			INSERT INTO team_member_change_events (
				invited_user_id, event_id, event_staff_id,
				change_type, field_name, old_value, new_value, source_hash
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (invited_user_id, source_hash) DO NOTHING
		`, invitedUserID, eventID, eventStaffID, changeType, field, oldValue, newValue, sourceHash)
		if err != nil {
			return fmt.Errorf("insert team member change event: %w", err)
		}
		return nil
	}

	for eventStaffID, cur := range current {
		snap, exists := snapshots[eventStaffID]
		if !exists {
			if err := insertEvent(eventStaffID, cur.EventID, "assignment_added", "status", nil, cur.Status); err != nil {
				return err
			}
		} else {
			for _, ch := range buildChanges(snap, cur) {
				if err := insertEvent(eventStaffID, cur.EventID, ch.changeType, ch.field, ch.oldValue, ch.newValue); err != nil {
					return err
				}
			}
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO team_member_assignment_snapshots (
				invited_user_id, event_staff_id, event_id, location, city,
				role_override, shift_start, shift_end, status, updated_at
			)
			VALUES (
				$1, $2, $3, $4, $5, $6,
				$7::timestamptz, $8::timestamptz, $9, NOW()
			)
			ON CONFLICT (invited_user_id, event_staff_id) DO UPDATE SET
				event_id = EXCLUDED.event_id,
				location = EXCLUDED.location,
				city = EXCLUDED.city,
				role_override = EXCLUDED.role_override,
				shift_start = EXCLUDED.shift_start,
				shift_end = EXCLUDED.shift_end,
				status = EXCLUDED.status,
				updated_at = NOW()
		`, invitedUserID, cur.EventStaffID, cur.EventID, cur.Location, cur.City, cur.RoleOverride, cur.ShiftStart, cur.ShiftEnd, cur.Status)
		if err != nil {
			return fmt.Errorf("upsert timeline snapshot: %w", err)
		}
	}

	for eventStaffID, snap := range snapshots {
		if _, exists := current[eventStaffID]; exists {
			continue
		}
		removed := "removed"
		if err := insertEvent(eventStaffID, snap.EventID, "assignment_removed", "status", snap.Status, &removed); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx,
			`DELETE FROM team_member_assignment_snapshots WHERE invited_user_id = $1 AND event_staff_id = $2`,
			invitedUserID, eventStaffID,
		); err != nil {
			return fmt.Errorf("delete stale timeline snapshot: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit sync timeline tx: %w", err)
	}

	return nil
}

func (r *StaffRepo) ListMyTimeline(ctx context.Context, invitedUserID uuid.UUID, unreadOnly bool, limit int) ([]TeamMemberChangeEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}

	if err := r.SyncTimelineSnapshots(ctx, invitedUserID); err != nil {
		return nil, err
	}

	query := `
		SELECT c.id, c.event_id, c.event_staff_id,
			e.service_type, e.event_date,
			c.change_type, c.field_name, c.old_value, c.new_value,
			c.occurred_at, c.read_at
		FROM team_member_change_events c
		JOIN events e ON e.id = c.event_id
		WHERE c.invited_user_id = $1
	`
	args := []any{invitedUserID}
	if unreadOnly {
		query += ` AND c.read_at IS NULL`
	}
	query += ` ORDER BY c.occurred_at DESC, c.created_at DESC LIMIT $2`
	args = append(args, limit)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query my timeline: %w", err)
	}
	defer rows.Close()

	items := make([]TeamMemberChangeEvent, 0)
	for rows.Next() {
		var (
			item       TeamMemberChangeEvent
			eventDate  time.Time
			occurredAt time.Time
			readAt     *time.Time
		)
		if err := rows.Scan(
			&item.ID,
			&item.EventID,
			&item.EventStaffID,
			&item.EventName,
			&eventDate,
			&item.ChangeType,
			&item.FieldName,
			&item.OldValue,
			&item.NewValue,
			&occurredAt,
			&readAt,
		); err != nil {
			return nil, fmt.Errorf("scan my timeline row: %w", err)
		}
		item.EventDate = eventDate.Format("2006-01-02")
		item.OccurredAt = occurredAt.UTC().Format(time.RFC3339)
		if readAt != nil {
			s := readAt.UTC().Format(time.RFC3339)
			item.ReadAt = &s
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate my timeline rows: %w", err)
	}

	return items, nil
}

func (r *StaffRepo) MarkTimelineRead(ctx context.Context, invitedUserID uuid.UUID, ids []uuid.UUID) (int64, error) {
	if len(ids) == 0 {
		tag, err := r.pool.Exec(ctx,
			`UPDATE team_member_change_events SET read_at = NOW() WHERE invited_user_id = $1 AND read_at IS NULL`,
			invitedUserID,
		)
		if err != nil {
			return 0, fmt.Errorf("mark all timeline events read: %w", err)
		}
		return tag.RowsAffected(), nil
	}

	tag, err := r.pool.Exec(ctx,
		`UPDATE team_member_change_events
		 SET read_at = NOW()
		 WHERE invited_user_id = $1 AND id = ANY($2) AND read_at IS NULL`,
		invitedUserID,
		ids,
	)
	if err != nil {
		return 0, fmt.Errorf("mark timeline events read by ids: %w", err)
	}

	return tag.RowsAffected(), nil
}

func nullableString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
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
