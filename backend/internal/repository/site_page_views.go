package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SitePageView is a privacy-safe marketing/public page view (analytics slice 2).
type SitePageView struct {
	PageKey     string
	VisitorHash string
	DeviceClass string
	CountryCode *string
	Referrer    *string
	Source      string
	ViewedAt    time.Time
}

// SitePageViewRepo records platform marketing page views.
type SitePageViewRepo struct {
	pool *pgxpool.Pool
}

func NewSitePageViewRepo(pool *pgxpool.Pool) *SitePageViewRepo {
	return &SitePageViewRepo{pool: pool}
}

// Record inserts one page view.
func (r *SitePageViewRepo) Record(ctx context.Context, v SitePageView) error {
	if v.PageKey == "" || v.VisitorHash == "" {
		return fmt.Errorf("site page view: missing page_key or visitor_hash")
	}
	device := v.DeviceClass
	if device == "" {
		device = "unknown"
	}
	source := v.Source
	if source == "" {
		source = "direct"
	}
	_, err := r.pool.Exec(ctx, `
		INSERT INTO site_page_views (page_key, visitor_hash, device_class, country_code, referrer, source, viewed_at)
		VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))`,
		v.PageKey, v.VisitorHash, device, v.CountryCode, v.Referrer, source, nullTime(v.ViewedAt),
	)
	if err != nil {
		return fmt.Errorf("record site page view: %w", err)
	}
	return nil
}
