# Backend API — Map of Content

#backend #moc #solennix

> [!info] Plataforma
> **Stack**: Go 1.24 + Chi v5 + PostgreSQL 15 + pgx/v5
> **Estado**: Producción (API completa)
> **Última actualización**: 2026-04-05

---

## Arquitectura

- [[Arquitectura General]] — Vista de alto nivel, capas, flujo de datos, estructura de directorios
- [[Middleware Stack]] — Recovery, CORS, Security, Logger, Auth, RateLimit, AdminOnly
- [[Autenticación]] — JWT, bcrypt, cookies httpOnly, OAuth (Google/Apple), token refresh
- [[Sistema de Tipos]] — Models, entidades, relaciones, patrones Insert/Update

## Módulos por Dominio

- [[Módulo Eventos]] — CRUD, items (productos/extras/equipo/insumos), fotos, conflictos, sugerencias, pagos Stripe
- [[Módulo Clientes]] — CRUD, búsqueda, métricas calculadas
- [[Módulo Productos]] — CRUD, ingredientes/recetas, batch, gestión de insumos
- [[Módulo Inventario]] — CRUD, stock tracking, tipos (equipo/insumo/consumible)
- [[Módulo Pagos]] — CRUD, registro manual, checkout Stripe para eventos
- [[Módulo Suscripciones]] — Stripe, RevenueCat, webhooks, sync bidireccional, billing
- [[Módulos Auxiliares]] — Calendario (fechas bloqueadas), Búsqueda global, Uploads (imágenes), Dispositivos (push tokens)
- [[Módulo Admin]] — Stats, gestión de usuarios, upgrades, suscripciones

## Infraestructura

- [[Base de Datos]] — PostgreSQL, pgxpool, migraciones custom con go:embed, pool config
- [[Integraciones]] — Stripe, RevenueCat, Resend (email)
- [[Despliegue]] — Docker multi-stage, Docker Compose, variables de entorno, graceful shutdown

## Calidad

- [[Seguridad]] — Headers OWASP, rate limiting, JWT blacklist, CORS, SQL injection prevention
- [[Testing]] — testify, httptest, mocks por interfaz, tests de integración con DB real
- [[Performance]] — Connection pool, índices, queries optimizadas, áreas de mejora

## Roadmap

- [[Roadmap Backend]] — Mejoras priorizadas para alinear con frontend, seguridad, y escalabilidad

---

> [!tip] Navegación
> Cada nota enlaza con `[[wikilinks]]` a sus dependencias. Usá el **Graph View** de Obsidian para ver las relaciones entre módulos.

#backend #moc #solennix
