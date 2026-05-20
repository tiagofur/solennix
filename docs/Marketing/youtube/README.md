# Solennix YouTube Marketing Assets

Generador de miniaturas (thumbnails) y capas (covers) para el canal de YouTube de Solennix.

## Contenido

- `youtube-assets.html`: Plantilla HTML con los diseños en el formato correcto.
- `render.mjs`: Script de automatización para convertir el HTML en imágenes PNG.

## Formatos Generados

| Asset | Resolución | Propósito |
|-------|------------|-----------|
| `thumbnail-impacto.png` | 1280x720 | Miniatura de impacto (Antes/Después) |
| `thumbnail-tutorial.png` | 1280x720 | Miniatura para tutoriales de marca |
| `channel-cover.png` | 2560x1440 | Capa del canal (con área segura central) |

## Cómo generar las imágenes

1. Instala las dependencias:
   ```bash
   cd docs/Marketing/youtube
   npm install
   ```

2. Ejecuta el renderizado:
   ```bash
   node render.mjs
   ```

Las imágenes se guardarán en la carpeta `out/`.

## Personalización

Para cambiar los textos o temas de los tutoriales, edita directamente los archivos en `youtube-assets.html` antes de correr el script de renderizado.
