package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type UserCleanupRepo struct {
	pool *pgxpool.Pool
}

func NewUserCleanupRepo(pool *pgxpool.Pool) *UserCleanupRepo {
	return &UserCleanupRepo{pool: pool}
}

func scanUser(row pgx.Row) (*models.User, error) {
	user := &models.User{}
	err := row.Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.CoverURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.PreferredLanguage, &user.DefaultCurrency,
		&user.EmailVerifiedAt, &user.EmailVerificationHash, &user.EmailVerificationSentAt, &user.EmailVerificationExpiry,
		&user.Plan, &user.Role,
		&user.AccountStatus, &user.BlockedAt, &user.BlockedReason, &user.BlockedBy, &user.DeletionEligibleAt, &user.DeletedAt,
		&user.StripeCustomerID, &user.LastActiveAt, &user.RegistrationPlatform,
		&user.InactivityStage, &user.InactivityWarningSentAt,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

const selectUserColumns = `SELECT id, email, password_hash, name, business_name, logo_url, cover_url, brand_color, show_business_name_in_pdf,
	default_deposit_percent, default_cancellation_days, default_refund_percent,
	contract_template,
	email_payment_receipt, email_event_reminder, email_subscription_updates,
	email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
	preferred_language, default_currency,
	email_verified_at, email_verification_token_hash, email_verification_sent_at, email_verification_expires_at,
	plan, role,
	COALESCE(account_status, 'active') AS account_status,
	blocked_at, blocked_reason, blocked_by, deletion_eligible_at, deleted_at,
	stripe_customer_id, last_active_at, registration_platform,
	COALESCE(inactivity_stage, 0) AS inactivity_stage, inactivity_warning_sent_at,
	created_at, updated_at
	FROM users`

// FindStage1WarningCandidates returns active basic/free plan users inactive >= 90 days with stage 0.
func (r *UserCleanupRepo) FindStage1WarningCandidates(ctx context.Context, inactiveThreshold time.Time) ([]*models.User, error) {
	query := selectUserColumns + `
		WHERE COALESCE(account_status, 'active') = 'active'
		  AND LOWER(plan) IN ('basic', 'free', 'gratis')
		  AND COALESCE(inactivity_stage, 0) = 0
		  AND COALESCE(last_active_at, created_at) <= $1`

	rows, err := r.pool.Query(ctx, query, inactiveThreshold)
	if err != nil {
		return nil, fmt.Errorf("failed to query stage 1 warning candidates: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan stage 1 candidate: %w", err)
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

// FindStage2WarningCandidates returns active basic/free plan users inactive >= 120 days with stage 1.
func (r *UserCleanupRepo) FindStage2WarningCandidates(ctx context.Context, inactiveThreshold time.Time, minWarningAge time.Time) ([]*models.User, error) {
	query := selectUserColumns + `
		WHERE COALESCE(account_status, 'active') = 'active'
		  AND LOWER(plan) IN ('basic', 'free', 'gratis')
		  AND inactivity_stage = 1
		  AND COALESCE(last_active_at, created_at) <= $1
		  AND (inactivity_warning_sent_at IS NULL OR inactivity_warning_sent_at <= $2)`

	rows, err := r.pool.Query(ctx, query, inactiveThreshold, minWarningAge)
	if err != nil {
		return nil, fmt.Errorf("failed to query stage 2 warning candidates: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan stage 2 candidate: %w", err)
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

// FindStage3WarningCandidates returns active basic/free plan users inactive >= 150 days with stage 2.
func (r *UserCleanupRepo) FindStage3WarningCandidates(ctx context.Context, inactiveThreshold time.Time, minWarningAge time.Time) ([]*models.User, error) {
	query := selectUserColumns + `
		WHERE COALESCE(account_status, 'active') = 'active'
		  AND LOWER(plan) IN ('basic', 'free', 'gratis')
		  AND inactivity_stage = 2
		  AND COALESCE(last_active_at, created_at) <= $1
		  AND (inactivity_warning_sent_at IS NULL OR inactivity_warning_sent_at <= $2)`

	rows, err := r.pool.Query(ctx, query, inactiveThreshold, minWarningAge)
	if err != nil {
		return nil, fmt.Errorf("failed to query stage 3 warning candidates: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan stage 3 candidate: %w", err)
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

// FindBlockCandidates returns active basic/free plan users inactive >= 180 days with stage >= 3.
func (r *UserCleanupRepo) FindBlockCandidates(ctx context.Context, inactiveThreshold time.Time) ([]*models.User, error) {
	query := selectUserColumns + `
		WHERE COALESCE(account_status, 'active') = 'active'
		  AND LOWER(plan) IN ('basic', 'free', 'gratis')
		  AND inactivity_stage >= 3
		  AND COALESCE(last_active_at, created_at) <= $1`

	rows, err := r.pool.Query(ctx, query, inactiveThreshold)
	if err != nil {
		return nil, fmt.Errorf("failed to query block candidates: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan block candidate: %w", err)
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

// FindHardDeleteCandidates returns blocked users whose retention period has expired.
func (r *UserCleanupRepo) FindHardDeleteCandidates(ctx context.Context, now time.Time) ([]*models.User, error) {
	query := selectUserColumns + `
		WHERE COALESCE(account_status, 'active') = 'blocked'
		  AND deletion_eligible_at IS NOT NULL
		  AND deletion_eligible_at <= $1`

	rows, err := r.pool.Query(ctx, query, now)
	if err != nil {
		return nil, fmt.Errorf("failed to query hard delete candidates: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan hard delete candidate: %w", err)
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

// UpdateInactivityStage sets the warning stage and updates inactivity_warning_sent_at.
func (r *UserCleanupRepo) UpdateInactivityStage(ctx context.Context, userID uuid.UUID, stage int) error {
	query := `
		UPDATE users
		SET inactivity_stage = $2,
			inactivity_warning_sent_at = NOW(),
			updated_at = NOW()
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID, stage)
	return err
}

// BlockUserForInactivity soft-blocks an inactive user and sets deletion_eligible_at to +30 days.
func (r *UserCleanupRepo) BlockUserForInactivity(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users
		SET account_status = 'blocked',
			blocked_at = NOW(),
			blocked_reason = 'Inactivity policy: 180 days without activity',
			deletion_eligible_at = NOW() + INTERVAL '30 days',
			updated_at = NOW()
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// HardDeleteUser performs a cascading delete of the user record and associated data.
func (r *UserCleanupRepo) HardDeleteUser(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}
