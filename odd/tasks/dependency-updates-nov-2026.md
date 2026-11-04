# Dependency updates Nov 2026 — batch 2

Header: aplicar 11 PRs de Dependabot sobre feat/adopt-software-factory-methodology, en orden de riesgo, con verificación por app. Branch: feat/adopt-software-factory-methodology. Estrategia: un commit por PR/grupo aplicado localmente (no merge via gh, la rama base no es main). Test runners: web (vitest run + tsc), backend (go test), remotion (tsc/build), android (verificación estática + assemble cuando sea viable).

## Specs

- S1: "tenemos muchos PRs de actualizacion de dependencias, revisemos y apliquemos con cuidado cada una para no romper ninguna app"
- S2: base de aplicación = "Rama actual (Recommended)" (respuesta del usuario a pregunta de base; rama feat/adopt-software-factory-methodology, 5 commits por delante de main, árbol limpio)
- Alcance: PRs #1333, #1351, #1331, #1335, #1337, #1334, #1332, #1352, #1336+#1338, #1339. No hacer push ni merge a main sin pedirlo; no tocar PR #1354.

## Tasks

- T1 (S1,S2, route: inline): aplicar #1333 gradle/actions 6.4.0->6.4.1 — status: done, commit: 6c0fcd93
- T2 (S1,S2, route: inline): aplicar #1351 re2js 2.8.6->2.9.1 en /web — status: done, commit: (este commit; diff lock idéntico al PR 285f474e..b08307d3; sin uso directo en web/src; engines node>=20 OK con CI Node 22)
- T3 (S1,S2, route: inline): aplicar #1331 go-jose 4.1.4->4.1.6 en /backend (security, RSA cap 4096 bits) — status: done, commit: (este commit; diff idéntico al PR; go build ./... OK; go test handlers -run TestGoogle|TestJWKS|TestAuth OK 31s; backend usa RSA-2048 de Google, bajo el cap)
- T4 (S1,S2, route: inline): aplicar #1335 backend-go-non-major (aws-sdk x3 + google api) — status: done, commit: (este commit; go.mod +/- idéntico al PR, +99/-96; go build OK; storage+s3+config tests OK)
- T5 (S1,S2, route: inline): aplicar #1337 android-gradle-non-major (firebase-bom 35.1.0, ktor 3.6.1, AGP 9.5.0) — status: done, commit: (este commit; valores idénticos al PR; uso ktor = plugins estables core/okhttp/auth/logging/mock; sin Gradle local: sandbox bloquea sockets y services.gradle.org — verificar assemble+tests en CI)
- T6 (S1,S2, route: inline): aplicar #1334 web-non-major 12 updates — status: done, commit: (este commit; package.json+lock del PR + hunk T2 re2js; tsc check OK; vitest 176 files/1666 tests OK; api.ts regenerado revertido por drift ajeno)
- T7 (S1,S2, route: inline): aplicar #1332 remotion-non-major 4.0.536->4.0.539 — status: pending, commit: -
- T8 (S1,S2, route: inline): aplicar #1352 remotion zod 4.5.4->4.6.7 + @remotion/cli — status: pending, commit: -
- T9 (S1,S2, route: inline + verifier): aplicar #1336+#1338 vitest 4.1.11->5.0.5 en /web (major, van juntos) — status: pending, commit: -
- T10 (S1,S2, route: inline + verifier): aplicar #1339 revenuecat 10.29.0->11.0.1 en /android (major: Billing 9, compileSdk 35, AGP 9, Kotlin 2.2.21) — status: pending, commit: -

## Log

- L1: "tenemos muchos PRs de actualizacion de dependencias, revisemos y apliquemos con cuidado cada una para no romper ninguna app"
- L2: base elegida por el usuario: rama actual (feat/adopt-software-factory-methodology). Rama 5 commits por delante de main, árbol limpio. Se aplica localmente commit por commit, sin push/merge.
- L3: triage: bajo (1333, 1351, 1332), bajo-medio (1335), medio (1331-security con breaking RSA cap, 1337, 1334, 1352), alto (1336+1338 vitest major juntos, 1339 revenuecat major con Billing 9/compileSdk 35).
