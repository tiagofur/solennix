package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
)

// generateFormToken returns a 64-char hex string (256 bits of entropy).
// Shared by public event portal links, staff invites, and similar tokens.
func generateFormToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

// trimStrPtr trims whitespace from a string pointer; empty results become nil.
func trimStrPtr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

// normalizeEmail trims whitespace and converts email to lowercase.
func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// normalizeEmailPtr trims and lowercases a string pointer; empty results become nil.
func normalizeEmailPtr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.ToLower(strings.TrimSpace(*s))
	if t == "" {
		return nil
	}
	return &t
}

