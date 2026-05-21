# Benchmark Baseline (Backend)

Issue: #385

## Scope

Initial benchmark suite for critical backend paths:

- Handler: `BenchmarkSearchHandler_SearchAll`
- Handler: `BenchmarkUploadHandler_UploadImage`
- Repository: `BenchmarkClientRepo_Search` (requires DB)

## Commands

### Handler benchmarks (always runnable)

```bash
cd backend
go test ./internal/handlers -run '^$' -bench 'Benchmark(SearchHandler_SearchAll|UploadHandler_UploadImage)$' -benchmem
```

### Repository benchmark (requires database DSN)

```bash
cd backend
BENCH_DB_DSN='postgres://user:pass@localhost:5432/solennix?sslmode=disable' \
  go test ./internal/repository -run '^$' -bench 'BenchmarkClientRepo_Search$' -benchmem
```

## Baseline Tracking

Capture and update these fields after each run:

- ns/op
- B/op
- allocs/op

Store trend snapshots in PR comments for regression tracking until a dedicated benchmark workflow is added.
