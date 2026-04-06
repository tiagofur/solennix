package handlers

import (
	"math"
	"net/http"
	"strconv"
)

// PaginationParams holds parsed pagination query parameters.
type PaginationParams struct {
	Page  int
	Limit int
	Sort  string
	Order string
}

// PaginatedResponse is the envelope returned when pagination is requested.
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int         `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

// parsePaginationParams extracts pagination from query params.
// Returns nil if no "page" param is present (backward-compatible: return flat array).
// allowedSorts maps allowed sort param values to actual SQL column names.
func parsePaginationParams(r *http.Request, allowedSorts map[string]string, defaultSort string) *PaginationParams {
	pageStr := r.URL.Query().Get("page")
	if pageStr == "" {
		return nil // No pagination requested
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if limit > 100 {
		limit = 100
	}

	sort := defaultSort
	if s := r.URL.Query().Get("sort"); s != "" {
		if col, ok := allowedSorts[s]; ok {
			sort = col
		}
	}

	order := "DESC"
	if o := r.URL.Query().Get("order"); o == "asc" {
		order = "ASC"
	}

	return &PaginationParams{
		Page:  page,
		Limit: limit,
		Sort:  sort,
		Order: order,
	}
}

// writePaginatedJSON writes a paginated JSON envelope response.
func writePaginatedJSON(w http.ResponseWriter, status int, data interface{}, total int, params *PaginationParams) {
	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))
	writeJSON(w, status, PaginatedResponse{
		Data:       data,
		Total:      total,
		Page:       params.Page,
		Limit:      params.Limit,
		TotalPages: totalPages,
	})
}
