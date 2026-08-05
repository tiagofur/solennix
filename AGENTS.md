# AGENTS.md — Punto de entrada para agentes de IA (Solennix)

> **Este archivo es la única fuente normative para cualquier agente** (ZCode, Claude Code, Codex, Copilot, Cursor). No es una biblia de reglas: es un **mapa con divulgación progresiva**. Lee solo lo que tu tarea necesita.
> Otros archivos de entrada (`CLAUDE.md`, `.github/copilot-instructions.md`) son stubs que apuntan aquí.

---

## 1. Antes de empezar (obligatorio)

1. Ejecutá `./init.sh` en la raíz y verificá que termine sin errores. Si falla, **pará** y resolvé el entorno antes de tocar código.
2. Leé `progress/current.md` para saber en qué estado quedó la última sesión activa.
3. Elegí **una** tarea: preferí `pending` en `feature_list.json`. Si no hay pending, usá `progress/current.md` + cambios activos en `openspec/changes/`. No trabajes en más de una a la vez.

## 2. Mapa de navegación (qué leer según tu tarea)

Leé **solo** lo relevante a tu tarea. Cargar todo de antemano desperdicia contexto y genera alucinaciones.

| Si tu tarea es… | Leé esto |
| :--- | :--- |
| Arrancar sesión / elegir tarea | `feature_list.json` (si hay pending) + `progress/current.md` + `openspec/changes/` |
| Diseñar o estructurar cambios | `docs/agents/architecture.md` |
| Escribir código (estilo, naming, DRY) | `docs/agents/conventions.md` |
| Declarar tarea completada / escribir tests | `docs/agents/verification.md` |
| Tocar UI, marca, diseño o accesibilidad | `PRODUCT.md` (intención) → Design System de la plataforma |
| Auto-evaluarte antes del review | `CHECKPOINTS.md` |
| Definir o implementar un cambio grande (spec-driven) | familia SDD: `.agents/skills/sdd-*` + `openspec/` |
| Crear PR / issue | skills `branch-pr` / `issue-creation` |
| Estado actual del producto | `docs/PRD/11_CURRENT_STATUS.md` (snapshot vivo) |
| Roadmap | `docs/PRD/09_ROADMAP.md` (forward) · v2 inbound: `docs/PRD/15_MARKETPLACE_V2.md` |
| Arquitectura por plataforma | `docs/{iOS,Android,Web,Backend}/Arquitectura General.md` |
| Contrato API | `backend/docs/openapi.yaml` |
| Contexto histórico | `progress/history.md` y `docs/_archive/` |

**Stack por plataforma:** iOS, Android, Web y Backend. Ver `docs/agents/architecture.md` para el desglose de capas y `README.md` para los comandos de cada una.

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de múltiples tareas.
- **Paridad Cross-Platform obligatoria.** Todo cambio que altere dominio, DB o APIs DEBE propagarse a iOS, Android, Web y Backend de inmediato. Revisá proactivamente — no esperes que te lo pidan.
- **DRY (Don't Repeat Yourself).** Antes de escribir una utilidad/componente, buscá si ya existe.
- **No declares una tarea `done` sin pruebas en verde.** Corré `./init.sh` y asegurá que pase al 100%.
- **Documentá lo que hacés** en `progress/current.md` a medida que avanzás.
- **Dejá el repositorio limpio** al cerrar (sin logs de debug ni temporales huérfanos).

### Mapeo cross-platform (dónde tocar por área)

| Área | iOS | Android | Web | Backend |
| :--- | :--- | :--- | :--- | :--- |
| Modelos | `ios/Packages/SolennixCore/.../Models/` | `android/core/model/` | `web/src/types/` | `backend/internal/models/` |
| API/Red | `ios/Packages/SolennixNetwork/.../` | `android/core/network/` | `web/src/services/` | `backend/internal/handlers/` |
| ViewModels | `.../ViewModels/` | `android/feature/**/viewmodel/` | `web/src/stores/` (Zustand) | — |
| UI | `.../Views/` | `android/feature/**/ui/` | `web/src/pages/`, `components/` | — |
| Navegación | `ios/Solennix/Navigation/` | `.../navigation/` | `web/src/router/` | — |
| Auth | `AuthManager.swift` | `AuthInterceptor.kt` | `AuthContext.tsx` / `authStore.ts` | `handlers/auth.go`, `middleware/auth.go` |
| DB / Repo | — | — | — | `backend/internal/repository/` |
| Servicios | — | — | — | `backend/internal/services/` |
| Rutas API | — | — | — | `backend/internal/router/` |

### Terminología del dominio

UI en español · código y DB en inglés · endpoints en `kebab-case`.

| UI (español) | Código | DB |
| :--- | --- | --- |
| Evento | `Event` | `events` |
| Cliente | `Client` | `clients` |
| Producto | `Product` | `products` |
| Inventario | `InventoryItem` | `inventory_items` |
| Cotización | `Quote` | `quotes` |
| Contrato | `Contract` | `contracts` |
| Pago | `Payment` | `payments` |
| Extra | `EventExtra` | `event_extras` |
| Equipo | `Equipment` | _(subcategoría inventario)_ |
| Insumo | `Supply` | _(subcategoría inventario)_ |
| Receta | `Recipe` | _(ingredientes de un producto)_ |
| Plan | `Plan` | _(tier: Gratis/Pro/Business)_ |
| Checklist | `Checklist` | _(tareas por evento)_ |
| Dashboard | `Dashboard` | _(panel KPIs)_ |

## 4. Commits

Después de cada cambio significativo, commiteá.

- **Formato:** Conventional Commits, en inglés: `type(scope): description`
- **Types:** `feat` · `fix` · `refactor` · `docs` · `test` · `chore` · `style` · `perf`
- **Scopes:** `ios` · `android` · `web` · `backend` · `prd` · `infra`

```
feat(ios): add quick quote generation from client detail
fix(backend): correct event date parsing for timezone offset
docs(prd): update feature parity table after inventory release
```

**No commitear:** trabajo incompleto, secretos/`.env`, generados (`node_modules/`, `build/`, `.gradle/`), `console.log` de debug.

## 5. Comunicación

- Herramientas primero, texto después · Pará al encontrar lo buscado.
- Respuestas directas: solo la ruta, el valor, el dato.
- Oraciones cortas · Listas en vez de prosa · Código inline si es ≤3 líneas.
- Sin preámbulos, disculpas, hedging ni resúmenes redundantes.
- Números, no palabras: "3 archivos" no "varios".

## 6. Lifecycle de cierre de sesión

1. Ejecutá `./init.sh` y validá que termine en verde.
2. Si completaste la feature, marcála `done` en `feature_list.json`.
3. Pasá el resumen de `progress/current.md` al final de `progress/history.md`.
4. Dejá `progress/current.md` limpio con su plantilla básica.
5. Remové logs de debug, prints y temporales fuera del `.gitignore`.
