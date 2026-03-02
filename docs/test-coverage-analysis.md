# Test Coverage Analysis — EventosApp

**Date:** 2026-03-02
**Scope:** Full codebase (web frontend + backend API)

---

## Executive Summary

EventosApp has **solid test foundations** with 51 web test files and 21 backend test files. All services, hooks, and utilities have corresponding tests, and coverage thresholds are strict (95% lines/functions/statements, 90% branches). However, analysis reveals that most tests focus on **happy paths** — error handling, accessibility, and end-to-end journeys are significantly under-tested.

---

## Current Coverage Inventory

### Web Frontend — File Coverage

| Category            | Files | With Tests | Coverage | Status    |
|---------------------|-------|------------|----------|-----------|
| Services            | 7     | 7          | 100%     | Complete  |
| Hooks               | 4     | 4          | 100%     | Complete  |
| Utilities (lib/)    | 5     | 5          | 100%     | Complete  |
| Components          | 12    | 11         | 92%      | Good      |
| Pages & Contexts    | 25    | 24         | 96%      | Excellent |
| E2E Tests           | 5     | —          | —        | Exists    |
| Integration Tests   | 1     | —          | —        | Exists    |

**Missing test files:**
- `pages/Events/EventPaymentSuccess.tsx` — Stripe payment success page
- `pages/Products/ProductDetails.tsx` — Product detail view
- `pages/Inventory/InventoryDetails.tsx` — Inventory detail view
- `components/Logo.tsx` — Branding component (low priority)

### Backend API — File Coverage

| Category      | Files | With Tests | Coverage | Status    |
|---------------|-------|------------|----------|-----------|
| Middleware    | 6     | 6          | 100%     | Complete  |
| Repositories  | 6     | 6          | 100%     | Complete  |
| Services      | 2     | 2          | 100%     | Complete  |
| Config & DB   | 3     | 3          | 100%     | Complete  |
| Handlers      | 9     | 7          | 78%      | Fair      |
| Router        | 1     | 1          | 100%     | Complete  |

**Missing test files:**
- `handlers/search_handler.go` — No unit tests
- `handlers/upload_handler.go` — No unit tests
- `handlers/event_payment_handler.go` — Integration tests only, no unit tests

---

## Quality Assessment by Category

### 1. Service Tests — **SHALLOW**

Services tests verify that the correct HTTP method and URL are called, but lack:

- **Error response handling** — No tests for 400, 403, 500, or network failures
- **Timeout/retry behavior** — No tests for transient failures
- **Input validation** — No tests for malformed or missing parameters
- **Concurrent request handling** — No race condition tests

**Example of what's missing:**
```typescript
// Tested: happy path
it('fetches clients', async () => { /* verifies api.get called */ });

// Not tested: error paths
it('throws on 500 server error', async () => { /* ... */ });
it('handles network timeout', async () => { /* ... */ });
it('rejects invalid client data', async () => { /* ... */ });
```

### 2. Page Tests — **MODERATE**

Page tests cover form rendering, validation messages, submission, and loading states. Gaps:

- **Keyboard navigation** — No tests for Tab order, Enter to submit, Escape to cancel
- **Focus management** — After validation errors, is focus moved to the first error field?
- **Double-submit prevention** — No tests for rapid duplicate submissions
- **Back navigation** — No tests for form state preservation when navigating away and back
- **Mobile viewport** — No responsive layout tests

### 3. Hook Tests — **MODERATE**

Hook tests verify state initialization, mutations, persistence, and edge cases. Gaps:

- **Cleanup on unmount** — Event listeners and subscriptions aren't verified to be removed
- **Re-render stability** — No tests for infinite loop scenarios
- **Memory leak detection** — Long-running hooks not checked for leaks

### 4. Utility Tests — **SHALLOW**

Basic logic and null handling are tested, but:

- **Financial precision** — `finance.ts` doesn't test currency rounding to 2 decimals (critical for a financial app)
- **Large number handling** — No overflow or boundary tests
- **`api.ts` edge cases** — No tests for CORS errors, abort signals, malformed JSON responses
- **`utils.ts`** — Only 3 tests for the `cn()` utility

### 5. Component Tests — **MODERATE**

Conditional rendering and basic interactions are well-tested. Gaps:

- **Focus trap** — Mobile sidebar doesn't test focus containment
- **Screen reader announcements** — ARIA live regions not tested
- **Escape key** — Not tested as a close mechanism for modals/sidebar

### 6. MSW Mock Handlers — **SHALLOW**

Mocks only cover success responses and a single 404 case:

- **No 400 (validation error) responses** — Can't test form error display
- **No 403 (forbidden) responses** — Can't test permission-denied flows
- **No 500 (server error) responses** — Can't test error recovery UI
- **No latency simulation** — Can't test loading states accurately
- **No pagination or filtering** — Mock data is returned as-is regardless of query params
- **POST endpoints accept any body** — No schema validation in mocks

### 7. E2E Tests — **SHALLOW**

Five test files exist (login, events, payments, PDF, upgrade), but:

- **No complete lifecycle journey** — No test follows client → event → products → payment → PDF
- **No error recovery flows** — No test verifies behavior after a failed request
- **No cross-browser coverage** — Chromium only (no Safari/Firefox)
- **Heavy use of `test.skip()`** — Many tests guarded by backend availability checks
- **No data cleanup** — Tests create data without cleanup, risking state pollution
- **No performance assertions** — No page load time or interaction latency benchmarks

---

## Prioritized Improvement Proposals

### Tier 1: Critical (High impact, catches real bugs)

| # | Area | Description | Effort |
|---|------|-------------|--------|
| 1 | **MSW error handlers** | Add 400/422/500 responses to mock handlers so component tests can verify error UI | Small |
| 2 | **Service error handling** | Add tests for API failure scenarios (4xx, 5xx, timeout, network error) in all 7 services | Medium |
| 3 | **Financial precision** | Add currency rounding tests to `finance.ts` — this is a financial app, precision bugs are critical | Small |
| 4 | **Missing page tests** | Add tests for `ProductDetails.tsx`, `InventoryDetails.tsx`, `EventPaymentSuccess.tsx` | Medium |
| 5 | **Backend search & upload handlers** | Add unit tests for `search_handler.go` and `upload_handler.go` | Medium |

### Tier 2: Important (Improves reliability)

| # | Area | Description | Effort |
|---|------|-------------|--------|
| 6 | **Accessibility (a11y)** | Add keyboard navigation and focus management tests to forms and modals | Medium |
| 7 | **Complete E2E journey** | Write one full lifecycle test: login → create client → create event → add products → payment → PDF | Large |
| 8 | **Double-submit prevention** | Add tests verifying buttons disable during async operations across all forms | Small |
| 9 | **Hook cleanup** | Verify event listener removal on unmount for `useTheme`, toast cleanup | Small |
| 10 | **API client edge cases** | Test `api.ts` with malformed JSON, CORS errors, abort controller, concurrent requests | Medium |

### Tier 3: Nice-to-Have (Polish and robustness)

| # | Area | Description | Effort |
|---|------|-------------|--------|
| 11 | **E2E error recovery** | Test "submit form → network fail → retry → succeed" flows | Medium |
| 12 | **Cross-browser E2E** | Add Firefox and WebKit to Playwright config | Small |
| 13 | **Component focus trap** | Sidebar and modals should trap focus; test with keyboard-only navigation | Medium |
| 14 | **Mock pagination** | Implement realistic pagination/filtering in MSW handlers | Medium |
| 15 | **Performance benchmarks** | Add Playwright assertions for page load times (dashboard < 2s, etc.) | Small |

---

## Existing Test Infrastructure Issues

1. **Dependency issue:** `@testing-library/dom` is missing or has a version mismatch — 43 of 54 test files fail to import it, causing all component/page tests to fail
2. **pdfGenerator test regression:** The test `handles logo error gracefully` fails because `console.error` receives a formatted string (`[Error adding logo to PDF]`) instead of the raw string (`Error adding logo to PDF`)
3. **E2E tests require running backend** — Most E2E tests skip when backend is unavailable, reducing their CI value

---

## Recommended Next Steps

1. **Fix `@testing-library/dom` dependency** — This blocks all component/page test execution
2. **Fix `pdfGenerator.test.ts` assertion** — Update the error message matcher at line 1000
3. **Add MSW error handlers** (Tier 1, #1) — Unlocks error-path testing across all components
4. **Add `finance.ts` precision tests** (Tier 1, #3) — Quick win for a financial-critical module
5. **Add service error handling tests** (Tier 1, #2) — Ensures the app handles API failures gracefully
