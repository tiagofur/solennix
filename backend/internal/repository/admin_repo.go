package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// AdminRepo provides data access for admin-only operations.
type AdminRepo struct {
	pool *pgxpool.Pool
}

const (
	AdminAccountTypeAll        = "all"
	AdminAccountTypeUsers      = "users"
	AdminAccountTypeTeam       = "team"
	AdminAccountTypeAssistants = "assistants"
	AdminAccountTypeAdmins     = "admins"

	AccountStatusActive  = "active"
	AccountStatusBlocked = "blocked"
	AccountStatusDeleted = "deleted"

	AdminModerationStatusAll                 = "all"
	AdminModerationStatusActive              = "active"
	AdminModerationStatusBlocked             = "blocked"
	AdminModerationStatusEligibleForDeletion = "eligible_for_deletion"
)

var (
	ErrAdminUserNotFound             = errors.New("admin user not found")
	ErrAdminUserAlreadyDeleted       = errors.New("admin user already deleted")
	ErrAdminUserNotBlocked           = errors.New("admin user is not blocked")
	ErrAdminUserNotEligibleForDelete = errors.New("admin user is not eligible for deletion")
	ErrAdminUserNotBlockable         = errors.New("admin user is not blockable")
)

func NewAdminRepo(pool *pgxpool.Pool) *AdminRepo {
	return &AdminRepo{pool: pool}
}

func normalizeAdminAccountType(accountType string) string {
	switch strings.ToLower(strings.TrimSpace(accountType)) {
	case "", AdminAccountTypeUsers:
		return AdminAccountTypeUsers
	case AdminAccountTypeAll:
		return AdminAccountTypeAll
	case AdminAccountTypeTeam:
		return AdminAccountTypeTeam
	case AdminAccountTypeAssistants:
		return AdminAccountTypeAssistants
	case AdminAccountTypeAdmins:
		return AdminAccountTypeAdmins
	default:
		return ""
	}
}

// PlatformStats holds global platform KPIs.
//
// Note on plan counters: PremiumUsers counts the legacy 'premium' plan rows
// still allowed by migration 040 for backward compat; in practice this will
// be zero after migration 037. BusinessUsers is the current paid tier added
// in migration 040. Both are exposed so admin dashboards can show the full
// breakdown.
type PlatformStats struct {
	TotalUsers          int `json:"total_users"`
	BasicUsers          int `json:"basic_users"`
	ProUsers            int `json:"pro_users"`
	BusinessUsers       int `json:"business_users"`
	PremiumUsers        int `json:"premium_users"`
	TotalEvents         int `json:"total_events"`
	TotalClients        int `json:"total_clients"`
	TotalProducts       int `json:"total_products"`
	NewUsersToday       int `json:"new_users_today"`
	NewUsersWeek        int `json:"new_users_week"`
	NewUsersMonth       int `json:"new_users_month"`
	ActiveSubscriptions int `json:"active_subscriptions"`
	RegistrationsByPlatform map[string]int `json:"registrations_by_platform"`
	ActiveUsersByPlatform   map[string]int `json:"active_users_by_platform"`
	InteractionsByPlatform  map[string]int `json:"interactions_by_platform"`

	// Product analytics slice 1 — engagement + public visitor traffic.
	DAU int `json:"dau"` // distinct end-users active today (UTC)
	WAU int `json:"wau"` // last 7 days
	MAU int `json:"mau"` // last 30 days
	// DauByDay is last 30 UTC days (zeros filled). Source: user_activity_days.
	DauByDay []AnalyticsDayCount `json:"dau_by_day"`
	// Visitor* aggregates public_profile_views platform-wide (not per-organizer).
	VisitorViewsLast30d  int                 `json:"visitor_views_last_30d"`
	VisitorUniqueLast30d int                 `json:"visitor_unique_last_30d"`
	VisitorViewsByDay    []AnalyticsDayCount `json:"visitor_views_by_day"`

	// Slice 2 — landing + coarse device/country (visitor traffic).
	LandingViewsLast30d  int                 `json:"landing_views_last_30d"`
	LandingUniqueLast30d int                 `json:"landing_unique_last_30d"`
	LandingViewsByDay    []AnalyticsDayCount `json:"landing_views_by_day"`
	VisitorByDevice      map[string]int      `json:"visitor_by_device"`
	VisitorByCountry     map[string]int      `json:"visitor_by_country"`

	// Slice 3 — registration funnel (last 30d UTC window).
	FunnelRegisterViewsLast30d int            `json:"funnel_register_views_last_30d"`
	FunnelRegisteredLast30d    int            `json:"funnel_registered_last_30d"`
	FunnelEmailVerifiedLast30d int            `json:"funnel_email_verified_last_30d"`
	FunnelFirstLoginLast30d    int            `json:"funnel_first_login_last_30d"`
	FunnelRegisteredByMethod   map[string]int `json:"funnel_registered_by_method"`
}

// AnalyticsDayCount is one calendar day for admin time-series charts.
type AnalyticsDayCount struct {
	Date  string `json:"date"` // YYYY-MM-DD (UTC)
	Count int    `json:"count"`
}

// AdminUser represents a user with usage stats for admin views.
type AdminUser struct {
	ID                 uuid.UUID  `json:"id"`
	Email              string     `json:"email"`
	Name               string     `json:"name"`
	BusinessName       *string    `json:"business_name,omitempty"`
	Plan               string     `json:"plan"`
	Role               string     `json:"role"`
	AccountStatus      string     `json:"account_status"`
	BlockedAt          *time.Time `json:"blocked_at,omitempty"`
	BlockedReason      *string    `json:"blocked_reason,omitempty"`
	BlockedBy          *uuid.UUID `json:"blocked_by,omitempty"`
	DeletionEligibleAt *time.Time `json:"deletion_eligible_at,omitempty"`
	DeletedAt          *time.Time `json:"deleted_at,omitempty"`
	EmailVerifiedAt    *time.Time `json:"email_verified_at,omitempty"`
	StripeCustomerID   *string    `json:"stripe_customer_id,omitempty"`
	HasPaidSub         bool       `json:"has_paid_subscription"`
	PlanExpiresAt      *time.Time `json:"plan_expires_at,omitempty"`
	EventsCount        int        `json:"events_count"`
	ClientsCount       int        `json:"clients_count"`
	ProductsCount      int        `json:"products_count"`
	RegistrationPlatform string                `json:"registration_platform"`
	PlatformActivity     []models.UserPlatform `json:"platform_activity"`
	ActivePlatforms      []string              `json:"active_platforms"`
	LastActiveAt         *time.Time            `json:"last_active_at,omitempty"`
	LastLoginAt          *time.Time            `json:"last_login_at,omitempty"`
	CreatedAt            time.Time             `json:"created_at"`
	UpdatedAt            time.Time             `json:"updated_at"`
}

// AdminUserListOpts filters/pages the admin user list.
type AdminUserListOpts struct {
	AccountType string
	Search      string // name, email, business_name (ILIKE)
	Plan        string // empty or "all" = no filter
	Offset      int
	Limit       int // <= 0 = no limit (legacy full list)
}

// SubscriptionOverview holds subscription stats.
type SubscriptionOverview struct {
	TotalActive   int `json:"total_active"`
	TotalCanceled int `json:"total_canceled"`
	TotalTrialing int `json:"total_trialing"`
	TotalPastDue  int `json:"total_past_due"`
	// Provider counts are for active subscriptions only.
	StripeCount int `json:"stripe_count"`
	AppleCount  int `json:"apple_count"`
	GoogleCount int `json:"google_count"`
	// CanceledLast30Days is the period-churn numerator (last 30 days).
	CanceledLast30Days int `json:"canceled_last_30_days"`
}

// GetPlatformStats returns global platform KPIs.
func (r *AdminRepo) GetPlatformStats(ctx context.Context) (*PlatformStats, error) {
	stats := &PlatformStats{}

	// Users by plan: end-user accounts only, active & not soft-deleted.
	const activeUserFilter = `role = 'user' AND COALESCE(account_status, 'active') = 'active' AND deleted_at IS NULL`

	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND plan = 'basic'`).Scan(&stats.BasicUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count basic users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND plan = 'pro'`).Scan(&stats.ProUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count pro users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND plan = 'business'`).Scan(&stats.BusinessUsers)
	if err != nil {
		return nil, fmt.Errorf("failed to count business users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND plan = 'premium'`).Scan(&stats.PremiumUsers)
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

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND created_at >= $1`, todayStart).Scan(&stats.NewUsersToday)
	if err != nil {
		return nil, fmt.Errorf("failed to count today's users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND created_at >= $1`, weekStart).Scan(&stats.NewUsersWeek)
	if err != nil {
		return nil, fmt.Errorf("failed to count week's users: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users WHERE `+activeUserFilter+` AND created_at >= $1`, monthStart).Scan(&stats.NewUsersMonth)
	if err != nil {
		return nil, fmt.Errorf("failed to count month's users: %w", err)
	}

	// Active subscriptions
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM subscriptions s
		JOIN users u ON u.id = s.user_id
		WHERE s.status = 'active' AND u.role = 'user'`).Scan(&stats.ActiveSubscriptions)
	if err != nil {
		return nil, fmt.Errorf("failed to count active subs: %w", err)
	}

	// Registrations by platform (active, non-deleted users only).
	stats.RegistrationsByPlatform = make(map[string]int)
	rowsRegs, err := r.pool.Query(ctx, `
		SELECT COALESCE(NULLIF(registration_platform, ''), 'unknown'), COUNT(*)
		FROM users
		WHERE role = 'user'
		  AND COALESCE(account_status, 'active') = 'active'
		  AND deleted_at IS NULL
		GROUP BY 1`)
	if err != nil {
		return nil, fmt.Errorf("failed to count registrations by platform: %w", err)
	}
	defer rowsRegs.Close()
	for rowsRegs.Next() {
		var p string
		var count int
		if err := rowsRegs.Scan(&p, &count); err != nil {
			return nil, fmt.Errorf("failed to scan registrations by platform: %w", err)
		}
		stats.RegistrationsByPlatform[p] = count
	}
	if err := rowsRegs.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating registrations by platform: %w", err)
	}

	// Active users in last 30 days by platform
	stats.ActiveUsersByPlatform = make(map[string]int)
	rowsActive, err := r.pool.Query(ctx, `
		SELECT up.platform, COUNT(DISTINCT up.user_id)
		FROM user_platforms up
		JOIN users u ON u.id = up.user_id
		WHERE up.last_used_at >= NOW() - INTERVAL '30 days'
		  AND u.role = 'user'
		  AND COALESCE(u.account_status, 'active') = 'active'
		  AND u.deleted_at IS NULL
		GROUP BY up.platform`)
	if err != nil {
		return nil, fmt.Errorf("failed to count active users by platform: %w", err)
	}
	defer rowsActive.Close()
	for rowsActive.Next() {
		var p string
		var count int
		if err := rowsActive.Scan(&p, &count); err != nil {
			return nil, fmt.Errorf("failed to scan active users by platform: %w", err)
		}
		stats.ActiveUsersByPlatform[p] = count
	}
	if err := rowsActive.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating active users by platform: %w", err)
	}

	// Interactions for users active in the last 30 days (aligned with MAU window).
	// interaction_count is cumulative, so this is "lifetime hits of 30d-active users",
	// not pure 30d deltas — still better than all-time / 30d MAU mixing dead accounts.
	stats.InteractionsByPlatform = make(map[string]int)
	rowsInteractions, err := r.pool.Query(ctx, `
		SELECT up.platform, COALESCE(SUM(up.interaction_count), 0)
		FROM user_platforms up
		JOIN users u ON u.id = up.user_id
		WHERE up.last_used_at >= NOW() - INTERVAL '30 days'
		  AND u.role = 'user'
		  AND COALESCE(u.account_status, 'active') = 'active'
		  AND u.deleted_at IS NULL
		GROUP BY up.platform`)
	if err != nil {
		return nil, fmt.Errorf("failed to sum interactions by platform: %w", err)
	}
	defer rowsInteractions.Close()
	for rowsInteractions.Next() {
		var p string
		var count int
		if err := rowsInteractions.Scan(&p, &count); err != nil {
			return nil, fmt.Errorf("failed to scan interactions by platform: %w", err)
		}
		stats.InteractionsByPlatform[p] = count
	}
	if err := rowsInteractions.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating interactions by platform: %w", err)
	}

	// --- Product analytics: DAU / WAU / MAU (end-users, active accounts) ---
	utcToday := time.Now().UTC().Truncate(24 * time.Hour)
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM users
		WHERE `+activeUserFilter+`
		  AND last_active_at >= $1`, utcToday).Scan(&stats.DAU); err != nil {
		return nil, fmt.Errorf("failed to count DAU: %w", err)
	}
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM users
		WHERE `+activeUserFilter+`
		  AND last_active_at >= NOW() - INTERVAL '7 days'`).Scan(&stats.WAU); err != nil {
		return nil, fmt.Errorf("failed to count WAU: %w", err)
	}
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM users
		WHERE `+activeUserFilter+`
		  AND last_active_at >= NOW() - INTERVAL '30 days'`).Scan(&stats.MAU); err != nil {
		return nil, fmt.Errorf("failed to count MAU: %w", err)
	}

	// DAU series from user_activity_days (distinct users per UTC day, any platform).
	seriesStart := utcToday.AddDate(0, 0, -29)
	seriesEnd := utcToday.AddDate(0, 0, 1) // exclusive
	stats.DauByDay = make([]AnalyticsDayCount, 0, 30)
	dauRows, err := r.pool.Query(ctx, `
		SELECT to_char(d.activity_date, 'YYYY-MM-DD'), COUNT(DISTINCT d.user_id)::int
		FROM user_activity_days d
		JOIN users u ON u.id = d.user_id
		WHERE d.activity_date >= $1::date
		  AND d.activity_date < $2::date
		  AND u.role = 'user'
		  AND COALESCE(u.account_status, 'active') = 'active'
		  AND u.deleted_at IS NULL
		GROUP BY d.activity_date
		ORDER BY d.activity_date ASC`,
		seriesStart, seriesEnd,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query DAU by day: %w", err)
	}
	dauMap := map[string]int{}
	for dauRows.Next() {
		var d string
		var c int
		if err := dauRows.Scan(&d, &c); err != nil {
			dauRows.Close()
			return nil, fmt.Errorf("failed to scan DAU by day: %w", err)
		}
		dauMap[d] = c
	}
	dauRows.Close()
	if err := dauRows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating DAU by day: %w", err)
	}
	for d := seriesStart; d.Before(seriesEnd); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		stats.DauByDay = append(stats.DauByDay, AnalyticsDayCount{Date: key, Count: dauMap[key]})
	}

	// Visitor public-profile views (platform-wide) last 30 days.
	visitorStart := utcToday.AddDate(0, 0, -29)
	visitorEnd := seriesEnd
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int, COUNT(DISTINCT visitor_hash)::int
		FROM public_profile_views
		WHERE viewed_at >= $1 AND viewed_at < $2`,
		visitorStart, visitorEnd,
	).Scan(&stats.VisitorViewsLast30d, &stats.VisitorUniqueLast30d); err != nil {
		return nil, fmt.Errorf("failed to count visitor views: %w", err)
	}

	stats.VisitorViewsByDay = make([]AnalyticsDayCount, 0, 30)
	vRows, err := r.pool.Query(ctx, `
		SELECT to_char(viewed_at::date, 'YYYY-MM-DD'), COUNT(*)::int
		FROM public_profile_views
		WHERE viewed_at >= $1 AND viewed_at < $2
		GROUP BY viewed_at::date
		ORDER BY 1 ASC`,
		visitorStart, visitorEnd,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query visitor views by day: %w", err)
	}
	vMap := map[string]int{}
	for vRows.Next() {
		var d string
		var c int
		if err := vRows.Scan(&d, &c); err != nil {
			vRows.Close()
			return nil, fmt.Errorf("failed to scan visitor views by day: %w", err)
		}
		vMap[d] = c
	}
	vRows.Close()
	if err := vRows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating visitor views by day: %w", err)
	}
	for d := visitorStart; d.Before(visitorEnd); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		stats.VisitorViewsByDay = append(stats.VisitorViewsByDay, AnalyticsDayCount{Date: key, Count: vMap[key]})
	}

	// Landing page views (site_page_views).
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int, COUNT(DISTINCT visitor_hash)::int
		FROM site_page_views
		WHERE page_key = 'landing'
		  AND viewed_at >= $1 AND viewed_at < $2`,
		visitorStart, visitorEnd,
	).Scan(&stats.LandingViewsLast30d, &stats.LandingUniqueLast30d); err != nil {
		return nil, fmt.Errorf("failed to count landing views: %w", err)
	}
	stats.LandingViewsByDay = make([]AnalyticsDayCount, 0, 30)
	lRows, err := r.pool.Query(ctx, `
		SELECT to_char(viewed_at::date, 'YYYY-MM-DD'), COUNT(*)::int
		FROM site_page_views
		WHERE page_key = 'landing'
		  AND viewed_at >= $1 AND viewed_at < $2
		GROUP BY viewed_at::date
		ORDER BY 1 ASC`,
		visitorStart, visitorEnd,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query landing views by day: %w", err)
	}
	lMap := map[string]int{}
	for lRows.Next() {
		var d string
		var c int
		if err := lRows.Scan(&d, &c); err != nil {
			lRows.Close()
			return nil, fmt.Errorf("failed to scan landing views by day: %w", err)
		}
		lMap[d] = c
	}
	lRows.Close()
	if err := lRows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating landing views by day: %w", err)
	}
	for d := visitorStart; d.Before(visitorEnd); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		stats.LandingViewsByDay = append(stats.LandingViewsByDay, AnalyticsDayCount{Date: key, Count: lMap[key]})
	}

	// Device mix: profile + site page views.
	stats.VisitorByDevice = make(map[string]int)
	devRows, err := r.pool.Query(ctx, `
		SELECT device_class, SUM(cnt)::int FROM (
			SELECT COALESCE(NULLIF(device_class, ''), 'unknown') AS device_class, COUNT(*)::int AS cnt
			FROM public_profile_views
			WHERE viewed_at >= $1 AND viewed_at < $2
			GROUP BY 1
			UNION ALL
			SELECT COALESCE(NULLIF(device_class, ''), 'unknown'), COUNT(*)::int
			FROM site_page_views
			WHERE viewed_at >= $1 AND viewed_at < $2
			GROUP BY 1
		) s
		GROUP BY device_class`,
		visitorStart, visitorEnd,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query visitor by device: %w", err)
	}
	for devRows.Next() {
		var d string
		var c int
		if err := devRows.Scan(&d, &c); err != nil {
			devRows.Close()
			return nil, fmt.Errorf("failed to scan visitor by device: %w", err)
		}
		stats.VisitorByDevice[d] = c
	}
	devRows.Close()
	if err := devRows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating visitor by device: %w", err)
	}

	// Country mix (edge headers only).
	stats.VisitorByCountry = make(map[string]int)
	cRows, err := r.pool.Query(ctx, `
		SELECT country_code, SUM(cnt)::int FROM (
			SELECT UPPER(country_code) AS country_code, COUNT(*)::int AS cnt
			FROM public_profile_views
			WHERE viewed_at >= $1 AND viewed_at < $2
			  AND country_code IS NOT NULL AND country_code <> ''
			GROUP BY 1
			UNION ALL
			SELECT UPPER(country_code), COUNT(*)::int
			FROM site_page_views
			WHERE viewed_at >= $1 AND viewed_at < $2
			  AND country_code IS NOT NULL AND country_code <> ''
			GROUP BY 1
		) s
		GROUP BY country_code
		ORDER BY 2 DESC
		LIMIT 15`,
		visitorStart, visitorEnd,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query visitor by country: %w", err)
	}
	for cRows.Next() {
		var code string
		var c int
		if err := cRows.Scan(&code, &c); err != nil {
			cRows.Close()
			return nil, fmt.Errorf("failed to scan visitor by country: %w", err)
		}
		stats.VisitorByCountry[code] = c
	}
	cRows.Close()
	if err := cRows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating visitor by country: %w", err)
	}

	// Registration funnel (slice 3) — step counts last 30d.
	countFunnelStep := func(step string, dest *int) error {
		return r.pool.QueryRow(ctx, `
			SELECT COUNT(*)::int
			FROM registration_funnel_events
			WHERE step = $1
			  AND occurred_at >= $2 AND occurred_at < $3`,
			step, visitorStart, visitorEnd,
		).Scan(dest)
	}
	if err := countFunnelStep("register_view", &stats.FunnelRegisterViewsLast30d); err != nil {
		return nil, fmt.Errorf("failed to count funnel register_view: %w", err)
	}
	if err := countFunnelStep("registered", &stats.FunnelRegisteredLast30d); err != nil {
		return nil, fmt.Errorf("failed to count funnel registered: %w", err)
	}
	if err := countFunnelStep("email_verified", &stats.FunnelEmailVerifiedLast30d); err != nil {
		return nil, fmt.Errorf("failed to count funnel email_verified: %w", err)
	}
	if err := countFunnelStep("first_login", &stats.FunnelFirstLoginLast30d); err != nil {
		return nil, fmt.Errorf("failed to count funnel first_login: %w", err)
	}

	stats.FunnelRegisteredByMethod = make(map[string]int)
	mRows, err := r.pool.Query(ctx, `
		SELECT COALESCE(NULLIF(method, ''), 'unknown'), COUNT(*)::int
		FROM registration_funnel_events
		WHERE step = 'registered'
		  AND occurred_at >= $1 AND occurred_at < $2
		GROUP BY 1`,
		visitorStart, visitorEnd,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query funnel registered by method: %w", err)
	}
	for mRows.Next() {
		var method string
		var c int
		if err := mRows.Scan(&method, &c); err != nil {
			mRows.Close()
			return nil, fmt.Errorf("failed to scan funnel registered by method: %w", err)
		}
		stats.FunnelRegisteredByMethod[method] = c
	}
	mRows.Close()
	if err := mRows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating funnel registered by method: %w", err)
	}

	return stats, nil
}

func adminUsersWhere(accountType string) (whereClause string, ok bool) {
	switch normalizeAdminAccountType(accountType) {
	case AdminAccountTypeUsers:
		return "WHERE u.role = 'user'", true
	case AdminAccountTypeTeam:
		return "WHERE u.role = 'team_member'", true
	case AdminAccountTypeAssistants:
		return "WHERE u.role = 'assistant'", true
	case AdminAccountTypeAdmins:
		return "WHERE u.role = 'admin'", true
	case AdminAccountTypeAll:
		return "", true
	default:
		return "", false
	}
}

const adminUserListSelect = `
		SELECT
			u.id, u.email, u.name, u.business_name, u.plan, u.role,
			COALESCE(u.account_status, 'active') AS account_status,
			u.blocked_at, u.blocked_reason, u.blocked_by, u.deletion_eligible_at, u.deleted_at,
			u.email_verified_at,
			u.stripe_customer_id,
			(u.stripe_customer_id IS NOT NULL OR EXISTS(
				SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
			)) AS has_paid_sub,
			u.plan_expires_at,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.user_id = u.id), 0) AS events_count,
			COALESCE((SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id), 0) AS clients_count,
			COALESCE((SELECT COUNT(*) FROM products p WHERE p.user_id = u.id), 0) AS products_count,
			COALESCE(u.registration_platform, 'unknown') AS registration_platform,
			COALESCE((SELECT string_agg(platform, ',') FROM user_platforms WHERE user_id = u.id), '') AS active_platforms_str,
			u.last_active_at, u.last_login_at, u.created_at, u.updated_at
		FROM users u `

// GetAllUsers returns admin-user rows filtered by account type (unbounded — prefer GetAllUsersPage).
func (r *AdminRepo) GetAllUsers(ctx context.Context, accountType string) ([]AdminUser, error) {
	users, _, err := r.GetAllUsersPage(ctx, AdminUserListOpts{AccountType: accountType})
	return users, err
}

// GetAllUsersPage returns a page of admin users and the total matching count.
// Limit <= 0 returns all matching rows (legacy callers).
func (r *AdminRepo) GetAllUsersPage(ctx context.Context, opts AdminUserListOpts) ([]AdminUser, int, error) {
	whereClause, ok := adminUsersWhere(opts.AccountType)
	if !ok {
		return nil, 0, fmt.Errorf("invalid account type")
	}

	args := make([]any, 0, 4)
	extra := make([]string, 0, 2)

	search := strings.TrimSpace(opts.Search)
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		n := len(args)
		extra = append(extra, fmt.Sprintf(
			`(LOWER(u.email) LIKE $%d OR LOWER(u.name) LIKE $%d OR LOWER(COALESCE(u.business_name, '')) LIKE $%d)`,
			n, n, n,
		))
	}

	plan := strings.ToLower(strings.TrimSpace(opts.Plan))
	if plan != "" && plan != "all" {
		args = append(args, plan)
		extra = append(extra, fmt.Sprintf(`LOWER(u.plan) = $%d`, len(args)))
	}

	if len(extra) > 0 {
		conj := strings.Join(extra, " AND ")
		if whereClause == "" {
			whereClause = "WHERE " + conj
		} else {
			whereClause = whereClause + " AND " + conj
		}
	}

	countQuery := `SELECT COUNT(*) FROM users u ` + whereClause
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	query := adminUserListSelect + whereClause + ` ORDER BY u.created_at DESC`
	queryArgs := append([]any{}, args...)
	if opts.Limit > 0 {
		offset := opts.Offset
		if offset < 0 {
			offset = 0
		}
		query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(queryArgs)+1, len(queryArgs)+2)
		queryArgs = append(queryArgs, opts.Limit, offset)
	}

	rows, err := r.pool.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		var activePlatsStr string
		err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.BusinessName, &u.Plan, &u.Role,
			&u.AccountStatus, &u.BlockedAt, &u.BlockedReason, &u.BlockedBy, &u.DeletionEligibleAt, &u.DeletedAt,
			&u.EmailVerifiedAt,
			&u.StripeCustomerID,
			&u.HasPaidSub, &u.PlanExpiresAt,
			&u.EventsCount, &u.ClientsCount, &u.ProductsCount,
			&u.RegistrationPlatform, &activePlatsStr,
			&u.LastActiveAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}
		u.PlatformActivity = []models.UserPlatform{}
		if activePlatsStr != "" {
			u.ActivePlatforms = strings.Split(activePlatsStr, ",")
		} else {
			u.ActivePlatforms = []string{}
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating users: %w", err)
	}

	return users, total, nil
}

// GetUserByID returns a single user with usage stats for admin view.
func (r *AdminRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*AdminUser, error) {
	query := `
		SELECT
			u.id, u.email, u.name, u.business_name, u.plan, u.role,
			COALESCE(u.account_status, 'active') AS account_status,
			u.blocked_at, u.blocked_reason, u.blocked_by, u.deletion_eligible_at, u.deleted_at,
			u.email_verified_at,
			u.stripe_customer_id,
			(u.stripe_customer_id IS NOT NULL OR EXISTS(
				SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
			)) AS has_paid_sub,
			u.plan_expires_at,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.user_id = u.id), 0) AS events_count,
			COALESCE((SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id), 0) AS clients_count,
			COALESCE((SELECT COUNT(*) FROM products p WHERE p.user_id = u.id), 0) AS products_count,
			COALESCE(u.registration_platform, 'unknown') AS registration_platform,
			u.last_active_at, u.last_login_at, u.created_at, u.updated_at
		FROM users u
		WHERE u.id = $1`

	var u AdminUser
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.BusinessName, &u.Plan, &u.Role,
		&u.AccountStatus, &u.BlockedAt, &u.BlockedReason, &u.BlockedBy, &u.DeletionEligibleAt, &u.DeletedAt,
		&u.EmailVerifiedAt,
		&u.StripeCustomerID,
		&u.HasPaidSub, &u.PlanExpiresAt,
		&u.EventsCount, &u.ClientsCount, &u.ProductsCount,
		&u.RegistrationPlatform,
		&u.LastActiveAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAdminUserNotFound
		}
		return nil, fmt.Errorf("get admin user by id: %w", err)
	}

	u.PlatformActivity = []models.UserPlatform{}
	u.ActivePlatforms = []string{}

	// Load detailed platform activity metrics for this user
	rows, err := r.pool.Query(ctx, `
		SELECT user_id, platform, interaction_count, last_used_at
		FROM user_platforms
		WHERE user_id = $1
		ORDER BY last_used_at DESC`, id)
	if err != nil {
		return nil, fmt.Errorf("list user platforms: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var ap models.UserPlatform
		if err := rows.Scan(&ap.UserID, &ap.Platform, &ap.InteractionCount, &ap.LastUsedAt); err != nil {
			return nil, fmt.Errorf("scan user platform: %w", err)
		}
		u.PlatformActivity = append(u.PlatformActivity, ap)
		u.ActivePlatforms = append(u.ActivePlatforms, ap.Platform)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user platforms: %w", err)
	}

	return &u, nil
}

// BlockUser transitions an end-user account to blocked state and sets
// deletion eligibility to 6 months after block time.
func (r *AdminRepo) BlockUser(ctx context.Context, id, adminID uuid.UUID, reason string) error {
	if strings.TrimSpace(reason) == "" {
		return fmt.Errorf("block reason is required")
	}

	var role string
	var currentStatus string
	err := r.pool.QueryRow(ctx, `
		SELECT role, COALESCE(account_status, 'active')
		FROM users
		WHERE id = $1
	`, id).Scan(&role, &currentStatus)
	if err != nil {
		return ErrAdminUserNotFound
	}

	if role != "user" {
		return ErrAdminUserNotBlockable
	}

	if currentStatus == AccountStatusDeleted {
		return ErrAdminUserAlreadyDeleted
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin block user tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	query := `
		UPDATE users
		SET account_status = $2,
			blocked_at = NOW(),
			blocked_reason = $3,
			blocked_by = $4,
			deletion_eligible_at = NOW() + INTERVAL '6 months',
			updated_at = NOW()
		WHERE id = $1`
	tag, err := tx.Exec(ctx, query, id, AccountStatusBlocked, strings.TrimSpace(reason), adminID)
	if err != nil {
		return fmt.Errorf("failed to block user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAdminUserNotFound
	}

	if _, err = tx.Exec(ctx, `DELETE FROM refresh_token_families WHERE user_id = $1`, id); err != nil {
		return fmt.Errorf("failed to revoke refresh tokens for blocked user: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit block user tx: %w", err)
	}

	return nil
}

// DeleteBlockedUserIfEligible soft-deletes a blocked user once the 6-month
// eligibility period has been reached.
func (r *AdminRepo) DeleteBlockedUserIfEligible(ctx context.Context, id uuid.UUID) error {
	var currentStatus string
	var eligibleAt *time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(account_status, 'active'), deletion_eligible_at
		FROM users
		WHERE id = $1
	`, id).Scan(&currentStatus, &eligibleAt)
	if err != nil {
		return ErrAdminUserNotFound
	}

	if currentStatus == AccountStatusDeleted {
		return ErrAdminUserAlreadyDeleted
	}

	if currentStatus != AccountStatusBlocked {
		return ErrAdminUserNotBlocked
	}

	if eligibleAt == nil || eligibleAt.After(time.Now().UTC()) {
		return ErrAdminUserNotEligibleForDelete
	}

	query := `
		UPDATE users
		SET account_status = $2,
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, id, AccountStatusDeleted)
	if err != nil {
		return fmt.Errorf("failed to delete blocked user: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrAdminUserNotFound
	}

	return nil
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

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND provider = 'stripe'`).Scan(&overview.StripeCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count stripe: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND provider = 'apple'`).Scan(&overview.AppleCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count apple: %w", err)
	}

	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND provider = 'google'`).Scan(&overview.GoogleCount)
	if err != nil {
		return nil, fmt.Errorf("failed to count google: %w", err)
	}

	// Prefer updated_at when present; fall back to created_at for period window.
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM subscriptions
		WHERE status = 'canceled'
		  AND COALESCE(updated_at, created_at) >= NOW() - INTERVAL '30 days'`).Scan(&overview.CanceledLast30Days)
	if err != nil {
		return nil, fmt.Errorf("failed to count canceled last 30 days: %w", err)
	}

	return overview, nil
}

// GetInactiveUsers returns users whose last_active_at is older than the specified days.
func (r *AdminRepo) GetInactiveUsers(ctx context.Context, days int) ([]AdminUser, error) {
	query := `
		SELECT
			u.id, u.email, u.name, u.business_name, u.plan, u.role,
			COALESCE(u.account_status, 'active') AS account_status,
			u.blocked_at, u.blocked_reason, u.blocked_by, u.deletion_eligible_at, u.deleted_at,
			u.email_verified_at,
			u.stripe_customer_id,
			(u.stripe_customer_id IS NOT NULL OR EXISTS(
				SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
			)) AS has_paid_sub,
			u.plan_expires_at,
			COALESCE((SELECT COUNT(*) FROM events e WHERE e.user_id = u.id), 0) AS events_count,
			COALESCE((SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id), 0) AS clients_count,
			COALESCE((SELECT COUNT(*) FROM products p WHERE p.user_id = u.id), 0) AS products_count,
			COALESCE(u.registration_platform, 'unknown') AS registration_platform,
			COALESCE((SELECT string_agg(platform, ',') FROM user_platforms WHERE user_id = u.id), '') AS active_platforms_str,
			u.last_active_at, u.last_login_at, u.created_at, u.updated_at
		FROM users u
		WHERE u.role = 'user'
		  AND COALESCE(u.last_active_at, u.created_at) < NOW() - $1 * INTERVAL '1 day'
		ORDER BY COALESCE(u.last_active_at, u.created_at) ASC`

	rows, err := r.pool.Query(ctx, query, days)
	if err != nil {
		return nil, fmt.Errorf("failed to list inactive users: %w", err)
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		var activePlatsStr string
		err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.BusinessName, &u.Plan, &u.Role,
			&u.AccountStatus, &u.BlockedAt, &u.BlockedReason, &u.BlockedBy, &u.DeletionEligibleAt, &u.DeletedAt,
			&u.EmailVerifiedAt,
			&u.StripeCustomerID,
			&u.HasPaidSub, &u.PlanExpiresAt,
			&u.EventsCount, &u.ClientsCount, &u.ProductsCount,
			&u.RegistrationPlatform, &activePlatsStr,
			&u.LastActiveAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		)
		if err == nil {
			if activePlatsStr != "" {
				u.ActivePlatforms = strings.Split(activePlatsStr, ",")
			} else {
				u.ActivePlatforms = []string{}
			}
		}
		if err != nil {
			return nil, fmt.Errorf("failed to scan inactive user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

// GetUsersWithZeroResources returns users who have created 0 events, 0 products, and 0 clients.
func (r *AdminRepo) GetUsersWithZeroResources(ctx context.Context) ([]AdminUser, error) {
	query := `
		SELECT
			u.id, u.email, u.name, u.business_name, u.plan, u.role,
			COALESCE(u.account_status, 'active') AS account_status,
			u.blocked_at, u.blocked_reason, u.blocked_by, u.deletion_eligible_at, u.deleted_at,
			u.email_verified_at,
			u.stripe_customer_id,
			(u.stripe_customer_id IS NOT NULL OR EXISTS(
				SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
			)) AS has_paid_sub,
			u.plan_expires_at,
			0 AS events_count,
			0 AS clients_count,
			0 AS products_count,
			COALESCE(u.registration_platform, 'unknown') AS registration_platform,
			COALESCE((SELECT string_agg(platform, ',') FROM user_platforms WHERE user_id = u.id), '') AS active_platforms_str,
			u.last_active_at, u.last_login_at, u.created_at, u.updated_at
		FROM users u
		WHERE u.role = 'user'
		  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.user_id = u.id)
		  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.user_id = u.id)
		  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.user_id = u.id)
		ORDER BY u.created_at DESC`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list users with zero resources: %w", err)
	}
	defer rows.Close()

	var users []AdminUser
	for rows.Next() {
		var u AdminUser
		var activePlatsStr string
		err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.BusinessName, &u.Plan, &u.Role,
			&u.AccountStatus, &u.BlockedAt, &u.BlockedReason, &u.BlockedBy, &u.DeletionEligibleAt, &u.DeletedAt,
			&u.EmailVerifiedAt,
			&u.StripeCustomerID,
			&u.HasPaidSub, &u.PlanExpiresAt,
			&u.EventsCount, &u.ClientsCount, &u.ProductsCount,
			&u.RegistrationPlatform, &activePlatsStr,
			&u.LastActiveAt, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		)
		if err == nil {
			if activePlatsStr != "" {
				u.ActivePlatforms = strings.Split(activePlatsStr, ",")
			} else {
				u.ActivePlatforms = []string{}
			}
		}
		if err != nil {
			return nil, fmt.Errorf("failed to scan zero resource user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

// VerifyUserEmail marks a user's email as verified by setting email_verified_at to NOW().
func (r *AdminRepo) VerifyUserEmail(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to verify user email: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}
