package models

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestUser_PublicSlugJSON(t *testing.T) {
	slug := "alice-events"
	u := &User{
		ID:         uuid.New(),
		Email:      "alice@example.com",
		Name:       "Alice",
		Plan:       "basic",
		Role:       "user",
		PublicSlug: &slug,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	b, err := json.Marshal(u)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(b)

	if !strings.Contains(s, `"public_slug":"alice-events"`) {
		t.Fatalf("expected public_slug in JSON, got: %s", s)
	}
}

func TestUser_PublicSlugOmittedWhenNil(t *testing.T) {
	u := &User{
		ID:    uuid.New(),
		Email: "bob@example.com",
		Name:  "Bob",
		Plan:  "basic",
		Role:  "user",
	}

	b, err := json.Marshal(u)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	if strings.Contains(string(b), "public_slug") {
		t.Fatalf("nil public_slug must be omitted, got: %s", b)
	}
}

func TestProduct_ShowOnPublicProfileJSON(t *testing.T) {
	p := &Product{
		ID:                  uuid.New(),
		UserID:              uuid.New(),
		Name:                "Catering",
		Category:            "food",
		BasePrice:           100,
		IsActive:            true,
		ShowOnPublicProfile: true,
		CreatedAt:           time.Now().UTC(),
		UpdatedAt:           time.Now().UTC(),
	}

	b, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	if !strings.Contains(string(b), `"show_on_public_profile":true`) {
		t.Fatalf("expected show_on_public_profile true, got: %s", b)
	}
}

func TestProduct_ShowOnPublicProfileDefaultFalse(t *testing.T) {
	p := &Product{
		ID:        uuid.New(),
		UserID:    uuid.New(),
		Name:      "Hidden",
		Category:  "food",
		BasePrice: 50,
		IsActive:  true,
	}

	b, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	if !strings.Contains(string(b), `"show_on_public_profile":false`) {
		t.Fatalf("default show_on_public_profile must serialize as false, got: %s", b)
	}
}

func TestPublicReview_OmitsPrivateFields(t *testing.T) {
	comment := "Great service"
	response := "Thanks!"
	label := "Wedding"
	r := PublicReview{
		Rating:            5,
		Comment:           &comment,
		SubmittedAt:       time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC),
		OrganizerResponse: &response,
		DisplayName:       "A.",
		EventLabel:        &label,
	}

	b, err := json.Marshal(r)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(b)

	for _, banned := range []string{"client_id", "event_id", "user_id", "client_name", "email"} {
		if strings.Contains(s, banned) {
			t.Errorf("PublicReview must not include %q, got: %s", banned, s)
		}
	}
	if !strings.Contains(s, `"display_name":"A."`) {
		t.Errorf("expected display_name, got: %s", s)
	}
	if !strings.Contains(s, `"rating":5`) {
		t.Errorf("expected rating, got: %s", s)
	}
}

func TestOrganizerPublicProfile_Defaults(t *testing.T) {
	profile := OrganizerPublicProfile{
		UserID:        uuid.New(),
		IsEnabled:     false,
		ShowPrices:    false,
		ShowServices:  true,
		ShowReviews:   true,
		ShowPortfolio: true,
		ShowContact:   true,
		Socials:       map[string]string{},
	}

	b, err := json.Marshal(profile)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(b)

	if !strings.Contains(s, `"is_enabled":false`) {
		t.Errorf("is_enabled default false missing: %s", s)
	}
	if !strings.Contains(s, `"show_prices":false`) {
		t.Errorf("show_prices default false missing: %s", s)
	}
}

func TestPublicOrganizerProfile_JSONShape(t *testing.T) {
	city := "CDMX"
	region := "CDMX"
	country := "MX"
	headline := "Bodas y eventos"
	dto := PublicOrganizerProfile{
		Slug:         "alice-events",
		BusinessName: "Alice Events",
		Headline:     &headline,
		Location: &PublicLocation{
			City:    &city,
			Region:  &region,
			Country: &country,
		},
		Services: []PublicProfileService{
			{ID: uuid.New(), Name: "Catering", Category: "food"},
		},
	}

	b, err := json.Marshal(dto)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(b)

	if !strings.Contains(s, `"slug":"alice-events"`) {
		t.Errorf("slug missing: %s", s)
	}
	if strings.Contains(s, "user_id") || strings.Contains(s, "email") || strings.Contains(s, "password") {
		t.Errorf("public DTO must not leak private fields: %s", s)
	}
	// Free projection omits reviews/portfolio/socials when nil with omitempty
	if strings.Contains(s, "reviews") || strings.Contains(s, "portfolio") || strings.Contains(s, "socials") {
		t.Errorf("nil optional sections must be omitted: %s", s)
	}
}

func TestPublicPortfolioItem_JSONShape(t *testing.T) {
	item := PublicPortfolioItem{
		ID:        uuid.New(),
		Title:     "Boda en jardín",
		PhotoURL:  "https://cdn.example.com/photo.jpg",
		SortOrder: 0,
	}

	b, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(b)
	if strings.Contains(s, "user_id") || strings.Contains(s, "event_id") {
		t.Errorf("public portfolio item must not include user_id/event_id: %s", s)
	}
	if !strings.Contains(s, `"title":"Boda en jardín"`) {
		t.Errorf("title missing: %s", s)
	}
}
