package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                      uuid.UUID  `json:"id"`
	Email                   string     `json:"email"`
	PasswordHash            string     `json:"-"` // Never expose in JSON
	Name                    string     `json:"name"`
	BusinessName            *string    `json:"business_name,omitempty"`
	LogoURL                 *string    `json:"logo_url,omitempty"`
	BrandColor              *string    `json:"brand_color,omitempty"`
	ShowBusinessNameInPdf   *bool      `json:"show_business_name_in_pdf,omitempty"`
	DefaultDepositPercent   *float64   `json:"default_deposit_percent,omitempty"`
	DefaultCancellationDays *float64   `json:"default_cancellation_days,omitempty"`
	DefaultRefundPercent    *float64   `json:"default_refund_percent,omitempty"`
	ContractTemplate        *string    `json:"contract_template,omitempty"`
	// Notification preferences
	EmailPaymentReceipt      *bool `json:"email_payment_receipt,omitempty"`
	EmailEventReminder       *bool `json:"email_event_reminder,omitempty"`
	EmailSubscriptionUpdates *bool `json:"email_subscription_updates,omitempty"`
	EmailWeeklySummary       *bool `json:"email_weekly_summary,omitempty"`
	EmailMarketing           *bool `json:"email_marketing,omitempty"`
	PushEnabled              *bool `json:"push_enabled,omitempty"`
	PushEventReminder        *bool `json:"push_event_reminder,omitempty"`
	PushPaymentReceived      *bool `json:"push_payment_received,omitempty"`
	Plan                    string     `json:"plan"`
	Role                    string     `json:"role"`
	StripeCustomerID        *string    `json:"stripe_customer_id,omitempty"`
	GoogleUserID            *string    `json:"google_user_id,omitempty"`
	AppleUserID             *string    `json:"apple_user_id,omitempty"`
	PlanExpiresAt           *time.Time `json:"plan_expires_at,omitempty"`
	CreatedAt               time.Time  `json:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at"`
}

type Client struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	Phone       string    `json:"phone"`
	Email       *string   `json:"email,omitempty"`
	Address     *string   `json:"address,omitempty"`
	City        *string   `json:"city,omitempty"`
	Notes       *string   `json:"notes,omitempty"`
	PhotoURL    *string   `json:"photo_url,omitempty"`
	TotalEvents int       `json:"total_events"`
	TotalSpent  float64   `json:"total_spent"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Event struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"user_id"`
	ClientID         uuid.UUID `json:"client_id"`
	EventDate        string    `json:"event_date"` // DATE as string "YYYY-MM-DD"
	StartTime        *string   `json:"start_time,omitempty"`
	EndTime          *string   `json:"end_time,omitempty"`
	ServiceType      string    `json:"service_type"`
	NumPeople        int       `json:"num_people"`
	Status           string    `json:"status"`
	Discount         float64   `json:"discount"`
	DiscountType     string    `json:"discount_type"` // 'percent' | 'fixed'
	RequiresInvoice  bool      `json:"requires_invoice"`
	TaxRate          float64   `json:"tax_rate"`
	TaxAmount        float64   `json:"tax_amount"`
	TotalAmount      float64   `json:"total_amount"`
	Location         *string   `json:"location,omitempty"`
	City             *string   `json:"city,omitempty"`
	DepositPercent   *float64  `json:"deposit_percent,omitempty"`
	CancellationDays *float64  `json:"cancellation_days,omitempty"`
	RefundPercent    *float64  `json:"refund_percent,omitempty"`
	Notes            *string   `json:"notes,omitempty"`
	Photos           *string   `json:"photos,omitempty"` // JSONB stored as string (array of URLs)
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`

	// Joined data (populated by queries with joins)
	Client *Client `json:"client,omitempty"`
}

type Product struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	Category  string    `json:"category"`
	BasePrice float64   `json:"base_price"`
	Recipe    *string   `json:"recipe,omitempty"`    // JSONB stored as string
	ImageURL  *string   `json:"image_url,omitempty"` // Product image URL
	IsActive  bool      `json:"is_active"`
	// StaffTeamID (Ola 3) optionally binds a product to a staff team. When the
	// client adds this product to an event, the UI expands the team's members
	// into event_staff rows so the organizer can sell "servicio de meseros"
	// as a line item with internal staff cost tracking. Coexists with Recipe.
	StaffTeamID *uuid.UUID `json:"staff_team_id,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type InventoryItem struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	IngredientName string    `json:"ingredient_name"`
	CurrentStock   float64   `json:"current_stock"`
	MinimumStock   float64   `json:"minimum_stock"`
	Unit           string    `json:"unit"`
	UnitCost       *float64  `json:"unit_cost,omitempty"`
	Type           string    `json:"type"`
	LastUpdated    time.Time `json:"last_updated"`
}

type EventProduct struct {
	ID         uuid.UUID `json:"id"`
	EventID    uuid.UUID `json:"event_id"`
	ProductID  uuid.UUID `json:"product_id"`
	Quantity   float64   `json:"quantity"`
	UnitPrice  float64   `json:"unit_price"`
	Discount   float64   `json:"discount"`
	TotalPrice float64   `json:"total_price"` // Generated column
	CreatedAt  time.Time `json:"created_at"`

	// Joined data
	ProductName *string `json:"product_name,omitempty"`
}

type EventExtra struct {
	ID                 uuid.UUID `json:"id"`
	EventID            uuid.UUID `json:"event_id"`
	Description        string    `json:"description"`
	Cost               float64   `json:"cost"`
	Price              float64   `json:"price"`
	ExcludeUtility     bool      `json:"exclude_utility"`
	IncludeInChecklist bool      `json:"include_in_checklist"`
	CreatedAt          time.Time `json:"created_at"`
}

type EventEquipment struct {
	ID            uuid.UUID `json:"id"`
	EventID       uuid.UUID `json:"event_id"`
	InventoryID   uuid.UUID `json:"inventory_id"`
	Quantity      int       `json:"quantity"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	EquipmentName *string   `json:"equipment_name,omitempty"`
	Unit          *string   `json:"unit,omitempty"`
	CurrentStock  *float64  `json:"current_stock,omitempty"`
}

// EquipmentSuggestion is returned by the suggestions endpoint.
// SuggestedQty is already calculated: ceil(product_qty / capacity) if capacity is set,
// or quantity_required otherwise, summed across all products in the event.
type EquipmentSuggestion struct {
	ID             uuid.UUID `json:"id"`
	IngredientName string    `json:"ingredient_name"`
	CurrentStock   float64   `json:"current_stock"`
	Unit           string    `json:"unit"`
	Type           string    `json:"type"`
	SuggestedQty   int       `json:"suggested_quantity"`
}

type EquipmentConflict struct {
	InventoryID   uuid.UUID `json:"inventory_id"`
	EquipmentName string    `json:"equipment_name"`
	EventID       uuid.UUID `json:"conflicting_event_id"`
	EventDate     string    `json:"event_date"`
	StartTime     *string   `json:"start_time,omitempty"`
	EndTime       *string   `json:"end_time,omitempty"`
	ServiceType   string    `json:"service_type"`
	ClientName    *string   `json:"client_name,omitempty"`
	ConflictType  string    `json:"conflict_type"`
}

type ProductIngredient struct {
	ID               uuid.UUID `json:"id"`
	ProductID        uuid.UUID `json:"product_id"`
	InventoryID      uuid.UUID `json:"inventory_id"`
	QuantityRequired float64   `json:"quantity_required"`
	// Capacity applies only to equipment: how many product units one piece handles.
	// nil = fixed quantity (use quantity_required as-is); non-nil = ceil(event_qty / capacity).
	Capacity *float64 `json:"capacity,omitempty"`
	// BringToEvent indicates this ingredient should be transported to the event venue.
	// Equipment items always travel regardless of this flag.
	BringToEvent bool      `json:"bring_to_event"`
	CreatedAt    time.Time `json:"created_at"`

	// Joined data from inventory
	IngredientName *string  `json:"ingredient_name,omitempty"`
	Unit           *string  `json:"unit,omitempty"`
	UnitCost       *float64 `json:"unit_cost,omitempty"`
	Type           *string  `json:"type,omitempty"`
}

type Payment struct {
	ID            uuid.UUID `json:"id"`
	EventID       uuid.UUID `json:"event_id"`
	UserID        uuid.UUID `json:"user_id"`
	Amount        float64   `json:"amount"`
	PaymentDate   string    `json:"payment_date"` // DATE as string
	PaymentMethod string    `json:"payment_method"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

// Subscription represents a SaaS subscription from any provider (Stripe/Apple/Google).
type Subscription struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              uuid.UUID  `json:"user_id"`
	Provider            string     `json:"provider"` // 'stripe' | 'apple' | 'google'
	ProviderSubID       *string    `json:"provider_subscription_id,omitempty"`
	RevenueCatAppUserID *string    `json:"revenuecat_app_user_id,omitempty"`
	Plan                string     `json:"plan"`   // 'basic' | 'pro'
	Status              string     `json:"status"` // 'active' | 'past_due' | 'canceled' | 'trialing'
	CurrentPeriodStart  *time.Time `json:"current_period_start,omitempty"`
	CurrentPeriodEnd    *time.Time `json:"current_period_end,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type EventSupply struct {
	ID          uuid.UUID `json:"id"`
	EventID     uuid.UUID `json:"event_id"`
	InventoryID uuid.UUID `json:"inventory_id"`
	Quantity    float64   `json:"quantity"`
	UnitCost    float64   `json:"unit_cost"`
	Source      string    `json:"source"`       // 'stock' | 'purchase'
	ExcludeCost bool      `json:"exclude_cost"` // true = don't count in event total
	CreatedAt   time.Time `json:"created_at"`

	// Joined data from inventory
	SupplyName   *string  `json:"supply_name,omitempty"`
	Unit         *string  `json:"unit,omitempty"`
	CurrentStock *float64 `json:"current_stock,omitempty"`
}

// SupplySuggestion is returned by the supply suggestions endpoint.
// SuggestedQty is the sum of quantity_required across all products that use this supply.
// Unlike ingredients, supply quantities are fixed per event (not scaled by product quantity).
type SupplySuggestion struct {
	ID             uuid.UUID `json:"id"`
	IngredientName string    `json:"ingredient_name"`
	CurrentStock   float64   `json:"current_stock"`
	Unit           string    `json:"unit"`
	UnitCost       float64   `json:"unit_cost"`
	SuggestedQty   float64   `json:"suggested_quantity"`
}

type UnavailableDate struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	StartDate string    `json:"start_date"` // DATE as string
	EndDate   string    `json:"end_date"`   // DATE as string
	Reason    *string   `json:"reason,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EventPhoto represents a photo attached to an event
type EventPhoto struct {
	ID           uuid.UUID `json:"id"`
	URL          string    `json:"url"`
	ThumbnailURL *string   `json:"thumbnail_url,omitempty"`
	Caption      *string   `json:"caption,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// AuditLog represents an entry in the audit trail.
type AuditLog struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"user_id"`
	Action       string     `json:"action"`
	ResourceType string     `json:"resource_type"`
	ResourceID   *uuid.UUID `json:"resource_id,omitempty"`
	Details      *string    `json:"details,omitempty"`
	IPAddress    *string    `json:"ip_address,omitempty"`
	UserAgent    *string    `json:"user_agent,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// DeviceToken represents a device registered for push notifications
type DeviceToken struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Token     string    `json:"token"`
	Platform  string    `json:"platform"` // 'ios' | 'android' | 'web'
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// LiveActivityToken represents an iOS Live Activity push token bound to an event.
// Used to send remote updates to a running Activity (Dynamic Island / lock screen)
// without requiring the app to be in the foreground.
type LiveActivityToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	EventID   uuid.UUID  `json:"event_id"`
	PushToken string     `json:"push_token"`
	CreatedAt time.Time  `json:"created_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// EventFormLink represents a shareable, single-use link that a prospective client
// opens in a browser to fill out event details and select products (without prices).
// On submission it creates a draft Event + Client for the organizer.
type EventFormLink struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"user_id"`
	Token             string     `json:"token"`
	Label             *string    `json:"label,omitempty"`
	Status            string     `json:"status"` // "active" | "used" | "expired"
	SubmittedEventID  *uuid.UUID `json:"submitted_event_id,omitempty"`
	SubmittedClientID *uuid.UUID `json:"submitted_client_id,omitempty"`
	ExpiresAt         time.Time  `json:"expires_at"`
	UsedAt            *time.Time `json:"used_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	URL               string     `json:"url,omitempty"` // Computed, not stored
}

// Staff represents a collaborator (photographer, DJ, waiter, coordinator, etc.)
// that the organizer keeps in their contact list and assigns to events.
// Ownership is per user (multi-tenant). Phase 1 is pure CRM; Phase 2 adds
// email notifications on assignment; Phase 3 (Business tier) lets the
// collaborator log in via invited_user_id and see their assigned events.
type Staff struct {
	ID                     uuid.UUID  `json:"id"`
	UserID                 uuid.UUID  `json:"user_id"`
	Name                   string     `json:"name"`
	RoleLabel              *string    `json:"role_label,omitempty"`
	Phone                  *string    `json:"phone,omitempty"`
	Email                  *string    `json:"email,omitempty"`
	Notes                  *string    `json:"notes,omitempty"`
	NotificationEmailOptIn bool       `json:"notification_email_opt_in"`
	InvitedUserID          *uuid.UUID `json:"invited_user_id,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// AssignmentStatus values for EventStaff.Status.
const (
	AssignmentStatusPending   = "pending"
	AssignmentStatusConfirmed = "confirmed"
	AssignmentStatusDeclined  = "declined"
	AssignmentStatusCancelled = "cancelled"
)

// EventStaff is the assignment of a Staff row to an Event. Fee is per-assignment
// because the same person may charge differently per event. NotificationSentAt
// and NotificationLastResult are Phase 2 tracking columns (dedup + outcome).
// ShiftStart/End and Status are Ola 1 operational fields (shift window + RSVP).
type EventStaff struct {
	ID                     uuid.UUID  `json:"id"`
	EventID                uuid.UUID  `json:"event_id"`
	StaffID                uuid.UUID  `json:"staff_id"`
	FeeAmount              *float64   `json:"fee_amount,omitempty"`
	RoleOverride           *string    `json:"role_override,omitempty"`
	Notes                  *string    `json:"notes,omitempty"`
	ShiftStart             *time.Time `json:"shift_start,omitempty"`
	ShiftEnd               *time.Time `json:"shift_end,omitempty"`
	// Status is a pointer so an omitted field in the payload is distinguishable
	// from an empty string. UPSERT uses COALESCE to preserve the stored status
	// when clients (e.g. older app versions) don't send the field at all.
	Status *string `json:"status,omitempty"`
	NotificationSentAt     *time.Time `json:"notification_sent_at,omitempty"`
	NotificationLastResult *string    `json:"notification_last_result,omitempty"`
	CreatedAt              time.Time  `json:"created_at"`

	// Joined from staff
	StaffName      *string `json:"staff_name,omitempty"`
	StaffRoleLabel *string `json:"staff_role_label,omitempty"`
	StaffPhone     *string `json:"staff_phone,omitempty"`
	StaffEmail     *string `json:"staff_email,omitempty"`
}

// StaffTeam is a named group of staff (e.g. "Meseros Plata", "Cuadrilla de
// montaje") so the organizer can assign the whole crew to an event in one
// click. Members are populated by GetByID; MemberCount by list queries for
// cheap display. RoleLabel is the default role applied to each expanded
// assignment when role_override is blank.
type StaffTeam struct {
	ID          uuid.UUID         `json:"id"`
	UserID      uuid.UUID         `json:"user_id"`
	Name        string            `json:"name"`
	RoleLabel   *string           `json:"role_label,omitempty"`
	Notes       *string           `json:"notes,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	Members     []StaffTeamMember `json:"members,omitempty"`
	MemberCount *int              `json:"member_count,omitempty"`
}

// StaffTeamMember is the junction between a team and a staff row. Carries no
// fee/status — those belong on event_staff per assignment so the same team can
// be assigned to multiple events with different costs/RSVPs.
type StaffTeamMember struct {
	TeamID    uuid.UUID `json:"team_id"`
	StaffID   uuid.UUID `json:"staff_id"`
	IsLead    bool      `json:"is_lead"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`

	// Joined from staff for display convenience
	StaffName      *string `json:"staff_name,omitempty"`
	StaffRoleLabel *string `json:"staff_role_label,omitempty"`
	StaffPhone     *string `json:"staff_phone,omitempty"`
	StaffEmail     *string `json:"staff_email,omitempty"`
}

// EventPublicLink is a shareable, revocable token that opens a read-only
// portal (PRD/12 feature A) for the end client of an event — the person who
// hired the organizer. Unlike EventFormLink (which captures a lead), this
// link is generated AFTER the event exists so the client can watch timeline,
// payment status, etc.
//
// One event may have many rows here (history of rotated tokens). Only one
// row with status='active' exists at a time — enforced by a partial unique
// index in migration 041 plus application-layer revoke-before-insert logic.
type EventPublicLink struct {
	ID        uuid.UUID  `json:"id"`
	EventID   uuid.UUID  `json:"event_id"`
	UserID    uuid.UUID  `json:"user_id"`
	Token     string     `json:"token"`
	Status    string     `json:"status"` // "active" | "revoked" | "expired"
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	URL       string     `json:"url,omitempty"` // Computed, not stored
}
