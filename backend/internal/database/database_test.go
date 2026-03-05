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

func TestConnectSuccessWhenDatabaseAvailable(t *testing.T) {
	pool, err := Connect("postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("skipping success test when database is unavailable: %v", err)
	}
	pool.Close()
}
