# PRD — Map of Content

> [!info] Solennix
> **Producto**: Plataforma de gestión de eventos para organizadores LATAM
> **Plataformas**: iOS · Android · Web · Backend (Go)
> **Estado**: En producción (4 plataformas live) — ver [[11_CURRENT_STATUS|Estado Actual]] para detalle vivo

> [!success] 🎯 Dashboard Ejecutivo
> Abrí [[../00_DASHBOARD|🏛️ Dashboard Ejecutivo]] para la vista de 30 segundos y navegación por área.

---

## Visión y Estrategia

- [[01_PRODUCT_VISION|Visión del Producto]] — Problema, visión, objetivos, usuarios, historias de usuario
- [[03_COMPETITIVE_ANALYSIS|Análisis Competitivo]] — Posicionamiento vs HoneyBook, Excel, WhatsApp y LATAM
- [[04_MONETIZATION|Monetización]] — Tiers (**Gratis con taste** / Pro / Business), precios, Stripe, RevenueCat, **§4.3 qué ve cada tier**, **§11 keys y secrets — no confundir**

## Features y Estado

- [[02_FEATURES|Catálogo de Features]] — Paridad cross-platform por feature
- [[11_CURRENT_STATUS|Estado Actual]] — Implementación por plataforma, brechas, migraciones. **Fuente viva.**

## Arquitectura Técnica

- [[05_TECHNICAL_ARCHITECTURE_IOS|Arquitectura iOS]] — SwiftUI + MVVM + @Observable + SPM
- [[06_TECHNICAL_ARCHITECTURE_ANDROID|Arquitectura Android]] — Kotlin + Compose + Hilt + Multi-module
- [[07_TECHNICAL_ARCHITECTURE_BACKEND|Arquitectura Backend]] — Go + Chi + PostgreSQL + pgx
- [[08_TECHNICAL_ARCHITECTURE_WEB|Arquitectura Web]] — React 19 + TypeScript + Vite + Tailwind
- [[19_I18N_STRATEGY|i18n Strategy]] — Infraestructura multi-idioma + copy matrix canónica + governance cross-platform

## Planificación

- [[09_ROADMAP|Roadmap Maestro]] — Timeline, matriz feature-per-platform, bloqueantes externos, Q2-Q4 2026 + Q1 2027
- [[13_POST_MVP_ROADMAP|Roadmap Post-MVP (Etapa 2)]] — Notificaciones, reportes, portal del cliente, diferenciadores
- [[14_CLIENT_EXPERIENCE_IDEAS|Ideas Experiencia Cliente (Exploración)]] — Clusters A–G
- [[10_COLLABORATION_GUIDE|Guía de Colaboración]] — Workflow con agentes, prompts, reglas
- [[12_CLIENT_TRANSPARENCY_AND_DELIGHT|Transparencia & Delight]] — Features A–L de experiencia del cliente

---

## Principios Clave

> [!abstract] Paridad Cross-Platform
> Cada feature core y cada bug fix DEBE existir en todas las plataformas. Ver [[01_PRODUCT_VISION#Principio de Paridad Cross-Platform|regla de paridad]] y [[02_FEATURES|tabla de features]].

> [!abstract] Flujo de Eventos
> El flujo core del negocio: **Cotizar → Confirmar → Cobrar anticipo → Ejecutar → Cobrar saldo → Cerrar**. Todo gira alrededor de este ciclo de vida.

> [!abstract] LATAM First
> Español nativo, precios en MXN, IVA configurable. No es una traducción — es el idioma de diseño.

---

## 📦 Histórico

Los trackers cerrados, audits puntuales y el SUPER_PLAN (programa de transformación de 12 semanas, concluido) se preservan en **[[_archive|docs/_archive/]]** como registro histórico. No están activos — la verdad actual vive en [[11_CURRENT_STATUS]] y [[09_ROADMAP]].

---

## Navegación Rápida

```mermaid
graph TB
    D["🏛️ 00_DASHBOARD<br/>Índice de navegación"]
    V[Visión] --> F[Features]
    V --> C[Competencia]
    V --> M[Monetización §4.3 taste<br/>+ §11 keys y secrets]
    F --> iOS[Arq. iOS]
    F --> And[Arq. Android]
    F --> Web[Arq. Web]
    F --> Back[Arq. Backend]
    F --> S["Estado Actual (vivo)"]
    iOS --> R[Roadmap]
    And --> R
    Web --> R
    Back --> R
    R --> G[Guía Colaboración]

    D -.-> V
    D -.-> R

    style D fill:#1B2A4A,stroke:#C4A265,color:#fff
    style S fill:#C4A265,stroke:#1B2A4A,color:#1A1A1A
    style V fill:#F5F4F1,stroke:#1B2A4A,color:#1A1A1A
    style F fill:#F5F4F1,stroke:#1B2A4A,color:#1A1A1A
    style M fill:#F5F4F1,stroke:#1B2A4A,color:#1A1A1A
    style R fill:#F5F4F1,stroke:#1B2A4A,color:#1A1A1A
```

---

> [!tip] Navegación
> Cada documento enlaza con `[[wikilinks]]` a sus dependencias. Usá el **Graph View** de Obsidian para ver las relaciones. Para estado del producto, [[11_CURRENT_STATUS|Estado Actual]] es la fuente viva.

#prd #moc #solennix
