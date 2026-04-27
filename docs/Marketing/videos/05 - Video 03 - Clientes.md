---
tags:
  - marketing
  - video
  - v03
date: 2026-04-21
status: draft
duration: 15s
screenshots: pending
---

# V03 — Gestión de Clientes

> [!quote] Mensaje clave
> "CRM integrado. Historial completo. Sin Excel."

---

## Objetivo

Mostrar que Solennix reemplaza el Excel/WhatsApp para gestionar clientes. Historial de eventos, datos de contacto, todo en un solo lugar.

## Audiencia

Organizadores que pierden tiempo buscando datos de clientes en WhatsApp o papeles.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Pregunta: "¿Dónde está el teléfono de la clienta de la boda Martínez?"
- Fondo oscuro

### Escena 2: Lista de Clientes (Frames 60-180 / 2-6s)

- Screenshot `client-list.png` aparece con slide desde la derecha
- Muestra lista con varios clientes, búsqueda visible

### Escena 3: Detalle del Cliente (Frames 180-360 / 6-12s)

- Transición slide → `client-detail.png`
- Destacar: nombre, teléfono, email, historial de eventos
- Animación de "highlight" sobre los datos de contacto

### Escena 4: Beneficio + CTA (Frames 360-600 / 12-20s)

- Texto: "Historial completo. Un click. Sin excavar en WhatsApp."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `client-list.png` | Lista de clientes con datos | ⬜ |
| `client-detail.png` | Detalle con historial y contacto | ⬜ |

## Notas Técnicas

- Transición entre lista y detalle: `slide({ direction: "from-right" })`
- Highlight sobre datos de contacto: overlay con `interpolate()` de opacity
- Datos de contacto pueden animarse con "reveal" individual

---

## Redes Sociales & Promoción

### Descripción sugerida
"¿Dónde estaba el teléfono de la clienta?" 📱 No busques más en chats infinitos de WhatsApp. Solennix centraliza todo tu historial de clientes, eventos pasados y pagos en un CRM diseñado para organizadores.

### Hashtags
#Solennix #CRMEventos #ClientesFelices #Organizacion #PlannerLife #Eventos2024 #GestionDeClientes

### Música sugerida
- **Estilo:** Elegant Chill / Smooth Deep House.
- **Evolución:** Sonido profesional, ligero y elegante que refuerce la idea de una gestión impecable.

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
