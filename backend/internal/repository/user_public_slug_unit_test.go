package repository

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestIsUniqueViolation(t *testing.T) {
	t.Run("pg error 23505", func(t *testing.T) {
		err := &pgconn.PgError{Code: "23505", Message: "duplicate key value"}
		if !isUniqueViolation(err) {
			t.Fatal("expected unique violation for SQLSTATE 23505")
		}
	})

	t.Run("wrapped pg error", func(t *testing.T) {
		err := errors.Join(errors.New("update failed"), &pgconn.PgError{Code: "23505"})
		if !isUniqueViolation(err) {
			t.Fatal("expected unique violation for wrapped 23505")
		}
	})

	t.Run("message fallback", func(t *testing.T) {
		err := errors.New("ERROR: duplicate key value violates unique constraint \"idx_users_public_slug_unique\"")
		if !isUniqueViolation(err) {
			t.Fatal("expected unique violation from message fallback")
		}
	})

	t.Run("non unique error", func(t *testing.T) {
		err := errors.New("connection refused")
		if isUniqueViolation(err) {
			t.Fatal("did not expect unique violation")
		}
	})
}
