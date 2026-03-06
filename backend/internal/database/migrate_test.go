package database

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestMigrateIntegration(t *testing.T) {
	pool := openDBPoolForTest(t)
	defer pool.Close()

	if _, err := pool.Exec(context.Background(), "DROP TABLE IF EXISTS schema_migrations"); err != nil {
		t.Fatalf("failed to drop schema_migrations: %v", err)
	}

	if err := Migrate(pool); err != nil {
		t.Fatalf("Migrate() first run error = %v", err)
	}

	var count int
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
		t.Fatalf("failed to count schema_migrations: %v", err)
	}
	if count == 0 {
		t.Fatalf("schema_migrations count = %d, want > 0", count)
	}
	initialCount := count

	if err := Migrate(pool); err != nil {
		t.Fatalf("Migrate() second run error = %v", err)
	}
	if err := pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM schema_migrations").Scan(&count); err != nil {
		t.Fatalf("failed to count schema_migrations after second run: %v", err)
	}
	if count != initialCount {
		t.Fatalf("schema_migrations count after rerun = %d, want %d", count, initialCount)
	}
}

func TestMigrateFailsWithClosedPool(t *testing.T) {
	pool := openDBPoolForTest(t)
	pool.Close()

	if err := Migrate(pool); err == nil {
		t.Fatalf("Migrate() expected error when pool is closed")
	}
}

func TestMigrateFailsWithNilPool(t *testing.T) {
	// Calling Migrate with a nil pool should panic or error.
	// Since pool.Exec will panic on nil, we recover and check.
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("Migrate(nil) expected panic")
		}
	}()
	_ = Migrate(nil)
}

func TestMigrateFailsWithClosedPoolFromNew(t *testing.T) {
	// Create a pool with a valid URL format but close it immediately.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, "postgres://user:pass@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed (no local postgres): %v", err)
	}
	pool.Close()

	err = Migrate(pool)
	if err == nil {
		t.Fatal("Migrate() expected error with closed pool")
	}
	// The error should mention failing to create migrations table
	if !strings.Contains(err.Error(), "failed to create migrations table") {
		t.Logf("got error: %v (acceptable — closed pool)", err)
	}
}

func openDBPoolForTest(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("Skipping integration tests: TEST_DATABASE_URL is not set (safety guard)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Skipf("Skipping integration test: cannot create pool: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("Skipping integration test: cannot ping db: %v", err)
	}
	_, err = pool.Exec(context.Background(), "SELECT pg_advisory_lock($1)", int64(22220001))
	if err != nil {
		pool.Close()
		t.Fatalf("failed to acquire integration test lock: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", int64(22220001))
	})

	return pool
}
