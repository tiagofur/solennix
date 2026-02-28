package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
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

// Decode JSON body into struct with a 1MB size limit to prevent DoS
func decodeJSON(r *http.Request, dst interface{}) error {
	const maxBodySize = 1 << 20 // 1 MB
	r.Body = http.MaxBytesReader(nil, r.Body, maxBodySize)
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(dst)
}
