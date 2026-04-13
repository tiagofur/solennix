package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf, plan, role)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`
	if user.Role == "" {
		user.Role = "user"
	}
	return r.pool.QueryRow(ctx, query,
		user.Email, user.PasswordHash, user.Name, user.BusinessName, user.LogoURL, user.BrandColor, user.ShowBusinessNameInPdf, user.Plan, user.Role,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
		default_deposit_percent, default_cancellation_days, default_refund_percent,
		contract_template,
		email_payment_receipt, email_event_reminder, email_subscription_updates,
		email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
		plan, role, stripe_customer_id, created_at, updated_at
		FROM users WHERE email = $1`
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
		default_deposit_percent, default_cancellation_days, default_refund_percent,
		contract_template,
		email_payment_receipt, email_event_reminder, email_subscription_updates,
		email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
		plan, role, stripe_customer_id, created_at, updated_at
		FROM users WHERE id = $1`
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

func (r *UserRepo) Update(ctx context.Context, id uuid.UUID, name, businessName, logoURL, brandColor *string, showBusinessNameInPdf *bool,
	depositPercent, cancellationDays, refundPercent *float64, contractTemplate *string,
	emailPaymentReceipt, emailEventReminder, emailSubscriptionUpdates, emailWeeklySummary, emailMarketing, pushEnabled, pushEventReminder, pushPaymentReceived *bool) (*models.User, error) {
	query := `
		UPDATE users SET
			name = COALESCE($2, name),
			business_name = COALESCE($3, business_name),
			logo_url = COALESCE($4, logo_url),
			brand_color = COALESCE($5, brand_color),
			show_business_name_in_pdf = COALESCE($6, show_business_name_in_pdf),
			default_deposit_percent = COALESCE($7, default_deposit_percent),
			default_cancellation_days = COALESCE($8, default_cancellation_days),
			default_refund_percent = COALESCE($9, default_refund_percent),
			contract_template = COALESCE($10, contract_template),
			email_payment_receipt = COALESCE($11, email_payment_receipt),
			email_event_reminder = COALESCE($12, email_event_reminder),
			email_subscription_updates = COALESCE($13, email_subscription_updates),
			email_weekly_summary = COALESCE($14, email_weekly_summary),
			email_marketing = COALESCE($15, email_marketing),
			push_enabled = COALESCE($16, push_enabled),
			push_event_reminder = COALESCE($17, push_event_reminder),
			push_payment_received = COALESCE($18, push_payment_received),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
			default_deposit_percent, default_cancellation_days, default_refund_percent,
			contract_template,
			email_payment_receipt, email_event_reminder, email_subscription_updates,
			email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
			plan, role, stripe_customer_id, created_at, updated_at`
	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, id, name, businessName, logoURL, brandColor, showBusinessNameInPdf,
		depositPercent, cancellationDays, refundPercent, contractTemplate,
		emailPaymentReceipt, emailEventReminder, emailSubscriptionUpdates, emailWeeklySummary, emailMarketing, pushEnabled, pushEventReminder, pushPaymentReceived).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, nil
}

// GetPlanByID returns just the subscription plan for a user by ID.
// Used by the rate limiter to resolve plan-based limits without loading the full user.
func (r *UserRepo) GetPlanByID(ctx context.Context, id uuid.UUID) (string, error) {
	var plan string
	err := r.pool.QueryRow(ctx, `SELECT plan FROM users WHERE id = $1`, id).Scan(&plan)
	if err != nil {
		return "", fmt.Errorf("user not found: %w", err)
	}
	return plan, nil
}

// UpdatePlanAndStripeID updates the user's plan and optionally their Stripe Customer ID
func (r *UserRepo) UpdatePlanAndStripeID(ctx context.Context, id uuid.UUID, plan string, stripeCustomerID *string) error {
	query := `
		UPDATE users SET
			plan = $2,
			stripe_customer_id = COALESCE($3, stripe_customer_id),
			updated_at = NOW()
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id, plan, stripeCustomerID)
	return err
}

// UpdatePlanByStripeCustomerID downgrades/upgrades a user by their Stripe Customer ID.
// Used when Stripe webhooks reference a customer but not a user ID.
func (r *UserRepo) UpdatePlanByStripeCustomerID(ctx context.Context, stripeCustomerID string, plan string) error {
	query := `
		UPDATE users SET
			plan = $2,
			updated_at = NOW()
		WHERE stripe_customer_id = $1`
	tag, err := r.pool.Exec(ctx, query, stripeCustomerID, plan)
	if err != nil {
		return fmt.Errorf("failed to update plan by stripe customer id: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("no user found with stripe_customer_id: %s", stripeCustomerID)
	}
	return nil
}

// GetByStripeCustomerID retrieves a user by their Stripe Customer ID.
// Used to look up user ID for RevenueCat entitlement sync on Stripe webhook events.
func (r *UserRepo) GetByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
		default_deposit_percent, default_cancellation_days, default_refund_percent,
		contract_template,
		email_payment_receipt, email_event_reminder, email_subscription_updates,
		email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
		plan, role, stripe_customer_id, created_at, updated_at
		FROM users WHERE stripe_customer_id = $1`
	err := r.pool.QueryRow(ctx, query, stripeCustomerID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found by stripe_customer_id: %w", err)
	}
	return user, nil
}

// UpdatePassword updates a user's password hash
func (r *UserRepo) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	query := `
		UPDATE users SET
			password_hash = $2,
			updated_at = NOW()
		WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, userID, passwordHash)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// GetByGoogleUserID finds a user by their Google OAuth user ID
func (r *UserRepo) GetByGoogleUserID(ctx context.Context, googleUserID string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
		default_deposit_percent, default_cancellation_days, default_refund_percent,
		contract_template,
		email_payment_receipt, email_event_reminder, email_subscription_updates,
		email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
		plan, role, stripe_customer_id, google_user_id, apple_user_id, created_at, updated_at
		FROM users WHERE google_user_id = $1`
	err := r.pool.QueryRow(ctx, query, googleUserID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.GoogleUserID, &user.AppleUserID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

// GetByAppleUserID finds a user by their Apple OAuth user ID
func (r *UserRepo) GetByAppleUserID(ctx context.Context, appleUserID string) (*models.User, error) {
	user := &models.User{}
	query := `SELECT id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
		default_deposit_percent, default_cancellation_days, default_refund_percent,
		contract_template,
		email_payment_receipt, email_event_reminder, email_subscription_updates,
		email_weekly_summary, email_marketing, push_enabled, push_event_reminder, push_payment_received,
		plan, role, stripe_customer_id, google_user_id, apple_user_id, created_at, updated_at
		FROM users WHERE apple_user_id = $1`
	err := r.pool.QueryRow(ctx, query, appleUserID).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.EmailPaymentReceipt, &user.EmailEventReminder, &user.EmailSubscriptionUpdates,
		&user.EmailWeeklySummary, &user.EmailMarketing, &user.PushEnabled, &user.PushEventReminder, &user.PushPaymentReceived,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.GoogleUserID, &user.AppleUserID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

// CreateWithOAuth creates a new user with OAuth provider ID (no password)
func (r *UserRepo) CreateWithOAuth(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email, name, plan, role, google_user_id, apple_user_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at`
	if user.Role == "" {
		user.Role = "user"
	}
	if user.Plan == "" {
		user.Plan = "basic"
	}
	return r.pool.QueryRow(ctx, query,
		user.Email, user.Name, user.Plan, user.Role, user.GoogleUserID, user.AppleUserID,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

// LinkGoogleAccount links a Google account to an existing user
func (r *UserRepo) LinkGoogleAccount(ctx context.Context, userID uuid.UUID, googleUserID string) error {
	query := `
		UPDATE users SET
			google_user_id = $2,
			updated_at = NOW()
		WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, userID, googleUserID)
	if err != nil {
		return fmt.Errorf("failed to link Google account: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}

// LinkAppleAccount links an Apple account to an existing user
func (r *UserRepo) LinkAppleAccount(ctx context.Context, userID uuid.UUID, appleUserID string) error {
	query := `
		UPDATE users SET
			apple_user_id = $2,
			updated_at = NOW()
		WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, userID, appleUserID)
	if err != nil {
		return fmt.Errorf("failed to link Apple account: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}
