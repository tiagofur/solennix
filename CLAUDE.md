# CLAUDE.md

Este proyecto usa **`AGENTS.md`** como única fuente normativa para todos los agentes (incluido Claude Code). Antes de empezar, leé [`AGENTS.md`](./AGENTS.md).

Las reglas de estilo, convenciones, arquitectura, workflow y diseño viven ahí y en los archivos a los que rutea (`CHECKPOINTS.md`, `docs/stack/`, `docs/factory/`, `PRODUCT.md`). Este archivo no duplica ese contenido.

## Notas específicas de Claude Code

- **Co-autoría:** la regla global del usuario prohíbe `Co-Authored-By: Claude`. No la agregues a los commits.
- **Documentación en español:** los docs de producto del vault (`docs/PRD/`, `docs/{iOS,Android,Web,Backend}/`) se escriben en español; la capa normativa y de factory (`AGENTS.md`, `CHECKPOINTS.md`, `docs/stack/`, `docs/factory/`, ADRs) en inglés.
