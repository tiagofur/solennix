package repository

import "strings"

// GetAllSafetyLimit caps every unpaginated GetAll query at this many rows.
// Callers that need more must use GetAllPaginated. Without this cap, a user
// with tens of thousands of rows could exhaust memory or timeout the request
// when the handler falls back to GetAll because the `page` query param is
// missing. 1000 is generous for realistic Solennix workloads while still
// being a meaningful ceiling.
const GetAllSafetyLimit = 1000

// safeSortColumn returns sortCol if it is in the allowed set, otherwise it
// returns fallback. This is a defense-in-depth guard against SQL injection
// in GetAllPaginated queries where the column name is interpolated via
// fmt.Sprintf (positional parameters do not cover identifiers). The handler
// layer already filters user input via parsePaginationParams, but a direct
// caller (tests, future handlers, internal tooling) could bypass that —
// repo-level validation makes the repository itself safe.
func safeSortColumn(sortCol string, allowed []string, fallback string) string {
	for _, a := range allowed {
		if a == sortCol {
			return sortCol
		}
	}
	return fallback
}

// safeSortOrder returns "ASC" or "DESC", defaulting to "DESC" for any input
// other than an exact case-insensitive match to "asc".
func safeSortOrder(order string) string {
	if strings.EqualFold(order, "asc") {
		return "ASC"
	}
	return "DESC"
}
