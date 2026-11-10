# Skill Registry — Solennix

This registry maps **cognitive roles**, **stack/contract contexts**, and **project/global Gentle-AI skills** to their canonical file paths and activation rules.

---

## 1. Cognitive Role Skills (Project-Local, Task-Oriented)

We separate **cognitive task roles** from **technology stack knowledge**. Every execution unit loads exactly one primary cognitive role skill:

| Skill | Path | Trigger / Activation Rule |
| :--- | :--- | :--- |
| `leader` | `.agents/skills/leader/SKILL.md` | Orchestrating an issue end-to-end (`C1`–`C5`), choosing ODD `Inline Direct` vs `Delegated Direct`, dispatching bounded workers, generating stateless review bundles (`scripts/factory_handoff.py`), or preparing PR delivery (`scripts/check_pr_metadata.py`). |
| `explorer` | `.agents/skills/explorer/SKILL.md` | Read-only codebase/context mapping (`<2k` token handoff with `path:line` evidence) OR GitHub Issue Triage converting `status:new` issues into verifiable `status:ready` specifications with DoR and taxonomy labels. |
| `implementer` | `.agents/skills/implementer/SKILL.md` | Sole-writer implementation on an isolated branch within `## Allowed edit surfaces`, Contract-First OpenAPI workflow, RED → GREEN → Refactor test-first execution, proportional `V0`/`V1`/`V2` verification, and atomic work-unit commits. |
| `reviewer` | `.agents/skills/reviewer/SKILL.md` | Stateless Clean-Context Independent Review (`C4`) with **zero** access to implementer chat transcripts, evaluating only the deterministic `scripts/factory_handoff.py` bundle against the `P0`–`P3` rubric and `judgment-day` escalation rules. |
| `ux-brief` | `.agents/skills/ux-brief/SKILL.md` | Issue labeled `ux:shape` without a current brief: unattended UX brief published as an issue comment before implementation (performed by the `explorer` role; never writes code). |

---

## 2. Stack & Surface Context Skills (Project-Local, On-Demand)

Stack skills are loaded **on demand** by `explorer`, `implementer`, or `reviewer` when the task or touched file paths match the surface:

| Skill | Path | File / Path Triggers | Task Intent Triggers |
| :--- | :--- | :--- | :--- |
| `go-backend` | `.agents/skills/go-backend/SKILL.md` | `backend/**`, `*.go`, `go.mod`, `contracts/openapi.yaml` | Go 1.26 clean layered architecture (handlers → services → repository → models), PostgreSQL (`pgx/v5` + repository interfaces), RFC 9457 Problem Details, structured logging, `go test -race ./...`. |
| `react-vite-web` | `.agents/skills/react-vite-web/SKILL.md` | `web/**`, `*.tsx`, `*.ts`, `vite.config.ts` | React 19 + Vite + TypeScript strict, react-router-dom v7 / TanStack Query / Context+Zustand(toast), OpenAPI TypeScript types (`web/src/types/api.ts` from `contracts/openapi.yaml`), i18next (`es`/`en`), Vitest + Playwright verification. |
| `client-surfaces` | `.agents/skills/client-surfaces/SKILL.md` | `ios/**`, `android/**`, `*.swift`, `*.kt` | Native iOS (SwiftUI + async/await) and Native Android (Jetpack Compose + Kotlin Coroutines), cross-platform model/API symmetry, localization parity. |

---

## 3. Project & Domain Skills

| Skill | Path | Trigger / Activation Rule |
| :--- | :--- | :--- |
| `branch-pr` | `.agents/skills/branch-pr/SKILL.md` | PR creation workflow following conventional commits, labels, and issue-linking rules. |
| `issue-creation` | `.agents/skills/issue-creation/SKILL.md` | Authoring or refining GitHub Issues with verifiable acceptance criteria (`S1..Sn`), exclusions, and taxonomy labels. |
| `solennix-video-creator` | `.agents/skills/solennix-video-creator/SKILL.md` | Creating tutorials and marketing videos for Solennix using Remotion. |
| `remotion-best-practices` | `.agents/skills/remotion-best-practices/SKILL.md` | Best practices for Remotion video creation in React. |

---

## 4. Resolution Protocol

1. Before starting any task, identify your **Cognitive Role** (`leader`, `explorer`, `implementer`, or `reviewer`) and read its `SKILL.md`.
2. Inspect the target file paths (`## Allowed edit surfaces` or diff paths) and load all matching **Stack & Surface Context Skills**.
3. When delegating to a subagent, inject the resolved skill paths explicitly and require `skill_resolution: paths-injected` in the worker report.
