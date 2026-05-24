package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/pashagolub/pgxmock/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeEmailSender struct {
	weekly []weeklyEmailCall
}

type weeklyEmailCall struct {
	email        string
	userName     string
	eventsHTML   string
	paymentsHTML string
}

func (f *fakeEmailSender) SendEventReminder(string, string, string, string, string) error {
	return nil
}

func (f *fakeEmailSender) SendWeeklySummary(email, userName, nextEventsHTML, paymentsHTML string) error {
	f.weekly = append(f.weekly, weeklyEmailCall{
		email:        email,
		userName:     userName,
		eventsHTML:   nextEventsHTML,
		paymentsHTML: paymentsHTML,
	})
	return nil
}

func (f *fakeEmailSender) SendMarketingUpdate(string, string, string) error {
	return nil
}

type queryGuardStore struct {
	inner      pgxmock.PgxPoolIface
	prohibited []string
	hits       []string
}

func newQueryGuardStore(t *testing.T, prohibited ...string) *queryGuardStore {
	mock, err := pgxmock.NewPool()
	require.NoError(t, err)
	return &queryGuardStore{inner: mock, prohibited: prohibited}
}

func (s *queryGuardStore) Close() {
	s.inner.Close()
}

func (s *queryGuardStore) ExpectationsWereMet() error {
	return s.inner.ExpectationsWereMet()
}

func (s *queryGuardStore) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	s.record(sql)
	return s.inner.Query(ctx, sql, args...)
}

func (s *queryGuardStore) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	s.record(sql)
	return s.inner.QueryRow(ctx, sql, args...)
}

func (s *queryGuardStore) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	s.record(sql)
	return s.inner.Exec(ctx, sql, args...)
}

func (s *queryGuardStore) record(sql string) {
	normalized := strings.Join(strings.Fields(sql), " ")
	for _, forbidden := range s.prohibited {
		if strings.Contains(normalized, forbidden) {
			s.hits = append(s.hits, forbidden)
		}
	}
}

func TestChunkUUIDs_GivenMoreThanBatchSize_WhenChunked_ThenPreservesOrderAndBounds(t *testing.T) {
	ids := make([]uuid.UUID, 0, 5)
	for i := 0; i < 5; i++ {
		ids = append(ids, uuid.New())
	}

	chunks := chunkUUIDs(ids, 2)
	require.Len(t, chunks, 3)
	assert.Equal(t, []uuid.UUID{ids[0], ids[1]}, chunks[0])
	assert.Equal(t, []uuid.UUID{ids[2], ids[3]}, chunks[1])
	assert.Equal(t, []uuid.UUID{ids[4]}, chunks[2])
}

func TestSendWeeklySummaryEmails_GivenMultipleUsers_WhenCalled_ThenAvoidsPerUserQueries(t *testing.T) {
	store := newQueryGuardStore(t,
		"WHERE user_id = $1 AND status = 'confirmed'",
		"SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM payments",
	)
	defer store.Close()

	userID1 := uuid.New()
	userID2 := uuid.New()
	emails := &fakeEmailSender{}

	store.inner.ExpectQuery(`(?s)SELECT id, email, name FROM users\s+WHERE email_weekly_summary = true`).
		WillReturnRows(
			pgxmock.NewRows([]string{"id", "email", "name"}).
				AddRow(userID1, "ana@example.com", "Ana").
				AddRow(userID2, "beto@example.com", "Beto"),
		)

	store.inner.ExpectQuery(`(?s)SELECT user_id, service_type, to_char\(event_date, 'YYYY-MM-DD'\) as event_date`).
		WithArgs(pgxmock.AnyArg()).
		WillReturnRows(
			pgxmock.NewRows([]string{"user_id", "service_type", "event_date"}).
				AddRow(userID1, "Boda", "2026-05-30").
				AddRow(userID2, "Corporativo", "2026-05-31"),
		)

	store.inner.ExpectQuery(`(?s)SELECT user_id, COALESCE\(SUM\(amount\), 0\), COUNT\(\*\)`).
		WithArgs(pgxmock.AnyArg()).
		WillReturnRows(
			pgxmock.NewRows([]string{"user_id", "total_amount", "payment_count"}).
				AddRow(userID1, 1500.0, int64(1)).
				AddRow(userID2, 3200.0, int64(2)),
		)

	svc := NewNotificationService(&PushService{enabled: false}, &mockDeviceTokenFetcher{}, store, emails)

	svc.SendWeeklySummaryEmails(context.Background())

	require.NoError(t, store.ExpectationsWereMet())
	assert.Empty(t, store.hits)
	require.Len(t, emails.weekly, 2)
	assert.Equal(t, "ana@example.com", emails.weekly[0].email)
	assert.Contains(t, emails.weekly[0].eventsHTML, "Boda")
	assert.Contains(t, emails.weekly[0].paymentsHTML, "$1500.00")
}

func TestSendWeeklySummaryEmails_GivenEventBatchFailure_WhenCalled_ThenSkipsAffectedRecipients(t *testing.T) {
	store := newQueryGuardStore(t)
	defer store.Close()

	userID1 := uuid.New()
	userID2 := uuid.New()
	emails := &fakeEmailSender{}

	store.inner.ExpectQuery(`(?s)SELECT id, email, name FROM users\s+WHERE email_weekly_summary = true`).
		WillReturnRows(
			pgxmock.NewRows([]string{"id", "email", "name"}).
				AddRow(userID1, "ana@example.com", "Ana").
				AddRow(userID2, "beto@example.com", "Beto"),
		)

	store.inner.ExpectQuery(`(?s)SELECT user_id, service_type, to_char\(event_date, 'YYYY-MM-DD'\) as event_date`).
		WithArgs(pgxmock.AnyArg()).
		WillReturnError(fmt.Errorf("events unavailable"))

	svc := NewNotificationService(&PushService{enabled: false}, &mockDeviceTokenFetcher{}, store, emails)

	svc.SendWeeklySummaryEmails(context.Background())

	require.NoError(t, store.ExpectationsWereMet())
	assert.Empty(t, emails.weekly)
}

func TestSendWeeklySummaryEmails_GivenPaymentBatchFailure_WhenCalled_ThenSkipsAffectedRecipients(t *testing.T) {
	store := newQueryGuardStore(t)
	defer store.Close()

	userID1 := uuid.New()
	userID2 := uuid.New()
	emails := &fakeEmailSender{}

	store.inner.ExpectQuery(`(?s)SELECT id, email, name FROM users\s+WHERE email_weekly_summary = true`).
		WillReturnRows(
			pgxmock.NewRows([]string{"id", "email", "name"}).
				AddRow(userID1, "ana@example.com", "Ana").
				AddRow(userID2, "beto@example.com", "Beto"),
		)

	store.inner.ExpectQuery(`(?s)SELECT user_id, service_type, to_char\(event_date, 'YYYY-MM-DD'\) as event_date`).
		WithArgs(pgxmock.AnyArg()).
		WillReturnRows(
			pgxmock.NewRows([]string{"user_id", "service_type", "event_date"}).
				AddRow(userID1, "Boda", "2026-05-30"),
		)

	store.inner.ExpectQuery(`(?s)SELECT user_id, COALESCE\(SUM\(amount\), 0\), COUNT\(\*\)`).
		WithArgs(pgxmock.AnyArg()).
		WillReturnError(fmt.Errorf("payments unavailable"))

	svc := NewNotificationService(&PushService{enabled: false}, &mockDeviceTokenFetcher{}, store, emails)

	svc.SendWeeklySummaryEmails(context.Background())

	require.NoError(t, store.ExpectationsWereMet())
	assert.Empty(t, emails.weekly)
}

func TestProcessPendingReminders_GivenMultipleUsersWithoutEvents_WhenCalled_ThenAvoidsPerUserEventQueries(t *testing.T) {
	store := newQueryGuardStore(t,
		"WHERE user_id = $1 AND status = 'confirmed'",
		"WHERE user_id = $1 AND status = 'quoted'",
	)
	defer store.Close()

	userID1 := uuid.New()
	userID2 := uuid.New()

	store.inner.ExpectQuery(`SELECT DISTINCT user_id FROM device_tokens ORDER BY user_id`).
		WillReturnRows(
			pgxmock.NewRows([]string{"user_id"}).
				AddRow(userID1).
				AddRow(userID2),
		)

	store.inner.ExpectQuery(`(?s)SELECT id, user_id, client_id, to_char\(event_date, 'YYYY-MM-DD'\) as event_date`).
		WithArgs(pgxmock.AnyArg(), "confirmed", int((24 * time.Hour).Seconds())).
		WillReturnRows(pgxmock.NewRows([]string{"id", "user_id", "client_id", "event_date", "start_time", "service_type", "status"}))

	store.inner.ExpectQuery(`(?s)SELECT id, user_id, client_id, to_char\(event_date, 'YYYY-MM-DD'\) as event_date`).
		WithArgs(pgxmock.AnyArg(), "quoted", int((7 * 24 * time.Hour).Seconds())).
		WillReturnRows(pgxmock.NewRows([]string{"id", "user_id", "client_id", "event_date", "start_time", "service_type", "status"}))

	svc := NewNotificationService(&PushService{enabled: true}, &mockDeviceTokenFetcher{}, store, &fakeEmailSender{})

	svc.ProcessPendingReminders(context.Background())

	require.NoError(t, store.ExpectationsWereMet())
	assert.Empty(t, store.hits)
}
