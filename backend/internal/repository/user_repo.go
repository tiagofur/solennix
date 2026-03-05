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
		plan, role, stripe_customer_id, created_at, updated_at
		FROM users WHERE email = $1`
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
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
		plan, role, stripe_customer_id, created_at, updated_at
		FROM users WHERE id = $1`
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	return user, nil
}

func (r *UserRepo) Update(ctx context.Context, id uuid.UUID, name, businessName, logoURL, brandColor *string, showBusinessNameInPdf *bool,
	depositPercent, cancellationDays, refundPercent *float64, contractTemplate *string) (*models.User, error) {
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
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, email, password_hash, name, business_name, logo_url, brand_color, show_business_name_in_pdf,
			default_deposit_percent, default_cancellation_days, default_refund_percent,
			contract_template,
			plan, role, stripe_customer_id, created_at, updated_at`
	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, id, name, businessName, logoURL, brandColor, showBusinessNameInPdf,
		depositPercent, cancellationDays, refundPercent, contractTemplate).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.BusinessName, &user.LogoURL, &user.BrandColor, &user.ShowBusinessNameInPdf,
		&user.DefaultDepositPercent, &user.DefaultCancellationDays, &user.DefaultRefundPercent,
		&user.ContractTemplate,
		&user.Plan, &user.Role, &user.StripeCustomerID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, nil
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
