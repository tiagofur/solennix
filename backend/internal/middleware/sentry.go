package middleware

import (
	"net/http"
	"time"

	sentryhttp "github.com/getsentry/sentry-go/http"
)

// Sentry returns a chi-compatible middleware that creates a per-request Sentry
// hub, captures panics, and re-panics so Recovery can still return the 500.
//
// Must be registered AFTER Recovery (Recovery outermost → Sentry inner) so that
// on panic: Sentry captures first, repanics, Recovery catches and responds.
var Sentry = sentryhttp.New(sentryhttp.Options{
	Repanic:         true,
	WaitForDelivery: false,
	Timeout:         5 * time.Second,
}).Handle

var _ func(http.Handler) http.Handler = Sentry
