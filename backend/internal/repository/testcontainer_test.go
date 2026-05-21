package repository

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

var (
	testDBOnce      sync.Once
	testDBURL       string
	testDBStartErr  error
	testPGContainer *postgres.PostgresContainer
)

func TestMain(m *testing.M) {
	exitCode := m.Run()
	if testPGContainer != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = testPGContainer.Terminate(ctx)
	}
	os.Exit(exitCode)
}

func resolveTestDatabaseURL(t *testing.T) string {
	t.Helper()

	if databaseURL := os.Getenv("TEST_DATABASE_URL"); databaseURL != "" {
		return databaseURL
	}

	testDBOnce.Do(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()

		container, err := postgres.Run(
			ctx,
			"postgres:16-alpine",
			postgres.WithDatabase("solennix"),
			postgres.WithUsername("solennix_user"),
			postgres.WithPassword("solennix_password"),
			testcontainers.WithWaitStrategy(
				wait.ForListeningPort("5432/tcp").WithStartupTimeout(90*time.Second),
			),
		)
		if err != nil {
			testDBStartErr = err
			return
		}

		testPGContainer = container
		testDBURL, err = container.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			testDBStartErr = err
		}
	})

	if testDBStartErr != nil {
		t.Skipf("Skipping integration tests: cannot start testcontainer postgres: %v", testDBStartErr)
	}
	if testDBURL == "" {
		t.Skip("Skipping integration tests: testcontainer postgres did not provide a connection string")
	}

	return testDBURL
}
