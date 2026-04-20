package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DashboardKPIs holds user-scoped key performance indicators.
//
// Monthly fields (net_sales_this_month, cash_collected_this_month,
// vat_collected_this_month, vat_outstanding_this_month) are scoped to events
// with event_date in the current calendar month AND status IN
// ('confirmed','completed'). VAT is prorated per event by paid ratio.
// Cash collected is scoped by payment_date in the current calendar month.
type DashboardKPIs struct {
	TotalRevenue              float64 `json:"total_revenue"`
	EventsThisMonth           int     `json:"events_this_month"`
	PendingQuotes             int     `json:"pending_quotes"`
	LowStockItems             int     `json:"low_stock_items"`
	UpcomingEvents            int     `json:"upcoming_events"`
	TotalClients              int     `json:"total_clients"`
	AverageEventValue         float64 `json:"average_event_value"`
	NetSalesThisMonth         float64 `json:"net_sales_this_month"`
	CashCollectedThisMonth    float64 `json:"cash_collected_this_month"`
	VATCollectedThisMonth     float64 `json:"vat_collected_this_month"`
	VATOutstandingThisMonth   float64 `json:"vat_outstanding_this_month"`
}

// RevenueDataPoint represents one month of revenue data.
type RevenueDataPoint struct {
	Month      string  `json:"month"`
	Revenue    float64 `json:"revenue"`
	EventCount int     `json:"event_count"`
}

// EventStatusCount represents event count grouped by status.
type EventStatusCount struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

// TopClient represents a client ranked by total spent.
type TopClient struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	TotalSpent  float64   `json:"total_spent"`
	TotalEvents int       `json:"total_events"`
}

// ProductDemandItem represents a product ranked by usage.
type ProductDemandItem struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	TimesUsed    int       `json:"times_used"`
	TotalRevenue float64   `json:"total_revenue"`
}

// ForecastDataPoint represents projected revenue for a future month.
type ForecastDataPoint struct {
	Month             string  `json:"month"`
	ConfirmedRevenue  float64 `json:"confirmed_revenue"`
	ConfirmedEvents   int     `json:"confirmed_events"`
}

// DashboardRepo provides data access for user-scoped dashboard analytics.
type DashboardRepo struct {
	pool *pgxpool.Pool
}

// NewDashboardRepo creates a new DashboardRepo.
func NewDashboardRepo(pool *pgxpool.Pool) *DashboardRepo {
	return &DashboardRepo{pool: pool}
}

// GetKPIs returns user-scoped key performance indicators.
func (r *DashboardRepo) GetKPIs(ctx context.Context, userID uuid.UUID) (*DashboardKPIs, error) {
	kpis := &DashboardKPIs{}

	// Total revenue (sum of all payments for this user's events)
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(p.amount), 0)
		FROM payments p
		JOIN events e ON p.event_id = e.id
		WHERE e.user_id = $1`, userID).Scan(&kpis.TotalRevenue)
	if err != nil {
		return nil, fmt.Errorf("failed to get total revenue: %w", err)
	}

	// Events this month
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM events
		WHERE user_id = $1
		  AND DATE_TRUNC('month', event_date::date) = DATE_TRUNC('month', CURRENT_DATE)`, userID).Scan(&kpis.EventsThisMonth)
	if err != nil {
		return nil, fmt.Errorf("failed to count events this month: %w", err)
	}

	// Pending quotes (events with status = 'quoted')
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM events
		WHERE user_id = $1 AND status = 'quoted'`, userID).Scan(&kpis.PendingQuotes)
	if err != nil {
		return nil, fmt.Errorf("failed to count pending quotes: %w", err)
	}

	// Low stock items (inventory where current_stock <= minimum_stock)
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM inventory_items
		WHERE user_id = $1 AND current_stock <= minimum_stock`, userID).Scan(&kpis.LowStockItems)
	if err != nil {
		return nil, fmt.Errorf("failed to count low stock items: %w", err)
	}

	// Upcoming events (next 7 days)
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM events
		WHERE user_id = $1
		  AND event_date::date >= CURRENT_DATE
		  AND event_date::date <= CURRENT_DATE + INTERVAL '7 days'`, userID).Scan(&kpis.UpcomingEvents)
	if err != nil {
		return nil, fmt.Errorf("failed to count upcoming events: %w", err)
	}

	// Total clients
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM clients
		WHERE user_id = $1`, userID).Scan(&kpis.TotalClients)
	if err != nil {
		return nil, fmt.Errorf("failed to count clients: %w", err)
	}

	// Average event value
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(total_amount), 0)
		FROM events
		WHERE user_id = $1 AND total_amount > 0`, userID).Scan(&kpis.AverageEventValue)
	if err != nil {
		return nil, fmt.Errorf("failed to get average event value: %w", err)
	}

	// Net sales / VAT collected / VAT outstanding for the current month.
	// Scope: events with event_date in current month AND status IN ('confirmed','completed').
	// VAT is prorated per event by paid ratio (capped at 1.0 if overpaid).
	err = r.pool.QueryRow(ctx, `
		WITH month_events AS (
			SELECT
				e.total_amount,
				e.tax_amount,
				COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.event_id = e.id), 0) AS total_paid
			FROM events e
			WHERE e.user_id = $1
			  AND DATE_TRUNC('month', e.event_date) = DATE_TRUNC('month', CURRENT_DATE)
			  AND e.status IN ('confirmed', 'completed')
		)
		SELECT
			COALESCE(SUM(total_amount), 0) AS net_sales,
			COALESCE(SUM(
				CASE WHEN total_amount > 0
					 THEN tax_amount * LEAST(total_paid / total_amount, 1.0)
					 ELSE 0
				END
			), 0) AS vat_collected,
			COALESCE(SUM(
				CASE WHEN total_amount > 0
					 THEN tax_amount * GREATEST(1.0 - (total_paid / total_amount), 0.0)
					 ELSE tax_amount
				END
			), 0) AS vat_outstanding
		FROM month_events`, userID).Scan(
		&kpis.NetSalesThisMonth,
		&kpis.VATCollectedThisMonth,
		&kpis.VATOutstandingThisMonth,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly sales/VAT aggregates: %w", err)
	}

	// Cash collected this month: sum of payments with payment_date in current month
	// belonging to the user's events.
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(p.amount), 0)
		FROM payments p
		JOIN events e ON p.event_id = e.id
		WHERE e.user_id = $1
		  AND DATE_TRUNC('month', p.payment_date) = DATE_TRUNC('month', CURRENT_DATE)`, userID).Scan(&kpis.CashCollectedThisMonth)
	if err != nil {
		return nil, fmt.Errorf("failed to get cash collected this month: %w", err)
	}

	return kpis, nil
}

// GetRevenueChart returns monthly revenue data for the given period.
// period: "month" (last 1 month), "quarter" (last 3 months), "year" (last 12 months, default).
func (r *DashboardRepo) GetRevenueChart(ctx context.Context, userID uuid.UUID, period string) ([]RevenueDataPoint, error) {
	months := 12
	switch period {
	case "month":
		months = 1
	case "quarter":
		months = 3
	case "year":
		months = 12
	}

	query := `
		SELECT
			TO_CHAR(p.payment_date::date, 'YYYY-MM') AS month,
			COALESCE(SUM(p.amount), 0) AS revenue,
			COUNT(DISTINCT p.event_id) AS event_count
		FROM payments p
		JOIN events e ON p.event_id = e.id
		WHERE e.user_id = $1
		  AND p.payment_date::date >= CURRENT_DATE - ($2 || ' months')::INTERVAL
		GROUP BY 1
		ORDER BY 1`

	rows, err := r.pool.Query(ctx, query, userID, fmt.Sprintf("%d", months))
	if err != nil {
		return nil, fmt.Errorf("failed to get revenue chart: %w", err)
	}
	defer rows.Close()

	var result []RevenueDataPoint
	for rows.Next() {
		var dp RevenueDataPoint
		if err := rows.Scan(&dp.Month, &dp.Revenue, &dp.EventCount); err != nil {
			return nil, fmt.Errorf("failed to scan revenue data point: %w", err)
		}
		result = append(result, dp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating revenue chart: %w", err)
	}

	if result == nil {
		result = []RevenueDataPoint{}
	}
	return result, nil
}

// GetEventsByStatus returns event counts grouped by status for the user.
func (r *DashboardRepo) GetEventsByStatus(ctx context.Context, userID uuid.UUID) ([]EventStatusCount, error) {
	query := `
		SELECT status, COUNT(*) AS count
		FROM events
		WHERE user_id = $1
		GROUP BY status
		ORDER BY count DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get events by status: %w", err)
	}
	defer rows.Close()

	var result []EventStatusCount
	for rows.Next() {
		var esc EventStatusCount
		if err := rows.Scan(&esc.Status, &esc.Count); err != nil {
			return nil, fmt.Errorf("failed to scan event status count: %w", err)
		}
		result = append(result, esc)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating events by status: %w", err)
	}

	if result == nil {
		result = []EventStatusCount{}
	}
	return result, nil
}

// GetTopClients returns the top clients by total_spent for the user.
func (r *DashboardRepo) GetTopClients(ctx context.Context, userID uuid.UUID, limit int) ([]TopClient, error) {
	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT id, name, COALESCE(total_spent, 0) AS total_spent, COALESCE(total_events, 0) AS total_events
		FROM clients
		WHERE user_id = $1
		ORDER BY total_spent DESC
		LIMIT $2`

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top clients: %w", err)
	}
	defer rows.Close()

	var result []TopClient
	for rows.Next() {
		var tc TopClient
		if err := rows.Scan(&tc.ID, &tc.Name, &tc.TotalSpent, &tc.TotalEvents); err != nil {
			return nil, fmt.Errorf("failed to scan top client: %w", err)
		}
		result = append(result, tc)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating top clients: %w", err)
	}

	if result == nil {
		result = []TopClient{}
	}
	return result, nil
}

// GetProductDemand returns the most used products from event_products for the user.
func (r *DashboardRepo) GetProductDemand(ctx context.Context, userID uuid.UUID) ([]ProductDemandItem, error) {
	query := `
		SELECT p.id, p.name, COUNT(ep.id) AS times_used, COALESCE(SUM(ep.total_price), 0) AS total_revenue
		FROM event_products ep
		JOIN products p ON ep.product_id = p.id
		JOIN events e ON ep.event_id = e.id
		WHERE e.user_id = $1
		GROUP BY p.id, p.name
		ORDER BY times_used DESC
		LIMIT 10`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get product demand: %w", err)
	}
	defer rows.Close()

	var result []ProductDemandItem
	for rows.Next() {
		var pd ProductDemandItem
		if err := rows.Scan(&pd.ID, &pd.Name, &pd.TimesUsed, &pd.TotalRevenue); err != nil {
			return nil, fmt.Errorf("failed to scan product demand item: %w", err)
		}
		result = append(result, pd)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating product demand: %w", err)
	}

	if result == nil {
		result = []ProductDemandItem{}
	}
	return result, nil
}

// GetForecast returns revenue forecast based on confirmed/quoted future events.
func (r *DashboardRepo) GetForecast(ctx context.Context, userID uuid.UUID) ([]ForecastDataPoint, error) {
	query := `
		SELECT
			TO_CHAR(event_date::date, 'YYYY-MM') AS month,
			COALESCE(SUM(total_amount), 0) AS confirmed_revenue,
			COUNT(*) AS confirmed_events
		FROM events
		WHERE user_id = $1
		  AND status IN ('confirmed', 'quoted')
		  AND event_date::date >= CURRENT_DATE
		GROUP BY 1
		ORDER BY 1`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get forecast: %w", err)
	}
	defer rows.Close()

	var result []ForecastDataPoint
	for rows.Next() {
		var fp ForecastDataPoint
		if err := rows.Scan(&fp.Month, &fp.ConfirmedRevenue, &fp.ConfirmedEvents); err != nil {
			return nil, fmt.Errorf("failed to scan forecast data point: %w", err)
		}
		result = append(result, fp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating forecast: %w", err)
	}

	if result == nil {
		result = []ForecastDataPoint{}
	}
	return result, nil
}
