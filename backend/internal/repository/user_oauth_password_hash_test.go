package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// OAuth users store password_hash as NULL (migration 029). Scanning NULL into
// models.User.PasswordHash (string) must not fail — that failure was misclassified
// as a transient DB error on refresh and flooded admin audit logs.
func TestUserRepo_OAuthNullPasswordHash_LoadableOnAllLookupPaths(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	ctx := context.Background()

	googleID := "google-oauth-" + uuid.NewString()
	oauthUser := &models.User{
		Email:                "oauth.nullhash@test.dev",
		Name:                 "OAuth Null Hash",
		Plan:                 "basic",
		GoogleUserID:         &googleID,
		RegistrationPlatform: "ios",
	}
	if err := repo.CreateWithOAuth(ctx, oauthUser); err != nil {
		t.Fatalf("CreateWithOAuth() error = %v", err)
	}
	if oauthUser.ID == uuid.Nil {
		t.Fatal("CreateWithOAuth() did not set ID")
	}

	// Prove DB still has NULL (not empty string) so the COALESCE path is exercised.
	var rawHash *string
	if err := pool.QueryRow(ctx,
		`SELECT password_hash FROM users WHERE id = $1`, oauthUser.ID,
	).Scan(&rawHash); err != nil {
		t.Fatalf("raw password_hash read: %v", err)
	}
	if rawHash != nil {
		t.Fatalf("password_hash after CreateWithOAuth = %q, want NULL", *rawHash)
	}

	byID, err := repo.GetByID(ctx, oauthUser.ID)
	if err != nil {
		t.Fatalf("GetByID(OAuth) error = %v — NULL password_hash must scan as empty string", err)
	}
	if byID.PasswordHash != "" {
		t.Fatalf("GetByID PasswordHash = %q, want empty string", byID.PasswordHash)
	}
	if byID.Email != oauthUser.Email {
		t.Fatalf("GetByID email = %q, want %q", byID.Email, oauthUser.Email)
	}

	byEmail, err := repo.GetByEmail(ctx, oauthUser.Email)
	if err != nil {
		t.Fatalf("GetByEmail(OAuth) error = %v", err)
	}
	if byEmail.PasswordHash != "" {
		t.Fatalf("GetByEmail PasswordHash = %q, want empty", byEmail.PasswordHash)
	}

	byGoogle, err := repo.GetByGoogleUserID(ctx, googleID)
	if err != nil {
		t.Fatalf("GetByGoogleUserID() error = %v", err)
	}
	if byGoogle.ID != oauthUser.ID {
		t.Fatalf("GetByGoogleUserID id = %v, want %v", byGoogle.ID, oauthUser.ID)
	}
	if byGoogle.PasswordHash != "" {
		t.Fatalf("GetByGoogleUserID PasswordHash = %q, want empty", byGoogle.PasswordHash)
	}

	appleID := "apple-oauth-" + uuid.NewString()
	appleUser := &models.User{
		Email:       "oauth.apple.nullhash@test.dev",
		Name:        "Apple OAuth",
		AppleUserID: &appleID,
	}
	if err := repo.CreateWithOAuth(ctx, appleUser); err != nil {
		t.Fatalf("CreateWithOAuth(Apple) error = %v", err)
	}
	byApple, err := repo.GetByAppleUserID(ctx, appleID)
	if err != nil {
		t.Fatalf("GetByAppleUserID() error = %v", err)
	}
	if byApple.PasswordHash != "" {
		t.Fatalf("GetByAppleUserID PasswordHash = %q, want empty", byApple.PasswordHash)
	}
	if _, err := repo.GetByID(ctx, appleUser.ID); err != nil {
		t.Fatalf("GetByID(Apple OAuth) error = %v", err)
	}
}

// Email/password users must keep a non-empty hash on every lookup path.
func TestUserRepo_EmailPassword_HashPreservedOnLookup(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	ctx := context.Background()

	const storedHash = "$2a$10$abcdefghijklmnopqrstuuEXAMPLEHASHxxxxxxxxxxxxxxxx"
	user := &models.User{
		Email:                "email.password@test.dev",
		PasswordHash:         storedHash,
		Name:                 "Email User",
		Plan:                 "basic",
		RegistrationPlatform: "web",
	}
	if err := repo.Create(ctx, user); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	var rawHash *string
	if err := pool.QueryRow(ctx,
		`SELECT password_hash FROM users WHERE id = $1`, user.ID,
	).Scan(&rawHash); err != nil {
		t.Fatalf("raw password_hash read: %v", err)
	}
	if rawHash == nil || *rawHash != storedHash {
		t.Fatalf("stored password_hash = %v, want %q", rawHash, storedHash)
	}

	byID, err := repo.GetByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if byID.PasswordHash != storedHash {
		t.Fatalf("GetByID PasswordHash = %q, want %q", byID.PasswordHash, storedHash)
	}

	byEmail, err := repo.GetByEmail(ctx, user.Email)
	if err != nil {
		t.Fatalf("GetByEmail() error = %v", err)
	}
	if byEmail.PasswordHash != storedHash {
		t.Fatalf("GetByEmail PasswordHash = %q, want %q", byEmail.PasswordHash, storedHash)
	}
}

// Cleanup repo shares the same NULL-hash scan risk when listing inactive users.
func TestUserCleanupRepo_ScanOAuthUserWithNullPasswordHash(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	ctx := context.Background()
	googleID := "google-cleanup-" + uuid.NewString()
	user := &models.User{
		Email:        "oauth.cleanup@test.dev",
		Name:         "Cleanup OAuth",
		GoogleUserID: &googleID,
	}
	if err := NewUserRepo(pool).CreateWithOAuth(ctx, user); err != nil {
		t.Fatalf("CreateWithOAuth() error = %v", err)
	}

	// Force last_active_at old enough that stage-1 query can pick the user if filters match.
	// We only need scanUser to succeed: query by id via the same SELECT columns.
	row := pool.QueryRow(ctx, selectUserColumns+` WHERE id = $1`, user.ID)
	got, err := scanUser(row)
	if err != nil {
		t.Fatalf("scanUser(OAuth NULL password_hash) error = %v", err)
	}
	if got.PasswordHash != "" {
		t.Fatalf("scanUser PasswordHash = %q, want empty", got.PasswordHash)
	}
}
