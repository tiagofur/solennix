# CLAUDE.md

Este proyecto usa **`AGENTS.md`** como única fuente normative para todos los agentes (incluido Claude Code). Antes de empezar, leé [`AGENTS.md`](./AGENTS.md).

Las reglas de estilo, convenciones, arquitectura, workflow y diseño viven ahí y en los archivos a los que rutea (`docs/agents/`, `PRODUCT.md`, `CHECKPOINTS.md`). Este archivo no duplica ese contenido.

## Notas específicas de Claude Code

- **Permisos MCP de Engram** (si usás persistencia SDD en modo `engram`/`hybrid`): permitir las herramientas `mem_save`, `mem_search`, `mem_get_observation` del servidor Engram. Ver `.claude/settings.local.json`.
- **Co-autoría:** la regla global del usuario prohíbe `Co-Authored-By: Claude`. No la agregues a los commits.
