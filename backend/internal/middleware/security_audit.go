package middleware

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

const auditWorkerQueueSize = 256

var (
	securityAuditMu     sync.RWMutex
	securityAuditLogger AuditLogger

	// auditQueue is a bounded channel for async security audit writes.
	// When full, events are dropped with a warning rather than spawning unbounded goroutines.
	auditQueue     chan auditJob
	auditQueueOnce sync.Once
)

type auditJob struct {
	logger AuditLogger
	entry  *models.AuditLog
}

func startAuditWorker() {
	auditQueueOnce.Do(func() {
		auditQueue = make(chan auditJob, auditWorkerQueueSize)
		go func() {
			for job := range auditQueue {
				if err := job.logger.Create(context.Background(), job.entry); err != nil {
					slog.Warn("security audit: failed to create log entry", "error", err,
						"user_id", job.entry.UserID, "action", job.entry.Action)
				}
			}
		}()
	})
}

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

// GetSecurityAuditLogger returns the current audit logger (used in tests to save/restore state).
func GetSecurityAuditLogger() AuditLogger {
	return getSecurityAuditLogger()
}

// LogSecurityAuditEvent enqueues a security-focused audit event for async writes.
// It is a no-op when no logger is configured or when userID is empty.
// Events are dropped (with a warning) if the bounded queue is full, preventing
// goroutine unboundedness under abusive traffic.
func LogSecurityAuditEvent(userID uuid.UUID, action, resourceType string, details map[string]any, ip, userAgent string) {
	logger := getSecurityAuditLogger()
	if logger == nil || userID == uuid.Nil {
		return
	}

	startAuditWorker()

	var detailsPtr *string
	if details != nil {
		if b, err := json.Marshal(details); err == nil {
			s := string(b)
			detailsPtr = &s
		}
	}

	ipCopy := ip
	uaCopy := userAgent

	job := auditJob{
		logger: logger,
		entry: &models.AuditLog{
			UserID:       userID,
			Action:       action,
			ResourceType: resourceType,
			Details:      detailsPtr,
			IPAddress:    &ipCopy,
			UserAgent:    &uaCopy,
		},
	}

	select {
	case auditQueue <- job:
	default:
		slog.Warn("security audit: queue full, dropping event", "user_id", userID, "action", action)
	}
}
