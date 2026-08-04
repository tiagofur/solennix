package services

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestIsRequestLinkUsable(t *testing.T) {
	now := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	max1 := 1
	max3 := 3
	future := now.Add(24 * time.Hour)
	past := now.Add(-time.Hour)

	tests := []struct {
		name string
		link *models.PublicRequestLink
		want bool
	}{
		{
			name: "active unlimited no expiry",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkActive},
			want: true,
		},
		{
			name: "active future expiry",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkActive, ExpiresAt: &future},
			want: true,
		},
		{
			name: "expired by time",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkActive, ExpiresAt: &past},
			want: false,
		},
		{
			name: "revoked",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkRevoked},
			want: false,
		},
		{
			name: "used status",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkUsed},
			want: false,
		},
		{
			name: "max uses reached",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkActive, MaxUses: &max1, UseCount: 1},
			want: false,
		},
		{
			name: "max uses remaining",
			link: &models.PublicRequestLink{Status: models.PublicRequestLinkActive, MaxUses: &max3, UseCount: 2},
			want: true,
		},
		{
			name: "nil link",
			link: nil,
			want: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, IsRequestLinkUsable(tt.link, now))
		})
	}
}

func TestBuildServicesSnapshotFromCatalog(t *testing.T) {
	pid := uuid.New()
	other := uuid.New()
	catalog := []models.Product{
		{ID: pid, Name: "Banquete", BasePrice: 1000, IsFeatured: true},
	}

	t.Run("empty selections ok", func(t *testing.T) {
		snap, err := BuildServicesSnapshotFromCatalog(catalog, nil)
		require.NoError(t, err)
		assert.Empty(t, snap)
	})

	t.Run("valid with qty", func(t *testing.T) {
		snap, err := BuildServicesSnapshotFromCatalog(catalog, []ServiceSelection{{ProductID: pid, Qty: 2}})
		require.NoError(t, err)
		require.Len(t, snap, 1)
		assert.Equal(t, 2, snap[0].Qty)
		assert.Equal(t, "Banquete", snap[0].Name)
		require.NotNil(t, snap[0].Price)
		assert.Equal(t, 1000.0, *snap[0].Price)
		assert.True(t, snap[0].IsFeatured)
	})

	t.Run("invalid product", func(t *testing.T) {
		_, err := BuildServicesSnapshotFromCatalog(catalog, []ServiceSelection{{ProductID: other, Qty: 1}})
		assert.ErrorIs(t, err, ErrInvalidServices)
	})

	t.Run("qty defaults to 1 when zero", func(t *testing.T) {
		snap, err := BuildServicesSnapshotFromCatalog(catalog, []ServiceSelection{{ProductID: pid, Qty: 0}})
		require.NoError(t, err)
		assert.Equal(t, 1, snap[0].Qty)
	})
}

func TestSumSnapshotQuote(t *testing.T) {
	p1, p2 := 100.0, 50.0
	services := []models.PublicRequestServiceSnapshot{
		{Name: "A", Price: &p1, Qty: 2},
		{Name: "B", Price: &p2, Qty: 3},
	}
	assert.Equal(t, 350.0, SumSnapshotQuote(services))
	assert.Equal(t, 0.0, SumSnapshotQuote(nil))
}

func TestSnapshotInclusionNames(t *testing.T) {
	names := SnapshotInclusionNames([]models.PublicRequestServiceSnapshot{
		{Name: "DJ"}, {Name: "Banquete"}, {Name: ""},
	})
	assert.Equal(t, []string{"DJ", "Banquete"}, names)
	assert.Empty(t, SnapshotInclusionNames(nil))
}

func TestValidateAutoEventFields(t *testing.T) {
	name, phone := "Ana", "+52"
	date, etype := "2026-11-20", "Boda"
	guests := 80
	assert.Empty(t, ValidateAutoEventFields(&name, &phone, &date, &etype, &guests))

	assert.Contains(t, ValidateAutoEventFields(nil, &phone, &date, &etype, &guests), "contact_name")
	assert.Contains(t, ValidateAutoEventFields(&name, nil, &date, &etype, &guests), "contact_phone")
	assert.Contains(t, ValidateAutoEventFields(&name, &phone, nil, &etype, &guests), "event_date")
	assert.Contains(t, ValidateAutoEventFields(&name, &phone, &date, nil, &guests), "event_type")
	zero := 0
	assert.Contains(t, ValidateAutoEventFields(&name, &phone, &date, &etype, &zero), "guest_count")
}

func TestValidateContactRule(t *testing.T) {
	phone := "555"
	assert.Empty(t, ValidateContactRule("a@b.com", nil))
	assert.Empty(t, ValidateContactRule("", &phone))
	assert.NotEmpty(t, ValidateContactRule("", nil))
	assert.NotEmpty(t, ValidateContactRule("  ", nil))
}

func TestConvertNotes(t *testing.T) {
	msg := "Hola"
	assert.Contains(t, ConvertNotes(models.RequestSourceSharedLink, nil), "link")
	assert.Contains(t, ConvertNotes(models.RequestSourcePublicProfile, &msg), "Hola")
	assert.Contains(t, ConvertNotes(models.RequestSourcePublicProfile, &msg), "perfil")
}

func TestSnapshotQtyDefault(t *testing.T) {
	s := models.PublicRequestServiceSnapshot{Qty: 0}
	assert.Equal(t, 1, s.SnapshotQty())
	s.Qty = 4
	assert.Equal(t, 4, s.SnapshotQty())
}
