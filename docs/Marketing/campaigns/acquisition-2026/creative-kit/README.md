---
verified: 2026-10-26
---

# Kit creativo reproducible

Genera las piezas maestras de adquisición con el logo aprobado y capturas reales del producto.

## Uso

Desde la raíz del repositorio:

```bash
node docs/Marketing/campaigns/acquisition-2026/creative-kit/render.mjs
```

En macOS usa Google Chrome. En otro entorno, definí `PLAYWRIGHT_CHROMIUM_EXECUTABLE` con la ruta de un navegador Chromium compatible.

La salida se escribe en `../out/`. El archivo `manifest.csv` documenta formato, dimensiones y texto alternativo.

## Reglas

- No editar el logo ni recrearlo con IA.
- No sustituir capturas por interfaces inventadas.
- No publicar una pieza cuyo mensaje no esté aprobado en `../02-messaging.md`.
- Los PNG son maestros estáticos. Videos y animaciones se producen a partir de `../06-video-scripts.md`.
