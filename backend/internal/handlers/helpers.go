package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/tiagofur/solennix-backend/internal/i18n"
)

// JSON helper to write JSON responses
func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("Failed to encode JSON response", "error", err)
	}
}

// Error helper to write JSON error responses
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// writeEventCompletionBlockedError returns a structured 400 when an event cannot be
// marked completed due to a pending balance. Clients read error + remaining fields.
func writeEventCompletionBlockedError(w http.ResponseWriter, r *http.Request, remaining float64, currency string) {
	if currency == "" {
		currency = "MXN"
	}
	msg := i18n.Message(r.Context(), "crud.event_complete_balance_remaining", remaining)
	writeJSON(w, http.StatusBadRequest, map[string]interface{}{
		"error":     "event.completion_blocked",
		"remaining": remaining,
		"currency":  currency,
		"message":   msg,
	})
}

// writePlanLimitError returns a structured 403 response for plan limit violations.
// Clients can parse the "error" field to detect plan limits and show upgrade prompts.
func writePlanLimitError(w http.ResponseWriter, limitType string, current, max int) {
	writeJSON(w, http.StatusForbidden, map[string]interface{}{
		"error":   "plan_limit_exceeded",
		"message": "Has alcanzado el limite de tu plan. Actualiza a Pro para continuar.",
		"limit": map[string]interface{}{
			"type":    limitType,
			"current": current,
			"max":     max,
		},
	})
}

const maxJSONBodySize = 1 << 20 // 1 MB

// decodeJSON decodes a JSON request body with a 1MB size limit.
// Pass the ResponseWriter so MaxBytesReader can enforce the limit and emit HTTP 413.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodySize)
	defer r.Body.Close()
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		if isRequestBodyTooLarge(err) {
			writeError(w, http.StatusRequestEntityTooLarge, "Request body too large")
		}
		return err
	}
	return nil
}

// isRequestBodyTooLarge reports whether decodeJSON failed because the body exceeded
// the size limit. When true, MaxBytesReader has already written HTTP 413.
func isRequestBodyTooLarge(err error) bool {
	var maxErr *http.MaxBytesError
	return errors.As(err, &maxErr)
}

// maskEmail enmasks user email PII to protect privacy.
// e.g. tiago@solennix.com -> t***o@solennix.com
func maskEmail(email string) string {
	parts := strings.SplitN(email, "@", 2)
	if len(parts) != 2 {
		return email
	}
	mailbox := parts[0]
	domain := parts[1]
	runes := []rune(mailbox)
	if len(runes) <= 1 {
		return email
	}
	first := string(runes[0])
	last := string(runes[len(runes)-1])
	return first + "***" + last + "@" + domain
}
