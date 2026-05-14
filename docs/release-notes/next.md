# Release Notes — Próxima versión

Notas listas para copiar/pegar en App Store Connect y Google Play Console.
Este archivo acompaña el release train **iOS 1.2.0 (7)** + **Android 1.2.0 (6)**.

- **Corta (< 500 chars)** — App Store / Play Store resumen breve
- **Larga** — cuerpo completo de "What's New"

El changelog técnico canónico vive en `versioning/releases.json` y genera `CHANGELOG.md`.

---

## iOS 1.2.0 (build 7)

### 🇲🇽 Español (LATAM) — versión corta

```text
📅 Mejoramos calendario, búsqueda y planeación de eventos

• El calendario ahora tiene mejor paridad: filtros por estado, exportación iCal y navegación más fluida
• La búsqueda de eventos se apoya en backend para resultados más consistentes
• Mejoramos la disponibilidad de equipo al planear eventos
• Arreglamos widgets clave del Dashboard y el guardado de ajustes de stock
```

### 🇲🇽 Español (LATAM) — versión larga

```text
Esta actualización prepara el siguiente salto de calidad de Solennix en iPhone y iPad.

Nuevo
• La búsqueda de eventos ahora usa resultados apoyados en backend, con más coherencia entre vistas y plataformas.
• El calendario gana mejor paridad funcional: filtro por estado, exportación iCal, retry y navegación más clara desde los eventos.
• La disponibilidad de equipo entra al flujo de planeación para ayudarte a detectar capacidad real antes de cerrar cambios.

Mejorado
• El módulo de Staff queda mejor localizado y más consistente con el resto de la app.
• La experiencia general de detalle y calendar queda más alineada con Web y Android.

Arreglado
• Restauramos tarjetas clave del Dashboard: próximos eventos y top clients.
• El botón Guardar en ajustes de stock vuelve a persistir correctamente aunque el PUT sea parcial.
```

### 🇺🇸 English — short version

```text
📅 Better calendar, search, and event planning

• Calendar now has stronger parity: status filters, iCal export, and smoother navigation
• Event search now uses backend-powered results for better consistency
• Equipment availability is clearer during planning
• Fixed key Dashboard widgets and stock adjustment saving
```

### 🇺🇸 English — long version

```text
This release improves the core planning workflow on iPhone and iPad.

New
• Event search now relies on backend-powered results for stronger consistency across screens and platforms.
• Calendar reaches better functional parity with status filters, iCal export, retry states, and clearer event navigation.
• Equipment availability is now surfaced more clearly while planning event changes.

Improved
• Staff flows are better localized and more consistent with the rest of the app.
• Event detail and calendar behavior are better aligned with Web and Android.

Fixed
• Restored key Dashboard cards: upcoming events and top clients.
• Fixed stock adjustment saving when the request body is partial.
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
