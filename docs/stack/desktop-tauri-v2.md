---
verified: 2026-11-10
---

# Desktop Engineering Standard: Tauri v2 (`desktop-tauri-v2.md`)

> [!IMPORTANT]
> **Estado en Solennix: NO adoptado.** `factory.manifest.json` declara `backend, web, ios-native, android-native` — no existe superficie desktop. Este documento es un estándar condicional del factory (ADR-0002 §2.2) que se activa solo si un proyecto adopta el tier `desktop-tauri`.

This guide operationalizes [`ADR-0002`](../architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md) for cross-platform desktop applications (`apps/desktop-tauri/`) built with **Tauri v2**.

---

## 1. Architectural Model

Tauri v2 pairs the `apps/web` React + Vite frontend (rendered in the native OS WebView) with a lightweight **Rust Core (`src-tauri/`)** that manages OS windows, system trays, file-system sandboxing, hardware access, and optional local sidecars.

```text
apps/desktop-tauri/
└── src-tauri/
    ├── capabilities/               # Fine-grained Tauri v2 security permissions (JSON)
    │   └── default.json            # Principle of least privilege per window/plugin
    ├── src/
    │   ├── main.rs                 # Desktop entrypoint (calls lib::run)
    │   ├── lib.rs                  # Plugin registration & invoke_handler wiring
    │   ├── commands/               # Typed #[tauri::command] IPC endpoints (<500 lines/file)
    │   └── error.rs                # Serializable IPC error enum (thiserror + serde)
    ├── Cargo.toml
    └── tauri.conf.json             # App identifier, CSP, bundle targets, devUrl/frontendDist
```

---

## 2. Security & Capability Rules (Mandatory `C4` Review Boundary)

1. **Least-Privilege Capabilities (`src-tauri/capabilities/`)**:
   - Never grant wildcard file-system (`fs:allow-all`) or unrestricted shell execution (`shell:allow-execute`) permissions.
   - Scope file access to explicit application directories (`$APPDATA`, `$APPLOCALDATA`, or user-selected dialog paths).
   - Any modification to `src-tauri/capabilities/**` or `tauri.conf.json` automatically triggers **Blind Dual Review (`judgment-day`)** at `Checkpoint C4`.
2. **Typed IPC Boundary (`#[tauri::command]`)**:
   - Never call `@tauri-apps/api/core` `invoke()` directly inside React UI components.
   - Wrap every Tauri command in a typed TypeScript adapter under `apps/web/src/shared/platform/desktop.ts` with a graceful browser fallback (or platform guard) so `apps/web` remains testable in standard Vitest/browser environments.
3. **Structured Rust Errors**:
   - Every `#[tauri::command]` returning a `Result<T, AppError>` must serialize errors deterministically via `serde::Serialize` + `thiserror::Error` with stable error `code` and `message` fields. Never use `.unwrap()` or `.expect()` on runtime user/OS inputs inside commands.
4. **Non-Blocking Event Loop**:
   - CPU-intensive work or blocking I/O in Rust commands must be `async` (`#[tauri::command] async fn ...`) so the main OS window thread never freezes.

---

## 3. Local-First / Sidecar Pattern

When a desktop product operates offline or local-first (`--db sqlite` under `ADR-0001`):
- Either embed the Go backend binary as a managed Tauri `externalBin` sidecar communicating over loopback/IPC, **or** execute SQLite queries through explicit Rust `commands/` backed by `rusqlite`/`sqlx` with `WAL` mode enabled.
- Never expose raw SQL string execution over the WebView IPC bridge (`invoke("execute_raw_sql", ...)` is a **P0** security blocker).

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# V1: Rust compiler, Clippy lints, and Rust unit tests
cargo test --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml
cargo clippy --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml -- -D warnings

# V2: Full frontend + Tauri bundle verification
npm --prefix apps/web test -- --run
cargo check --manifest-path apps/desktop-tauri/src-tauri/Cargo.toml
```
