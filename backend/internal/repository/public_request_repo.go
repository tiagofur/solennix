package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// PublicRequestRepo persists structured quote requests (PublicRequest) and
// organizer responses (PublicResponse). See PRD docs/PRD/15_MARKETPLACE_V2.md §3
// and openspec/changes/add-public-request-flow/.
//
// Pagination follows the project convention (LIMIT/OFFSET + total count), same
// as ClientRepo and EventRepo. NG1 ratified: the requester is a visitor with a
// contact email, not a Solennix user; client_token lets them act on their own
// request without an account.
type PublicRequestRepo struct {
	pool *pgxpool.Pool
}

func NewPublicRequestRepo(pool *pgxpool.Pool) *PublicRequestRepo {
	return &PublicRequestRepo{pool: pool}
}

// publicRequestFields lists the columns in stable order for SELECT/RETURNING.
// Keep in sync with scanPublicRequest.
const publicRequestFields = `
	id, organizer_user_id, client_token, contact_email, contact_name,
	event_type, event_date, location, guest_count, budget, currency,
	services, message, status, is_read, event_id, declined_reason,
	last_status_change, created_at, updated_at`

// PublicRequestListFilters controls ListByOrganizer pagination + filtering.
// Status is optional ("" = all). FromDate/ToDate filter on event_date.
type PublicRequestListFilters struct {
	Status   string // models.RequestStatus; empty = all
	FromDay  string // YYYY-MM-DD inclusive, optional
	ToDay    string // YYYY-MM-DD inclusive, optional
	SortBy   string // "created_at" (default) | "event_date"
	Order    string // "desc" (default) | "asc"
	Limit    int
	Offset   int
}

// Create inserts a public request and returns the stored row (id, tokens,
// timestamps populated by DB defaults).
func (r *PublicRequestRepo) Create(ctx context.Context, req *models.PublicRequest) error {
	servicesJSON, err := json.Marshal(req.Services)
	if err != nil {
		return fmt.Errorf("marshal services: %w", err)
	}
	query := `
		INSERT INTO public_requests
			(organizer_user_id, contact_email, contact_name, event_type, event_date,
			 location, guest_count, budget, currency, services, message, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING ` + publicRequestFields
	args := []any{
		req.OrganizerUserID, req.ContactEmail, req.ContactName, req.EventType,
		req.EventDate, req.Location, req.GuestCount, req.Budget, req.Currency,
		servicesJSON, req.Message, string(req.Status),
	}
	return scanPublicRequest(
		r.pool.QueryRow(ctx, query, args...),
		req,
		"create public request",
	)
}

// GetByID returns one request scoped to organizerUserID (404 if missing or
// belonging to another organizer).
func (r *PublicRequestRepo) GetByID(ctx context.Context, id, organizerUserID uuid.UUID) (*models.PublicRequest, error) {
	req := &models.PublicRequest{}
	query := `SELECT ` + publicRequestFields + `
		FROM public_requests
		WHERE id = $1 AND organizer_user_id = $2`
	if err := scanPublicRequest(
		r.pool.QueryRow(ctx, query, id, organizerUserID),
		req,
		"get public request",
	); err != nil {
		return nil, err
	}
	return req, nil
}

// GetByIDAndToken returns one request matched by (id, client_token). Used by the
// public action endpoint (visitor without account proves possession via token).
func (r *PublicRequestRepo) GetByIDAndToken(ctx context.Context, id uuid.UUID, clientToken uuid.UUID) (*models.PublicRequest, error) {
	req := &models.PublicRequest{}
	query := `SELECT ` + publicRequestFields + `
		FROM public_requests
		WHERE id = $1 AND client_token = $2`
	if err := scanPublicRequest(
		r.pool.QueryRow(ctx, query, id, clientToken),
		req,
		"get public request by token",
	); err != nil {
		return nil, err
	}
	return req, nil
}

// ListByOrganizer returns a paginated, filtered slice of requests for an
// organizer plus the total count (before pagination).
func (r *PublicRequestRepo) ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID, f PublicRequestListFilters) ([]models.PublicRequest, int, error) {
	if f.Limit <= 0 || f.Limit > GetAllSafetyLimit {
		f.Limit = GetAllSafetyLimit
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	sortCol := "created_at"
	if f.SortBy == "event_date" {
		sortCol = "event_date"
	}
	order := "DESC"
	if f.Order == "asc" {
		order = "ASC"
	}

	where := "WHERE organizer_user_id = $1"
	args := []any{organizerUserID}
	n := 2
	if f.Status != "" {
		where += fmt.Sprintf(" AND status = $%d", n)
		args = append(args, f.Status)
		n++
	}
	if f.FromDay != "" {
		where += fmt.Sprintf(" AND event_date >= $%d", n)
		args = append(args, f.FromDay)
		n++
	}
	if f.ToDay != "" {
		where += fmt.Sprintf(" AND event_date <= $%d", n)
		args = append(args, f.ToDay)
		n++
	}

	var total int
	countQuery := `SELECT count(*) FROM public_requests ` + where
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count public requests: %w", err)
	}

	listQuery := fmt.Sprintf(
		`SELECT %s FROM public_requests %s ORDER BY %s %s NULLS LAST LIMIT $%d OFFSET $%d`,
		publicRequestFields, where, sortCol, order, n, n+1,
	)
	args = append(args, f.Limit, f.Offset)
	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list public requests: %w", err)
	}
	defer rows.Close()

	out := make([]models.PublicRequest, 0)
	for rows.Next() {
		var req models.PublicRequest
		if err := scanPublicRequest(rows, &req, "scan public request"); err != nil {
			return nil, 0, err
		}
		out = append(out, req)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate public requests: %w", err)
	}
	return out, total, nil
}

// UpdateStatus transitions a request to newStatus and bumps last_status_change
// + updated_at. declinedReason is optional (only meaningful for declined_*).
// Returns pgx.ErrNoRows if the row is missing or belongs to another organizer.
func (r *PublicRequestRepo) UpdateStatus(ctx context.Context, id, organizerUserID uuid.UUID, newStatus models.RequestStatus, declinedReason *string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE public_requests
		SET status = $3,
		    declined_reason = $4,
		    last_status_change = NOW(),
		    updated_at = NOW()
		WHERE id = $1 AND organizer_user_id = $2`,
		id, organizerUserID, string(newStatus), declinedReason)
	if err != nil {
		return fmt.Errorf("update public request status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("update public request status: %w", pgx.ErrNoRows)
	}
	return nil
}

// SetEventID links a request to a created Event (conversion to event, status=booked).
// Returns pgx.ErrNoRows if the request is missing or foreign.
func (r *PublicRequestRepo) SetEventID(ctx context.Context, id, organizerUserID, eventID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE public_requests
		SET event_id = $3, status = $4, last_status_change = NOW(), updated_at = NOW()
		WHERE id = $1 AND organizer_user_id = $2`,
		id, organizerUserID, eventID, string(models.RequestStatusBooked))
	if err != nil {
		return fmt.Errorf("set public request event id: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("set public request event id: %w", pgx.ErrNoRows)
	}
	return nil
}

// MarkRead flags a request as read by the organizer.
func (r *PublicRequestRepo) MarkRead(ctx context.Context, id, organizerUserID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE public_requests SET is_read = true, updated_at = NOW()
		 WHERE id = $1 AND organizer_user_id = $2`,
		id, organizerUserID)
	if err != nil {
		return fmt.Errorf("mark public request read: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("mark public request read: %w", pgx.ErrNoRows)
	}
	return nil
}

// CountUnreadByOrganizer returns the number of unread requests (for the badge).
func (r *PublicRequestRepo) CountUnreadByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM public_requests WHERE organizer_user_id = $1 AND is_read = false`,
		organizerUserID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count unread public requests: %w", err)
	}
	return count, nil
}

// CountPendingByOrganizer returns the number of pending requests for an
// organizer. Used by the anti-spam cap (PRD §3.4) before accepting a new request.
func (r *PublicRequestRepo) CountPendingByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM public_requests
		 WHERE organizer_user_id = $1 AND status = $2`,
		organizerUserID, string(models.RequestStatusPending)).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count pending public requests: %w", err)
	}
	return count, nil
}

// ExpireStale marks requests past the inactivity threshold as expired.
// Only non-terminal, "active" statuses are eligible. Returns the number expired.
func (r *PublicRequestRepo) ExpireStale(ctx context.Context, inactiveDays int) (int, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE public_requests
		SET status = $1, last_status_change = NOW(), updated_at = NOW()
		WHERE status IN ('pending', 'info_requested', 'responded', 'accepted_by_client')
		  AND last_status_change < NOW() - ($2 || ' days')::interval`,
		string(models.RequestStatusExpired), inactiveDays)
	if err != nil {
		return 0, fmt.Errorf("expire stale public requests: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

// --- PublicResponse ---

const publicResponseFields = `
	id, request_id, quote_amount, currency, inclusions, valid_until, message, created_at`

// CreateResponse inserts an organizer quote reply. The caller (service) is
// responsible for transitioning the parent request to "responded".
func (r *PublicRequestRepo) CreateResponse(ctx context.Context, resp *models.PublicResponse) error {
	inclusionsJSON, err := json.Marshal(resp.Inclusions)
	if err != nil {
		return fmt.Errorf("marshal inclusions: %w", err)
	}
	query := `
		INSERT INTO public_responses
			(request_id, organizer_user_id, quote_amount, currency, inclusions, valid_until, message)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + publicResponseFields
	return scanPublicResponse(
		r.pool.QueryRow(ctx, query,
			resp.RequestID, resp.OrganizerUserID, resp.QuoteAmount, resp.Currency,
			inclusionsJSON, resp.ValidUntil, resp.Message),
		resp,
		"create public response",
	)
}

// ListResponsesByRequest returns the response history for a request, scoped to
// the organizer (404 path: caller checks ownership of the parent request first).
func (r *PublicRequestRepo) ListResponsesByRequest(ctx context.Context, requestID, organizerUserID uuid.UUID) ([]models.PublicResponse, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+publicResponseFields+`
		 FROM public_responses
		 WHERE request_id = $1 AND organizer_user_id = $2
		 ORDER BY created_at ASC`,
		requestID, organizerUserID)
	if err != nil {
		return nil, fmt.Errorf("list public responses: %w", err)
	}
	defer rows.Close()

	out := make([]models.PublicResponse, 0)
	for rows.Next() {
		var resp models.PublicResponse
		if err := scanPublicResponse(rows, &resp, "scan public response"); err != nil {
			return nil, err
		}
		out = append(out, resp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public responses: %w", err)
	}
	return out, nil
}

// --- scanners ---
// rowScanner is shared with public_profile_repo.go (package-level interface
// abstracting *pgx.Row and pgx.Rows so scan helpers work for single + iteration).

func scanPublicRequest(sc rowScanner, req *models.PublicRequest, wrap string) error {
	var (
		servicesRaw    []byte
		statusStr      string
		eventDate      *string
		location       *string
		contactName    *string
		eventType      *string
		message        *string
		declinedReason *string
	)
	err := sc.Scan(
		&req.ID, &req.OrganizerUserID, &req.ClientToken, &req.ContactEmail, &contactName,
		&eventType, &eventDate, &location, &req.GuestCount, &req.Budget, &req.Currency,
		&servicesRaw, &message, &statusStr, &req.IsRead, &req.EventID, &declinedReason,
		&req.LastStatusChange, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("%s: %w", wrap, err)
	}
	if len(servicesRaw) > 0 && string(servicesRaw) != "null" {
		if err := json.Unmarshal(servicesRaw, &req.Services); err != nil {
			return fmt.Errorf("%s: unmarshal services: %w", wrap, err)
		}
	}
	if len(req.Services) == 0 {
		req.Services = []models.PublicRequestServiceSnapshot{}
	}
	req.Status = models.RequestStatus(statusStr)
	req.ContactName = contactName
	req.EventType = eventType
	req.EventDate = eventDate
	req.Location = location
	req.Message = message
	req.DeclinedReason = declinedReason
	return nil
}

func scanPublicResponse(sc rowScanner, resp *models.PublicResponse, wrap string) error {
	var (
		inclusionsRaw []byte
		validUntil    *string
		message       *string
	)
	err := sc.Scan(
		&resp.ID, &resp.RequestID, &resp.QuoteAmount, &resp.Currency,
		&inclusionsRaw, &validUntil, &message, &resp.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("%s: %w", wrap, err)
	}
	if len(inclusionsRaw) > 0 && string(inclusionsRaw) != "null" {
		if err := json.Unmarshal(inclusionsRaw, &resp.Inclusions); err != nil {
			return fmt.Errorf("%s: unmarshal inclusions: %w", wrap, err)
		}
	}
	if len(resp.Inclusions) == 0 {
		resp.Inclusions = []string{}
	}
	resp.ValidUntil = validUntil
	resp.Message = message
	return nil
}
