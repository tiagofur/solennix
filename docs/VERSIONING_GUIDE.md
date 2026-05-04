# Control de Versiones y Changelog

Guía completa del sistema de versionado unificado para Web, iOS, Android y Backend.

---

## Visión general

Solennix mantiene **una única fuente de verdad** para todas las versiones en `versioning/releases.json`. Este documento es el contrato vinculante que:

1. **Valida sincronía**: Los archivos fuente de cada plataforma (web/package.json, ios/project.yml, etc.) deben coincidir con el manifest.
2. **Genera changelog**: Produce automáticamente `CHANGELOG.md` (para GitHub) y `web/src/content/changelog.generated.ts` (para la web pública).
3. **Bloquea drift en CI**: Si versions no coinciden, la PR no puede mergearse.

---

## Arquitectura

### Archivos clave

| Archivo | Responsabilidad | Quién lo edita | Frecuencia |
|---------|-----------------|-----------------|-----------|
| `versioning/releases.json` | Manifest oficial + changelog | Operadores | Por cada release |
| `web/package.json` | Version de Web (campo `version`) | Equipo Web / Release Script | En release |
| `ios/project.yml` | Version de iOS (MARKETING_VERSION + CURRENT_PROJECT_VERSION) | Equipo iOS / Release Script | En release |
| `android/app/build.gradle.kts` | Version de Android (versionName + versionCode) | Equipo Android / Release Script | En release |
| `backend/VERSION` | Version de Backend | Equipo Backend / Release Script | En release |

### Flujo de actualización

```
1. Operador edita versioning/releases.json
   ├─ Actualiza currentVersions (4 plataformas)
   └─ Agrega release entry con cambios por plataforma

2. Corre "npm run version:check"
   ├─ Lee manifest
   └─ Compara contra archivos fuente de cada plataforma
   └─ Falla si hay mismatches

3. Corre "npm run changelog:generate"
   ├─ Lee manifest
   ├─ Genera CHANGELOG.md (para GitHub)
   └─ Genera web/src/content/changelog.generated.ts (para web pública)

4. Git commit + push + PR
   ├─ CI workflow "version-governance" se dispara
   ├─ Re-valida con check-versions.mjs
   ├─ Re-genera con generate-changelog.mjs --check (falla si hay diff)
   └─ Bloquea merge si algo falla

5. Merge a main/develop
   └─ Versiones están locked y changelog es oficial
```

---

## Cómo usar

### Escenario 1: Agregar un nuevo release

**Paso 1:** Actualiza versiones en archivos fuente (solo si cambió versión):

- **Web**: Edita `web/package.json`, campo `"version": "X.Y.Z"`
- **iOS**: Edita `ios/project.yml`, campos `MARKETING_VERSION: X.Y.Z` y `CURRENT_PROJECT_VERSION: N`
- **Android**: Edita `android/app/build.gradle.kts`, campos `versionName = "X.Y.Z"` y `versionCode = N`
- **Backend**: Edita `backend/VERSION`, contenido `X.Y.Z`

**Paso 2:** Edita `versioning/releases.json`:

```json
{
  "updatedAt": "2026-05-10",
  "currentVersions": {
    "web": { "version": "0.1.0", "source": "web/package.json" },
    "ios": { "version": "1.2.0", "build": "7", "source": "ios/project.yml" },
    "android": { "version": "1.2.0", "build": "6", "source": "android/app/build.gradle.kts" },
    "backend": { "version": "0.2.0", "source": "backend/VERSION" }
  },
  "releases": [
    {
      "id": "2026-05-10-release-id",
      "date": "2026-05-10",
      "title": "Título descriptivo",
      "summary": "Resumen en 1-2 líneas",
      "platforms": {
        "web": ["Item 1", "Item 2"],
        "ios": ["Item 1"],
        "android": ["Item 1"],
        "backend": []
      }
    }
  ]
}
```

**Paso 3:** Valida y genera:

```bash
# desde la raíz del repo

# Valida que versiones match
npm run version:check

# Genera CHANGELOG.md y changelog.generated.ts
npm run changelog:generate

# Pre-valida como lo haría CI
npm run version:ci
```

Si todo pasa, haz commit:

```bash
git add versioning/releases.json CHANGELOG.md web/src/content/changelog.generated.ts
git commit -m "docs(releases): add vX.Y.Z release notes"
```

**Paso 4:** Abre PR y espera approval + CI:

```bash
gh pr create --title "docs(releases): add vX.Y.Z" --body "..."
```

CI (`.github/workflows/version-governance.yml`) correrá automáticamente y bloqueará merge si hay problemas.

---

### Escenario 2: ¿Qué pasa si hay mismatch de versiones?

**Síntoma:** `npm run version:check` falla con:

```
Version mismatch detected:
web: expected 0.1.0 but got 0.0.0
```

**Causa:** La versión en `web/package.json` no coincide con lo declarado en `versioning/releases.json`.

**Solución:**

1. Decide cuál es la versión correcta:
   - ¿Es un release real? → Actualiza el manifest.
   - ¿Se cambió el archivo fuente por error? → Revierta el archivo fuente.

2. Sincroniza:
   ```bash
   # Opción A: Archivo fuente tiene la verdad
   # → Actualiza versioning/releases.json con el valor del archivo fuente

   # Opción B: Manifest tiene la verdad
   # → Actualiza el archivo fuente con el valor del manifest

   npm run version:check  # Debe pasar
   ```

3. Commiteá la corrección antes de abrir PR.

---

### Escenario 3: Testear localmente antes de PR

Corre toda la cadena de validación:

```bash
# desde la raíz del repo

# Paso 1: Valida archivos fuente vs manifest
npm run version:check
echo "✅ Versions in sync"

# Paso 2: Genera changelog
npm run changelog:generate
echo "✅ Generated CHANGELOG.md and changelog.generated.ts"

# Paso 3: Pre-valida como lo haría CI
npm run version:ci
echo "✅ All CI checks passed locally"

# Paso 4: Revisa los outputs generados
cat CHANGELOG.md
cat web/src/content/changelog.generated.ts

# Si todo se ve bien:
git add -A
git commit -m "docs(releases): add vX.Y.Z"
```

---

### Escenario 4: Editar changelog sin cambiar versión

A veces quieres corregir un typo o agregar detalle al último release sin bump de versión.

1. Edita `versioning/releases.json` (último entry en `releases` array).
2. **NO toques `currentVersions`** — las versiones siguen iguales.
3. Corre:
   ```bash
   npm run version:check  # Debe pasar (versiones no cambiaron)
   npm run changelog:generate  # Regenera outputs
   ```
4. Commitea:
   ```bash
   git add versioning/releases.json CHANGELOG.md web/src/content/changelog.generated.ts
   git commit -m "docs(changelog): fix typo in last release"
   ```

---

## Convenciones de copy para changelog

### Cómo escribir items por plataforma

**Formato:**
- Usa **verbos claros** (Fix, Agrega, Mejora, Corrige, Paridad, etc.).
- Incluye **contexto de usuario** (qué problema se resuelve, qué mejora se logra).
- Sé **específico**: qué cambió, dónde, cuál es el impacto visible.

**Ejemplos buenos:**

```
✅ "Fix de crash al eliminar extra sin nombre en formulario de evento."
✅ "Stepper visual con indicadores de progreso en formulario de evento."
✅ "Paridad de validacion inline con Web — feedback inmediato sin bloqueos."
✅ "PDF de contrato genera en background sin congelar la app."
✅ "Descuento se calcula correctamente en cotizacion — antes mostraba monto incorrecto."
```

**Ejemplos malos:**

```
❌ "Se corrigió el bug"
❌ "Nuevo feature"
❌ "Mejorado"
❌ "Refactored stepper component"
❌ "Migramos a async/await"
```

### Cantidad de items

- **Web**: 2–5 items (típicamente menos por ser SPA única).
- **iOS**: 2–5 items.
- **Android**: 2–5 items.
- **Backend**: 1–3 items (suele ser contratos de API, no detalles de implementation).

Si una plataforma no tiene cambios, dejar array vacío:

```json
"backend": []
```

### Ejemplo de release bien documentado

```json
{
  "id": "2026-05-15-event-form-complete",
  "date": "2026-05-15",
  "title": "Formulario de evento: stepwise UI y validacion progresiva",
  "summary": "Mejor UX en flujo multi-paso con validacion por pantalla y hints inline.",
  "platforms": {
    "web": [
      "Stepper visual con números y títulos descriptivos.",
      "Validacion inline sin bloqueos — puedes navegar y volver atrás.",
      "Resumen antes de guardar con detalle de todos los datos."
    ],
    "ios": [
      "NavigationStack coherente con Web en secuencia de pasos.",
      "Validacion progresiva con hints inline sobre cada campo.",
      "Toast de error + opción \"Volver atrás\" si falla validacion."
    ],
    "android": [
      "NavGraph refactorizada para 5 destinos (paso 1-5).",
      "Validacion y UX de errores aligned con iOS.",
      "Accessibility mejorada: content descriptions en todos los campos."
    ],
    "backend": [
      "PUT /api/events/{id} acepta partial updates por step (no requiere todos los campos)."
    ]
  }
}
```

---

## Cómo ve el usuario el changelog

### Ruta pública

El changelog está disponible en dos rutas web:

- **`/changelog`** — Ruta principal
- **`/help/changelog`** — Alias desde Help center

### Dónde aparece

- **Página Changelog** (`web/src/pages/Changelog.tsx`):
  - Grid de versiones actuales (Web, iOS, Android, Backend).
  - Historial de releases con fecha, título, resumen y bullets por plataforma.
  - Actualizacion automática cada vez que regeneras `changelog.generated.ts`.

- **Página About** (`web/src/pages/About.tsx`):
  - Link a `/changelog` con icono de historia.

- **GitHub**:
  - Archivo `CHANGELOG.md` en la raíz del repo.
  - Visible en Releases y git history.

---

## CI Workflow: version-governance.yml

Cada PR a `main` o `develop` corre automáticamente:

1. **Checkout** del código
2. **Setup Node 20**
3. **Valida versiones**: `node scripts/versioning/check-versions.mjs`
   - Lee manifest, compara contra archivos fuente, falla si hay mismatch.
4. **Valida changelog generado**: `node scripts/versioning/generate-changelog.mjs --check`
   - Regenera outputs en memoria y compara contra git.
   - Falla si archivos en git están stale o editas a mano.

**Si falla CI:**

```
Error: check-versions failed
Version mismatch detected: web expected 0.1.0 but got 0.0.0
```

**Cómo resolver:**

1. Corre localmente: `npm run version:check`
2. Sincroniza versiones (edita manifest o archivos fuente).
3. Regenera: `npm run changelog:generate`
4. Pushea cambios:
   ```bash
   git add versioning/releases.json CHANGELOG.md web/src/content/changelog.generated.ts
   git commit -m "fix: sync versions"
   git push origin tu-rama
   ```
5. CI revalidará automáticamente en la PR.

---

## FAQ

**P: ¿Puedo editar `CHANGELOG.md` o `changelog.generated.ts` a mano?**
A: No. Están marcados con banner de "AUTO-GENERATED". Si los editas, CI fallará con `--check`. Edita solo `versioning/releases.json` y regenera.

**P: ¿Cómo sé cuándo debo hacer un bump de versión?**
A: Usa Semantic Versioning (SemVer):
- **MAJOR**: Breaking changes (cambios de API, formato de datos, UI crítica incompatible).
- **MINOR**: Features nuevas (nueva pantalla, nuevo campo de entrada, nueva regla de negocio).
- **PATCH**: Bug fixes, optimizaciones, UX minor.

Ejemplo: `1.2.3` → `1.3.0` (MINOR) o `1.2.4` (PATCH).

**P: ¿Todas las plataformas deben tener la misma versión?**
A: No necesariamente. Web podría ser 0.1.0, iOS 1.2.0 y Android 1.2.1. Lo importante es que **cada una** respete SemVer y esté documentada en el manifest.

**P: ¿Qué pasa si Web no cambia pero iOS/Android sí?**
A: Actualiza solo las versiones que cambiaron en `versioning/releases.json` y en sus archivos fuente. Web queda igual.

**P: ¿Con qué frecuencia debería actualizar el manifest?**
A: Después de cada **release real**:
- Cuando haces deploy a producción (web).
- Cuando builds se envían a App Store o Play Store.
- Cuando hay release de Backend a staging/prod.

Para development interno (branches, cambios en progress), **no actualices manifest**.

**P: ¿Cómo genero un release para App Store / Play Store?**
A: Una vez que tengas versión actualizada y changelog en el manifest:
- Corre `npm run changelog:generate`.
- Abre `versioning/releases.json`, copia el último release entry.
- Usa la sección `platforms.ios` o `platforms.android` como release notes en App Store Connect o Google Play Console.

Ej: Copiar bullets de `"ios": ["Item 1", "Item 2"]` → pega en "What's New in This Version" en App Store Connect.

**P: ¿Qué si commiteo versioning/releases.json pero me olvido de correr generate-changelog.mjs?**
A: CI bloqueará el merge. Debes regenerar localmente antes de pushear.

**P: ¿Cómo testeo el changelog localmente antes de PR?**
A: Después de editar manifest:

```bash
npm run version:check  # Valida versiones
npm run changelog:generate  # Genera CHANGELOG.md y changelog.generated.ts
cat CHANGELOG.md  # Revisa visualmente
cat web/src/content/changelog.generated.ts  # Revisa formato
npm run version:ci  # Simula CI
```

Si todo está bien, la PR no debería tener problemas.

---

## Archivos involucrados

```
versioning/
├── releases.json              ← Editar aquí para nuevo release
├── RELEASE_TEMPLATE.md        ← Guía de formato + ejemplos
scripts/versioning/
├── check-versions.mjs         ← Valida sincronía (no editar)
├── generate-changelog.mjs     ← Genera outputs (no editar)
.github/workflows/
├── version-governance.yml     ← CI workflow (no editar)
docs/
├── VERSIONING_GUIDE.md        ← Este documento
CHANGELOG.md                   ← Auto-generado
web/src/
├── content/changelog.generated.ts    ← Auto-generado
├── pages/Changelog.tsx               ← Renderiza changelog público
```

---

## Soporte y escalada

Si enfrentas un problema no cubierto en esta guía:

1. Revisa [RELEASE_TEMPLATE.md](../versioning/RELEASE_TEMPLATE.md) para ejemplos de formato.
2. Corre `npm run version:ci` localmente para debug detallado.
3. Revisa CI logs en GitHub (Actions → version-governance workflow).
4. Si persiste, abre issue describiendo:
   - Qué comando coriste
   - Qué error recibiste
   - Output de `npm run version:check`
   - Output de `npm run changelog:generate`

---

## Resumen rápido

```bash
# Workflow típico:

# 1. Edita versiones en archivos fuente (si aplica)
# 2. Edita versioning/releases.json
# 3. Valida
npm run version:check        # ✅ Versiones OK?
npm run changelog:generate   # ✅ Outputs generados?
npm run version:ci           # ✅ Todo OK para CI?
# 4. Commit + push + PR
git add versioning/releases.json CHANGELOG.md web/src/content/changelog.generated.ts
git commit -m "docs(releases): add vX.Y.Z"
git push origin rama
# 5. Espera CI ✅ + approval
# 6. Squash & merge
```
