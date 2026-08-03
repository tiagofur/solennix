# Geo-Data Specification

## Purpose

El directorio `/proveedores` gana discovery por cercanía: el backend geocodifica la ubicación del organizador al guardar su perfil (Nominatim/OSM, gratis), persiste `latitude`/`longitude` + `service_radius_km`, y el endpoint de búsqueda (#1116) filtra por **bounding box** + ordena por distancia. Habilita #1128 (geo-search web).

## Requirements

### Requirement: Geocoding al guardar perfil

El sistema MUST geocodificar la ubicación (city+country) del organizador al hacer `PUT /users/me/public-profile`, solo si la ubicación cambió respecto al valor existente. Persiste `latitude`/`longitude` via Nominatim/OSM.

#### Scenario: Guardar con ubicación nueva

- GIVEN un organizador sin lat/lng que guarda city="Mexico City", country="Mexico"
- WHEN se procesa el upsert
- THEN se geocodifica via Nominatim y se persisten latitude/longitude aproximadas de Mexico City

#### Scenario: Ubicación sin cambios (no re-geocodifica)

- GIVEN un organizador que ya tiene lat/lng y guarda sin cambiar city/country
- WHEN se procesa el upsert
- THEN NO se llama a Nominatim (reusa lat/lng existente)

#### Scenario: Nominatim no responde (graceful)

- GIVEN un organizador que guarda city pero Nominatim timeout/error
- WHEN se procesa el upsert
- THEN el perfil se guarda igual (lat/lng null) y NO devuelve error al cliente

### Requirement: Campo service_radius_km

El sistema MUST soportar `service_radius_km` (radio de cobertura) en `organizer_public_profiles`. Default null = sin límite.

#### Scenario: Proveedor define radio

- GIVEN un organizador que guarda service_radius_km=50
- WHEN se persiste
- THEN el campo queda en 50

### Requirement: Bounding box filter en directorio

El sistema MUST extender `GET /api/public/organizers` (#1116) con params `lat`, `lng`, `radius_km` para filtrar por **bounding box** (rectángulo computado, sin PostGIS).

#### Scenario: Búsqueda por cercanía

- GIVEN un visitante en lat=19.43, lng=-99.13 (CDMX)
- WHEN `GET ?lat=19.43&lng=-99.13&radius_km=50`
- THEN devuelve solo organizadores dentro del bounding box de 50km

#### Scenario: Sin coords → excluido de geo filter

- GIVEN un organizador sin lat/lng
- WHEN se busca con geo filter
- THEN NO aparece en resultados geo (sí aparecería en búsqueda por city texto)

### Requirement: Distance sort

El sistema MUST soportar `sort=distance` en el directorio, ordenando por distancia euclidiana aproximada al punto del visitante.

#### Scenario: Orden por cercanía

- GIVEN organizadores a 10km, 30km, 50km del visitante
- WHEN `GET ?lat=&lng=&sort=distance`
- THEN aparecen ordenados: 10km, 30km, 50km

### Requirement: Cache de geocoding

El sistema SHOULD cachear resultados de Nominatim en memoria (TTL 24h por query) para respetar el rate limit de 1 req/segundo.

#### Scenario: Mismo query reusado

- GIVEN dos organizadores que guardan "Mexico City, Mexico"
- WHEN el segundo guarda
- THEN se reusa el cache (no segundo request a Nominatim)

### Requirement: User-Agent identificable

El sistema MUST enviar un `User-Agent` identificable en requests a Nominatim (política de uso de OSM).

#### Scenario: Header presente

- GIVEN el backend llama a Nominatim
- WHEN envía el request
- THEN incluye header `User-Agent: Solennix/1.0 (contact@solennix.app)`
