package services

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// DeviceTokenFetcher is the interface for getting device tokens.
type DeviceTokenFetcher interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.DeviceToken, error)
	Unregister(ctx context.Context, userID uuid.UUID, token string) error
}

// EventFetcher is the interface for getting events for notifications.
type EventFetcher interface {
	GetUpcoming(ctx context.Context, userID uuid.UUID, limit int) ([]models.Event, error)
}

type NotificationStore interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type NotificationEmailSender interface {
	SendEventReminder(email, userName, eventName, eventDate, eventLink string) error
	SendWeeklySummary(email, userName, nextEventsHTML, paymentsHTML string) error
	SendMarketingUpdate(email, userName, tipsHTML string) error
}

type weeklySummaryRecipient struct {
	UserID uuid.UUID
	Email  string
	Name   string
}

type weeklySummaryEvent struct {
	UserID      uuid.UUID
	ServiceType string
	EventDate   string
}

type weeklyPaymentSummary struct {
	UserID       uuid.UUID
	TotalAmount  float64
	PaymentCount int
}

const notificationBatchSize = 200

// NotificationService handles business-level push and email notification logic.
type NotificationService struct {
	pushService  *PushService
	deviceRepo   DeviceTokenFetcher
	emailService NotificationEmailSender
	pool         NotificationStore
}

// NewNotificationService creates a new NotificationService.
func NewNotificationService(pushService *PushService, deviceRepo DeviceTokenFetcher, pool NotificationStore, emailService NotificationEmailSender) *NotificationService {
	return &NotificationService{
		pushService:  pushService,
		deviceRepo:   deviceRepo,
		pool:         pool,
		emailService: emailService,
	}
}

func chunkUUIDs(ids []uuid.UUID, chunkSize int) [][]uuid.UUID {
	if len(ids) == 0 {
		return nil
	}
	if chunkSize <= 0 {
		chunkSize = notificationBatchSize
	}

	chunks := make([][]uuid.UUID, 0, (len(ids)+chunkSize-1)/chunkSize)
	for start := 0; start < len(ids); start += chunkSize {
		end := start + chunkSize
		if end > len(ids) {
			end = len(ids)
		}
		chunk := make([]uuid.UUID, end-start)
		copy(chunk, ids[start:end])
		chunks = append(chunks, chunk)
	}
	return chunks
}

func renderWeeklySummaryEventsHTML(events []weeklySummaryEvent) string {
	if len(events) == 0 {
		return `<p style="margin: 4px 0;">• Sin eventos próximos</p>`
	}

	html := ""
	for _, event := range events {
		html += fmt.Sprintf(`<p style="margin: 4px 0;">• %s - %s</p>`, event.ServiceType, event.EventDate)
	}
	return html
}

func renderWeeklySummaryPaymentsHTML(summary weeklyPaymentSummary, ok bool) string {
	if !ok || summary.PaymentCount == 0 {
		return `<p style="margin: 4px 0;">• Sin pagos registrados</p>`
	}
	return fmt.Sprintf(`<p style="margin: 4px 0;">• %d pagos por $%.2f MXN esta semana</p>`, summary.PaymentCount, summary.TotalAmount)
}

func (s *NotificationService) listWeeklySummaryRecipients(ctx context.Context) ([]weeklySummaryRecipient, error) {
	if s.pool == nil {
		return nil, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, email, name FROM users
		WHERE email_weekly_summary = true
		ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	recipients := make([]weeklySummaryRecipient, 0)
	for rows.Next() {
		var recipient weeklySummaryRecipient
		if err := rows.Scan(&recipient.UserID, &recipient.Email, &recipient.Name); err != nil {
			continue
		}
		recipients = append(recipients, recipient)
	}
	return recipients, nil
}

func (s *NotificationService) listWeeklySummaryEventsForUsers(ctx context.Context, userIDs []uuid.UUID) ([]weeklySummaryEvent, error) {
	if s.pool == nil || len(userIDs) == 0 {
		return nil, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT user_id, service_type, to_char(event_date, 'YYYY-MM-DD') as event_date
		FROM (
			SELECT user_id, service_type, event_date,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_date ASC) AS rn
			FROM events
			WHERE user_id = ANY($1::uuid[]) AND status = 'confirmed'
			AND event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + INTERVAL '7 days'
		) upcoming
		WHERE rn <= 5
		ORDER BY user_id ASC, event_date ASC
	`, userIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]weeklySummaryEvent, 0)
	for rows.Next() {
		var event weeklySummaryEvent
		if err := rows.Scan(&event.UserID, &event.ServiceType, &event.EventDate); err != nil {
			continue
		}
		events = append(events, event)
	}
	return events, nil
}

func (s *NotificationService) listWeeklyPaymentSummariesForUsers(ctx context.Context, userIDs []uuid.UUID) ([]weeklyPaymentSummary, error) {
	if s.pool == nil || len(userIDs) == 0 {
		return nil, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT user_id, COALESCE(SUM(amount), 0), COUNT(*)
		FROM payments
		WHERE user_id = ANY($1::uuid[])
		AND payment_date >= CURRENT_DATE - INTERVAL '7 days'
		GROUP BY user_id
		ORDER BY user_id ASC
	`, userIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	summaries := make([]weeklyPaymentSummary, 0)
	for rows.Next() {
		var summary weeklyPaymentSummary
		if err := rows.Scan(&summary.UserID, &summary.TotalAmount, &summary.PaymentCount); err != nil {
			continue
		}
		summaries = append(summaries, summary)
	}
	return summaries, nil
}

func (s *NotificationService) listReminderUserIDs(ctx context.Context) ([]uuid.UUID, error) {
	if s.pool == nil {
		return nil, nil
	}

	rows, err := s.pool.Query(ctx, `SELECT DISTINCT user_id FROM device_tokens ORDER BY user_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	userIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		var uid uuid.UUID
		if err := rows.Scan(&uid); err != nil {
			continue
		}
		userIDs = append(userIDs, uid)
	}
	return userIDs, nil
}

func (s *NotificationService) listEventsForUsers(ctx context.Context, userIDs []uuid.UUID, status string, horizon time.Duration) ([]models.Event, error) {
	if s.pool == nil || len(userIDs) == 0 {
		return nil, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, client_id, to_char(event_date, 'YYYY-MM-DD') as event_date,
			to_char(start_time, 'HH24:MI:SS') as start_time,
			service_type, status
		FROM events
		WHERE user_id = ANY($1::uuid[]) AND status = $2
		AND event_date >= CURRENT_DATE AND event_date <= CURRENT_DATE + $3 * INTERVAL '1 second'
		ORDER BY user_id ASC, event_date ASC
	`, userIDs, status, int(horizon.Seconds()))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]models.Event, 0)
	for rows.Next() {
		var event models.Event
		if err := rows.Scan(&event.ID, &event.UserID, &event.ClientID, &event.EventDate, &event.StartTime, &event.ServiceType, &event.Status); err != nil {
			continue
		}
		events = append(events, event)
	}
	return events, nil
}

// getUserPushPrefs returns the push notification preferences for a user.
// Returns defaults (all true) if the user cannot be fetched.
func (s *NotificationService) getUserPushPrefs(ctx context.Context, userID uuid.UUID) (enabled, eventReminder, paymentReceived bool) {
	enabled, eventReminder, paymentReceived = true, true, true
	if s.pool == nil {
		return
	}
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(push_enabled, true), COALESCE(push_event_reminder, true), COALESCE(push_payment_received, true) FROM users WHERE id = $1`,
		userID).Scan(&enabled, &eventReminder, &paymentReceived)
	if err != nil {
		slog.Error("Failed to fetch push preferences", "user_id", userID, "error", err)
	}
	return
}

// getUserEmailPrefs returns email notification preferences for a user.
func (s *NotificationService) getUserEmailPrefs(ctx context.Context, userID uuid.UUID) (eventReminder, paymentReceipt, subscriptionUpdates bool) {
	eventReminder, paymentReceipt, subscriptionUpdates = true, true, true
	if s.pool == nil {
		return
	}
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(email_event_reminder, true), COALESCE(email_payment_receipt, true), COALESCE(email_subscription_updates, true) FROM users WHERE id = $1`,
		userID).Scan(&eventReminder, &paymentReceipt, &subscriptionUpdates)
	if err != nil {
		slog.Error("Failed to fetch email preferences", "user_id", userID, "error", err)
	}
	return
}

// SendEventReminder sends a push notification reminding about an upcoming event.
// reminderType: "24h" or "1h"
func (s *NotificationService) SendEventReminder(ctx context.Context, userID uuid.UUID, event models.Event, reminderType string) error {
	// Check push preferences
	enabled, eventRem, _ := s.getUserPushPrefs(ctx, userID)
	if !enabled || !eventRem {
		return nil
	}

	notifType := fmt.Sprintf("event_reminder_%s", reminderType)

	// Check if already sent
	if s.wasAlreadySent(ctx, event.ID, notifType) {
		return nil
	}

	tokens, err := s.deviceRepo.GetByUserID(ctx, userID)
	if err != nil || len(tokens) == 0 {
		return err
	}

	var title, body string
	switch reminderType {
	case "24h":
		title = "Evento mañana"
		body = fmt.Sprintf("Tu evento '%s' es mañana. ¡Revisa los detalles!", event.ServiceType)
	case "1h":
		title = "Evento en 1 hora"
		body = fmt.Sprintf("Tu evento '%s' comienza pronto.", event.ServiceType)
	default:
		title = "Recordatorio de evento"
		body = fmt.Sprintf("Tu evento '%s' se acerca.", event.ServiceType)
	}

	msg := PushMessage{
		Title: title,
		Body:  body,
		Data: map[string]string{
			"type":     "event_reminder",
			"event_id": event.ID.String(),
		},
	}

	failed := s.pushService.SendToTokens(ctx, tokens, msg)
	s.cleanupFailedTokens(ctx, userID, failed)
	s.markAsSent(ctx, userID, event.ID, notifType)
	return nil
}

// SendEventReminderEmail sends an email reminder about an upcoming event.
func (s *NotificationService) SendEventReminderEmail(ctx context.Context, userID uuid.UUID, event models.Event, reminderType string) error {
	// Check email preferences
	emailEventRem, _, _ := s.getUserEmailPrefs(ctx, userID)
	if !emailEventRem {
		return nil
	}

	notifType := fmt.Sprintf("event_reminder_email_%s", reminderType)

	// Check if already sent
	if s.wasAlreadySent(ctx, event.ID, notifType) {
		return nil
	}

	// Get user email and name
	var email, name string
	err := s.pool.QueryRow(ctx, `SELECT email, name FROM users WHERE id = $1`, userID).Scan(&email, &name)
	if err != nil {
		slog.Error("Failed to fetch user email", "user_id", userID, "error", err)
		return err
	}

	eventLink := fmt.Sprintf("https://app.solennix.com/events/%s", event.ID.String())
	if err := s.emailService.SendEventReminder(email, name, event.ServiceType, event.EventDate, eventLink); err != nil {
		slog.Error("Failed to send event reminder email", "user_id", userID, "error", err)
		return err
	}

	s.markAsSent(ctx, userID, event.ID, notifType)
	return nil
}

// SendPaymentReceived sends a notification when a payment is recorded.
func (s *NotificationService) SendPaymentReceived(ctx context.Context, userID uuid.UUID, eventID uuid.UUID, amount float64) error {
	// Check push preferences
	enabled, _, paymentRcv := s.getUserPushPrefs(ctx, userID)
	if !enabled || !paymentRcv {
		return nil
	}

	tokens, err := s.deviceRepo.GetByUserID(ctx, userID)
	if err != nil || len(tokens) == 0 {
		return err
	}

	msg := PushMessage{
		Title: "Pago registrado",
		Body:  fmt.Sprintf("Se registró un pago de $%.2f MXN.", amount),
		Data: map[string]string{
			"type":     "payment_received",
			"event_id": eventID.String(),
		},
	}

	failed := s.pushService.SendToTokens(ctx, tokens, msg)
	s.cleanupFailedTokens(ctx, userID, failed)
	return nil
}

// SendQuotationPending sends a notification when a quotation is still unconfirmed
// and the event date is approaching. Deduped via notification_log.
func (s *NotificationService) SendQuotationPending(ctx context.Context, userID uuid.UUID, event models.Event) error {
	// Check push preferences (gated by push_enabled + push_event_reminder)
	enabled, eventRem, _ := s.getUserPushPrefs(ctx, userID)
	if !enabled || !eventRem {
		return nil
	}

	const notifType = "quotation_pending"
	if s.wasAlreadySent(ctx, event.ID, notifType) {
		return nil
	}

	tokens, err := s.deviceRepo.GetByUserID(ctx, userID)
	if err != nil || len(tokens) == 0 {
		return err
	}

	msg := PushMessage{
		Title: "Cotización pendiente",
		Body:  fmt.Sprintf("'%s' aún no está confirmado. Hacé seguimiento con el cliente.", event.ServiceType),
		Data: map[string]string{
			"type":     "quotation_pending",
			"event_id": event.ID.String(),
		},
	}

	failed := s.pushService.SendToTokens(ctx, tokens, msg)
	s.cleanupFailedTokens(ctx, userID, failed)
	s.markAsSent(ctx, userID, event.ID, notifType)
	return nil
}

// SendEventConfirmed sends a notification when an event status changes to confirmed.
func (s *NotificationService) SendEventConfirmed(ctx context.Context, userID uuid.UUID, event models.Event) error {
	// Check push preferences (gated by push_enabled global toggle)
	enabled, _, _ := s.getUserPushPrefs(ctx, userID)
	if !enabled {
		return nil
	}

	tokens, err := s.deviceRepo.GetByUserID(ctx, userID)
	if err != nil || len(tokens) == 0 {
		return err
	}

	msg := PushMessage{
		Title: "Evento confirmado",
		Body:  fmt.Sprintf("Tu evento '%s' ha sido confirmado.", event.ServiceType),
		Data: map[string]string{
			"type":     "event_confirmed",
			"event_id": event.ID.String(),
		},
	}

	failed := s.pushService.SendToTokens(ctx, tokens, msg)
	s.cleanupFailedTokens(ctx, userID, failed)
	return nil
}

// SendWeeklySummaryEmails sends a weekly summary to all users who enabled it.
func (s *NotificationService) SendWeeklySummaryEmails(ctx context.Context) {
	if s.emailService == nil {
		return
	}

	recipients, err := s.listWeeklySummaryRecipients(ctx)
	if err != nil {
		slog.Error("Failed to query users for weekly summary", "error", err)
		return
	}
	if len(recipients) == 0 {
		return
	}

	userIDs := make([]uuid.UUID, 0, len(recipients))
	for _, recipient := range recipients {
		userIDs = append(userIDs, recipient.UserID)
	}

	eventsByUser := make(map[uuid.UUID][]weeklySummaryEvent, len(recipients))
	paymentsByUser := make(map[uuid.UUID]weeklyPaymentSummary, len(recipients))
	skipRecipients := make(map[uuid.UUID]bool, len(recipients))

	for _, chunk := range chunkUUIDs(userIDs, notificationBatchSize) {
		events, err := s.listWeeklySummaryEventsForUsers(ctx, chunk)
		if err != nil {
			slog.Error("Failed to query events for weekly summary", "error", err)
			for _, userID := range chunk {
				skipRecipients[userID] = true
			}
			continue
		}
		for _, event := range events {
			eventsByUser[event.UserID] = append(eventsByUser[event.UserID], event)
		}

		payments, err := s.listWeeklyPaymentSummariesForUsers(ctx, chunk)
		if err != nil {
			slog.Error("Failed to query payments for weekly summary", "error", err)
			continue
		}
		for _, payment := range payments {
			paymentsByUser[payment.UserID] = payment
		}
	}

	sentCount := 0
	for _, recipient := range recipients {
		if skipRecipients[recipient.UserID] {
			continue
		}

		nextEventsHTML := renderWeeklySummaryEventsHTML(eventsByUser[recipient.UserID])
		paymentSummary, ok := paymentsByUser[recipient.UserID]
		paymentsHTML := renderWeeklySummaryPaymentsHTML(paymentSummary, ok)

		if err := s.emailService.SendWeeklySummary(recipient.Email, recipient.Name, nextEventsHTML, paymentsHTML); err != nil {
			slog.Error("Failed to send weekly summary", "user_id", recipient.UserID, "error", err)
		} else {
			sentCount++
		}
	}

	if sentCount > 0 {
		slog.Info("Sent weekly summary emails", "count", sentCount)
	}
}

// SendMarketingEmails sends marketing/tips emails to all users who enabled it.
func (s *NotificationService) SendMarketingEmails(ctx context.Context) {
	if s.emailService == nil {
		return
	}

	// Get all users who want marketing emails
	rows, err := s.pool.Query(ctx, `
		SELECT id, email, name FROM users
		WHERE email_marketing = true
	`)
	if err != nil {
		slog.Error("Failed to query users for marketing emails", "error", err)
		return
	}
	defer rows.Close()

	// Static tips for this week (could be dynamic in the future)
	tipsHTML := `
	<div class="highlight">
		<p style="margin: 0;"><strong>💡 Tip de la semana:</strong></p>
		<p style="margin: 8px 0 0 0;">Utiliza los recordatorios automáticos de Solennix para nunca olvidar un evento importante. Los recordatorios por email y push te avisarán 24 horas y 1 hora antes de cada evento.</p>
		<p style="margin: 8px 0 0 0;"><strong>⚡ Novedad:</strong> Ahora podés personalizar qué notificaciones recibir desde tu configuración de preferencias.</p>
	</div>
	`

	sentCount := 0
	for rows.Next() {
		var userID uuid.UUID
		var email, name string
		if err := rows.Scan(&userID, &email, &name); err != nil {
			continue
		}

		if err := s.emailService.SendMarketingUpdate(email, name, tipsHTML); err != nil {
			slog.Error("Failed to send marketing email", "user_id", userID, "error", err)
		} else {
			sentCount++
		}
	}

	if sentCount > 0 {
		slog.Info("Sent marketing emails", "count", sentCount)
	}
}

// ProcessPendingReminders checks for upcoming events and sends reminders.
// Should be called periodically (e.g., every 15 minutes).
func (s *NotificationService) ProcessPendingReminders(ctx context.Context) {
	if !s.pushService.IsEnabled() {
		return
	}

	userIDs, err := s.listReminderUserIDs(ctx)
	if err != nil {
		slog.Error("Failed to query users for reminders", "error", err)
		return
	}
	if len(userIDs) == 0 {
		return
	}

	now := time.Now()
	sentCount := 0

	for _, chunk := range chunkUUIDs(userIDs, notificationBatchSize) {
		events, err := s.listEventsForUsers(ctx, chunk, "confirmed", 24*time.Hour)
		if err != nil {
			slog.Error("Failed to query events for reminders", "error", err)
			continue
		}

		for _, event := range events {
			eventDate, err := time.Parse("2006-01-02", event.EventDate)
			if err != nil {
				continue
			}

			eventTime := eventDate
			if event.StartTime != nil {
				if parsed, err := time.Parse("15:04:05", *event.StartTime); err == nil {
					eventTime = time.Date(eventDate.Year(), eventDate.Month(), eventDate.Day(), parsed.Hour(), parsed.Minute(), 0, 0, now.Location())
				}
			}

			hoursUntil := eventTime.Sub(now).Hours()
			if hoursUntil >= 23 && hoursUntil <= 25 {
				if err := s.SendEventReminder(ctx, event.UserID, event, "24h"); err == nil {
					sentCount++
				}
				_ = s.SendEventReminderEmail(ctx, event.UserID, event, "24h")
			}
			if hoursUntil >= 0.5 && hoursUntil <= 1.5 {
				if err := s.SendEventReminder(ctx, event.UserID, event, "1h"); err == nil {
					sentCount++
				}
				_ = s.SendEventReminderEmail(ctx, event.UserID, event, "1h")
			}
		}
	}

	if sentCount > 0 {
		slog.Info("Processed event reminders", "sent", sentCount)
	}

	s.processQuotationPending(ctx, userIDs)
}

// processQuotationPending sends a one-time push for events still in 'quoted' status
// with an event_date within the next 7 days.
func (s *NotificationService) processQuotationPending(ctx context.Context, userIDs []uuid.UUID) {
	if !s.pushService.IsEnabled() || len(userIDs) == 0 {
		return
	}

	sent := 0
	for _, chunk := range chunkUUIDs(userIDs, notificationBatchSize) {
		events, err := s.listEventsForUsers(ctx, chunk, "quoted", 7*24*time.Hour)
		if err != nil {
			slog.Error("Failed to query pending quotations", "error", err)
			continue
		}

		for _, event := range events {
			if err := s.SendQuotationPending(ctx, event.UserID, event); err == nil {
				sent++
			}
		}
	}
	if sent > 0 {
		slog.Info("Processed pending quotation notifications", "sent", sent)
	}
}

// wasAlreadySent checks the notification_log table for duplicates.
func (s *NotificationService) wasAlreadySent(ctx context.Context, eventID uuid.UUID, notifType string) bool {
	if s.pool == nil {
		return false
	}
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM notification_log WHERE event_id = $1 AND notification_type = $2)`,
		eventID, notifType).Scan(&exists)
	if err != nil {
		slog.Error("Failed to check notification log", "error", err)
		return false
	}
	return exists
}

// markAsSent records a notification in the log.
func (s *NotificationService) markAsSent(ctx context.Context, userID, eventID uuid.UUID, notifType string) {
	if s.pool == nil {
		return
	}
	_, err := s.pool.Exec(ctx,
		`INSERT INTO notification_log (user_id, event_id, notification_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
		userID, eventID, notifType)
	if err != nil {
		slog.Error("Failed to log notification", "error", err)
	}
}

// cleanupFailedTokens removes tokens that permanently failed.
func (s *NotificationService) cleanupFailedTokens(ctx context.Context, userID uuid.UUID, failed []FailedToken) {
	for _, f := range failed {
		// Common permanent error indicators
		if containsAny(f.Reason, "Unregistered", "InvalidRegistration", "NotRegistered", "BadDeviceToken") {
			slog.Info("Removing invalid device token", "platform", f.Platform, "reason", f.Reason)
			_ = s.deviceRepo.Unregister(ctx, userID, f.Token)
		}
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}
