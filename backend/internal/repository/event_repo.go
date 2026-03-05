package repository

import (
	"context"
	"fmt"
	"log/slog"

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
	e.service_type, e.num_people, e.status, e.discount, e.requires_invoice,
	e.tax_rate, e.tax_amount, e.total_amount, e.location, e.city,
	e.deposit_percent, e.cancellation_days, e.refund_percent,
	e.notes, e.photos, e.created_at, e.updated_at`

func scanEvent(row pgx.Row) (*models.Event, error) {
	e := &models.Event{}
	err := row.Scan(
		&e.ID, &e.UserID, &e.ClientID, &e.EventDate, &e.StartTime, &e.EndTime,
		&e.ServiceType, &e.NumPeople, &e.Status, &e.Discount, &e.RequiresInvoice,
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
		&e.ServiceType, &e.NumPeople, &e.Status, &e.Discount, &e.RequiresInvoice,
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
		WHERE e.user_id = $1 ORDER BY e.event_date DESC`, eventSelectFields)
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
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

	var events []models.Event
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

	var events []models.Event
	for rows.Next() {
		var e models.Event
		err := rows.Scan(
			&e.ID, &e.UserID, &e.ClientID, &e.EventDate, &e.StartTime, &e.EndTime,
			&e.ServiceType, &e.NumPeople, &e.Status, &e.Discount, &e.RequiresInvoice,
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
		WHERE e.user_id = $1 AND e.event_date >= CURRENT_DATE
		ORDER BY e.event_date ASC LIMIT $2`, eventSelectFields)
	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
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

	query := `INSERT INTO events (user_id, client_id, event_date, start_time, end_time,
		service_type, num_people, status, discount, requires_invoice,
		tax_rate, tax_amount, total_amount, location, city,
		deposit_percent, cancellation_days, refund_percent, notes, photos)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
		RETURNING id, created_at, updated_at`
	err := r.pool.QueryRow(ctx, query,
		e.UserID, e.ClientID, e.EventDate, startTime, endTime,
		e.ServiceType, e.NumPeople, e.Status, e.Discount, e.RequiresInvoice,
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

	query := `UPDATE events SET client_id=$3, event_date=$4, start_time=$5, end_time=$6,
		service_type=$7, num_people=$8, status=$9, discount=$10, requires_invoice=$11,
		tax_rate=$12, tax_amount=$13, total_amount=$14, location=$15, city=$16,
		deposit_percent=$17, cancellation_days=$18, refund_percent=$19, notes=$20, photos=$21, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		e.ID, e.UserID, e.ClientID, e.EventDate, startTime, endTime,
		e.ServiceType, e.NumPeople, e.Status, e.Discount, e.RequiresInvoice,
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

	var products []models.EventProduct
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
	query := `SELECT id, event_id, description, cost, price, exclude_utility, created_at
		FROM event_extras WHERE event_id = $1`
	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var extras []models.EventExtra
	for rows.Next() {
		var ee models.EventExtra
		if err := rows.Scan(&ee.ID, &ee.EventID, &ee.Description, &ee.Cost,
			&ee.Price, &ee.ExcludeUtility, &ee.CreatedAt); err != nil {
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
// It atomically replaces all products, extras, and optionally equipment for an event within a transaction.
func (r *EventRepo) UpdateEventItems(ctx context.Context, eventID uuid.UUID,
	products []models.EventProduct, extras []models.EventExtra, equipment *[]models.EventEquipment) error {

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
			`INSERT INTO event_extras (event_id, description, cost, price, exclude_utility)
			VALUES ($1, $2, $3, $4, $5)`,
			eventID, e.Description, e.Cost, e.Price, e.ExcludeUtility)
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

	return tx.Commit(ctx)
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

	var items []models.EventEquipment
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

	var conflicts []models.EquipmentConflict
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

func (r *EventRepo) GetEquipmentSuggestionsFromProducts(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) ([]models.InventoryItem, error) {
	if len(productIDs) == 0 {
		return nil, nil
	}

	query := `SELECT DISTINCT i.id, i.user_id, i.ingredient_name, i.current_stock, i.minimum_stock,
		i.unit, i.unit_cost, i.type, i.last_updated
		FROM product_ingredients pi
		JOIN inventory i ON pi.inventory_id = i.id
		WHERE pi.product_id = ANY($1) AND i.type = 'equipment' AND i.user_id = $2`
	rows, err := r.pool.Query(ctx, query, productIDs, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.InventoryItem
	for rows.Next() {
		var item models.InventoryItem
		if err := rows.Scan(&item.ID, &item.UserID, &item.IngredientName, &item.CurrentStock,
			&item.MinimumStock, &item.Unit, &item.UnitCost, &item.Type, &item.LastUpdated); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating equipment suggestions: %w", err)
	}
	return items, nil
}

// Search performs a full-text search on events for the given user
func (r *EventRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Event, error) {
	searchPattern := "%" + query + "%"
	sqlQuery := `SELECT e.id, e.user_id, e.client_id, e.event_date, e.service_type, e.num_people,
		e.start_time, e.end_time, e.location, e.status, e.discount, e.tax_rate, e.tax_amount, e.total_amount,
		e.deposit_percent, e.cancellation_days, e.refund_percent, e.created_at, e.updated_at,
		c.name as client_name
		FROM events e
		LEFT JOIN clients c ON e.client_id = c.id
		WHERE e.user_id = $1
		AND (
			e.service_type ILIKE $2 OR
			e.location ILIKE $2 OR
			c.name ILIKE $2
		)
		ORDER BY e.event_date DESC
		LIMIT 10`

	rows, err := r.pool.Query(ctx, sqlQuery, userID, searchPattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var e models.Event
		var clientName *string
		if err := rows.Scan(&e.ID, &e.UserID, &e.ClientID, &e.EventDate, &e.ServiceType, &e.NumPeople,
			&e.StartTime, &e.EndTime, &e.Location, &e.Status, &e.Discount, &e.TaxRate, &e.TaxAmount, &e.TotalAmount,
			&e.DepositPercent, &e.CancellationDays, &e.RefundPercent, &e.CreatedAt, &e.UpdatedAt,
			&clientName); err != nil {
			return nil, err
		}
		if clientName != nil {
			e.Client = &models.Client{
				Name: *clientName,
			}
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event search: %w", err)
	}

	if events == nil {
		events = []models.Event{}
	}

	return events, nil
}

