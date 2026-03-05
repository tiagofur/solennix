# Solennix Mobile

Documentación para la aplicación móvil de Solennix, construida con React Native + Expo.

## Índice

- [PRD (Product Requirements Document)](./PRD.md) — Requisitos del producto, alcance, decisiones clave
- [Arquitectura](./architecture.md) — Stack técnico, estructura del proyecto, navegación, código reutilizable
- [Plan de Implementación](./implementation-plan.md) — Fases, tareas, estimaciones de tiempo

## Contexto

La app mobile replica el MVP de la app web, adaptada a patrones UX nativos de iOS/Android. Utiliza el mismo backend Go existente y reutiliza ~60% de la lógica TypeScript (tipos, servicios, hooks, validaciones) copiándola al proyecto mobile.

## Stack Principal

| Capa          | Tecnología                            |
| ------------- | ------------------------------------- |
| Framework     | React Native 0.79+ (New Architecture) |
| Tooling       | Expo SDK 53 (managed workflow)        |
| Navigation    | React Navigation 7                    |
| State         | Zustand + React Hook Form + Zod       |
| Subscriptions | RevenueCat (`react-native-purchases`) |
| Testing       | Jest + RNTL (unit), Maestro (E2E)     |

## Quick Links

- [Web app docs](../development/setup.md)
- [Backend API routes](../architecture/system-overview.md)
- [Deployment docs](../deployment/)
