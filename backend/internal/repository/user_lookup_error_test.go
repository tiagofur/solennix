package repository

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5"
)

func TestIsUserNotFound(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		err  error
		want bool
	}{
		{name: "nil", err: nil, want: false},
		{name: "sentinel", err: ErrUserNotFound, want: true},
		{name: "pgx no rows", err: pgx.ErrNoRows, want: true},
		{name: "wrapped sentinel", err: fmt.Errorf("wrap: %w", ErrUserNotFound), want: true},
		{name: "wrapped no rows", err: fmt.Errorf("user not found: %w", pgx.ErrNoRows), want: true},
		{name: "generic not found string", err: errors.New("not found"), want: false},
		{name: "connection error", err: errors.New("get user by id: connection reset"), want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := IsUserNotFound(tt.err); got != tt.want {
				t.Fatalf("IsUserNotFound(%v) = %v, want %v", tt.err, got, tt.want)
			}
		})
	}
}

func TestMapUserLookupError(t *testing.T) {
	t.Parallel()

	if err := mapUserLookupError(nil, "op"); err != nil {
		t.Fatalf("mapUserLookupError(nil) = %v, want nil", err)
	}

	if err := mapUserLookupError(pgx.ErrNoRows, "get user by id"); !errors.Is(err, ErrUserNotFound) {
		t.Fatalf("mapUserLookupError(NoRows) = %v, want ErrUserNotFound", err)
	}

	dbErr := errors.New("connection reset")
	err := mapUserLookupError(dbErr, "get user by id")
	if errors.Is(err, ErrUserNotFound) {
		t.Fatalf("mapUserLookupError(dbErr) must not be ErrUserNotFound, got %v", err)
	}
	if !errors.Is(err, dbErr) {
		t.Fatalf("mapUserLookupError(dbErr) = %v, want wrapped connection error", err)
	}
	if got := err.Error(); got != "get user by id: connection reset" {
		t.Fatalf("mapUserLookupError(dbErr).Error() = %q", got)
	}
}
