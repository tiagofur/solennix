# Convenciones de Desarrollo — Solennix

> Homogeneidad absoluta. La consistencia extrema mejora la precisión de la IA al generar código y minimiza errores de integración.

---

## 1. Regla Suprema: DRY (Don't Repeat Yourself)

- **Reutilización:** Antes de escribir una función de utilidad, componente visual o regla de validación, buscá en la base de código si ya existe uno similar.
- **Componentes Compartidos:** Toda UI común (botones, selects, modales, tarjetas) se construye en `web/src/components/` o equivalentes móviles y se importa en lugar de duplicar HTML/CSS.
- **Utilidades Centralizadas:** Las utilidades matemáticas, de formateo de moneda (MXN), de manejo de fechas y PDFs viven en `lib/` (ej. `web/src/lib/`).

## 2. Idioma e Internacionalización (i18n)

- **Código y Base de Datos:** Los nombres de variables, funciones, clases, tablas, columnas y comentarios técnicos deben escribirse estrictamente en **inglés**.
- **UI y Mensajes (Sin Textos Duros):** Todo texto visible para el usuario final (etiquetas, botones, errores, placeholders, correos) debe utilizar obligatoriamente el sistema de traducción dinámico de la plataforma correspondiente, resuelto según el idioma de su perfil:
  - **React Web:** Usar `i18next` mediante `t('key')` (el archivo principal de traducción por defecto es `es-419` / Español Latinoamericano).
  - **Go Backend:** Las respuestas de error del API, notificaciones push y correos deben resolver plantillas localizadas dinámicamente según la preferencia idiomática del usuario.
  - **iOS Swift & Android Kotlin:** Toda vista de aplicación móvil debe resolver textos utilizando archivos de localización nativos (`Localizable.strings` y `strings.xml`), sin valores duros en el código.
- **API Endpoints:** Direcciones en minúscula y separadas por guiones (`kebab-case`). Ejemplo: `/api/inventory-items`.

## 3. Nombres y Estilos de Código

| Plataforma / Capa | Elemento | Convención | Ejemplo |
| :--- | :--- | :--- | :--- |
| **General** | Base de Datos | `snake_case` (tablas y columnas) | `inventory_items`, `user_id` |
| **Go Backend** | Funciones, Structs | `camelCase` / `PascalCase` exportados | `getEventDetails`, `Event` |
| **React Web** | Componentes, Hooks | `PascalCase` componentes, `camelCase` hooks | `EventDetail.tsx`, `usePlanLimits.ts` |
| **iOS Swift** | Vistas, Modelos | `PascalCase` con sufijos View o ViewModel | `EventFormView.swift` |
| **Android Kotlin** | Pantallas | `PascalCase` con sufijo Screen o ViewModel | `ClientListScreen.kt` |

## 4. Seguridad y Base de Datos (PostgreSQL)

- **Parámetros en Queries:** Está terminantemente prohibido concatenar variables directas en strings SQL. Usá placeholders paramétricos siempre (ej. `$1, $2`).
- **Seguridad Multi-Tenant:** Asegurá que toda consulta de inserción, actualización, eliminación o lectura valide y filtre explícitamente por el `user_id` (o tenant id) del usuario autenticado.
- **Fechas:** Todo almacenamiento de fecha y hora se realiza en formato **ISO 8601 UTC**. La conversión a hora local se delega exclusivamente a la vista de usuario.

## 5. Diseño de Habilidades (Skills) y Prompts de Agentes

- **Modularidad y Foco:** Los archivos `SKILL.md` y prompts de agentes deben mantenerse estrictamente cortos, ultra-enfocados y modulares (rango recomendado: 180–450 tokens).
- **Control de Bloat (Contexto/Tokens):** Está prohibido crear habilidades "gigantes" que abarquen múltiples dominios inconexos o añadan código innecesario. Las habilidades masivas inflan el contexto del agente de forma ineficiente y malgastan tokens.
- **Generalización vs Especificación:** Las optimizaciones aplicadas a prompts o skills globales deben ser abstractas y reutilizables en múltiples tareas. Está prohibido inyectar parches ad-hoc para resolver una sola feature si esto degrada el rendimiento de los demás agentes.

