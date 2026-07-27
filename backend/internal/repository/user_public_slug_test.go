package repository

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestUserRepo_PublicSlug_GetByIDAndGetByEmail(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	ctx := context.Background()

	user := &models.User{
		Email:        "slug.owner@test.dev",
		PasswordHash: "hash",
		Name:         "Slug Owner",
		Plan:         "basic",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	slug := "slug-owner"
	if err := repo.UpdatePublicSlug(ctx, user.ID, slug); err != nil {
		t.Fatalf("UpdatePublicSlug() error = %v", err)
	}

	byID, err := repo.GetByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if byID.PublicSlug == nil || *byID.PublicSlug != slug {
		t.Fatalf("GetByID() PublicSlug = %v, want %q", byID.PublicSlug, slug)
	}

	byEmail, err := repo.GetByEmail(ctx, user.Email)
	if err != nil {
		t.Fatalf("GetByEmail() error = %v", err)
	}
	if byEmail.PublicSlug == nil || *byEmail.PublicSlug != slug {
		t.Fatalf("GetByEmail() PublicSlug = %v, want %q", byEmail.PublicSlug, slug)
	}
}

func TestUserRepo_GetByPublicSlug(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	ctx := context.Background()

	user := &models.User{
		Email:        "find.by.slug@test.dev",
		PasswordHash: "hash",
		Name:         "Find By Slug",
		Plan:         "pro",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	slug := "find-by-slug"
	if err := repo.UpdatePublicSlug(ctx, user.ID, slug); err != nil {
		t.Fatalf("UpdatePublicSlug() error = %v", err)
	}

	found, err := repo.GetByPublicSlug(ctx, slug)
	if err != nil {
		t.Fatalf("GetByPublicSlug() error = %v", err)
	}
	if found.ID != user.ID {
		t.Fatalf("GetByPublicSlug() ID = %s, want %s", found.ID, user.ID)
	}
	if found.PublicSlug == nil || *found.PublicSlug != slug {
		t.Fatalf("GetByPublicSlug() PublicSlug = %v, want %q", found.PublicSlug, slug)
	}
	if found.Email != user.Email {
		t.Fatalf("GetByPublicSlug() Email = %q, want %q", found.Email, user.Email)
	}
}

func TestUserRepo_GetByPublicSlug_NotFound(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	_, err := repo.GetByPublicSlug(context.Background(), "does-not-exist")
	if err == nil {
		t.Fatal("GetByPublicSlug() expected error for missing slug")
	}
	if !errors.Is(err, pgx.ErrNoRows) && !strings.Contains(err.Error(), "not found") {
		t.Fatalf("GetByPublicSlug() error = %v, want not found", err)
	}
}

func TestUserRepo_UpdatePublicSlug_Conflict(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	ctx := context.Background()

	first := &models.User{
		Email:        "first.slug@test.dev",
		PasswordHash: "hash",
		Name:         "First",
		Plan:         "basic",
	}
	second := &models.User{
		Email:        "second.slug@test.dev",
		PasswordHash: "hash",
		Name:         "Second",
		Plan:         "basic",
	}
	if err := repo.Create(ctx, first); err != nil {
		t.Fatalf("Create first error = %v", err)
	}
	if err := repo.Create(ctx, second); err != nil {
		t.Fatalf("Create second error = %v", err)
	}

	if err := repo.UpdatePublicSlug(ctx, first.ID, "taken-slug"); err != nil {
		t.Fatalf("UpdatePublicSlug first error = %v", err)
	}

	err := repo.UpdatePublicSlug(ctx, second.ID, "taken-slug")
	if err == nil {
		t.Fatal("UpdatePublicSlug() expected uniqueness conflict")
	}
	if !errors.Is(err, ErrPublicSlugTaken) && !strings.Contains(strings.ToLower(err.Error()), "slug") {
		t.Fatalf("UpdatePublicSlug() error = %v, want slug conflict", err)
	}
}

func TestUserRepo_UpdatePublicSlug_Rename(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	ctx := context.Background()

	user := &models.User{
		Email:        "rename.slug@test.dev",
		PasswordHash: "hash",
		Name:         "Rename",
		Plan:         "basic",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if err := repo.UpdatePublicSlug(ctx, user.ID, "old-slug"); err != nil {
		t.Fatalf("UpdatePublicSlug old error = %v", err)
	}
	if err := repo.UpdatePublicSlug(ctx, user.ID, "new-slug"); err != nil {
		t.Fatalf("UpdatePublicSlug new error = %v", err)
	}

	found, err := repo.GetByPublicSlug(ctx, "new-slug")
	if err != nil {
		t.Fatalf("GetByPublicSlug new error = %v", err)
	}
	if found.ID != user.ID {
		t.Fatalf("renamed slug points to wrong user")
	}

	_, err = repo.GetByPublicSlug(ctx, "old-slug")
	if err == nil {
		t.Fatal("old slug should no longer resolve")
	}
}

func TestUserRepo_UpdatePublicSlug_UnknownUser(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	err := repo.UpdatePublicSlug(context.Background(), uuid.New(), "orphan-slug")
	if err == nil {
		t.Fatal("UpdatePublicSlug() expected error for unknown user")
	}
}
