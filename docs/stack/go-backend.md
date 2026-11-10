---
verified: 2026-11-10
---

# Go Backend Engineering Standard (`go-backend.md`)

This guide operationalizes [`ADR-0001`](../architecture/adr/ADR-0001-go-backend-and-db-matrix.md) and [`ADR-0003`](../architecture/adr/ADR-0003-contract-first-openapi.md) for the Solennix backend (`backend/`).

---

## 1. Directory Blueprint (Actual Layout)

```text
backend/
├── cmd/
│   ├── server/                     # Entrypoint: wiring, signal handling, background job tickers
│   └── seed/                       # Dev seeding tool
├── internal/
│   ├── config/                     # Env config loading (JWT, Stripe, SMTP, Firebase, ...)
│   ├── database/                   # Connection pool + sequential SQL migrations (NNN_*.up.sql)
│   ├── router/                     # chi route registration under /api/v1 (single router.go)
│   ├── handlers/                   # HTTP layer: request parsing, responses, RFC 9457 errors
│   ├── services/                   # Business logic (no HTTP transport, no raw SQL in loops)
│   ├── repository/                 # Data access via explicit repository interfaces (pgx/v5)
│   ├── models/                     # Shared domain structs (models.go, snake_case DB mapping)
│   ├── middleware/                 # Auth (JWT), CORS, rate limit, request logging, recovery
│   ├── planlimit/                  # Plan tier limits (Basic 4 events/month, 20 clients, seats)
│   ├── financial/                  # Money math, P&L and accounting aggregation
│   ├── pdf/                        # Quote/contract/report PDF generation (go-pdf/fpdf)
│   ├── storage/                    # S3/object storage adapters
│   └── i18n/                       # Localized templates for emails/push notifications
└── docker-compose.yml              # Local PostgreSQL only (no backend Makefile — use root make targets)
```

- **Cognitive Budget**: Keep every `.go` file under **~500 lines** (`docs/agent-first-methodology.md`).
- **Multi-Tenant Rule**: Every query filters by `user_id` (or the resolved tenant scope). Parameterized placeholders only (`$1, $2`) — string concatenation into SQL is a P0 security blocker.

---

## 2. Approved Stack & Libraries

| Concern | Standard Choice | Prohibited Anti-Pattern |
| :--- | :--- | :--- |
| **Go Version** | Go 1.26 (see `backend/go.mod`) | Deprecated `ioutil`, untyped context keys |
| **HTTP Router** | `github.com/go-chi/chi/v5` | Heavyweight magic frameworks (`gin`, `fiber`, `beego`) |
| **PostgreSQL Driver** | `github.com/jackc/pgx/v5/pgxpool` behind repository interfaces | Heavy reflection ORMs (`GORM`, `xorm`) |
| **Contract** | `contracts/openapi.yaml` is the schema of record (RFC 9457 `ProblemDetails` errors) | Hand-invented response fields not present in the contract |
| **Logging** | Standard library `log/slog` (JSON handler in prod) | Unstructured `fmt.Println` or `log.Printf` |
| **Testing** | Table-driven `testing` + `pgxmock` for repository units + `testcontainers-go` for integration | Unbounded `sqlmock`-style mocks of business logic; real DB in unit tests |

---

## 3. Non-Negotiable Coding Rules

1. **Context Propagation**: Every I/O or database function accepts `ctx context.Context` as its **first parameter** and respects cancellation/timeouts.
2. **Error Wrapping & Domain Mapping**:
   - Wrap lower-level errors with context: `fmt.Errorf("creating event %s: %w", id, err)`.
   - Domain/services return typed sentinel errors (`ErrNotFound`, `ErrConflict`, `ErrValidation`).
   - HTTP handlers translate them into **RFC 9457 `application/problem+json`** responses (`status`, `title`, `detail`, `type`, `instance`). Never leak raw SQL errors or stack traces to clients.
3. **Transactions**: Wrap multi-statement mutations in explicit pgx transactions; never partially commit ledgers (payments, inventory deductions).
4. **Concurrency Safety**: Never spawn an unmanaged `go func()` without a clear lifecycle owner, context cancellation path, and panic boundary. Background jobs in `cmd/server/main.go` are ticker goroutines — follow the same pattern for new jobs.

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# V1: Fast RED -> GREEN unit test + race detector + static analysis
cd backend && go test -race -count=1 ./internal/...
cd backend && go vet ./...

# V2: Full integration suite (including OpenAPI contract parity)
make contracts-lint contracts-diff
cd backend && go test -race -count=1 ./...
```
