package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/eventosapp-backend/internal/models"
)

type ProductRepo struct {
	pool *pgxpool.Pool
}

func NewProductRepo(pool *pgxpool.Pool) *ProductRepo {
	return &ProductRepo{pool: pool}
}
func (r *ProductRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM products WHERE user_id = $1`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *ProductRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Product, error) {
	query := `SELECT id, user_id, name, category, base_price, recipe, image_url, is_active, created_at, updated_at
		FROM products WHERE user_id = $1 ORDER BY name`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Category, &p.BasePrice,
			&p.Recipe, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating products: %w", err)
	}
	return products, nil
}

func (r *ProductRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Product, error) {
	p := &models.Product{}
	query := `SELECT id, user_id, name, category, base_price, recipe, image_url, is_active, created_at, updated_at
		FROM products WHERE id = $1 AND user_id = $2`
	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&p.ID, &p.UserID, &p.Name, &p.Category, &p.BasePrice,
		&p.Recipe, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}
	return p, nil
}

func (r *ProductRepo) Create(ctx context.Context, p *models.Product) error {
	query := `INSERT INTO products (user_id, name, category, base_price, recipe, image_url, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		p.UserID, p.Name, p.Category, p.BasePrice, p.Recipe, p.ImageURL, p.IsActive,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *ProductRepo) Update(ctx context.Context, p *models.Product) error {
	query := `UPDATE products SET name=$3, category=$4, base_price=$5, recipe=$6, image_url=$7, is_active=$8, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		p.ID, p.UserID, p.Name, p.Category, p.BasePrice, p.Recipe, p.ImageURL, p.IsActive,
	).Scan(&p.CreatedAt, &p.UpdatedAt)
}

func (r *ProductRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM products WHERE id=$1 AND user_id=$2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("product not found")
	}
	return nil
}

// -- Ingredients --

func (r *ProductRepo) GetIngredients(ctx context.Context, productID uuid.UUID) ([]models.ProductIngredient, error) {
	query := `SELECT pi.id, pi.product_id, pi.inventory_id, pi.quantity_required, pi.capacity, pi.created_at,
		i.ingredient_name, i.unit, i.unit_cost, i.type
		FROM product_ingredients pi LEFT JOIN inventory i ON pi.inventory_id = i.id
		WHERE pi.product_id = $1`
	rows, err := r.pool.Query(ctx, query, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ingredients []models.ProductIngredient
	for rows.Next() {
		var pi models.ProductIngredient
		if err := rows.Scan(&pi.ID, &pi.ProductID, &pi.InventoryID, &pi.QuantityRequired, &pi.Capacity,
			&pi.CreatedAt, &pi.IngredientName, &pi.Unit, &pi.UnitCost, &pi.Type); err != nil {
			return nil, err
		}
		ingredients = append(ingredients, pi)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating ingredients: %w", err)
	}
	return ingredients, nil
}

func (r *ProductRepo) GetIngredientsForProducts(ctx context.Context, productIDs []uuid.UUID) ([]models.ProductIngredient, error) {
	if len(productIDs) == 0 {
		return nil, nil
	}
	query := `SELECT pi.id, pi.product_id, pi.inventory_id, pi.quantity_required, pi.capacity, pi.created_at,
		i.ingredient_name, i.unit, i.unit_cost, i.type
		FROM product_ingredients pi LEFT JOIN inventory i ON pi.inventory_id = i.id
		WHERE pi.product_id = ANY($1)`
	rows, err := r.pool.Query(ctx, query, productIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ingredients []models.ProductIngredient
	for rows.Next() {
		var pi models.ProductIngredient
		if err := rows.Scan(&pi.ID, &pi.ProductID, &pi.InventoryID, &pi.QuantityRequired, &pi.Capacity,
			&pi.CreatedAt, &pi.IngredientName, &pi.Unit, &pi.UnitCost, &pi.Type); err != nil {
			return nil, err
		}
		ingredients = append(ingredients, pi)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating batch ingredients: %w", err)
	}
	return ingredients, nil
}

func (r *ProductRepo) UpdateIngredients(ctx context.Context, productID uuid.UUID, ingredients []models.ProductIngredient) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM product_ingredients WHERE product_id=$1", productID); err != nil {
		return err
	}

	for _, ing := range ingredients {
		_, err := tx.Exec(ctx,
			`INSERT INTO product_ingredients (product_id, inventory_id, quantity_required, capacity)
			VALUES ($1, $2, $3, $4)`,
			productID, ing.InventoryID, ing.QuantityRequired, ing.Capacity)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// VerifyOwnership checks that all product IDs belong to the given user. Returns an error if any don't.
func (r *ProductRepo) VerifyOwnership(ctx context.Context, productIDs []uuid.UUID, userID uuid.UUID) error {
	if len(productIDs) == 0 {
		return nil
	}
	query := `SELECT COUNT(*) FROM products WHERE id = ANY($1) AND user_id = $2`
	var count int
	if err := r.pool.QueryRow(ctx, query, productIDs, userID).Scan(&count); err != nil {
		return fmt.Errorf("failed to verify product ownership: %w", err)
	}
	if count != len(productIDs) {
		return fmt.Errorf("one or more products not found")
	}
	return nil
}

// Search performs a full-text search on products for the given user
func (r *ProductRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Product, error) {
	searchPattern := "%" + query + "%"
	sqlQuery := `SELECT id, user_id, name, category, base_price, recipe, image_url, is_active, created_at, updated_at
		FROM products
		WHERE user_id = $1
		AND (
			name ILIKE $2 OR
			category ILIKE $2
		)
		ORDER BY created_at DESC
		LIMIT 10`

	rows, err := r.pool.Query(ctx, sqlQuery, userID, searchPattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Category, &p.BasePrice,
			&p.Recipe, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating product search: %w", err)
	}

	if products == nil {
		products = []models.Product{}
	}

	return products, nil
}

