# Plan de Desarrollo - Roadmap

> Ultima actualizacion: 2026-02-17

## Estado Real del Proyecto

La app Flutter está en producción y tiene paridad funcional parcial con la web. Las fases 1-5 están **completadas**. Quedan gaps puntuales documentados en [06-implementation-plan.md](./06-implementation-plan.md).

---

## 📋 Fases del Proyecto

### Fase 1: Setup del Proyecto
- [x] Crear documentación completa
- [x] Crear proyecto Flutter
- [x] Configurar estructura de directorios
- [x] Configurar dependencias principales
- [x] Configurar tema y colores (`AppColors.brand = Color(0xFFFF6B35)`)
- [x] Configurar routing (GoRouter con todas las rutas)

### Fase 2: Fundamentos
- [x] Implementar API Client con Dio
- [x] Implementar Secure Storage (tokens)
- [x] Crear modelos base
- [x] Implementar autenticación (login, register, forgot password, splash, JWT refresh)
- [x] Crear navegación base (CustomBottomNav, GoRouter)

### Fase 3: Features Core
- [x] Dashboard con KPIs (6 cards + gráfico de barras + eventos próximos)
- [x] Lista y detalle de eventos
- [x] Lista y detalle de clientes (con tabs Eventos y Pagos)
- [x] Calendario de eventos (`table_calendar`)

### Fase 4: Features Avanzados
- [x] Formulario completo de eventos (multi-paso: info, productos, extras, finanzas)
- [x] Gestión de productos (lista, detalle, formulario 5 pasos con receta e ingredientes)
- [x] Gestión de inventario (CRUD completo con búsqueda por texto)
- [x] Sistema de pagos (tab completo con barra progreso, cards, eliminar pago)
- [x] ClientDetailPage — tab Eventos con badge de estado + tab Pagos con eventName
- [x] Botón "Crear evento" desde ClientDetailPage

### Fase 5: Polish
- [x] Generación de PDFs (presupuesto y contrato) — `core/utils/pdf_generator.dart`
- [x] Búsqueda global funcional
- [x] Configuración UI completa (perfil, contrato, preferencias)
- [x] Eliminar desde listas (clientes, productos, inventario) con confirm dialog
- [x] EventDetailPage — Tab Contrato con vista legal completa
- [x] EventDetailPage — Tab Ingredientes con cálculo por receta

### Fase 6: Gaps Pendientes
- [ ] Settings con persistencia real (llamar `PUT /api/users/me`)
- [ ] Dashboard con datos reales del API (verificar mock data)
- [ ] `business_name` dinámico en contrato PDF (leer de Settings)
- [ ] PDF lista de compras (ingredientes del evento)
- [ ] PDF reporte de pagos
- [ ] Auto-status a "confirmed" al completar pago total
- [ ] Plan de suscripción en Settings (basic/premium)

### Fase 7: Testing & Deployment
- [ ] Unit tests
- [ ] Widget tests
- [ ] Integration tests
- [ ] Coverage de código (>70%)
- [ ] Optimización de performance
- [ ] Preparación para stores

---

## 🚀 Gaps Prioritarios

Ver [06-implementation-plan.md](./06-implementation-plan.md) para el plan detallado de cada gap pendiente.

```
Prioridad Alta:
  Settings persistencia real   <- Fase 6
  Dashboard datos reales       <- Fase 6

Prioridad Media:
  business_name dinámico       <- una línea en events_page.dart
  PDFs adicionales             <- Fase 6
  Auto-status pagos            <- Fase 6

Prioridad Baja:
  Offline mode                 <- no planeado aún
  Push notifications           <- no planeado aún
  Tests                        <- Fase 7
```
