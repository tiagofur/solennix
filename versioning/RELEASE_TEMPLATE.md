# Release Template

Guía para agregar un nuevo release a `versioning/releases.json`.

## Estructura JSON

```json
{
  "id": "YYYY-MM-DD-descripcion-corta",
  "date": "YYYY-MM-DD",
  "title": "Título descriptivo (max 60 chars)",
  "summary": "1-2 líneas resumiendo el release en términos de usuario final",
  "platforms": {
    "web": [
      "Cambio 1 en formato: acción + qué se logra",
      "Cambio 2...",
      "..."
    ],
    "ios": [
      "..."
    ],
    "android": [
      "..."
    ],
    "backend": [
      "..."
    ]
  }
}
```

## Pasos para crear un nuevo release

### 1. Actualizar versiones en `versioning/releases.json`

Si hay cambios de versión (web, iOS, Android o backend):

```json
"currentVersions": {
  "web": {
    "version": "X.Y.Z",      // ← Actualizar si cambió en web/package.json
    "source": "web/package.json"
  },
  "ios": {
    "version": "X.Y.Z",      // ← Actualizar MARKETING_VERSION en ios/project.yml
    "build": "N",            // ← Actualizar CURRENT_PROJECT_VERSION en ios/project.yml
    "source": "ios/project.yml"
  },
  "android": {
    "version": "X.Y.Z",      // ← Actualizar versionName en android/app/build.gradle.kts
    "build": "N",            // ← Actualizar versionCode en android/app/build.gradle.kts
    "source": "android/app/build.gradle.kts"
  },
  "backend": {
    "version": "X.Y.Z",      // ← Actualizar backend/VERSION
    "source": "backend/VERSION"
  }
}
```

### 2. Actualizar fecha de manifest

```json
"updatedAt": "YYYY-MM-DD"
```

### 3. Agregar entrada a `releases` array

Insertar al inicio del array (releases más recientes primero):

```json
{
  "id": "2026-05-10-new-event-form-refresh",
  "date": "2026-05-10",
  "title": "Rediseño del formulario de evento con stepper mejorado",
  "summary": "Mejor UX en formularios multi-paso con validación progresiva y UI unificada.",
  "platforms": {
    "web": [
      "Stepper visual con indicadores de progreso.",
      "Validación inline por paso sin bloquear.",
      "Botones de acción rediseñados (Siguiente, Guardar, Cancelar)."
    ],
    "ios": [
      "NavigationStack refactorizada para paridad con Web.",
      "Validación progresiva de campos.",
      "Manejo de errores con toast + recovery intuitivo."
    ],
    "android": [
      "ComposeNavigation actualizada para flujo de pasos.",
      "Validación y error handling consistent con iOS.",
      "Accessibility improvements: labels y hints mejorados."
    ],
    "backend": [
      "Nuevas validaciones en POST /api/events para step-by-step saves.",
      "Formato de respuesta incluye hints de errores por campo."
    ]
  }
}
```

## Convenciones de copy

### Formato de cambios por plataforma

- **Acción clara**: Usa verbos imperativos o adjetivos que describan el resultado.
  - ✅ `"Fix de crash al eliminar ..."`
  - ✅ `"Boton Liquidar ahora visible cuando ..."`
  - ✅ `"Paridad visual en equipamiento ..."`
  - ❌ `"Se corrigió el bug"`
  - ❌ `"Nuevo feature"`

- **Detalles específicos**: Menciona qué cambió visualmente o en comportamiento.
  - ✅ `"Confirmacion previa antes de eliminar pago."`
  - ✅ `"Alerta de sobrestock en rojo cuando pedís más del stock."`
  - ❌ `"Bug fixes"`
  - ❌ `"Mejorado"`

- **Contexto de usuario**: Escribe desde la perspectiva del usuario, no del desarrollador.
  - ✅ `"PDFs se generan sin congelar la app."`
  - ✅ `"Contador permite tipear directo sin +/- repetido."`
  - ❌ `"Migramos a async/await para PDFs."`
  - ❌ `"Refactored stepper component."`

### Cantidad de items por plataforma

- **Web**: 2–5 items (típicamente menos que mobile por ser SPA única).
- **iOS**: 2–5 items.
- **Android**: 2–5 items.
- **Backend**: 1–3 items (suele ser contrato de API y reglas, no detalles de impl).

Si una plataforma no tiene cambios en este release, dejar array vacío:

```json
"web": [],
```

## Ejemplo completo

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-10",
  "currentVersions": {
    "web": {
      "version": "0.1.0",
      "source": "web/package.json"
    },
    "ios": {
      "version": "1.2.0",
      "build": "7",
      "source": "ios/project.yml"
    },
    "android": {
      "version": "1.2.0",
      "build": "6",
      "source": "android/app/build.gradle.kts"
    },
    "backend": {
      "version": "0.2.0",
      "source": "backend/VERSION"
    }
  },
  "releases": [
    {
      "id": "2026-05-10-form-polish-v2",
      "date": "2026-05-10",
      "title": "Formulario de evento: UX mejorada y validación progresiva",
      "summary": "Mejoras de usabilidad en formulario multi-paso con validación por pantalla.",
      "platforms": {
        "web": [
          "Stepper visual con números de paso y títulos descriptivos.",
          "Validacion inline sin bloqueos — puedes navegar y volver atrás.",
          "Resumen antes de confirmar con botón \"Guardar evento\"."
        ],
        "ios": [
          "NavigationStack coherente con Web en la secuencia de pasos.",
          "Validacion progresiva con hints inline.",
          "Toast de error + opción \"Volver atrás\" intuitiva."
        ],
        "android": [
          "NavGraph refactorizada con 5 destinos (paso 1-5).",
          "Validacion y UX de errores aligned con iOS.",
          "Accessibility: content descriptions y labels en cada campo."
        ],
        "backend": [
          "PUT /api/events/{id} ahora acepta partial updates por step.",
          "Respuesta includes validation_errors por field con hints."
        ]
      }
    },
    {
      "id": "2026-05-03-platform-parity-and-stability",
      "date": "2026-05-03",
      "title": "Paridad de flujo de eventos y estabilidad general",
      "summary": "Se consolidaron mejoras de UX y fixes criticos en mobile y web para formulario, pagos y PDFs.",
      "platforms": {
        "web": [
          "Fix de descuento en PDF de contrato/cotizacion para que coincida con Finanzas.",
          "Confirmacion antes de eliminar productos, extras, equipo o insumos.",
          "Alerta inline de sobrestock en equipamiento en formulario de evento."
        ],
        "ios": [
          "Fix de crash al eliminar extra o insumo vacio en formulario de evento.",
          "Fix de descuento en PDF de contrato para mantener consistencia con pantalla financiera.",
          "Paridad de UI de equipamiento con alerta de sobrestock no bloqueante."
        ],
        "android": [
          "Boton Liquidar en pagos para autocompletar saldo pendiente.",
          "Confirmacion previa para eliminar pagos.",
          "Generacion de PDF en segundo plano para evitar congelamiento de UI."
        ],
        "backend": [
          "Contratos de API y reglas de negocio alineados con los fixes de descuentos y pagos.",
          "Refuerzo de consistencia para calculos mostrados en clientes API."
        ]
      }
    }
  ]
}
```

## Después de actualizar `versioning/releases.json`

1. Corre en la raíz:
   ```bash
   npm run version:check   # Valida que versiones match con archivos fuente
   npm run changelog:generate  # Genera CHANGELOG.md y web/src/content/changelog.generated.ts
   ```

2. Revisa que los archivos generados se vean bien:
   - `CHANGELOG.md` — debe tener tabla de versiones actualizada + nuevo release
   - `web/src/content/changelog.generated.ts` — debe tener export actualizado
   - `web/src/pages/Changelog.tsx` — renderiza automáticamente desde el generado

3. Commitea todo:
   ```bash
   git add versioning/releases.json CHANGELOG.md web/src/content/changelog.generated.ts
   git commit -m "docs(releases): add v0.2.0 release notes"
   ```

4. **Antes de abrir PR**: Corre en CI local:
   ```bash
   npm run version:ci  # = version:check + changelog:generate --check
   ```
   Debe pasar sin errores.

## FAQ

**P: ¿Puedo escribir changelog antes de actualizar versiones?**
A: Sí, pero `npm run version:check` va a fallar hasta que actualices. Idealmente hacés ambos al mismo tiempo.

**P: ¿Qué pasa si la versión de Web sigue siendo 0.0.0?**
A: Dejala como está. Algunos equipos usan versionado continuo (0.0.0 + deploy date). Si querés cambiarla, actualiza `web/package.json` y el manifest.

**P: ¿Cómo escribo changelog si tengo múltiples features en un release?**
A: Agrupá por impacto visual/usuario: si una feature requiere UI en las 4 plataformas, mencionar en todas. Si es puro backend, solo backend.

**P: ¿El changelog se publica automáticamente en la web?**
A: Sí. La página `/changelog` consume `web/src/content/changelog.generated.ts`, así que apenas corrés `generate-changelog.mjs`, la web ya muestra lo nuevo. Sin deploy requerido.

**P: ¿Qué versión uso si es un bugfix chiquito?**
A: Patch semver (X.Y.Z → X.Y.Z+1). Ej: 1.1.0 → 1.1.1. Si es feature nueva, minor (X.Y.0 → X.Y+1.0).
