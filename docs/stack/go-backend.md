# Go Backend Engineering Standard (`go-backend.md`)

This guide operationalizes [`ADR-0001`](../architecture/adr/ADR-0001-go-backend-and-db-matrix.md) and [`ADR-0003`](../architecture/adr/ADR-0003-contract-first-openapi.md) for all Go backend services (`backend/`).

---

## 1. Directory Blueprint (Screaming Hexagonal)

```text
backend/
├── cmd/
│   └── api/
│       └── main.go                 # Wire dependencies, signal handling, graceful shutdown
├── internal/
│   ├── platform/                   # Cross-cutting infrastructure (config, slog, httpserver, db pool)
│   │   ├── problem/                # RFC 9457 ProblemDetails encoder & error mapper
│   │   └── middleware/             # Request ID, structured access log, recovery, auth
│   └── modules/
│       └── <domain>/               # Vertical slice per bounded domain capability
│           ├── domain.go           # Pure entities, value objects, domain errors (ZERO I/O imports)
│           ├── service.go          # Use-case orchestration & repository port interfaces
│           ├── service_test.go     # Fast table-driven unit tests (V1)
│           ├── http_handler.go     # Transport adapter binding OpenAPI generated contracts
│           └── store_<db>.go       # Postgres (pgx/sqlc) or SQLite adapter implementing ports
├── db/
│   ├── migrations/                 # Sequential SQL migrations (000001_init.up.sql / .down.sql)
│   └── queries/                    # sqlc annotated SQL queries
├── sqlc.yaml                       # sqlc code generation config
└── Makefile                        # test, lint, sqlc, migrate targets
```

- **Cognitive Budget**: Keep every `.go` file under **~500 lines** (`docs/agent-first-methodology.md`).

---

## 2. Approved Stack & Libraries

| Concern | Standard Choice | Prohibited Anti-Pattern |
| :--- | :--- | :--- |
| **Go Version** | Go 1.23+ | Deprecated `ioutil`, untyped context keys |
| **HTTP Router** | `net/http` (`http.ServeMux`) or `github.com/go-chi/chi/v5` | Heavyweight magic frameworks (`gin`, `fiber`, `beego`) |
| **Contract Binding** | `oapi-codegen` against `contracts/openapi.yaml` | Hand-rolled unvalidated `map[string]any` JSON responses |
| **PostgreSQL Driver** | `github.com/jackc/pgx/v5/pgxpool` + `sqlc` | Heavy reflection ORMs (`GORM`, `xorm`) |
| **SQLite Driver** | `modernc.org/sqlite` (CGO-free) + `sqlc` | Unconfigured default SQLite without WAL or `busy_timeout` |
| **Logging** | Standard library `log/slog` (JSON handler in prod) | Unstructured `fmt.Println` or `log.Printf` |
| **Testing** | Standard `testing` + `testcontainers-go` (for V2 DB tests) | Mocking SQL drivers (`sqlmock`) instead of testing real queries |

---

## 3. Non-Negotiable Coding Rules

1. **Context Propagation**: Every I/O or database function accepts `ctx context.Context` as its **first parameter** and respects cancellation/timeouts.
2. **Error Wrapping & Domain Mapping**:
   - Wrap lower-level errors with context: `fmt.Errorf("creating invoice %s: %w", id, err)`.
   - Domain services return typed sentinel/domain errors (`ErrNotFound`, `ErrConflict`, `ErrValidation`).
   - HTTP handlers translate domain errors into **RFC 9457 `application/problem+json`** responses (`status`, `title`, `detail`, `type`, `instance`). Never leak raw SQL errors or stack traces to clients.
3. **Database Adapter Discipline**:
   - **PostgreSQL (`--db postgres`)**: Always use parameterized queries (`$1, $2`) via `sqlc`/`pgx`. Wrap multi-statement mutations in explicit transactions.
   - **SQLite (`--db sqlite`)**: Apply `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;` on connection init.
4. **Concurrency Safety**: Never spawn an unmanaged `go func()` without a clear lifecycle owner (`errgroup.Group` or `sync.WaitGroup`), context cancellation path, and panic boundary.

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# V1: Fast RED -> GREEN unit test + race detector + static analysis
cd backend && go test -race -count=1 ./internal/...
cd backend && go vet ./...

# V2: Full integration suite (including database adapter & OpenAPI contract parity)
make contracts-lint contracts-diff
cd backend && go test -race -count=1 ./...
```
