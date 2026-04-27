# i18n Strategy

> [!abstract] Resumen
> Solennix se construye multi-idioma desde el Calendario (slice inicial, 2026-04-20). Cada plataforma usa su infraestructura nativa; los idiomas shipped por default son **ES (source / development language)** y **EN**. El selector de idioma per-usuario queda pendiente para un slice posterior — por ahora el device / navigator locale gobierna.

## Idiomas soportados

| Locale | Rol | Estado |
| --- | --- | --- |
| `es` | Source (Rioplatense / neutral LATAM) | Completo |
| `en` | Secundario | Completo en Web y Calendario. (Faltan namespaces como `search`) |

Locales regionales (`es-MX`, `es-AR`, `en-US`, `en-GB`) colapsan al locale base de 2 letras. Los montos MXN siguen formateándose con `es-MX` independiente del idioma de UI (convención contable).

## Convención de keys

- **snake_case** + **punto para jerarquía**: `calendar.block.reason_label`, `calendar.error.load_failed`.
- Un namespace por pantalla (`calendar`, próximo `dashboard`, `events`, …). No existe namespace "common" todavía — las acciones compartidas (OK, Cancelar, Eliminar) se duplican en cada namespace para aislar el blast radius de un rename.
- Los placeholders de interpolación usan la sintaxis del framework correspondiente:
  - **iOS**: `%@` (String), `%lld` (Int). Ej: `"Motivo: %@"`.
  - **Android**: `%1$s`, `%1$d` (indexed). Ej: `<string name="calendar_unblock_reason_prefix">Motivo: %1$s</string>`.
  - **Web (i18next)**: `{{var}}`. Ej: `"reason_prefix": "Motivo: {{reason}}"`.

## Mapa de archivos por plataforma

| Plataforma | Catálogo ES | Catálogo EN | Cómo se consume |
| --- | --- | --- | --- |
| **iOS** | `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Resources/Localizable.xcstrings` (sourceLanguage=es) | Mismo archivo, campo `en.stringUnit.value` | `Text(String(localized: "calendar.title", bundle: .module))` |
| **Android** | `android/feature/<feature>/src/main/res/values/strings.xml` | `.../values-en/strings.xml` | `stringResource(R.string.calendar_title)` o `pluralStringResource(...)` |
| **Web** | `web/src/i18n/locales/es/<namespace>.json` | `web/src/i18n/locales/en/<namespace>.json` | `const { t } = useTranslation('calendar'); t('title')` |

## Infraestructura

### iOS

- [Package.swift](ios/Packages/SolennixFeatures/Package.swift) declara `defaultLocalization: "es"` y `resources: [.process("Resources")]` en el target.
- [project.yml](ios/project.yml) agrega `developmentLanguage: es` + `knownRegions: [en, es, Base]` al root `options`.
- Formato: **String Catalog** (`.xcstrings`) — Xcode 15+, con entrada `sourceLanguage` y un objeto `strings` keyed por identifier. Cada entrada tiene `localizations.<locale>.stringUnit.{state,value}`.
- Los strings se consumen con `String(localized: "key", bundle: .module)` — el `bundle: .module` es obligatorio porque las features viven en un SPM package, no en el app target.
- Fechas/números: `DateFormatter` con `locale = Locale.autoupdatingCurrent` + `setLocalizedDateFormatFromTemplate` para que el formato siga el idioma del device.

### Android

- `strings.xml` por feature module: `android/feature/<module>/src/main/res/values/strings.xml` (default ES), `values-en/strings.xml` (EN).
- Los modules NO dependen de `:app` por R — cada feature module ship sus propias strings para evitar ciclos de dependencia.
- Shared UI strings (`ok`, `cancel`, `delete`) se mantienen scoped al module que los necesita (p.ej. `calendar_action_cancel`) — `core:designsystem` podría absorberlos en un slice futuro si más módulos los duplican.
- Consumo: `stringResource(R.string.calendar_title)` / `pluralStringResource(R.plurals.calendar_event_count, count, count)` dentro de `@Composable`.

### Web

- Deps: `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Config: [web/src/i18n/config.ts](web/src/i18n/config.ts) con `fallbackLng: "es"`, `load: "languageOnly"`, `supportedLngs: ["es", "en"]` — regionales colapsan al base.
- Init side-effect en [web/src/main.tsx](web/src/main.tsx) antes del primer render.
- Locales: `web/src/i18n/locales/{es,en}/<namespace>.json`.
- Consumo: `const { t, i18n } = useTranslation('calendar'); <h1>{t('title')}</h1>`.
- Fechas via `date-fns`: helper `pickDateFnsLocale(i18n.language)` elige entre `es` / `enUS` según el idioma vigente.
- **Persistencia**: El idioma se cambia en `Settings.tsx`, se guarda en la base de datos (`user.preferred_language`) y `AuthContext` sincroniza automáticamente la UI (`i18n.changeLanguage(user.preferred_language)`) al iniciar sesión.
- Tests: [tests/setup.ts](web/tests/setup.ts) importa `../src/i18n/config` y pinea `i18n.changeLanguage('es')` para que las assertions sean deterministas (evita que el `navigator.language` del CI lleve los tests a EN).

## Qué NO localizamos

- **Datos ingresados por el usuario**: nombres de eventos, descripciones, motivos de bloqueo, nombres de clientes, etc. viajan tal cual.
- **Moneda**: MXN se formatea con `es-MX` (comas para miles) independiente del idioma de UI — convención contable mexicana.
- **Errores de backend**: los mensajes en `error` de respuestas HTTP siguen en inglés. Los clients los capturan y muestran su propio mensaje localizado del catálogo (`calendar.error.load_failed`, etc.), no el texto crudo del backend.
- **Endpoints**: las rutas API usan kebab-case en inglés (`/api/dashboard/revenue-chart`) — tráfico HTTP no cambia con el idioma.

## Próximos slices

1. **Completar catálogos EN**: Traducir los namespaces que faltan (ej: `search.json`).
2. **Selector de idioma en Mobile**: Agregar el selector de idioma en Settings de iOS (`@AppStorage("preferredLocale")`) y Android (`LocaleManager.setApplicationLocales`), que sincronicen con el backend igual que la web.
3. **Backend i18n** (opcional, lower priority): `Accept-Language` header routing + tabla de traducciones server-side para mensajes que se muestran al usuario crudos (validaciones de formularios).

## Verificación rápida

### iOS

```
# Cambia el idioma del simulador via Settings → General → Language & Region → iPhone Language → English
# Reinstala y relanza la app. La pantalla Calendario debería mostrar textos en EN.
```

### Android

```bash
adb shell setprop persist.sys.locale en-US
adb shell am broadcast -a android.intent.action.LOCALE_CHANGED
adb shell am force-stop com.solennix.app
adb shell monkey -p com.solennix.app -c android.intent.category.LAUNCHER 1
```

### Web

```js
// Browser console
localStorage.setItem('i18nextLng', 'en');
location.reload();
```
