package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// S4 (audit): the PDF generator fetches profile.logo_url server-side. A
// registered user can store any string as logo_url, so the fetch must never
// reach non-public hosts (blind SSRF probing + exfiltration via the
// downloadable PDF) nor buffer unbounded bodies (memory DoS).
func TestFetchLogoBytes_BlocksPrivateHosts(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("logo-bytes"))
	}))
	defer srv.Close()

	got := fetchLogoBytes(srv.URL + "/logo.png")
	assert.Nil(t, got, "server must not fetch loopback/private hosts (SSRF)")
}

func TestFetchLogoBytes_CapsOversizedBody(t *testing.T) {
	logoFetchAllowPrivateHosts = true
	defer func() { logoFetchAllowPrivateHosts = false }()

	big := strings.Repeat("x", 8<<20)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeContent(w, r, "logo.png", time.Now(), strings.NewReader(big))
	}))
	defer srv.Close()

	got := fetchLogoBytes(srv.URL + "/logo.png")
	assert.Nil(t, got, "oversized logo bodies must be rejected, not buffered unbounded")
}

func TestFetchLogoBytes_AllowsSmallBodyFromAllowedHost(t *testing.T) {
	logoFetchAllowPrivateHosts = true
	defer func() { logoFetchAllowPrivateHosts = false }()

	want := []byte("small-logo-bytes")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write(want)
	}))
	defer srv.Close()

	assert.Equal(t, want, fetchLogoBytes(srv.URL+"/logo.png"))
}

// S4 (audit): "/api/uploads/../../secret" passes the prefix check while
// filepath.Join+Cleans still escapes uploadDir — arbitrary local file read
// embedded into a downloadable PDF.
func TestLogoURLToBytes_RejectsTraversal(t *testing.T) {
	base := t.TempDir()
	uploadDir := filepath.Join(base, "upload")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(base, "secret.txt"), []byte("topsecret-outside-upload-dir"), 0o600); err != nil {
		t.Fatal(err)
	}

	h := &PDFHandler{uploadDir: uploadDir}

	for _, logoURL := range []string{"/api/uploads/../secret.txt", "/api/v1/uploads/../secret.txt"} {
		profile := &models.User{LogoURL: &logoURL}
		assert.Nil(t, h.logoURLToBytes(profile), "path %q escapes uploadDir and must be rejected", logoURL)
	}
}

func TestLogoURLToBytes_ServesLegitLocalFile(t *testing.T) {
	uploadDir := t.TempDir()
	sub := filepath.Join(uploadDir, "user-1")
	if err := os.MkdirAll(sub, 0o755); err != nil {
		t.Fatal(err)
	}
	want := []byte("legit-logo-bytes")
	if err := os.WriteFile(filepath.Join(sub, "file.jpg"), want, 0o600); err != nil {
		t.Fatal(err)
	}

	h := &PDFHandler{uploadDir: uploadDir}
	logoURL := "/api/uploads/user-1/file.jpg"
	profile := &models.User{LogoURL: &logoURL}
	assert.Equal(t, want, h.logoURLToBytes(profile))
}
