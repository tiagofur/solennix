# Release Notes — Próxima versión

Notas listas para copiar/pegar en App Store Connect y Google Play Console.
Este archivo acompaña el release train **iOS 1.3.0 (8)** + **Android 1.2.0 (6)**.

- **Corta (< 500 chars)** — App Store / Play Store resumen breve
- **Larga** — cuerpo completo de "What's New"

El changelog técnico canónico vive en `versioning/releases.json` y genera `CHANGELOG.md`.

---

## iOS 1.3.0 (build 8)

### 🇲🇽 Español (LATAM) — versión corta

```text
📲 Widgets, formulario más inteligente y mejoras visuales

• Los widgets del Dashboard y la pantalla de bloqueo ya muestran tus datos correctamente
• El formulario de evento ahora respeta tus valores de anticipo, días de cancelación y reembolso
• El formulario bloquea y avisa si eliges una fecha marcada como no disponible
• Refinamiento visual: paleta de marca, estados vacíos nativos y animaciones más suaves
```

### 🇲🇽 Español (LATAM) — versión larga

```text
Esta actualización lleva a Solennix al siguiente nivel de pulido en iPhone y iPad.

Nuevo
• Widgets funcionales: los widgets del Dashboard y la pantalla de bloqueo ahora reflejan tus eventos, KPIs e ingresos reales, con estados vacíos para todas las familias.
• Formulario de evento inteligente: respeta el % de anticipo, los días de cancelación y el % de reembolso que configuraste en Ajustes al crear un evento nuevo.
• Fechas bloqueadas: el calendario del formulario deshabilita las fechas marcadas como no disponibles, avisa en línea y protege el guardado para que no agendes un día bloqueado.

Mejorado
• Refinamiento visual integral: paleta de marca unificada, estados vacíos nativos (ContentUnavailableView), símbolos SF jerárquicos y animaciones con resorte que respetan "reducir movimiento".
• Navegación restaurada: al volver a abrir la app se conserva la última pantalla vista (y se limpia al cerrar sesión).
• Pantalla de inicio con fade que coincide con el primer contenido.

Arreglado
• Widgets: se corrigió la persistencia del App Group que dejaba los widgets en blanco y un error de un día en las fechas que mostraba KPIs en cero.
• Live Activity: el color de "completado" ahora es verde, consistente con la app.
• Bloqueo de completar un evento con saldo pendiente, con diálogo claro.
```

### 🇺🇸 English — short version

```text
📲 Widgets, smarter event form, and visual polish

• Dashboard and Lock Screen widgets now show your real data
• The event form now honors your deposit, cancellation, and refund defaults
• The form blocks and warns when you pick a date marked unavailable
• Visual refinement: brand palette, native empty states, smoother animations
```

### 🇺🇸 English — long version

```text
This release takes Solennix to the next level of polish on iPhone and iPad.

New
• Working widgets: Dashboard and Lock Screen widgets now reflect your real events, KPIs, and revenue, with empty states for every widget family.
• Smarter event form: new events now honor the deposit %, cancellation days, and refund % you configured in Settings.
• Blocked dates: the form's calendar disables dates marked unavailable, shows an inline warning, and guards the save so you can't book a blocked day.

Improved
• End-to-end visual polish: unified brand palette, native empty states (ContentUnavailableView), hierarchical SF Symbols, and spring animations that respect Reduce Motion.
• Restored navigation: reopening the app keeps the last screen you were on (and clears it on logout).
• Launch screen fades into the first content frame.

Fixed
• Widgets: corrected App Group persistence that left widgets blank, and a date off-by-one that showed KPIs as zero.
• Live Activity: the "completed" color is now green, matching the app.
• Blocked completing an event with a pending balance, with a clear dialog.
```

---

## Android 1.2.0 (versionCode 6)

### 🇲🇽 Español (LATAM) — versión corta

```text
📱 Android llega más sólido a stores

• Mejoramos formularios largos: el teclado ya no tapa campos ni acciones
• Integramos mejor la bandeja de pagos del organizador
• Migramos PDFs a backend para mayor consistencia y estabilidad
• Reforzamos calidad general con más validaciones pre-release
```

### 🇲🇽 Español (LATAM) — versión larga

```text
Esta actualización deja Android listo para release con foco en estabilidad y experiencia diaria.

Nuevo
• La bandeja de pagos del organizador queda integrada dentro del flujo operativo para revisar y resolver envíos pendientes.
• La generación de PDFs se ejecuta vía backend para mantener consistencia de resultados y reducir carga local.

Mejorado
• Ajustamos formularios scrolleables para que el teclado no tape inputs ni acciones importantes.
• Pulimos consistencia visual y de navegación en pantallas clave de eventos/pagos.

Arreglado
• `imePadding()` ahora se aplica en los contenedores correctos para eliminar fricción en pantallas largas.
• Se removió la acción legacy de WhatsApp en detalle de evento para evitar caminos duplicados de compartición.
• Se reforzó confiabilidad de build/dependencias y se elevó la cobertura de validaciones pre-store.
```

### 🇺🇸 English — short version

```text
📱 Android is now stronger for store rollout

• Long forms no longer get blocked by the keyboard
• Organizer payment inbox is better integrated
• PDF generation moved to backend for consistency
• Broader pre-release quality checks improve reliability
```

### 🇺🇸 English — long version

```text
This release prepares Android for store publication with stronger reliability and day-to-day UX.

New
• Organizer payment inbox is integrated into the operational flow for faster pending-payment resolution.
• PDF generation now runs through backend endpoints for more consistent output and lower client-side load.

Improved
• Scrollable forms now behave better with the keyboard open, keeping key fields and actions reachable.
• Visual and navigation consistency was refined across key event/payment screens.

Fixed
• `imePadding()` is now applied in the correct containers to remove friction on long forms.
• Removed legacy WhatsApp action from event detail to avoid duplicate sharing paths.
• Build/dependency reliability and pre-store quality hardening were reinforced.
```

---

## 🌐 Web 1.0.1 — cambios incluidos

La web no requiere store release, pero este batch acompaña la comunicación pública del mismo tren:

- versión declarada `1.0.1`
- búsqueda de eventos apoyada en backend
- paridad documentada de calendario (estado, iCal, retry, navegación)
- landing/help/changelog público alineados para comunicar mejor el producto
