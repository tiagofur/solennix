package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ProfileView is a privacy-safe page-view of a public organizer profile (#1131).
type ProfileView struct {
	OrganizerUserID uuid.UUID
	Slug            string
	VisitorHash     string
	Referrer        *string
	Source          string // directory | share | direct | other
	DeviceClass     string // ios|android|desktop|mobile|bot|unknown
	CountryCode     *string
	ViewedAt        time.Time
}

// InboundAnalytics is the aggregated inbound funnel for an organizer (#1131).
type InboundAnalytics struct {
	PeriodDays       int                `json:"period_days"`
	Views            int                `json:"views"`
	UniqueVisitors   int                `json:"unique_visitors"`
	PreviousViews    int                `json:"previous_views"`
	ViewsChangePct   *float64           `json:"views_change_pct,omitempty"`
	Requests         int                `json:"requests"`
	Responded        int                `json:"responded"`
	ResponseRate     float64            `json:"response_rate"`
	Converted        int                `json:"converted"`
	ConversionRate   float64            `json:"conversion_rate"`
	RequestsByStatus map[string]int     `json:"requests_by_status"`
	Sources          map[string]int     `json:"sources"`
	ViewsByDay       []InboundDayCount  `json:"views_by_day"`
	Limited          bool               `json:"limited"` // true when Free teaser (views only)
}

// InboundDayCount is a single day bucket for charts.
type InboundDayCount struct {
	Date  string `json:"date"` // YYYY-MM-DD
	Count int    `json:"count"`
}

// RecordProfileView inserts one privacy-safe profile view. Failures are soft
// for callers — analytics must never break the public profile page.
func (r *PublicProfileRepo) RecordProfileView(ctx context.Context, v ProfileView) error {
	if v.OrganizerUserID == uuid.Nil || v.Slug == "" || v.VisitorHash == "" {
		return fmt.Errorf("record profile view: missing required fields")
	}
	source := v.Source
	if source == "" {
		source = "direct"
	}
	device := v.DeviceClass
	if device == "" {
		device = "unknown"
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO public_profile_views (organizer_user_id, slug, visitor_hash, referrer, source, device_class, country_code, viewed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))`,
		v.OrganizerUserID, v.Slug, v.VisitorHash, v.Referrer, source, device, v.CountryCode, nullTime(v.ViewedAt),
	)
	if err != nil {
		return fmt.Errorf("record profile view: %w", err)
	}
	return nil
}

func nullTime(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return t
}

// GetInboundAnalytics aggregates views + PublicRequest funnel for periodDays
// ending now. previous period is the immediately preceding equal window.
func (r *PublicProfileRepo) GetInboundAnalytics(ctx context.Context, organizerUserID uuid.UUID, periodDays int) (*InboundAnalytics, error) {
	if periodDays <= 0 {
		periodDays = 30
	}
	if periodDays > 365 {
		periodDays = 365
	}
	now := time.Now().UTC()
	// Inclusive day windows: [start, end)
	end := now
	start := end.AddDate(0, 0, -periodDays)
	prevStart := start.AddDate(0, 0, -periodDays)

	out := &InboundAnalytics{
		PeriodDays:       periodDays,
		RequestsByStatus: map[string]int{},
		Sources:          map[string]int{},
		ViewsByDay:       []InboundDayCount{},
	}

	// Current period views + unique visitors.
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int,
		       COUNT(DISTINCT visitor_hash)::int
		FROM public_profile_views
		WHERE organizer_user_id = $1
		  AND viewed_at >= $2 AND viewed_at < $3`,
		organizerUserID, start, end,
	).Scan(&out.Views, &out.UniqueVisitors); err != nil {
		return nil, fmt.Errorf("count profile views: %w", err)
	}

	// Previous period views (for Δ%).
	if err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int
		FROM public_profile_views
		WHERE organizer_user_id = $1
		  AND viewed_at >= $2 AND viewed_at < $3`,
		organizerUserID, prevStart, start,
	).Scan(&out.PreviousViews); err != nil {
		return nil, fmt.Errorf("count previous profile views: %w", err)
	}
	if out.PreviousViews > 0 {
		pct := (float64(out.Views-out.PreviousViews) / float64(out.PreviousViews)) * 100
		out.ViewsChangePct = &pct
	} else if out.Views > 0 {
		// No baseline — treat as +100% only when there is activity now.
		pct := 100.0
		out.ViewsChangePct = &pct
	}

	// Views by day (fill gaps with zeros for chart stability).
	rows, err := r.pool.Query(ctx, `
		SELECT to_char(viewed_at::date, 'YYYY-MM-DD') AS d, COUNT(*)::int
		FROM public_profile_views
		WHERE organizer_user_id = $1
		  AND viewed_at >= $2 AND viewed_at < $3
		GROUP BY viewed_at::date
		ORDER BY d ASC`,
		organizerUserID, start, end,
	)
	if err != nil {
		return nil, fmt.Errorf("views by day: %w", err)
	}
	byDay := map[string]int{}
	for rows.Next() {
		var d string
		var c int
		if err := rows.Scan(&d, &c); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan views by day: %w", err)
		}
		byDay[d] = c
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for d := start; d.Before(end); d = d.AddDate(0, 0, 1) {
		key := d.Format("2006-01-02")
		out.ViewsByDay = append(out.ViewsByDay, InboundDayCount{Date: key, Count: byDay[key]})
	}

	// Traffic sources.
	srows, err := r.pool.Query(ctx, `
		SELECT COALESCE(NULLIF(source, ''), 'other'), COUNT(*)::int
		FROM public_profile_views
		WHERE organizer_user_id = $1
		  AND viewed_at >= $2 AND viewed_at < $3
		GROUP BY 1`,
		organizerUserID, start, end,
	)
	if err != nil {
		return nil, fmt.Errorf("views by source: %w", err)
	}
	for srows.Next() {
		var src string
		var c int
		if err := srows.Scan(&src, &c); err != nil {
			srows.Close()
			return nil, fmt.Errorf("scan source: %w", err)
		}
		out.Sources[src] = c
	}
	srows.Close()

	// PublicRequest funnel.
	rrows, err := r.pool.Query(ctx, `
		SELECT status, COUNT(*)::int
		FROM public_requests
		WHERE organizer_user_id = $1
		  AND created_at >= $2 AND created_at < $3
		GROUP BY status`,
		organizerUserID, start, end,
	)
	if err != nil {
		return nil, fmt.Errorf("request status counts: %w", err)
	}
	for rrows.Next() {
		var status string
		var c int
		if err := rrows.Scan(&status, &c); err != nil {
			rrows.Close()
			return nil, fmt.Errorf("scan request status: %w", err)
		}
		out.RequestsByStatus[status] = c
		out.Requests += c
	}
	rrows.Close()

	// Responded = organizer took any action (not still pending / expired).
	out.Responded = out.RequestsByStatus["responded"] +
		out.RequestsByStatus["info_requested"] +
		out.RequestsByStatus["declined_provider"] +
		out.RequestsByStatus["accepted_by_client"] +
		out.RequestsByStatus["declined_client"] +
		out.RequestsByStatus["booked"]
	out.Converted = out.RequestsByStatus["booked"]
	if out.Requests > 0 {
		out.ResponseRate = float64(out.Responded) / float64(out.Requests)
		out.ConversionRate = float64(out.Converted) / float64(out.Requests)
	}

	return out, nil
}
