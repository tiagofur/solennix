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
📱 Android gana mejor paridad en calendario y formularios

• Búsqueda de eventos conectada al backend para resultados más consistentes
• Calendario con filtro por estado, exportación iCal, retry y navegación refinada
• Mejor visibilidad de disponibilidad de equipo al planear eventos
• Los formularios ya no quedan tapados por el teclado en pantallas largas
```

### 🇲🇽 Español (LATAM) — versión larga

```text
Esta actualización fortalece la experiencia Android en los flujos diarios de operación.

Nuevo
• La búsqueda de eventos ahora usa `/api/events/search`, con resultados más coherentes entre pantallas y plataformas.
• El calendario alcanza mejor paridad funcional con filtro por estado, exportación iCal, retry, FAB y navegación desde eventos.
• La disponibilidad de equipo se integra mejor al flujo de eventos para planear con menos sorpresas.

Mejorado
• Ajustamos formularios scrolleables para que el teclado no tape inputs ni acciones importantes.
• La experiencia general de calendar y eventos queda más alineada con iOS y Web.

Arreglado
• `imePadding()` se aplica en los contenedores correctos para evitar fricción al editar formularios largos.
```

### 🇺🇸 English — short version

```text
📱 Better calendar parity and forms on Android

• Event search now uses backend-powered results
• Calendar gets status filters, iCal export, retry, and smoother navigation
• Equipment availability is clearer while planning events
• Long forms no longer get blocked by the keyboard
```

### 🇺🇸 English — long version

```text
This release sharpens the daily event workflow on Android.

New
• Event search now uses `/api/events/search` for more consistent results across screens and platforms.
• Calendar reaches better parity with status filters, iCal export, retry states, FAB entry points, and event navigation.
• Equipment availability is surfaced more clearly while planning event changes.

Improved
• Scrollable forms now behave better when the keyboard is open, so key inputs and actions stay reachable.
• Calendar and event flows are better aligned with iOS and Web.

Fixed
• Applied `imePadding()` in the right containers to remove friction on long form screens.
```

---

## 🌐 Web 1.0.1 — cambios incluidos

La web no requiere store release, pero este batch acompaña la comunicación pública del mismo tren:

- versión declarada `1.0.1`
- búsqueda de eventos apoyada en backend
- paridad documentada de calendario (estado, iCal, retry, navegación)
- landing/help/changelog público alineados para comunicar mejor el producto
