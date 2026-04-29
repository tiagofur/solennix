package handlers

import (
	"net/http"
	"time"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// PlanError represents an error when accessing a feature that requires a paid plan.
type PlanError struct {
	Message string `json:"message"`
	Code    string `json:"error"`
	Plan    string `json:"required_plan"`
}

// IsPlanActive checks if the organizer's subscription plan is currently active.
// Gratis plans are always active; paid plans check expiry date.
func IsPlanActive(user *models.User) bool {
	if user == nil {
		return false
	}
	if user.Plan == "gratis" {
		return true
	}
	if user.PlanExpiresAt == nil {
		return true // No expiry set, plan is active
	}
	return time.Now().Before(*user.PlanExpiresAt)
}

// RequiresPaidPlan checks if the organizer has an active paid plan.
// Returns true if the plan is Pro or Business and not expired.
// Writes appropriate error responses to w if plan requirements are not met.
func RequiresPaidPlan(w http.ResponseWriter, user *models.User) bool {
	if user == nil {
		writeError(w, http.StatusForbidden, "This feature requires a paid plan. Please upgrade to access it.")
		return false
	}

	// Gratis always requires upgrade
	if user.Plan == "gratis" {
		writeError(w, http.StatusForbidden, "This feature requires a paid plan. Please upgrade to access it.")
		return false
	}

	// Paid plan must not be expired
	if !IsPlanActive(user) {
		writeError(w, http.StatusForbidden, "Your plan has expired. Please renew your subscription to continue.")
		return false
	}

	return true
}

// PlanTiers defines the features available at each tier.
// This is documentation + reference for what needs to be enforced.
var PlanTiers = map[string]map[string]bool{
	"gratis": {
		// Client portal: limited shape (no detailed event info)
		"public_event_portal":    true,
		"public_event_form":      true,
		"basic_event_management": true,
		"basic_client_list":      true,
		"payment_tracking":       true, // Totals only, no individual submissions
		"staff_availability":     true,
		"event_templates":        true,

		// Premium features — gated
		"payment_submissions":       false,
		"advanced_payment_tracking": false,
		"milestones":                false,
		"chat":                      false,
		"decisions":                 false,
		"contracts":                 false,
		"rsvp":                      false,
		"reviews":                   false,
		"unlimited_staff_seats":     false,
		"custom_branding":           false,
		"api_access":                false,
	},
	"pro": {
		"public_event_portal":       true,
		"public_event_form":         true,
		"basic_event_management":    true,
		"basic_client_list":         true,
		"payment_tracking":          true,
		"payment_submissions":       true,
		"advanced_payment_tracking": true,
		"staff_availability":        true,
		"event_templates":           true,
		"milestones":                true,
		"chat":                      true,
		"decisions":                 true,
		"contracts":                 true,
		"rsvp":                      true,
		"reviews":                   true,
		"unlimited_staff_seats":     true,
		"custom_branding":           true,
		"api_access":                true,
	},
	"business": {
		// All Pro features + enterprise features (defined separately if needed)
		"public_event_portal":       true,
		"public_event_form":         true,
		"basic_event_management":    true,
		"basic_client_list":         true,
		"payment_tracking":          true,
		"payment_submissions":       true,
		"advanced_payment_tracking": true,
		"staff_availability":        true,
		"event_templates":           true,
		"milestones":                true,
		"chat":                      true,
		"decisions":                 true,
		"contracts":                 true,
		"rsvp":                      true,
		"reviews":                   true,
		"unlimited_staff_seats":     true,
		"custom_branding":           true,
		"api_access":                true,
	},
}

// FeatureAvailable checks if a feature is available for the given plan.
// Returns true if the feature is available, false otherwise.
func FeatureAvailable(plan string, feature string) bool {
	tierFeatures, ok := PlanTiers[plan]
	if !ok {
		return false // Unknown plan defaults to deny
	}
	available, ok := tierFeatures[feature]
	return ok && available
}
