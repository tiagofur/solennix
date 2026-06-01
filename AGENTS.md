# AGENTS.md — Mapa de navegación para agentes de IA (Solennix)

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en Solennix. NO es una biblia de reglas: es un **mapa**. Lee solo lo que necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `./init.sh` en la raíz y verifica que termine sin errores. Si falla, **para** y resuelve el entorno antes de tocar código.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión activa.
3. Lee `feature_list.json` y elige **una** tarea con estado `pending`. No trabajes en más de una a la vez.

## 2. Mapa de navegación del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
| :--- | :--- | :--- |
| `feature_list.json` | Lista de tareas con estado (`pending` / `in_progress` / `done`) | Siempre, al empezar la sesión |
| `progress/current.md` | Estado de la sesión actual activa | Siempre, al empezar la sesión |
| `progress/history.md` | Bitácora append-only de sesiones anteriores | Si necesitás contexto histórico de lo hecho |
| `docs/agents/architecture.md` | Estructura técnica de las 4 plataformas (Backend, Web, iOS, Android) | Antes de diseñar o estructurar cambios |
| `docs/agents/conventions.md` | Reglas de estilo, nombres, DRY, manejo de errores y base de datos | Antes de escribir código |
| `docs/agents/verification.md` | Cómo escribir y ejecutar pruebas en frontend y backend | Antes de declarar una tarea como completada |
| `CHECKPOINTS.md` | Criterios objetivos de "estado final correcto" | Para auto-evaluarte antes del review |
| `.agents/agents/` | Definiciones de subagentes (Líder, Implementador, Revisor) | Si necesitás saber cómo actúan los roles |
| `backend/` | Código fuente del servidor Go y sus pruebas | Para cambios de API o lógica de negocio |
| `web/` | Código fuente del frontend React y sus pruebas | Para cambios en la UI web o flujos de usuario |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de múltiples tareas.
- **Paridad Cross-Platform obligatoria.** Todo cambio que altere el dominio, base de datos o APIs DEBE ser propagado a iOS, Android, Web y Go Backend de inmediato. No esperes a que te lo pidan.
- **DRY (Don't Repeat Yourself).** Evitá la duplicación de código en lógica de negocio o utilidades. Reutilizá componentes existentes en atomic design.
- **No declares una tarea `done` sin pruebas en verde.** Corré `./init.sh` y asegurate de que todos los tests pasen al 100%.
- **Documentá lo que hacés** en `progress/current.md` a medida que avanzás, no al final.
- **Dejá el repositorio limpio** al cerrar la sesión (sin archivos temporales huérfanos).

## 4. Lifecycle de cierre de sesión

Antes de terminar tu turno de trabajo:
1. Ejecutá `./init.sh` y validá que termine en verde.
2. Si completaste la feature, marcala como `done` en `feature_list.json`.
3. Pasá el resumen de `progress/current.md` al final de `progress/history.md`.
4. Dejá `progress/current.md` limpio y vacío con su plantilla básica.
5. Remové logs de debug, prints innecesarios y archivos temporales que no estén en `.gitignore`.
