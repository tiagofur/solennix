# Release Notes — Próxima versión

Notas listas para copiar/pegar en App Store Connect y Google Play Console.
Este archivo acompaña el release train **iOS 1.5.1 (10)**.

- **Corta (< 500 chars)** — App Store / Play Store resumen breve
- **Larga** — cuerpo completo de "What's New"

El changelog técnico canónico vive en `versioning/releases.json` y genera `CHANGELOG.md`.

> Estado del tren (branch `fix/ios-event-list-date-shift`):
> 1. ✅ Bump `MARKETING_VERSION` → 1.5.1 y `CURRENT_PROJECT_VERSION` → 10 en
>    `ios/project.yml` (3 targets) + `xcodegen generate` (pbxproj actualizado).
> 2. ✅ Fix de fecha de la lista incluido en este branch.
> 3. ⏳ Crear la versión **1.5.1** en App Store Connect (la 1.5.0 ya está tomada),
>    mergear el PR, archivar desde Xcode y subir.

---

## iOS 1.5.1 (build 10)

### 🇲🇽 Español (LATAM) — versión corta

```text
🛠️ Suscripciones y fechas, al fin exactas

• Tus compras y suscripciones ahora se vinculan automáticamente a tu cuenta al iniciar sesión
• Corregimos la lista de eventos: las fechas ya no se muestran un día antes
• Mejoras internas de estabilidad y seguridad
```

### 🇲🇽 Español (LATAM) — versión larga

```text
Esta versión corrige dos problemas importantes detectados gracias a tu feedback.

Arreglado
• Suscripciones: al comprar un plan después de iniciar sesión, la compra a veces quedaba desvinculada de tu cuenta y el plan no se activaba. Ahora toda compra se asocia automáticamente a tu cuenta en el momento del inicio de sesión.
• Eventos: la lista mostraba la fecha de cada evento un día antes del real. Ahora la fecha que ves coincide exactamente con la que registraste, en cualquier zona horaria.

Mejorado
• Actualización del SDK de compras y reforzamiento general de estabilidad y seguridad.
```

### 🇺🇸 English — short version

```text
🛠️ Subscriptions and dates, finally exact

• Purchases and subscriptions now link to your account automatically when you sign in
• Fixed the events list showing dates one day earlier than the real date
• Internal stability and security improvements
```

### 🇺🇸 English — long version

```text
This release fixes two important issues found thanks to your feedback.

Fixed
• Subscriptions: purchasing a plan after signing in could leave the purchase detached from your account, so the plan never activated. Every purchase now attaches to your account automatically at sign-in.
• Events: the list showed each event one day earlier than its real date. The date you see now matches exactly what you scheduled, in any time zone.

Improved
• Purchases SDK update and general stability and security hardening.
```

---

## Idiomas soportados por la app

La app iOS localiza solo **es (LATAM) + en** — sin pt-BR (verificado en
`Localizable.xcstrings`; Android y Web tampoco lo incluyen). Si en App Store
Connect existe un listing pt-BR creado manualmente, hay que mantenerlo aparte o
eliminarlo: la app no muestra portugués.
