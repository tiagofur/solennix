package repository

import (
	"context"
	"fmt"
	"log/slog"
	"math"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type EventRepo struct {
	pool *pgxpool.Pool
}

func NewEventRepo(pool *pgxpool.Pool) *EventRepo {
	return &EventRepo{pool: pool}
}

const eventSelectFields = `e.id, e.user_id, e.client_id,
	to_char(e.event_date, 'YYYY-MM-DD') as event_date,
	to_char(e.start_time, 'HH24:MI:SS') as start_time,
	to_char(e.end_time, 'HH24:MI:SS') as end_time,
	e.service_type, e.num_people, e.status, e.discount, e.discount_type, e.requires_invoice,
	e.tax_rate, e.tax_amount, e.total_amount, e.location, e.city,
	e.deposit_percent, e.cancellation_days, e.refund_percent,
	e.notes, e.photos, e.created_at, e.updated_at`

func scanEvent(row pgx.Row) (*models.Event, error) {
	e := &models.Event{}
	err := row.Scan(
		&e.ID, &e.UserID, &e.ClientID, &e.EventDate, &e.StartTime, &e.EndTime,
		&e.ServiceType, &e.NumPeople, &e.Status, &e.Discount, &e.DiscountType, &e.RequiresInvoice,
		&e.TaxRate, &e.TaxAmount, &e.TotalAmount, &e.Location, &e.City,
		&e.DepositPercent, &e.CancellationDays, &e.RefundPercent,
		&e.Notes, &e.Photos, &e.CreatedAt, &e.UpdatedAt,
	)
	return e, err
}

func scanEventWithClient(row pgx.Row) (models.Event, error) {
	var e models.Event
	var clientName *string
	var clientPhone *string
	err := row.Scan(
		&e.ID, &e.UserID, &e.ClientID, &e.EventDate, &e.StartTime, &e.EndTime,
		&e.ServiceType, &e.NumPeople, &e.Status, &e.Discount, &e.DiscountType, &e.RequiresInvoice,
		&e.TaxRate, &e.TaxAmount, &e.TotalAmount, &e.Location, &e.City,
		&e.DepositPercent, &e.CancellationDays, &e.RefundPercent,
		&e.Notes, &e.Photos, &e.CreatedAt, &e.UpdatedAt,
		&clientName, &clientPhone,
	)
	if clientName != nil {
		e.Client = &models.Client{Name: *clientName}
		if clientPhone != nil {
			e.Client.Phone = *clientPhone
		}
	}
	return e, err
}

func (r *EventRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Event, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1 ORDER BY e.event_date DESC LIMIT %d`, eventSelectFields, GetAllSafetyLimit)
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		e, err := scanEventWithClient(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating events: %w", err)
	}
	return events, nil
}

var eventAllowedSortCols = []string{
	"e.event_date", "e.created_at", "e.total_amount", "e.status", "e.num_people",
}

func (r *EventRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Event, int, error) {
	sortCol = safeSortColumn(sortCol, eventAllowedSortCols, "e.event_date")
	order = safeSortOrder(order)

	var total int
	countQuery := `SELECT COUNT(*) FROM events WHERE user_id = $1`
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count events: %w", err)
	}

	query := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1 ORDER BY %s %s LIMIT $2 OFFSET $3`, eventSelectFields, sortCol, order)
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		e, err := scanEventWithClient(rows)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating paginated events: %w", err)
	}
	return events, total, nil
}

func (r *EventRepo) GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.Event, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1 AND e.event_date >= $2::date AND e.event_date <= $3::date
		ORDER BY e.event_date`, eventSelectFields)
	rows, err := r.pool.Query(ctx, query, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		e, err := scanEventWithClient(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating events by date range: %w", err)
	}
	return events, nil
}

func (r *EventRepo) GetByClientID(ctx context.Context, userID, clientID uuid.UUID) ([]models.Event, error) {
	query := fmt.Sprintf(`SELECT %s FROM events e WHERE e.user_id = $1 AND e.client_id = $2
		ORDER BY e.event_date DESC`, eventSelectFields)
	rows, err := r.pool.Query(ctx, query, userID, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		var e models.Event
		err := rows.Scan(
			&e.ID, &e.UserID, &e.ClientID, &e.EventDate, &e.StartTime, &e.EndTime,
			&e.ServiceType, &e.NumPeople, &e.Status, &e.Discount, &e.DiscountType, &e.RequiresInvoice,
			&e.TaxRate, &e.TaxAmount, &e.TotalAmount, &e.Location, &e.City,
			&e.DepositPercent, &e.CancellationDays, &e.RefundPercent,
			&e.Notes, &e.Photos, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating events by client: %w", err)
	}
	return events, nil
}

func (r *EventRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.id = $1 AND e.user_id = $2`, eventSelectFields)
	e, err := scanEventWithClient(r.pool.QueryRow(ctx, query, id, userID))
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *EventRepo) GetUpcoming(ctx context.Context, userID uuid.UUID, limit int) ([]models.Event, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1 AND e.event_date >= CURRENT_DATE AND e.status = 'confirmed'
		ORDER BY e.event_date ASC LIMIT $2`, eventSelectFields)
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		e, err := scanEventWithClient(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating upcoming events: %w", err)
	}
	return events, nil
}

func (r *EventRepo) CountCurrentMonth(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT count(*) FROM events 
		WHERE user_id = $1 
		AND date_trunc('month', event_date) = date_trunc('month', CURRENT_DATE)`
	
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *EventRepo) Create(ctx context.Context, e *models.Event) error {
	// Handle empty strings for time fields
	var startTime, endTime *string
	if e.StartTime != nil && *e.StartTime != "" {
		startTime = e.StartTime
	}
	if e.EndTime != nil && *e.EndTime != "" {
		endTime = e.EndTime
	}

	if e.DiscountType == "" {
		e.DiscountType = "percent"
	}
	query := `INSERT INTO events (user_id, client_id, event_date, start_time, end_time,
		service_type, num_people, status, discount, discount_type, requires_invoice,
		tax_rate, tax_amount, total_amount, location, city,
		deposit_percent, cancellation_days, refund_percent, notes, photos)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
		RETURNING id, created_at, updated_at`
	err := r.pool.QueryRow(ctx, query,
		e.UserID, e.ClientID, e.EventDate, startTime, endTime,
		e.ServiceType, e.NumPeople, e.Status, e.Discount, e.DiscountType, e.RequiresInvoice,
		e.TaxRate, e.TaxAmount, e.TotalAmount, e.Location, e.City,
		e.DepositPercent, e.CancellationDays, e.RefundPercent, e.Notes, e.Photos,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		slog.Error("Error creating event", "error", err)
		return err
	}
	return nil
}

func (r *EventRepo) Update(ctx context.Context, e *models.Event) error {
	// Handle empty strings for time fields
	var startTime, endTime *string
	if e.StartTime != nil && *e.StartTime != "" {
		startTime = e.StartTime
	}
	if e.EndTime != nil && *e.EndTime != "" {
		endTime = e.EndTime
	}

	if e.DiscountType == "" {
		e.DiscountType = "percent"
	}
	query := `UPDATE events SET client_id=$3, event_date=$4, start_time=$5, end_time=$6,
		service_type=$7, num_people=$8, status=$9, discount=$10, discount_type=$11, requires_invoice=$12,
		tax_rate=$13, tax_amount=$14, total_amount=$15, location=$16, city=$17,
		deposit_percent=$18, cancellation_days=$19, refund_percent=$20, notes=$21, photos=$22, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		e.ID, e.UserID, e.ClientID, e.EventDate, startTime, endTime,
		e.ServiceType, e.NumPeople, e.Status, e.Discount, e.DiscountType, e.RequiresInvoice,
		e.TaxRate, e.TaxAmount, e.TotalAmount, e.Location, e.City,
		e.DepositPercent, e.CancellationDays, e.RefundPercent, e.Notes, e.Photos,
	).Scan(&e.CreatedAt, &e.UpdatedAt)
}

func (r *EventRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM events WHERE id=$1 AND user_id=$2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("event not found")
	}
	return nil
}

// UpdateClientStats recalculates total_events and total_spent for a client.
// This replaces the Supabase trigger `update_client_stats`.
func (r *EventRepo) UpdateClientStats(ctx context.Context, clientID uuid.UUID) error {
	query := `UPDATE clients SET
		total_events = (SELECT COUNT(*) FROM events WHERE client_id = $1 AND status = 'completed'),
		total_spent = (SELECT COALESCE(SUM(total_amount), 0) FROM events WHERE client_id = $1 AND status = 'completed')
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, clientID)
	return err
}

// -- Event Products --

func (r *EventRepo) GetProducts(ctx context.Context, eventID uuid.UUID) ([]models.EventProduct, error) {
	query := `SELECT ep.id, ep.event_id, ep.product_id, ep.quantity, ep.unit_price,
		ep.discount, ep.total_price, ep.created_at, p.name
		FROM event_products ep LEFT JOIN products p ON ep.product_id = p.id
		WHERE ep.event_id = $1`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make([]models.EventProduct, 0)
	for rows.Next() {
		var ep models.EventProduct
		if err := rows.Scan(&ep.ID, &ep.EventID, &ep.ProductID, &ep.Quantity,
			&ep.UnitPrice, &ep.Discount, &ep.TotalPrice, &ep.CreatedAt, &ep.ProductName); err != nil {
			return nil, err
		}
		products = append(products, ep)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event products: %w", err)
	}
	return products, nil
}

func (r *EventRepo) GetExtras(ctx context.Context, eventID uuid.UUID) ([]models.EventExtra, error) {
	query := `SELECT id, event_id, description, cost, price, exclude_utility, include_in_checklist, created_at
		FROM event_extras WHERE event_id = $1`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	extras := make([]models.EventExtra, 0)
	for rows.Next() {
		var ee models.EventExtra
		if err := rows.Scan(&ee.ID, &ee.EventID, &ee.Description, &ee.Cost,
			&ee.Price, &ee.ExcludeUtility, &ee.IncludeInChecklist, &ee.CreatedAt); err != nil {
			return nil, err
		}
		extras = append(extras, ee)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event extras: %w", err)
	}
	return extras, nil
}

// UpdateEventItems replaces the Supabase RPC `update_event_items`.
// It atomically replaces all products, extras, and optionally equipment, supplies and staff for an event within a transaction.
func (r *EventRepo) UpdateEventItems(ctx context.Context, eventID uuid.UUID,
	products []models.EventProduct, extras []models.EventExtra,
	equipment *[]models.EventEquipment, supplies *[]models.EventSupply,
	staff *[]models.EventStaff) error {

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete existing
	if _, err := tx.Exec(ctx, "DELETE FROM event_products WHERE event_id=$1", eventID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "DELETE FROM event_extras WHERE event_id=$1", eventID); err != nil {
		return err
	}

	// Insert products
	for _, p := range products {
		_, err := tx.Exec(ctx,
			`INSERT INTO event_products (event_id, product_id, quantity, unit_price, discount)
			VALUES ($1, $2, $3, $4, $5)`,
			eventID, p.ProductID, p.Quantity, p.UnitPrice, p.Discount)
		if err != nil {
			return err
		}
	}

	// Insert extras
	for _, e := range extras {
		_, err := tx.Exec(ctx,
			`INSERT INTO event_extras (event_id, description, cost, price, exclude_utility, include_in_checklist)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			eventID, e.Description, e.Cost, e.Price, e.ExcludeUtility, e.IncludeInChecklist)
		if err != nil {
			return err
		}
	}

	// Insert equipment (only if provided — nil means skip, preserving backward compatibility)
	if equipment != nil {
		if _, err := tx.Exec(ctx, "DELETE FROM event_equipment WHERE event_id=$1", eventID); err != nil {
			return err
		}
		for _, eq := range *equipment {
			_, err := tx.Exec(ctx,
				`INSERT INTO event_equipment (event_id, inventory_id, quantity, notes)
				VALUES ($1, $2, $3, $4)`,
				eventID, eq.InventoryID, eq.Quantity, eq.Notes)
			if err != nil {
				return err
			}
		}
	}

	// Insert supplies (only if provided — nil means skip, preserving backward compatibility)
	if supplies != nil {
		if _, err := tx.Exec(ctx, "DELETE FROM event_supplies WHERE event_id=$1", eventID); err != nil {
			return err
		}
		for _, s := range *supplies {
			// Purchases always have a cost — force exclude_cost=false
			excludeCost := s.ExcludeCost
			if s.Source == "purchase" {
				excludeCost = false
			}
			_, err := tx.Exec(ctx,
				`INSERT INTO event_supplies (event_id, inventory_id, quantity, unit_cost, source, exclude_cost)
				VALUES ($1, $2, $3, $4, $5, $6)`,
				eventID, s.InventoryID, s.Quantity, s.UnitCost, s.Source, excludeCost)
			if err != nil {
				return err
			}
		}
	}

	// Upsert staff (only if provided — nil means skip, preserving backward compatibility).
	// UNLIKE equipment/supplies we DO NOT DELETE+INSERT here, because event_staff carries
	// the Phase 2 notification dedup state (`notification_sent_at`, `notification_last_result`).
	// A DELETE+INSERT would wipe that state and cause email spam on every event save.
	// Instead: DELETE rows no longer in the list, then UPSERT on (event_id, staff_id).
	if staff != nil {
		requestedStaffIDs := make([]uuid.UUID, 0, len(*staff))
		for _, st := range *staff {
			requestedStaffIDs = append(requestedStaffIDs, st.StaffID)
		}
		if len(requestedStaffIDs) == 0 {
			if _, err := tx.Exec(ctx, "DELETE FROM event_staff WHERE event_id=$1", eventID); err != nil {
				return err
			}
		} else {
			if _, err := tx.Exec(ctx,
				"DELETE FROM event_staff WHERE event_id=$1 AND NOT (staff_id = ANY($2))",
				eventID, requestedStaffIDs,
			); err != nil {
				return err
			}
		}
		for _, st := range *staff {
			// Preserve-on-nil semantics for fields that legacy clients may not
			// send at all. Without this, an older app version saving an event
			// would clobber shift windows and RSVP state set by newer clients.
			//
			// Tradeoff: a client can no longer clear a previously-set shift by
			// sending null alone — the UI must DELETE+re-add the assignment to
			// clear a shift. Same reasoning as `status`. If explicit clearing
			// becomes a real user need, add a `clear_shift` flag to the payload.
			var status *string
			if st.Status != nil && *st.Status != "" {
				status = st.Status
			}
			_, err := tx.Exec(ctx,
				`INSERT INTO event_staff (event_id, staff_id, fee_amount, role_override, notes,
					shift_start, shift_end, status)
				VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'confirmed'))
				ON CONFLICT (event_id, staff_id) DO UPDATE SET
					fee_amount = EXCLUDED.fee_amount,
					role_override = EXCLUDED.role_override,
					notes = EXCLUDED.notes,
					shift_start = COALESCE(EXCLUDED.shift_start, event_staff.shift_start),
					shift_end = COALESCE(EXCLUDED.shift_end, event_staff.shift_end),
					status = COALESCE($8, event_staff.status)`,
				eventID, st.StaffID, st.FeeAmount, st.RoleOverride, st.Notes,
				st.ShiftStart, st.ShiftEnd, status)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

// StaffPendingNotification is a row from event_staff JOIN staff that still
// needs a Phase 2 assignment email (opt-in by the staff, they have an email,
// and the organizer hasn't sent it yet for this assignment). Only returned
// in the state "nothing has been sent for this (event_id, staff_id) pair".
type StaffPendingNotification struct {
	EventStaffID uuid.UUID
	StaffID      uuid.UUID
	StaffName    string
	StaffEmail   string
	RoleLabel    *string
	RoleOverride *string
	FeeAmount    *float64
}

// GetStaffPendingNotifications returns event_staff rows that are ready for
// the Phase 2 email: the staff opted in, has an email, and no notification
// has been recorded yet for this assignment row (`notification_sent_at IS NULL`).
// The UPSERT pattern in UpdateEventItems preserves notification_sent_at across
// saves, so a re-save of an unchanged assignment won't re-notify.
func (r *EventRepo) GetStaffPendingNotifications(ctx context.Context, eventID uuid.UUID) ([]StaffPendingNotification, error) {
	query := `SELECT es.id, es.staff_id, s.name, s.email, s.role_label,
		es.role_override, es.fee_amount
		FROM event_staff es
		JOIN staff s ON es.staff_id = s.id
		WHERE es.event_id = $1
		AND es.notification_sent_at IS NULL
		AND s.notification_email_opt_in = true
		AND s.email IS NOT NULL
		AND length(trim(s.email)) > 0`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pending := make([]StaffPendingNotification, 0)
	for rows.Next() {
		var p StaffPendingNotification
		var email *string
		if err := rows.Scan(&p.EventStaffID, &p.StaffID, &p.StaffName, &email, &p.RoleLabel, &p.RoleOverride, &p.FeeAmount); err != nil {
			return nil, err
		}
		if email != nil {
			p.StaffEmail = *email
		}
		pending = append(pending, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating pending staff notifications: %w", err)
	}
	return pending, nil
}

// MarkStaffNotificationResult records the outcome of the Phase 2 email send
// attempt. `result` is "sent" or "failed:<reason>". Setting notification_sent_at
// is what prevents a retry loop; even on failure we set it so a transient
// Resend outage doesn't spam the inbox every time the organizer re-saves the
// event. The organizer can force a retry by removing and re-adding the staff.
func (r *EventRepo) MarkStaffNotificationResult(ctx context.Context, eventStaffID uuid.UUID, result string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE event_staff SET notification_sent_at = NOW(), notification_last_result = $2 WHERE id = $1`,
		eventStaffID, result)
	return err
}

// GetStaff returns all staff assigned to an event with joined denormalized fields
// from the staff catalog (name, role_label, phone, email) for display convenience.
func (r *EventRepo) GetStaff(ctx context.Context, eventID uuid.UUID) ([]models.EventStaff, error) {
	query := `SELECT es.id, es.event_id, es.staff_id, es.fee_amount, es.role_override,
		es.notes, es.shift_start, es.shift_end, es.status,
		es.notification_sent_at, es.notification_last_result, es.created_at,
		s.name, s.role_label, s.phone, s.email
		FROM event_staff es
		LEFT JOIN staff s ON es.staff_id = s.id
		WHERE es.event_id = $1
		ORDER BY s.name`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.EventStaff, 0)
	for rows.Next() {
		var es models.EventStaff
		var status string
		if err := rows.Scan(&es.ID, &es.EventID, &es.StaffID, &es.FeeAmount,
			&es.RoleOverride, &es.Notes, &es.ShiftStart, &es.ShiftEnd, &status,
			&es.NotificationSentAt, &es.NotificationLastResult,
			&es.CreatedAt, &es.StaffName, &es.StaffRoleLabel, &es.StaffPhone, &es.StaffEmail); err != nil {
			return nil, err
		}
		statusCopy := status
		es.Status = &statusCopy
		items = append(items, es)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event staff: %w", err)
	}
	return items, nil
}

// -- Event Equipment --

func (r *EventRepo) GetEquipment(ctx context.Context, eventID uuid.UUID) ([]models.EventEquipment, error) {
	query := `SELECT ee.id, ee.event_id, ee.inventory_id, ee.quantity, ee.notes, ee.created_at,
		i.ingredient_name, i.unit, i.current_stock
		FROM event_equipment ee LEFT JOIN inventory i ON ee.inventory_id = i.id
		WHERE ee.event_id = $1`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.EventEquipment, 0)
	for rows.Next() {
		var eq models.EventEquipment
		if err := rows.Scan(&eq.ID, &eq.EventID, &eq.InventoryID, &eq.Quantity,
			&eq.Notes, &eq.CreatedAt, &eq.EquipmentName, &eq.Unit, &eq.CurrentStock); err != nil {
			return nil, err
		}
		items = append(items, eq)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event equipment: %w", err)
	}
	return items, nil
}

func (r *EventRepo) CheckEquipmentConflicts(ctx context.Context, userID uuid.UUID,
	eventDate string, startTime, endTime *string, inventoryIDs []uuid.UUID, excludeEventID *uuid.UUID) ([]models.EquipmentConflict, error) {

	if len(inventoryIDs) == 0 {
		return nil, nil
	}

	// Build the query: find events on the same date that use any of the given equipment
	// A conflict exists when:
	// 1. Either event has NULL times → full-day conflict
	// 2. Time ranges overlap or gap < 1 hour
	query := `SELECT ee.inventory_id, i.ingredient_name, e.id, to_char(e.event_date, 'YYYY-MM-DD'),
		to_char(e.start_time, 'HH24:MI:SS'), to_char(e.end_time, 'HH24:MI:SS'),
		e.service_type, c.name
		FROM event_equipment ee
		JOIN events e ON ee.event_id = e.id
		JOIN inventory i ON ee.inventory_id = i.id
		LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1
		AND e.event_date = $2::date
		AND e.status != 'cancelled'
		AND ee.inventory_id = ANY($3)`

	args := []interface{}{userID, eventDate, inventoryIDs}
	argIdx := 4

	if excludeEventID != nil {
		query += fmt.Sprintf(" AND e.id != $%d", argIdx)
		args = append(args, *excludeEventID)
		argIdx++
	}

	// Time-based conflict filtering
	if startTime != nil && endTime != nil {
		// Overlap with < 1hr gap: other event starts before our end+1hr AND ends after our start-1hr
		query += fmt.Sprintf(` AND (
			e.start_time IS NULL OR e.end_time IS NULL
			OR (e.start_time < ($%d::time + interval '1 hour') AND e.end_time > ($%d::time - interval '1 hour'))
		)`, argIdx, argIdx+1)
		args = append(args, *endTime, *startTime)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	conflicts := make([]models.EquipmentConflict, 0)
	for rows.Next() {
		var c models.EquipmentConflict
		if err := rows.Scan(&c.InventoryID, &c.EquipmentName, &c.EventID, &c.EventDate,
			&c.StartTime, &c.EndTime, &c.ServiceType, &c.ClientName); err != nil {
			return nil, err
		}
		// Determine conflict type
		if c.StartTime == nil || c.EndTime == nil {
			c.ConflictType = "full_day"
		} else if startTime == nil || endTime == nil {
			c.ConflictType = "full_day"
		} else {
			c.ConflictType = "insufficient_gap"
		}
		conflicts = append(conflicts, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating equipment conflicts: %w", err)
	}
	return conflicts, nil
}

// ProductQuantity pairs a product ID with the number of units in the event.
type ProductQuantity struct {
	ID       uuid.UUID
	Quantity float64
}

// GetEquipmentSuggestionsFromProducts returns suggested equipment for an event,
// with quantities calculated from each product's recipe:
//   - If capacity is set: ceil(product_event_qty / capacity)
//   - Otherwise: quantity_required (fixed, not scaled by event qty)
//
// Results are summed across all products that share the same equipment piece.
func (r *EventRepo) GetEquipmentSuggestionsFromProducts(ctx context.Context, userID uuid.UUID, products []ProductQuantity) ([]models.EquipmentSuggestion, error) {
	if len(products) == 0 {
		return nil, nil
	}

	productIDs := make([]uuid.UUID, len(products))
	quantities := make([]float64, len(products))
	for i, p := range products {
		productIDs[i] = p.ID
		quantities[i] = p.Quantity
	}

	// Join unnested product arrays with product_ingredients to get one row per
	// (product, equipment) pair, then aggregate in Go.
	query := `
		SELECT i.id, i.ingredient_name, i.current_stock, i.unit, i.type,
		       pi.quantity_required, pi.capacity, p.quantity AS product_quantity
		FROM (
			SELECT unnest($1::uuid[]) AS product_id,
			       unnest($2::float8[]) AS quantity
		) AS p
		JOIN product_ingredients pi ON pi.product_id = p.product_id
		JOIN inventory i ON pi.inventory_id = i.id
		WHERE i.type = 'equipment' AND i.user_id = $3`

	rows, err := r.pool.Query(ctx, query, productIDs, quantities, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Aggregate by inventory ID: sum the required equipment across products.
	type equipRow struct {
		id          uuid.UUID
		name        string
		stock       float64
		unit        string
		typ         string
		quantityReq float64
		capacity    *float64
		productQty  float64
	}

	totals := make(map[uuid.UUID]*models.EquipmentSuggestion)
	var order []uuid.UUID

	for rows.Next() {
		var eq equipRow
		if err := rows.Scan(&eq.id, &eq.name, &eq.stock, &eq.unit, &eq.typ,
			&eq.quantityReq, &eq.capacity, &eq.productQty); err != nil {
			return nil, err
		}

		var needed int
		if eq.capacity != nil && *eq.capacity > 0 {
			// Capacity-based: how many pieces of equipment handle this product qty
			needed = int(math.Ceil(eq.productQty / *eq.capacity))
		} else {
			// Fixed: quantity_required is the total needed regardless of event qty
			needed = int(math.Ceil(eq.quantityReq))
		}

		if s, ok := totals[eq.id]; ok {
			s.SuggestedQty += needed
		} else {
			totals[eq.id] = &models.EquipmentSuggestion{
				ID:             eq.id,
				IngredientName: eq.name,
				CurrentStock:   eq.stock,
				Unit:           eq.unit,
				Type:           eq.typ,
				SuggestedQty:   needed,
			}
			order = append(order, eq.id)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating equipment suggestions: %w", err)
	}

	result := make([]models.EquipmentSuggestion, 0, len(order))
	for _, id := range order {
		result = append(result, *totals[id])
	}
	return result, nil
}

// -- Event Supplies --

func (r *EventRepo) GetSupplies(ctx context.Context, eventID uuid.UUID) ([]models.EventSupply, error) {
	query := `SELECT es.id, es.event_id, es.inventory_id, es.quantity, es.unit_cost,
		es.source, es.exclude_cost, es.created_at,
		i.ingredient_name, i.unit, i.current_stock
		FROM event_supplies es LEFT JOIN inventory i ON es.inventory_id = i.id
		WHERE es.event_id = $1`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.EventSupply, 0)
	for rows.Next() {
		var s models.EventSupply
		if err := rows.Scan(&s.ID, &s.EventID, &s.InventoryID, &s.Quantity,
			&s.UnitCost, &s.Source, &s.ExcludeCost, &s.CreatedAt,
			&s.SupplyName, &s.Unit, &s.CurrentStock); err != nil {
			return nil, err
		}
		items = append(items, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event supplies: %w", err)
	}
	return items, nil
}

// GetSupplySuggestionsFromProducts returns suggested per-event supplies for an event,
// with quantities summed across all products that use the same supply.
// Unlike ingredients, supply quantities are fixed per event (not scaled by product quantity).
func (r *EventRepo) GetSupplySuggestionsFromProducts(ctx context.Context, userID uuid.UUID, products []ProductQuantity) ([]models.SupplySuggestion, error) {
	if len(products) == 0 {
		return nil, nil
	}

	productIDs := make([]uuid.UUID, len(products))
	for i, p := range products {
		productIDs[i] = p.ID
	}

	query := `
		SELECT i.id, i.ingredient_name, i.current_stock, i.unit, COALESCE(i.unit_cost, 0),
		       pi.quantity_required
		FROM (
			SELECT unnest($1::uuid[]) AS product_id
		) AS p
		JOIN product_ingredients pi ON pi.product_id = p.product_id
		JOIN inventory i ON pi.inventory_id = i.id
		WHERE i.type = 'supply' AND i.user_id = $2`

	rows, err := r.pool.Query(ctx, query, productIDs, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	totals := make(map[uuid.UUID]*models.SupplySuggestion)
	var order []uuid.UUID

	for rows.Next() {
		var id uuid.UUID
		var name, unit string
		var stock, unitCost, qtyReq float64
		if err := rows.Scan(&id, &name, &stock, &unit, &unitCost, &qtyReq); err != nil {
			return nil, err
		}

		if s, ok := totals[id]; ok {
			s.SuggestedQty += qtyReq
		} else {
			totals[id] = &models.SupplySuggestion{
				ID:             id,
				IngredientName: name,
				CurrentStock:   stock,
				Unit:           unit,
				UnitCost:       unitCost,
				SuggestedQty:   qtyReq,
			}
			order = append(order, id)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating supply suggestions: %w", err)
	}

	result := make([]models.SupplySuggestion, 0, len(order))
	for _, id := range order {
		result = append(result, *totals[id])
	}
	return result, nil
}

// DeductSupplyStock decrements inventory stock for all event supplies with source='stock'.
func (r *EventRepo) DeductSupplyStock(ctx context.Context, eventID uuid.UUID) error {
	query := `UPDATE inventory SET
		current_stock = GREATEST(0, current_stock - es.quantity),
		last_updated = NOW()
		FROM event_supplies es
		WHERE inventory.id = es.inventory_id
		AND es.event_id = $1
		AND es.source = 'stock'`
	_, err := r.pool.Exec(ctx, query, eventID)
	return err
}

// Search performs a fuzzy search on events using pg_trgm similarity + ILIKE fallback.
// Uses the shared eventSelectFields/scanEventWithClient helpers so that DATE/TIME
// columns are properly converted via to_char (otherwise pgx fails to scan into
// the string-typed fields of models.Event).
func (r *EventRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Event, error) {
	sqlQuery := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e
		LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1
		AND (
			e.service_type ILIKE '%%' || $2 || '%%' OR
			e.location ILIKE '%%' || $2 || '%%' OR
			c.name ILIKE '%%' || $2 || '%%' OR
			similarity(coalesce(c.name, ''), $2) > 0.3
		)
		ORDER BY similarity(coalesce(c.name, ''), $2) DESC, e.event_date DESC
		LIMIT 10`, eventSelectFields)

	rows, err := r.pool.Query(ctx, sqlQuery, userID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := []models.Event{}
	for rows.Next() {
		e, err := scanEventWithClient(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event search: %w", err)
	}

	return events, nil
}

// EventSearchFilters holds optional, combinable filters for advanced event search.
type EventSearchFilters struct {
	Query    string
	Status   string
	FromDate string
	ToDate   string
	ClientID *uuid.UUID
	Offset   int
	Limit    int
}

// SearchEventsAdvanced performs a filtered search on events with combinable criteria.
// All filters are optional — when omitted, that filter is not applied.
func (r *EventRepo) SearchEventsAdvanced(ctx context.Context, userID uuid.UUID, filters EventSearchFilters) ([]models.Event, error) {
	baseQuery := fmt.Sprintf(`SELECT %s, c.name as client_name, c.phone as client_phone
		FROM events e LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1`, eventSelectFields)

	args := []interface{}{userID}
	argN := 2

	if filters.Query != "" {
		// Text search covers:
		//   - service_type  (e.g. "Boda", "Catering")
		//   - location      (specific venue, e.g. "Salón Los Arcos")
		//   - city          (e.g. "Guadalajara") — previously missing, caused
		//                   Web searches by city to return no results
		//   - client name   (ILIKE + pg_trgm similarity for fuzzy match)
		baseQuery += fmt.Sprintf(` AND (
			e.service_type ILIKE '%%' || $%d || '%%' OR
			e.location ILIKE '%%' || $%d || '%%' OR
			e.city ILIKE '%%' || $%d || '%%' OR
			c.name ILIKE '%%' || $%d || '%%' OR
			similarity(c.name, $%d) > 0.3
		)`, argN, argN, argN, argN, argN)
		args = append(args, filters.Query)
		argN++
	}

	if filters.Status != "" {
		baseQuery += fmt.Sprintf(` AND e.status = $%d`, argN)
		args = append(args, filters.Status)
		argN++
	}

	if filters.FromDate != "" {
		baseQuery += fmt.Sprintf(` AND e.event_date >= $%d::date`, argN)
		args = append(args, filters.FromDate)
		argN++
	}

	if filters.ToDate != "" {
		baseQuery += fmt.Sprintf(` AND e.event_date <= $%d::date`, argN)
		args = append(args, filters.ToDate)
		argN++
	}

	if filters.ClientID != nil {
		baseQuery += fmt.Sprintf(` AND e.client_id = $%d`, argN)
		args = append(args, *filters.ClientID)
		argN++
	}

	baseQuery += fmt.Sprintf(` ORDER BY e.event_date DESC LIMIT %d OFFSET %d`, filters.Limit, filters.Offset)

	rows, err := r.pool.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		e, err := scanEventWithClient(rows)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating advanced event search: %w", err)
	}

	if events == nil {
		events = []models.Event{}
	}

	return events, nil
}

