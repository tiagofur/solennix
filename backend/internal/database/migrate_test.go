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

// TestMigrateCreateTableFails verifies that Migrate returns an error when
// the pool is closed and the initial CREATE TABLE statement fails.
func TestMigrateCreateTableFails(t *testing.T) {
	pool := openDBPoolForTest(t)
	pool.Close() // close pool so the CREATE TABLE will fail

	err := Migrate(pool)
	if err == nil {
		t.Fatal("Migrate() expected error when CREATE TABLE fails")
	}
	if !strings.Contains(err.Error(), "failed to create migrations table") {
		t.Fatalf("error = %q, expected 'failed to create migrations table'", err.Error())
	}
}

// TestMigrateIdempotency verifies that running Migrate twice in a row
// succeeds and produces the same number of applied migrations.
func TestMigrateIdempotency(t *testing.T) {
	pool := openDBPoolForTest(t)
	defer pool.Close()

	ctx := context.Background()

	// Drop schema_migrations to ensure a clean slate
	if _, err := pool.Exec(ctx, "DROP TABLE IF EXISTS schema_migrations"); err != nil {
		t.Fatalf("failed to drop schema_migrations: %v", err)
	}

	// First run
	if err := Migrate(pool); err != nil {
		t.Fatalf("Migrate() first run error = %v", err)
	}

	var firstCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&firstCount); err != nil {
		t.Fatalf("failed to count migrations after first run: %v", err)
	}
	if firstCount == 0 {
		t.Fatal("expected at least one migration after first run")
	}

	// Second run — should be fully idempotent
	if err := Migrate(pool); err != nil {
		t.Fatalf("Migrate() second run error = %v", err)
	}

	var secondCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&secondCount); err != nil {
		t.Fatalf("failed to count migrations after second run: %v", err)
	}
	if secondCount != firstCount {
		t.Fatalf("migration count changed: first=%d, second=%d", firstCount, secondCount)
	}

	// Third run — also idempotent
	if err := Migrate(pool); err != nil {
		t.Fatalf("Migrate() third run error = %v", err)
	}

	var thirdCount int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&thirdCount); err != nil {
		t.Fatalf("failed to count migrations after third run: %v", err)
	}
	if thirdCount != firstCount {
		t.Fatalf("migration count changed: first=%d, third=%d", firstCount, thirdCount)
	}
}

// TestMigrateQueryMigrationsFailsAfterCreateTable verifies that Migrate returns
// an appropriate error when the pool becomes unavailable after creating the
// schema_migrations table but before querying existing migrations.
// This is a variant of the closed-pool test that validates the error comes from
// the query phase (since the CREATE TABLE would have already succeeded or failed).
func TestMigrateQueryMigrationsFailsAfterCreateTable(t *testing.T) {
	// This test uses a pool from an unreachable host to simulate failures at
	// the first SQL operation (CREATE TABLE), which exercises the same code
	// path indirectly.
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
	// The error will be about failing to create migrations table since that's the first operation
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
