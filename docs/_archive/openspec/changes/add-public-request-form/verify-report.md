# Verification Report — add-public-request-form

**Change**: add-public-request-form
**Issue**: #1118 (Sprint 13 / Fase 1, Solennix v2.0)
**Branch**: feat/v2-public-request-form
**Verified**: 2026-08-02

---

## Completeness

| Métrica | Valor |
|--------|-------|
| Tasks totales | 8 |
| Tasks completas | 7 (la 3.3 es "abrir PR" — post-reporte) |
| Pendientes impl | 0 |

---

## Build & Tests Execution (real)

**Build/Typecheck**: ✅ `tsc --noEmit` limpio.
**ESLint**: ✅ Limpio.
**Tests**: ✅ **20/20 tests nuevos pasan** + suite web completa 100% verde.

| Archivo | Tests | Resultado |
|---|---|---|
| `publicRequestService.test.ts` | 8 | ✅ 8 PASS |
| `PublicLeadModal.test.tsx` | 12 | ✅ 12 PASS |

Suite web completa: **1536 tests, 0 FAILs**.

---

## Bugs cazados durante desarrollo

- **Parse error (typo)**: template literal `` `${API_BASE}...requests" `` abría con backtick pero cerraba con comilla doble en el test. Parser oxc lo cazó con línea exacta.
- **`type="email"` nativo vs validación custom**: el input nativo `type=email` bloqueaba el submit en jsdom antes de que corriera mi `validate()`, así que el test de "email inválido" no veía el error custom. Fix: `type="text"` + `inputMode="email"` (mi regex es la source of truth).

---

## Spec Compliance Matrix

Mapeo de los 14 escenarios del spec a tests reales:

| Requisito | Escenario | Test | Resultado |
|---|---|---|---|
| Service | submit exitoso | `svc > returns created request on 201` + `modal > submits structured payload` | ✅ COMPLIANT |
| Service | email obligatorio | `modal > rejects invalid email` | ✅ COMPLIANT |
| Modal | campos nuevos presentes | `modal > renders dialog with new structured fields` | ✅ COMPLIANT |
| Modal | multi-select servicios | `modal > toggles service selection` | ✅ COMPLIANT |
| Modal | sin servicios (oculto) | `modal > hides services section when no services` | ✅ COMPLIANT |
| Validación | email inválido | `modal > rejects invalid email` | ✅ COMPLIANT |
| Validación | fecha pasada | `modal > rejects past event date` | ✅ COMPLIANT |
| Validación | budget ≥ 0 | Cubierto por `validate()` (regex + parse); sin test dedicado | ⚠️ PARTIAL |
| Disclaimer | visible | `modal > shows the legal disclaimer` | ✅ COMPLIANT |
| Estados | submitting | `modal > disables submit button while submitting` | ✅ COMPLIANT |
| Estados | 429 inbox_full | `modal > shows inbox_full message on 429` + `svc > 429 inbox_full` | ✅ COMPLIANT |
| Estados | success | `modal > submits structured payload` (verifica success-view) | ✅ COMPLIANT |
| i18n | ES/EN | Strings en public.json ES+EN (validado JSON) | ✅ COMPLIANT |
| Error mapping | 404 | `modal > shows not_found on 404` + `svc > 404` | ✅ COMPLIANT |
| Error mapping | 500 | `modal > shows generic error on 500` + `svc > 500` | ✅ COMPLIANT |

**Compliance summary**: **13/14 COMPLIANT, 1 PARTIAL** (budget validation sin test dedicado).

---

## Coherence (Design)

| Decisión | Seguida? | Notas |
|---|---|---|
| D1 — evolucionar modal existente | ✅ | `PublicLeadModal` modificado in-place. |
| D2 — service nuevo | ✅ | `publicRequestService` separado. |
| D3 — useState local | ✅ | Sin React Hook Form. |
| D4 — servicios via props | ✅ | `PublicProfilePage` pasa `profile.services ?? []`. |
| D5 — checkboxes multi-select | ✅ | Chips toggles con `aria-pressed`. |
| D6 — regex email simple | ✅ | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. |
| D7 — mapeo errores code/status | ✅ | inbox_full / 404 / generic. |

Sin desviaciones.

---

## Issues Found

**CRITICAL**: None.
**WARNING**: budget validation sin test dedicado (cubre `validate()` pero no aserta el mensaje).
**SUGGESTION**: E2E del flujo completo `/u/:slug` → modal → submit → success.

---

## Verdict

# ✅ PASS WITH WARNINGS

Implementación completa (3 fases), 20 tests nuevos, suite web 100% verde, wiring cableado. 2 bugs cazados durante desarrollo. #1118 previamente aprobado (governance OK).
