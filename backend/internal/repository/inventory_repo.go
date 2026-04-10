package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type InventoryRepo struct {
	pool *pgxpool.Pool
}

func NewInventoryRepo(pool *pgxpool.Pool) *InventoryRepo {
	return &InventoryRepo{pool: pool}
}
func (r *InventoryRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM inventory WHERE user_id = $1`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *InventoryRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.InventoryItem, error) {
	query := `SELECT id, user_id, ingredient_name, current_stock, minimum_stock, unit, unit_cost, type, last_updated
		FROM inventory WHERE user_id = $1 ORDER BY ingredient_name`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.InventoryItem, 0)
	for rows.Next() {
		var i models.InventoryItem
		if err := rows.Scan(&i.ID, &i.UserID, &i.IngredientName, &i.CurrentStock,
			&i.MinimumStock, &i.Unit, &i.UnitCost, &i.Type, &i.LastUpdated); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating inventory: %w", err)
	}
	return items, nil
}

func (r *InventoryRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.InventoryItem, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM inventory WHERE user_id = $1`
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count inventory: %w", err)
	}

	query := fmt.Sprintf(`SELECT id, user_id, ingredient_name, current_stock, minimum_stock, unit, unit_cost, type, last_updated
		FROM inventory WHERE user_id = $1 ORDER BY %s %s LIMIT $2 OFFSET $3`, sortCol, order)
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]models.InventoryItem, 0)
	for rows.Next() {
		var i models.InventoryItem
		if err := rows.Scan(&i.ID, &i.UserID, &i.IngredientName, &i.CurrentStock,
			&i.MinimumStock, &i.Unit, &i.UnitCost, &i.Type, &i.LastUpdated); err != nil {
			return nil, 0, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating paginated inventory: %w", err)
	}
	return items, total, nil
}

func (r *InventoryRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.InventoryItem, error) {
	i := &models.InventoryItem{}
	query := `SELECT id, user_id, ingredient_name, current_stock, minimum_stock, unit, unit_cost, type, last_updated
		FROM inventory WHERE id = $1 AND user_id = $2`
	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&i.ID, &i.UserID, &i.IngredientName, &i.CurrentStock,
		&i.MinimumStock, &i.Unit, &i.UnitCost, &i.Type, &i.LastUpdated)
	if err != nil {
		return nil, fmt.Errorf("inventory item not found: %w", err)
	}
	return i, nil
}

func (r *InventoryRepo) Create(ctx context.Context, i *models.InventoryItem) error {
	query := `INSERT INTO inventory (user_id, ingredient_name, current_stock, minimum_stock, unit, unit_cost, type)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, last_updated`
	return r.pool.QueryRow(ctx, query,
		i.UserID, i.IngredientName, i.CurrentStock, i.MinimumStock, i.Unit, i.UnitCost, i.Type,
	).Scan(&i.ID, &i.LastUpdated)
}

func (r *InventoryRepo) Update(ctx context.Context, i *models.InventoryItem) error {
	query := `UPDATE inventory SET ingredient_name=$3, current_stock=$4, minimum_stock=$5,
		unit=$6, unit_cost=$7, type=$8, last_updated=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING last_updated`
	return r.pool.QueryRow(ctx, query,
		i.ID, i.UserID, i.IngredientName, i.CurrentStock, i.MinimumStock,
		i.Unit, i.UnitCost, i.Type,
	).Scan(&i.LastUpdated)
}

func (r *InventoryRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM inventory WHERE id=$1 AND user_id=$2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("inventory item not found")
	}
	return nil
}

// Search performs a fuzzy search on inventory items using pg_trgm similarity + ILIKE fallback
func (r *InventoryRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.InventoryItem, error) {
	sqlQuery := `SELECT id, user_id, ingredient_name, current_stock, minimum_stock, unit, unit_cost, type, last_updated
		FROM inventory
		WHERE user_id = $1
		AND (
			ingredient_name ILIKE '%' || $2 || '%' OR
			unit ILIKE '%' || $2 || '%' OR
			type ILIKE '%' || $2 || '%' OR
			similarity(ingredient_name, $2) > 0.3
		)
		ORDER BY similarity(ingredient_name, $2) DESC, last_updated DESC
		LIMIT 10`

	rows, err := r.pool.Query(ctx, sqlQuery, userID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]models.InventoryItem, 0)
	for rows.Next() {
		var item models.InventoryItem
		if err := rows.Scan(&item.ID, &item.UserID, &item.IngredientName, &item.CurrentStock,
			&item.MinimumStock, &item.Unit, &item.UnitCost, &item.Type,
			&item.LastUpdated); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating inventory search: %w", err)
	}

	if items == nil {
		items = []models.InventoryItem{}
	}

	return items, nil
}

