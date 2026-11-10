---
verified: 2026-11-04
---

# ADR-0000: Project Topology & Surface Selection — solennix

- **Status**: Accepted
- **Date**: 2026-11-04

## Context

Solennix is an event management and financial platform for event organizers. It operates across 4 synchronized client and service surfaces with mandatory cross-platform parity.

## Decision

- **Project Slug**: `solennix`
- **Primary Database Engine**: `postgres` (PostgreSQL 16+ via `pgx/v5`, governed by ADR-0001)
- **Active Surfaces**: `backend`, `web`, `ios-native`, `android-native` (governed by ADR-0002 & ADR-0003)
  - **Backend**: Go API (`backend/`)
  - **Web**: React 19 + Vite + TypeScript (`web/`)
  - **iOS Native**: Swift 6 / SwiftUI (`ios/`)
  - **Android Native**: Kotlin / Jetpack Compose (`android/`)

## Consequences

- Agents and CI workflows build, lint, and verify the 4 active surfaces listed in `factory.manifest.json`.
- Changes altering domain entities, database schemas, or API routes must be propagated symmetrically across iOS, Android, Web, and Backend.
- All network contracts, routes, and DTOs originate in `contracts/openapi.yaml` (ADR-0003).
