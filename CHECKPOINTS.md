# CHECKPOINTS — Evaluación del estado final (Solennix)

> En sistemas autónomos y orquestados por IA no se evalúa el camino, se evalúa el destino. Estos son los checkpoints objetivos que un revisor (o tú mismo) debe usar para determinar si el trabajo está en perfecto estado.

---

## C1 — Integridad del Arnés
- [ ] Existen los archivos base en la raíz: `AGENTS.md`, `init.sh`, `feature_list.json`, y `progress/current.md`.
- [ ] Existen los manuales en `docs/agents/`: `architecture.md`, `conventions.md`, y `verification.md`.
- [ ] `./init.sh` se ejecuta y finaliza con código de salida 0 (éxito).

## C2 — Coherencia de Feature y Progreso
- [ ] Hay como máximo **una** feature con estado `in_progress` en `feature_list.json`.
- [ ] La feature que se marca como `done` tiene pruebas asociadas que validan sus criterios de aceptación.
- [ ] `progress/current.md` está limpio o documenta únicamente la sesión de trabajo activa actual (sin residuos viejos).

## C3 — Parity & i18n (Internacionalización)
- [ ] Si se modificaron esquemas, tipos, APIs o modelos de dominio en backend, se reflejaron correctamente en:
  - Go Backend (`backend/internal/model/`)
  - React Web (`web/src/types/`)
  - iOS Swift (`SolennixCore/.../Models/`)
  - Android Kotlin (`core/model/`)
- [ ] Las capas de red y de integración de API correspondientes se actualizaron al mismo tiempo en todas las plataformas involucradas.
- [ ] **i18n Estricto:** Toda nueva cadena o texto visible para el usuario se encuentra mapeado al sistema de traducción correspondiente (i18next en web, templates localizados en Go, recursos de strings locales en Mobile) y no de forma dura en el código.

## C4 — Calidad de Código, DRY y Eficiencia de Agentes
- [ ] **Sin duplicación:** Se reutilizaron funciones, utilidades y componentes ya existentes en lugar de copiar código idéntico (DRY).
- [ ] **Limpio de debug:** No hay llamadas a `print()`, `fmt.Println()`, `console.log()`, o stack traces impresos al usuario de forma descuidada.
- [ ] **Foco en Skills:** Cualquier modificación a prompts de agentes o archivos de habilidades (`SKILL.md`) es genérica, modular y evita la creación de archivos gigantescos que inflen innecesariamente el contexto y desperdicien tokens.
- [ ] No existen TODOs o notas temporales sin contexto asignado o ID de ticket.

## C5 — Verificación y Tests Reales en Verde
- [ ] Toda nueva funcionalidad tiene pruebas unitarias o de integración automatizadas.
- [ ] Se ejecutan las pruebas del Backend Go (`go test ./...`) y terminan 100% en verde.
- [ ] Se ejecutan las pruebas del Frontend React (`npm run test:run`) y terminan 100% en verde.
- [ ] Los linters de frontend pasan correctamente sin errores de compilación de TypeScript o reglas bloqueantes.

## C6 — Cierre y Limpieza de Turno
- [ ] No quedan archivos temporales ni carpetas de compilación huérfanas fuera del `.gitignore`.
- [ ] Se movió el log del progreso de `progress/current.md` al archivo `progress/history.md`.
- [ ] El estado de la feature correspondiente en `feature_list.json` se actualizó a su estado final correcto (`done` o `blocked`).
