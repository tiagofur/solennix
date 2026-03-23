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
	query := `SELECT id, event_id, description, cost, price, exclude_utility, include_in_checklist, created_at
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
// It atomically replaces all products, extras, and optionally equipment and supplies for an event within a transaction.
func (r *EventRepo) UpdateEventItems(ctx context.Context, eventID uuid.UUID,
	products []models.EventProduct, extras []models.EventExtra, equipment *[]models.EventEquipment, supplies *[]models.EventSupply) error {

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

	var items []models.EventSupply
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

