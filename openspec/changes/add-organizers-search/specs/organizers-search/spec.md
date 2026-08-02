# Organizers Search Specification

## Purpose

El endpoint público `GET /api/public/organizers` permite a un visitante (sin cuenta, NG1 ratificado) descubrir y comparar organizadores de eventos vía filtros por ubicación, tipo de evento y texto. Devuelve cards livianas (proyección parcial) paginadas, con ranking plan-aware (Business primero). Solo aparecen perfiles "publicables" (completitud mínima). Es la fuente de datos del directorio `/proveedores` (#1117) y del SEO (#1119).

## Requirements

### Requirement: Endpoint de búsqueda pública

El sistema MUST exponer `GET /api/public/organizers` (sin auth) que acepta query params `city`, `country`, `event_type`, `q` (texto en business_name/headline/about/city), `sort` (`relevance` default | `rating` | `recent`), `order` (`desc` default | `asc`), `page` (default 1), `limit` (default 20, max 100).

#### Scenario: Búsqueda básica sin filtros

- GIVEN varios organizadores publicables
- WHEN `GET /api/public/organizers` sin params
- THEN devuelve la primera página (20 cards) + total + total_pages
- AND cada card tiene slug, business_name, headline, location, rating, reviews_count, cover_image, primary_event_types, is_featured

#### Scenario: Filtro por ciudad

- GIVEN organizadores en "Mexico City" y "Guadalajara"
- WHEN `GET ?city=Mexico City`
- THEN solo devuelve los de Mexico City (case-insensitive, partial match)

#### Scenario: Filtro por tipo de evento

- GIVEN organizadores con event_types que incluyen "boda"
- WHEN `GET ?event_type=boda`
- THEN solo devuelve los que ofrecen ese tipo

#### Scenario: Búsqueda de texto q

- GIVEN organizadores con headline "Catering premium"
- WHEN `GET ?q=catering`
- THEN devuelve los que matchean (case-insensitive) en business_name/headline/about/city

#### Scenario: Filtros combinables (AND)

- GIVEN organizadores en CDMX con tipo boda
- WHEN `GET ?city=CDMX&event_type=boda`
- THEN devuelve solo los que cumplen ambos filtros

### Requirement: Criterio de publicabilidad

El sistema MUST excluir del directorio cualquier perfil que NO cumpla los 4 requisitos: (a) `is_enabled=true`, (b) cuenta activa (no deleted/blocked), (c) tiene foto de portada (cover_url) o logo, (d) tiene headline o about no vacío, (e) al menos 1 servicio con `show_on_public_profile=true`, (f) ubicación con city + country.

#### Scenario: Perfil incompleto no aparece

- GIVEN un organizador con is_enabled=true pero sin servicios visibles
- WHEN se busca el directorio
- THEN NO aparece (criterio de publicabilidad no cumplido)

#### Scenario: Perfil completo aparece

- GIVEN un organizador con cover_url, headline, city, country y 1 servicio visible
- WHEN se busca el directorio
- THEN aparece en los resultados

### Requirement: Ranking plan-aware

El sistema MUST ordenar por defecto (`sort=relevance`): (1) plan Business primero (featured), (2) rating más alto con más reviews, (3) más recientes (updated_at). Los no-featured NO se eliminan, solo se reordenan.

#### Scenario: Business rankea primero

- GIVEN mezcla de planes Free/Pro/Business
- WHEN `GET` sin sort
- THEN los Business aparecen primero con badge is_featured=true

#### Scenario: Cero Business → se llenan con no-featured

- GIVEN una búsqueda filtrada donde ningún resultado es Business
- WHEN se renderiza
- THEN no hay slots vacíos; se devuelven no-featured normalmente

### Requirement: Proyección liviana (card)

El sistema MUST devolver `PublicOrganizerCard` (NO el `PublicOrganizerProfile` completo) para minimizar payload y queries. Omite services[]/reviews/portfolio/faq/packages (viven en la ficha `/{slug}`).

#### Scenario: Card tiene solo campos de listado

- GIVEN una card del directorio
- WHEN se inspecciona el JSON
- THEN NO contiene services[], reviews, portfolio, faq (esos se piden vía /{slug})

### Requirement: Plan-aware de contenido (Free básico)

El sistema SHOULD incluir organizadores Free en el directorio pero SIN exponer sus reviews/rating ( gating heredado del handler de perfil). Para las cards, Free devuelve `rating=null` y `reviews_count=null`.

#### Scenario: Free oculta rating en card

- GIVEN un organizador Free publicable
- WHEN aparece en el directorio
- THEN is_featured=false y rating/reviews_count son null (sin exponer social-proof Free)

### Requirement: Paginación LIMIT/OFFSET

El sistema MUST paginar con LIMIT/OFFSET + total count (patrón del repo, consistencia con ClientRepo).

#### Scenario: Paginación sin solapamiento

- GIVEN 50 organizadores publicables
- WHEN `GET ?page=1&limit=20` luego `?page=2&limit=20`
- THEN page 1 y page 2 no comparten items

#### Scenario: Página fuera de rango

- GIVEN 10 organizadores
- WHEN `GET ?page=5`
- THEN devuelve `data: []`, `total: 10`

### Requirement: Anti-abuse

El sistema MUST aplicar rate-limit del grupo público existente (`/api/public/organizers`). El sistema SHOULD cachear resultados (TTL corto, futuro) porque los datos del directorio cambian poco.

#### Scenario: Rate-limit excedido

- GIVEN una IP que excede el rate-limit del grupo público
- WHEN hace otra búsqueda
- THEN recibe 429
