package database

import (
	"strings"
	"testing"
)

func TestConnectInvalidURL(t *testing.T) {
	_, err := Connect("://bad-url")
	if err == nil {
		t.Fatalf("Connect() expected error for invalid URL")
	}
	if !strings.Contains(err.Error(), "unable to parse database URL") {
		t.Fatalf("error = %q, expected parse URL error", err.Error())
	}
}

func TestConnectPingFailure(t *testing.T) {
	_, err := Connect("postgres://user:pass@127.0.0.1:1/db?sslmode=disable")
	if err == nil {
		t.Fatalf("Connect() expected error when ping fails")
	}
	if !strings.Contains(err.Error(), "unable to ping database") {
		t.Fatalf("error = %q, expected ping error", err.Error())
	}
}

func TestConnectEmptyURL(t *testing.T) {
	_, err := Connect("")
	if err == nil {
		t.Fatal("Connect() expected error for empty URL")
	}
	// Empty URL may fail at parse or ping depending on pgx version
	// Just verify we get an error
}

func TestConnectUnreachableHost(t *testing.T) {
	// Use a valid URL format but unreachable host/port to trigger connection pool creation
	// followed by ping failure.
	_, err := Connect("postgres://user:pass@192.0.2.1:5432/db?sslmode=disable&connect_timeout=1")
	if err == nil {
		t.Fatal("Connect() expected error for unreachable host")
	}
}

func TestConnectSuccessWhenDatabaseAvailable(t *testing.T) {
	pool, err := Connect("postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("skipping success test when database is unavailable: %v", err)
	}
	pool.Close()
}
