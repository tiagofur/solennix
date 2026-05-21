package middleware

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

var (
	securityAuditMu     sync.RWMutex
	securityAuditLogger AuditLogger
)

// SetSecurityAuditLogger configures the optional logger used for auth failure
// and throttling security events.
func SetSecurityAuditLogger(logger AuditLogger) {
	securityAuditMu.Lock()
	securityAuditLogger = logger
	securityAuditMu.Unlock()
}

func getSecurityAuditLogger() AuditLogger {
	securityAuditMu.RLock()
	defer securityAuditMu.RUnlock()
	return securityAuditLogger
}

// LogSecurityAuditEvent writes a security-focused audit event asynchronously.
// It is a no-op when no logger is configured or when userID is empty.
func LogSecurityAuditEvent(userID uuid.UUID, action, resourceType string, details map[string]any, ip, userAgent string) {
	logger := getSecurityAuditLogger()
	if logger == nil || userID == uuid.Nil {
		return
	}

	var detailsPtr *string
	if details != nil {
		if b, err := json.Marshal(details); err == nil {
			s := string(b)
			detailsPtr = &s
		}
	}

	ipCopy := ip
	uaCopy := userAgent

	go func() {
		err := logger.Create(context.Background(), &models.AuditLog{
			UserID:       userID,
			Action:       action,
			ResourceType: resourceType,
			Details:      detailsPtr,
			IPAddress:    &ipCopy,
			UserAgent:    &uaCopy,
		})
		if err != nil {
			slog.Warn("security audit: failed to create log entry", "error", err, "user_id", userID, "action", action)
		}
	}()
}
