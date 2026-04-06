package middleware

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
)

// PlanResolver provides the subscription plan for a user.
type PlanResolver interface {
	GetPlan(ctx context.Context, userID uuid.UUID) string
}

// UserGetter is the minimal interface needed to resolve a user's plan.
type UserGetter interface {
	GetPlanByID(ctx context.Context, id uuid.UUID) (string, error)
}

// CachedPlanResolver caches user plans to avoid hitting the DB on every request.
type CachedPlanResolver struct {
	getter UserGetter
	cache  sync.Map // uuid.UUID → *cachedPlan
	ttl    time.Duration
}

type cachedPlan struct {
	plan      string
	expiresAt time.Time
}

// NewCachedPlanResolver creates a PlanResolver that caches plans for the given TTL.
func NewCachedPlanResolver(getter UserGetter, ttl time.Duration) *CachedPlanResolver {
	return &CachedPlanResolver{getter: getter, ttl: ttl}
}

// GetPlan returns the subscription plan for the given user, using a cache to reduce DB hits.
func (r *CachedPlanResolver) GetPlan(ctx context.Context, userID uuid.UUID) string {
	if cached, ok := r.cache.Load(userID); ok {
		cp := cached.(*cachedPlan)
		if time.Now().Before(cp.expiresAt) {
			return cp.plan
		}
	}

	plan, err := r.getter.GetPlanByID(ctx, userID)
	if err != nil {
		slog.Warn("Failed to resolve user plan for rate limiting", "user_id", userID, "error", err)
		return "basic" // default to most restrictive
	}

	r.cache.Store(userID, &cachedPlan{plan: plan, expiresAt: time.Now().Add(r.ttl)})
	return plan
}
