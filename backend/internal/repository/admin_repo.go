package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminRepo provides data access for admin-only operations.
type AdminRepo struct {
	pool *pgxpool.Pool
}

func NewAdminRepo(pool *pgxpool.Pool) *AdminRepo {
	return &AdminRepo{pool: pool}
}

// PlatformStats holds global platform KPIs.
type PlatformStats struct {
	TotalUsers          int `json:"total_users"`
	BasicUsers          int `json:"basic_users"`
	ProUsers            int `json:"pro_users"`
	PremiumUsers        int `json:"premium_users"`
	TotalEvents         int `json:"total_events"`
	TotalClients        int `json:"total_clients"`
	TotalProducts       int `json:"total_products"`
	NewUsersToday       int `json:"new_users_today"`
	NewUsersWeek        int `json:"new_users_week"`
	NewUsersMonth       int `json:"new_users_month"`
	ActiveSubscriptions int `json:"active_subscriptions"`
}

// AdminUser represents a user with usage stats for admin views.
type AdminUser struct {
	ID               uuid.UUID  `json:"id"`
	Email            string     `json:"email"`
	Name             string     `json:"name"`
	BusinessName     *string    `json:"business_name,omitempty"`
	Plan             string     `json:"plan"`
	Role             string     `json:"role"`
	StripeCustomerID *string    `json:"stripe_customer_id,omitempty"`
	HasPaidSub       bool       `json:"has_paid_subscription"`
	PlanExpiresAt    *time.Time `json:"plan_expires_at,omitempty"`
	EventsCount      int        `json:"events_count"`
	ClientsCount     int        `json:"clients_count"`
	ProductsCount    int        `json:"products_count"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// SubscriptionOverview holds subscription stats.
type SubscriptionOverview struct {
	TotalActive   int `json:"total_active"`
	TotalCanceled int `json:"total_canceled"`
	TotalTrialing int `json:"total_trialing"`
	TotalPastDue  int `json:"total_past_due"`
	StripeCount   int `json:"stripe_count"`
	AppleCount    int `json:"apple_count"`
	GoogleCount   int `json:"google_count"`
}

// GetPlatformStats returns global platform KPIs.
func (r *AdminRepo) GetPlatformStats(ctx context.Context) (*PlatformStats, error) {
	stats := &PlatformStats{}

	// Users by plan
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE plan = 'basic'`).Scan(&stats.BasicUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count basic users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE plan = 'pro'`).Scan(&stats.ProUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count pro users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE plan = 'premium'`).Scan(&stats.PremiumUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count premium users: %w", err)
	}

	// Global counts
	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM events`).Scan(&stats.TotalEvents)
	if err != nil {
		return nil, fmt.Errorf("failed to count events: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM clients`).Scan(&stats.TotalClients)
	if err != nil {
		return nil, fmt.Errorf("failed to count clients: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM products`).Scan(&stats.TotalProducts)
	if err != nil {
		return nil, fmt.Errorf("failed to count products: %w", err)
	}

	// Recent signups
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -7)
	monthStart := todayStart.AddDate(0, -1, 0)

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, todayStart).Scan(&stats.NewUsersToday)
	if err != nil {
		return nil, fmt.Errorf("failed to count today's users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, weekStart).Scan(&stats.NewUsersWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to count week's users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE created_at >= $1`, monthStart).Scan(&stats.NewUsersMonth)
	if err != nil {
		return nil, fmt.Errorf("failed to count month's users: %w", err)
	}

	// Active subscriptions
	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'active'`).Scan(&stats.ActiveSubscriptions)
	if err != nil {
		return nil, fmt.Errorf("failed to count active subs: %w", err)
	}

	return stats, nil
}

// GetAllUsers returns all users with their usage counts.
func (r *AdminRepo) GetAllUsers(ctx context.Context) ([]AdminUser, error) {
	query := `
		SELECT
			u.id, u.email, u.name, u.business_name, u.plan, u.role, u.stripe_customer_id,
			(u.stripe_customer_id IS NOT NULL OR EXISTS(
				SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
			)) AS has_paid_sub,
			u.plan_expires_at,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.user_id = u.id), 0) AS events_count,
			COALESCE((SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id), 0) AS clients_count,
			COALESCE((SELECT COUNT(*) FROM products p WHERE p.user_id = u.id), 0) AS products_count,
			u.created_at, u.updated_at
		FROM users u
		ORDER BY u.created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.BusinessName, &u.Plan, &u.Role, &u.StripeCustomerID,
			&u.HasPaidSub, &u.PlanExpiresAt,
			&u.EventsCount, &u.ClientsCount, &u.ProductsCount,
			&u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return users, nil
}

// GetUserByID returns a single user with usage stats for admin view.
func (r *AdminRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*AdminUser, error) {
	query := `
		SELECT
			u.id, u.email, u.name, u.business_name, u.plan, u.role, u.stripe_customer_id,
			(u.stripe_customer_id IS NOT NULL OR EXISTS(
				SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
			)) AS has_paid_sub,
			u.plan_expires_at,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.user_id = u.id), 0) AS events_count,
			COALESCE((SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id), 0) AS clients_count,
			COALESCE((SELECT COUNT(*) FROM products p WHERE p.user_id = u.id), 0) AS products_count,
			u.created_at, u.updated_at
		FROM users u
		WHERE u.id = $1`

	var u AdminUser
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.BusinessName, &u.Plan, &u.Role, &u.StripeCustomerID,
		&u.HasPaidSub, &u.PlanExpiresAt,
		&u.EventsCount, &u.ClientsCount, &u.ProductsCount,
		&u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return &u, nil
}

// UpdateUserPlan updates a user's plan (admin action).
// expiresAt is only set for gifted plans; nil means permanent (or paid subscription handles it).
func (r *AdminRepo) UpdateUserPlan(ctx context.Context, id uuid.UUID, plan string, expiresAt *time.Time) error {
	query := `UPDATE users SET plan = $2, plan_expires_at = $3, updated_at = NOW() WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, id, plan, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to update plan: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// ExpireGiftedPlans reverts to 'basic' any manually-gifted plan whose expiry has passed.
// It never touches users with an active paid subscription (stripe or in-app purchase).
// Returns the number of users whose plans were expired.
func (r *AdminRepo) ExpireGiftedPlans(ctx context.Context) (int, error) {
	query := `
		UPDATE users
		SET plan = 'basic', plan_expires_at = NULL, updated_at = NOW()
		WHERE plan_expires_at IS NOT NULL
		  AND plan_expires_at <= NOW()
		  AND stripe_customer_id IS NULL
		  AND NOT EXISTS (
			  SELECT 1 FROM subscriptions s
			  WHERE s.user_id = users.id AND s.status = 'active'
		  )`
	tag, err := r.pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to expire gifted plans: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

// HasActiveSubscription checks if a user has paid via Stripe/Apple/Google.
func (r *AdminRepo) HasActiveSubscription(ctx context.Context, userID uuid.UUID) (bool, error) {
	var hasPaid bool
	query := `
		SELECT (
			(SELECT stripe_customer_id FROM users WHERE id = $1) IS NOT NULL
			OR EXISTS(SELECT 1 FROM subscriptions WHERE user_id = $1 AND status = 'active')
		)`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&hasPaid)
	if err != nil {
		return false, fmt.Errorf("failed to check subscription: %w", err)
	}
	return hasPaid, nil
}

// GetSubscriptionOverview returns subscription stats grouped by status and provider.
func (r *AdminRepo) GetSubscriptionOverview(ctx context.Context) (*SubscriptionOverview, error) {
	overview := &SubscriptionOverview{}

	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'active'`).Scan(&overview.TotalActive)
	if err != nil {
		return nil, fmt.Errorf("failed to count active: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'canceled'`).Scan(&overview.TotalCanceled)
	if err != nil {
		return nil, fmt.Errorf("failed to count canceled: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'trialing'`).Scan(&overview.TotalTrialing)
	if err != nil {
		return nil, fmt.Errorf("failed to count trialing: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'past_due'`).Scan(&overview.TotalPastDue)
	if err != nil {
		return nil, fmt.Errorf("failed to count past_due: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE provider = 'stripe'`).Scan(&overview.StripeCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count stripe: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE provider = 'apple'`).Scan(&overview.AppleCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count apple: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE provider = 'google'`).Scan(&overview.GoogleCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count google: %w", err)
	}

	return overview, nil
}
