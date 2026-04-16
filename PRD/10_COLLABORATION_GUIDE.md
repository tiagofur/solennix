# 10 — Guía de Colaboración (trabajar con Claude)

**Estado:** Vivo — actualizar cuando cambie el workflow.
**Última actualización:** 2026-04-16.
**Propósito:** dejar registro de CÓMO trabajamos con Claude Code en Solennix, para que el próximo sprint o la próxima sesión arranque con contexto y no reinvente ruedas.

---

## 1. TL;DR

- **Fuente de verdad del tono y reglas:** `CLAUDE.md` (raíz) + `~/.claude/CLAUDE.md` (instrucciones globales del usuario).
- **Memoria persistente:** Engram (tool `mem_save`). Usar topic keys estables para que un tema evolucione sin duplicar.
- **Trabajo técnico:** por **sprints** (bundles de fixes cross-platform) con commits por plataforma y tests post-cambio.
- **Docs:** todo documento importante vive en `PRD/`. Nada crítico vive solo en Slack / WhatsApp.
- **Commits:** conventional commits (`fix(backend): ...`, `feat(ios): ...`, `docs(prd): ...`). **Nunca** incluir `Co-Authored-By: Claude` — ver global CLAUDE.md.

---

## 2. El rol de Claude en el proyecto

Claude es el **partner de ingeniería senior** del founder. NO es:
- Una IA que ejecuta comandos a ciegas.
- Un reemplazo del founder en decisiones de producto / monetización.
- Un servicio que despliega a producción por sí solo.

Claude **SÍ** es:
- Quien implementa, testea y commitea cambios en iOS / Android / Web / Backend.
- Quien audita en paralelo con 4 sub-agents para no inflar el contexto del thread principal.
- Quien mantiene paridad cross-platform (regla no negociable de `CLAUDE.md`).
- Quien documenta decisiones y deuda en `PRD/11_CURRENT_STATUS.md` + engram.

---

## 3. Conversaciones productivas

### Lo que funciona bien

- **Comandos claros con alcance acotado:** "fix el bug X que toca Y y Z, corre tests, commit."
- **Decisiones de producto explícitas:** "Quiero que el portal del cliente sea Pro, no Gratis."
- **Pedir skip con razón:** "Saltea la auditoría de Android por ahora, enfoquémonos en backend."
- **Paridad declarada:** "Esto es iOS-only esta sesión, paridad después" — Claude registra la brecha en CURRENT_STATUS.
- **Delegación via sub-agents:** cuando la tarea requiere leer muchos archivos (auditoría cross-platform, generación de docs técnicos), Claude lanza Explore agents en background y sintetiza los resultados.

### Lo que NO funciona

- Pedir features grandes sin docs de contexto — Claude tiene que crear muchas asunciones.
- Saltear tests "porque va a andar" — si no se testea, se rompe en silencio (el audit 2026-04-16 encontró 38 findings que nadie había detectado).
- Pedir "arregla todo" sin priorizar — terminan sprints infinitos.
- Delegar decisiones comerciales (precios, marketing) a Claude sin validación humana.

---

## 4. Reglas no negociables (herencia de CLAUDE.md)

### Paridad cross-platform

Toda feature tocada en una plataforma **DEBE** evaluarse en las 3 restantes antes de cerrar. Si no se aplica, documentar por qué en `PRD/11_CURRENT_STATUS.md`.

### Never build after changes

El usuario evita `xcodebuild assembleDebug` / `gradle build` automático. Tests sí se corren (implican compilación, pero es el tradeoff explícito para verificar).

### Never use grep/find/cat directly

Usar: `rg` via Grep tool, `fd` via Glob tool, `bat`/`eza` via Bash. Las tools built-in del harness (Grep, Glob, Read) son más rápidas y no requieren parsing de salida.

### Commits

- Conventional commits (`type(scope): description`), en inglés.
- **Nunca** agregar `Co-Authored-By` ni atribución a AI (regla global del usuario).
- Scopes válidos: `ios`, `android`, `web`, `backend`, `prd`, `infra`.
- Mensaje largo acepta párrafos — explicar el porqué, no solo el qué.

### Cuándo pedir confirmación

- Antes de operaciones destructivas (`git reset --hard`, `git push --force`, borrar branches, `rm -rf`).
- Antes de push a remotos si no fue pedido.
- Antes de tocar archivos de config / secretos.
- Cuando la decisión afecta producción (ej. activar el deploy workflow).

---

## 5. El workflow de sprint (plantilla)

Basado en los sprints 1–5 ejecutados el 2026-04-16. Cuando arranque un sprint nuevo:

1. **Definir alcance:** ¿qué se arregla/construye? ¿cross-platform o single-platform?
2. **Revisar `PRD/11`:** priorizar P0 → P1 → P2/P3 en ese orden.
3. **Delegación opcional:** si se necesita auditoría o exploración amplia, lanzar Explore agents en background ("Run in background" tool param).
4. **Implementación por plataforma:** ataque backend → web → mobile (o según dependencias).
5. **Tests por plataforma:**
   - Backend: `go test ./internal/{handlers,repository,services,middleware}/ -count=1`.
   - Web: `npm run test:run && npm run check` (typescript + lint también).
   - iOS: QA manual en device (SPM `swift test` falla por ActivityKit).
   - Android: QA manual en device (gradle tests son pesados para sprint).
6. **Commit por plataforma:** `fix(backend): ...`, `fix(ios): ...`, etc. Paridad check antes del próximo commit.
7. **Actualizar `PRD/11_CURRENT_STATUS.md`** con lo resuelto y lo que queda pendiente.
8. **Persistir a engram** via `mem_save` con topic key estable (ej. `sprint/2026-04-16-p0-bundle`).
9. **Resumen final al usuario:** qué se hizo, qué queda, qué probar en device.

---

## 6. Memoria persistente (Engram)

### Cuándo llamar `mem_save`

**Sin preguntar:** después de completar cualquier sprint, feature significativa, decisión arquitectónica, o fix no trivial.

Formato estándar:
```
title: "Sprint N — one-line summary"
type: bugfix | decision | architecture | discovery | pattern | config
topic_key: sprint/2026-04-16-p0-bundle (estable!)
content:
  **What**: Qué se hizo
  **Why**: Motivación / bug / request
  **Where**: Archivos tocados
  **Learned**: Gotchas, trade-offs, cosas que sorprendieron
```

### Cuándo usar `mem_search` / `mem_context`

- Al arrancar una sesión nueva, para recuperar contexto: `mem_context(project: eventosapp, limit: 15)`.
- Cuando el usuario menciona algo pre-existente: `mem_search(query, project: eventosapp)`.
- Si un search result está truncado, `mem_get_observation(id)` trae el contenido completo.

### Topic keys que conviene mantener

| Topic key | Qué evoluciona |
|---|---|
| `sprint/YYYY-MM-DD-...` | Sprints específicos con timestamp |
| `architecture/auth-model` | Modelo de autenticación en el tiempo |
| `audit/YYYY-MM-DD-cross-platform` | Resultados de cada audit cross-platform |
| `feedback/<tema>` | Preferencias del usuario registradas (ver más abajo) |

---

## 7. Feedback del usuario (patterns aprendidos)

El founder de Solennix (tiagofur) tiene preferencias explícitas que vale registrar:

- **Rioplatense voseo cuando entrada es español** ("dale", "fantástico", "locura", "bien"). Usar con calidez, nunca sarcasmo.
- **Tono directo, sin preámbulos.** "Claro, voy a..." / "Por supuesto..." molestan. Ir al grano.
- **Listas > prosa larga.** Escanear rápido, no leer.
- **Oraciones cortas.** ≤6 palabras cuando sea posible.
- **No confirmar lo que el tool call ya muestra.** Si el commit ya apareció en el output, no repetirlo textualmente.
- **Sin resumen final si el diff lo demuestra.** "Listo, 5 commits" > "He hecho los siguientes cambios: 1) ..."
- **Sin disculpas ni hedging.** "Podría ser que..." → dar la respuesta.
- **Números, no palabras.** "3 archivos" > "varios archivos".
- **Pedir PAUSA y esperar en preguntas genuinas.** No seguir asumiendo la respuesta.

Más contexto de personalidad: ver `~/.claude/CLAUDE.md` (preferencia del founder por analogías arquitectónicas y por explicar el "por qué" técnico).

---

## 8. Delegación a sub-agents

Claude tiene acceso al tool `Agent` que permite spawning de sub-agents especializados. Patrón usado en Sprint 5 (este):

```
4 × Explore agents in background, cada uno:
  - lee una plataforma (ios/android/web/backend)
  - escribe el archivo PRD/05-08 correspondiente
  - guarda resumen a engram
  - responde con <150 palabras al thread principal
```

**Cuándo delegar:**
- Investigación abierta que tocaría 4+ archivos.
- Trabajo en paralelo genuino (sin dependencias entre tareas).
- Para proteger el contexto del thread principal.

**Cuándo NO delegar:**
- Tareas chicas (leer 1-2 archivos).
- Decisiones que requieren juicio arquitectónico del thread principal.
- Fixes con interdependencias (mejor secuencial).

**Pitfalls observados:**
- **Agentes Explore en read-only:** no pueden escribir archivos. Si se les pide escribir un PRD, devuelven el contenido al thread y el thread principal lo materializa.
- **Rate limits:** múltiples agentes corriendo pueden saturar quota (el iOS agent del Sprint 5 pegó contra el límite). Tener plan B: escribir el doc manualmente.
- **Findings inválidos:** un agente puede reportar un bug que ya está fijado. El thread principal DEBE verificar cada finding antes de aplicar el fix (ver ejemplos en `PRD/11` — `addPhotos @MainActor` fue un falso positivo).

---

## 9. Estructura de los PRD docs

Todos los docs de `PRD/` siguen la misma anatomía:

1. **Estado** (vivo / borrador / archivado).
2. **Fecha de última actualización.**
3. **Propósito** (una oración).
4. **Secciones numeradas** con título claro.
5. **Tablas > prosa** donde aplique.
6. **Links a otros docs** con nombre de archivo explícito (`PRD/04_MONETIZATION.md`), no links externos obscuros.
7. **Sección "Debt conocido" / "Pendiente"** al final cuando aplica.

---

## 10. Cuándo actualizar qué

| Cambio | Actualizar |
|---|---|
| Fix de bug conocido | `PRD/11` (mover a "Resuelto") + engram |
| Feature nueva cross-platform | `PRD/02` + doc de arquitectura de cada plataforma afectada + `PRD/11` |
| Cambio de stack (ej. upgrade React 19) | Doc de arquitectura de la plataforma + commit nota en el doc |
| Cambio comercial (precios, tiers) | `PRD/04_MONETIZATION.md` + `PRD/01_PRODUCT_VISION.md` si afecta promesa de producto |
| Decisión estratégica (entrar a Brasil) | `PRD/01` + `PRD/03_COMPETITIVE_ANALYSIS.md` + `PRD/09_ROADMAP.md` |
| Nueva integración externa | doc de la plataforma que la usa + engram + `.env.example` si hay env vars nuevas |
| Discovery importante del audit | `PRD/11` (Known Issues) + engram |

---

## 11. Qué NO hacer (lecciones duras)

- **Commitear con `Co-Authored-By: Claude`.** El usuario lo prohíbe explícitamente.
- **Confiar 100% en el output de un sub-agent sin verificar.** 2 findings de Sprint 1 y Sprint 2 fueron invalidos / no reproducibles.
- **Asumir que `CLAUDE.md` está al día.** El audit del 2026-04-16 detectó que el Web stack era React 19 + React Query (el doc decía React 18 + Zustand). Los docs se atrasan, siempre verificar el código.
- **Push a remoto sin pedir.** El usuario hace `git push` él mismo.
- **Activar auto-deploy a producción sin confirmación de infra.** El workflow está "prepared, not activated" a propósito.
- **Refactorear por estética sin pedir.** "Don't add features, refactor, or introduce abstractions beyond what the task requires" (global `CLAUDE.md`).

---

## 12. Comandos útiles de sesión

| Necesidad | Comando al empezar |
|---|---|
| Arrancar sesión blanco/a | `"leé PRD/11_CURRENT_STATUS.md y dime en qué estamos"` |
| Continuar sprint | `"seguimos con el sprint N"` — Claude busca contexto en engram |
| Audit nuevo | `"corre auditoría cross-platform en paralelo"` |
| Feature nueva | `"implementá feature X según PRD/12 sección Y"` |
| Fix específico | `"fix PX-PLAT-N del backlog"` |
| Solo docs | `"actualizá PRD/N con lo que cambió"` |
| Solo pensar | `"no implementes, propone 3 alternativas para X"` |

---

## 13. Ejemplo de exchange típico

> **User:** vamos al sprint 2
>
> **Claude:** Dale, Sprint 2 arranca. 12 fixes — ataco por plataforma, commit por plataforma, tests después de cada una. Backend primero (más chico).
>
> `[Grep, Read, Edit, Edit, Bash test, commit]`
> `[Read, Edit, Edit, Bash test, commit]`
> `[... cross-platform ...]`
>
> **Claude (final):** Sprint 2 COMPLETO. 4 commits:
> - `fix(ios): ...`
> - `fix(android): ...`
> - `fix(web): ...`
> - `fix(backend): ...`
>
> Tests backend + web verdes. Skipped P1-iOS-2 (doc Apple contradice audit — justificado en commit). iOS/Android QA en device. ¿Sprint 3?

Ese tono — tight, sin fluff, con lista y close question — es el target.

---

## 14. Recursos

- [Conventional Commits](https://www.conventionalcommits.org/) — formato de mensajes.
- [CLAUDE.md raíz](../CLAUDE.md) — reglas del proyecto (terminología, paridad, convenciones).
- [CLAUDE.md global](~/.claude/CLAUDE.md) — preferencias del founder (tono, personalidad, rules).
- `PRD/` — toda la documentación producto + arquitectura.
- Engram — memoria persistente entre sesiones (project: `eventosapp`).
