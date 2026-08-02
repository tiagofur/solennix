# Proveedores Directory Specification

## Purpose

La página `/proveedores` es el hub de descubrimiento público de Solennix (v2.0, #1117). Un visitante (sin cuenta, NG1 ratificado) busca organizadores de eventos por ciudad, tipo de evento o texto, ve un grid de cards con sus datos esenciales, y navega al perfil público completo `/u/:slug` para contactarlos. Es la superficie de entrada del inbound del proveedor y la base del SEO (#1119).

## Requirements

### Requirement: Página pública accesible

El sistema MUST servir `/proveedores` sin autenticación. Es una ruta pública (como `/u/:slug` y `/login`), no requiere cuenta. El visitante es anónimo.

#### Scenario: Visitante anónimo accede

- GIVEN un visitante no logueado
- WHEN navega a `/proveedores`
- THEN ve la página del directorio con la primera página de resultados

### Requirement: Buscador con filtros inline (MVP)

El sistema MUST ofrecer un buscador inline (sin sidebar) con: input de ciudad (texto), select de tipo de evento, input q (texto libre). Los filtros son combinables (AND). Un debounce de 300ms evita spam de queries.

#### Scenario: Filtrar por ciudad

- GIVEN resultados en "Mexico City" y "Guadalajara"
- WHEN el visitante escribe "Mexico" en ciudad
- THEN el grid se actualiza (tras debounce) mostrando solo Mexico City

#### Scenario: Filtros combinables

- GIVEN resultados variados
- WHEN el visitante entra city="CDMX" + event_type="boda"
- THEN el grid muestra solo organizadores que cumplen ambos

#### Scenario: Debounce evita spam

- GIVEN el visitante tipea rápido "Mex" → "Mexi" → "Mexic" → "Mexico"
- WHEN se completa el debounce de 300ms
- THEN se hace UNA sola request con "Mexico" (no 4 requests)

### Requirement: URL params shareables

El sistema MUST sincronizar los filtros + paginación con la URL (`?city=&event_type=&q=&page=`). La URL es shareable/bookmarkable y al recargar restaura el estado.

#### Scenario: URL restaurable

- GIVEN una búsqueda con city=CDMX&page=2
- WHEN el visitante copia la URL y la abre en otra pestaña
- THEN ve los mismos resultados (city aplicado, página 2)

### Requirement: Grid de cards

El sistema MUST mostrar los resultados en un grid responsive: 1 columna en móvil, 2 en tablet, 3 en desktop. Cada card muestra: cover_image, business_name, headline, ubicación (city, country), rating + reviews_count (si no son null/Free), primary_event_types, badge "Destacado" si `is_featured`.

#### Scenario: Card con datos completos

- GIVEN un organizador Business con rating 4.8 y 23 reviews
- WHEN su card se renderiza
- THEN muestra cover, nombre, "4.8 ★ (23)", ciudad, tipos de evento, badge "Destacado"

#### Scenario: Card Free sin rating

- GIVEN un organizador Free (rating/reviews null)
- WHEN su card se renderiza
- THEN NO muestra rating (social-proof gating) ni badge Featured

#### Scenario: Responsive

- GIVEN un viewport móvil (375px)
- WHEN el grid se renderiza
- THEN hay 1 columna; en desktop (1280px) hay 3

### Requirement: Card → perfil público

El sistema MUST hacer cada card clickeable, llevando al perfil público `/u/:slug` existente. Sin drawer ni modal.

#### Scenario: Click en card

- GIVEN una card con slug "alice-catering"
- WHEN el visitante hace click
- THEN navega a `/u/alice-catering`

### Requirement: Paginación

El sistema MUST paginar los resultados con el componente `Pagination` existente (currentPage, totalPages, onPageChange). Cambiar de página actualiza la URL (`page=N`) y hace scroll al top.

#### Scenario: Navegar páginas

- GIVEN 50 resultados (totalPages=3 con limit 20)
- WHEN el visitante va a página 2
- THEN el grid muestra resultados 21-40 y la URL tiene page=2

### Requirement: Estados de carga y vacío

El sistema MUST mostrar skeletons (`SkeletonCard`) durante la carga y un Empty state con CTA "limpiar filtros" cuando la búsqueda devuelve 0 resultados.

#### Scenario: Skeleton durante carga

- GIVEN una búsqueda en vuelo
- WHEN el grid se renderiza
- THEN muestra N skeleton cards (no spinner suelto)

#### Scenario: Empty state con CTA

- GIVEN una búsqueda con 0 resultados
- WHEN el grid se renderiza
- THEN muestra Empty con mensaje "sin resultados" + botón "Limpiar filtros" que resetea

### Requirement: i18n ES/EN

El sistema MUST tener todos los strings en ES y EN (regla AGENTS.md). Sin hardcodes.

#### Scenario: Strings localizados

- GIVEN la página en EN
- WHEN se renderiza
- THEN todos los labels/botones/empty states están en inglés
