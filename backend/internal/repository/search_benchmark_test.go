package repository

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func openBenchmarkPool(b *testing.B) *pgxpool.Pool {
	b.Helper()

	dsn := os.Getenv("BENCH_DB_DSN")
	if dsn == "" {
		b.Skip("BENCH_DB_DSN not set; skipping repository benchmark")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		b.Fatalf("pgxpool.New failed: %v", err)
	}
	b.Cleanup(pool.Close)
	return pool
}

func seedBenchmarkClients(b *testing.B, pool *pgxpool.Pool, userID uuid.UUID, count int) {
	b.Helper()

	for i := 0; i < count; i++ {
		_, err := pool.Exec(context.Background(),
			`INSERT INTO clients (id, user_id, name, email, phone, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
			uuid.New(), userID, fmt.Sprintf("Benchmark Client %d", i), fmt.Sprintf("bench-%d@example.com", i), "555-1000")
		if err != nil {
			b.Fatalf("seed client %d failed: %v", i, err)
		}
	}

	b.Cleanup(func() {
		if _, err := pool.Exec(context.Background(), `DELETE FROM clients WHERE user_id = $1`, userID); err != nil {
			b.Fatalf("cleanup seeded clients failed: %v", err)
		}
	})
}

func BenchmarkClientRepo_Search(b *testing.B) {
	pool := openBenchmarkPool(b)
	repo := NewClientRepo(pool)
	ctx := context.Background()
	userID := uuid.New()
	seedBenchmarkClients(b, pool, userID, 500)

	query := "Benchmark"
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		results, err := repo.Search(ctx, userID, query)
		if err != nil {
			b.Fatalf("Search failed: %v", err)
		}
		if len(results) == 0 {
			b.Fatalf("expected non-empty search results")
		}
	}
}
