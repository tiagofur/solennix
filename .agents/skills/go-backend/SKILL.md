---
name: go-backend
description: "Go 1.26 layered backend (handlers → services → repository → models), PostgreSQL via pgx/v5 with explicit repository interfaces, RFC 9457 Problem Details, and race-tested verification."
---

# Stack Context Skill: Go Backend & Database Adapter

Load this skill whenever reading, implementing, or reviewing files under `backend/**`, `*.go`, `go.mod`, `migrations/**`, or `contracts/openapi.yaml`.

**Reference Docs**: [`docs/stack/go-backend.md`](../../../docs/stack/go-backend.md), [`ADR-0001`](../../../docs/architecture/adr/ADR-0001-go-backend-and-db-matrix.md), [`ADR-0003`](../../../docs/architecture/adr/ADR-0003-contract-first-openapi.md).

---

## 1. Actual Layout (Solennix `backend/`)

```text
backend/
├── cmd/server/            # Entrypoint: wiring, graceful shutdown, background job tickers
├── cmd/seed/              # Dev seeding tool
└── internal/
    ├── router/            # chi route registration under /api/v1 (single router.go)
    ├── handlers/          # HTTP layer: parsing, responses, RFC 9457 errors
    ├── services/          # Business logic (no HTTP transport)
    ├── repository/        # Data access via explicit repository interfaces (pgx/v5)
    ├── models/            # Shared domain structs (models.go)
    ├── middleware/        # JWT auth, CORS, rate limit, logging, recovery
    ├── planlimit/         # Plan tier limits (4 events/mes, 20 clientes, seats 1/5/∞)
    ├── financial/ pdf/ storage/ i18n/ config/ database/
```

- **Multi-Tenant Rule**: every query filters by `user_id`; parameterized placeholders only (`$1, $2`) — string concatenation into SQL is a P0 security blocker.
- **Migrations**: sequential SQL at `internal/database/migrations/` (`NNN_*.up.sql`), applied by the server's own migrator. No sqlc — repository interfaces + hand-written pgx queries are the norm (ADR-0001 §2.3).

---

## 2. Contract-First HTTP & RFC 9457 Problem Details

1. **Contract as schema of record**: routes/bodies/response schemas live in `contracts/openapi.yaml` (single copy). Go handlers hand-implement against it — never invent response fields that are not in the contract; contract changes go through C2 (`make contracts-lint contracts-diff`).
2. **RFC 9457 Error Contract (`application/problem+json`)**: map domain errors to `type`, `title`, `status`, `detail`, `instance` (+ optional `errors[]`). Never leak raw SQL errors, stack traces, or internal table names.

---

## 3. Data & Concurrency Discipline

- **PostgreSQL**: `jackc/pgx/v5/pgxpool` behind repository interfaces. Parameterized SQL only; explicit `ctx context.Context` first parameter; multi-statement mutations in explicit transactions.
- **Testing**: table-driven `testing` + `pgxmock` for repository-level units + `testcontainers-go` for integration; no real DB in unit tests.
- **Logging**: `log/slog` JSON in prod with `request_id` correlation.
- **Background jobs**: ticker goroutines in `cmd/server/main.go` — follow the same lifecycle pattern (owner, cancellation, panic boundary).
- **Cognitive File Budget**: keep `.go` files below ~500 lines (`docs/agent-first-methodology.md`).

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# V1: Unit tests with race detector + static analysis
cd backend && go test -race -count=1 ./internal/...
cd backend && go vet ./...

# V2: Full suite + contract check
make -C contracts lint diff
cd backend && go test -race -count=1 ./...
```
