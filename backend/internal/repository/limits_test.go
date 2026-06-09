package repository

import "testing"

func TestSafeSortColumn(t *testing.T) {
	allowed := []string{"name", "created_at", "total_spent"}

	tests := []struct {
		input    string
		wantOut  string
	}{
		{"name", "name"},
		{"created_at", "created_at"},
		{"total_spent", "total_spent"},
		// Disallowed — must fall back to default, not interpolate raw input.
		{"'; DROP TABLE users; --", "name"},
		{"unknown_col", "name"},
		{"", "name"},
		{"NAME", "name"}, // case-sensitive: "NAME" != "name"
	}

	for _, tc := range tests {
		got := safeSortColumn(tc.input, allowed, "name")
		if got != tc.wantOut {
			t.Errorf("safeSortColumn(%q) = %q, want %q", tc.input, got, tc.wantOut)
		}
	}
}

func TestSafeSortOrder(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"asc", "ASC"},
		{"ASC", "ASC"},
		{"Asc", "ASC"},
		{"desc", "DESC"},
		{"DESC", "DESC"},
		{"", "DESC"},
		{"random", "DESC"},
		{"'; DROP TABLE--", "DESC"},
	}

	for _, tc := range tests {
		got := safeSortOrder(tc.input)
		if got != tc.want {
			t.Errorf("safeSortOrder(%q) = %q, want %q", tc.input, got, tc.want)
		}
	}
}

// TestInventoryAllowedSortCols verifies that disallowed columns fall back to
// the default ("ingredient_name") and allowed columns are accepted as-is.
func TestInventoryAllowedSortCols(t *testing.T) {
	allowed := inventoryAllowedSortCols
	const defaultCol = "ingredient_name"

	for _, col := range allowed {
		got := safeSortColumn(col, allowed, defaultCol)
		if got != col {
			t.Errorf("allowed col %q was rejected, got %q", col, got)
		}
	}

	got := safeSortColumn("injected_col", allowed, defaultCol)
	if got != defaultCol {
		t.Errorf("disallowed col should fall back to %q, got %q", defaultCol, got)
	}
}

// TestProductAllowedSortCols verifies that disallowed columns fall back to
// the default ("name") and allowed columns are accepted as-is.
func TestProductAllowedSortCols(t *testing.T) {
	allowed := productAllowedSortCols
	const defaultCol = "name"

	for _, col := range allowed {
		got := safeSortColumn(col, allowed, defaultCol)
		if got != col {
			t.Errorf("allowed col %q was rejected, got %q", col, got)
		}
	}

	got := safeSortColumn("'; DROP TABLE products; --", allowed, defaultCol)
	if got != defaultCol {
		t.Errorf("disallowed col should fall back to %q, got %q", defaultCol, got)
	}
}
