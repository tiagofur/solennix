// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
// Source: versioning/releases.json
export const changelogData = {
  "schemaVersion": 1,
  "updatedAt": "2026-05-06",
  "currentVersions": {
    "web": {
      "version": "1.0.1",
      "source": "web/package.json"
    },
    "ios": {
      "version": "1.2.0",
      "build": "7",
      "source": "ios/project.yml"
    },
    "android": {
      "version": "1.2.0",
      "build": "6",
      "source": "android/app/build.gradle.kts"
    },
    "backend": {
      "version": "1.0.0",
      "source": "backend/VERSION"
    }
  },
  "releases": [
    {
      "id": "2026-05-06-mobile-1-2-0-and-web-1-0-1-release-train",
      "date": "2026-05-06",
      "title": "Release train móvil 1.2.0 + Web 1.0.1",
      "summary": "Se prepara el siguiente release de tiendas con mejoras reales de paridad en búsqueda, disponibilidad de equipo y calendario; Web recibe un patch visible para acompañar el changelog público y el reposicionamiento del producto.",
      "platforms": {
        "web": [
          "La versión declarada de Web sube a 1.0.1 para reflejar el siguiente batch público de mejoras.",
          "La app consume búsqueda de eventos server-backed (`/api/events/search`) y se alinea mejor con mobile en resultados y filtros.",
          "Landing, Help y changelog público quedan listos como superficie coherente de comunicación del release."
        ],
        "ios": [
          "iOS sube a 1.2.0 (build 7) con búsqueda de eventos apoyada en backend y mejor coherencia de resultados.",
          "Calendario gana paridad funcional con filtro por estado, exportación iCal, retry y navegación refinada.",
          "Se recuperan widgets clave del Dashboard y se corrige el guardado de ajustes de stock."
        ],
        "android": [
          "Android sube a 1.2.0 (versionCode 6) con búsqueda server-backed y disponibilidad de equipo integrada al flujo de eventos.",
          "Calendario alcanza paridad con estado, iCal, retry, FAB y navegación desde eventos.",
          "Los formularios scrolleables usan `imePadding()` para evitar que el teclado tape acciones o campos."
        ],
        "backend": [
          "El backend mantiene 1.0.0 como versión canónica del API en este release train.",
          "Las apps consumen capacidades ya presentes en el API actual para `/api/events/search`, disponibilidad de equipo y exportación iCal."
        ]
      }
    },
    {
      "id": "2026-05-04-web-backend-1-0-0-and-help-polish",
      "date": "2026-05-04",
      "title": "Baseline 1.0.0 para Web y Backend + Help alineado al diseño",
      "summary": "Web y Backend quedan formalmente en 1.0.0 bajo el manifest canónico, con changelog oficial regenerado y Help Center visualmente alineado al sistema de diseño.",
      "platforms": {
        "web": [
          "La versión pública de Web sube a 1.0.0 y queda gobernada desde versioning/releases.json + web/package.json.",
          "About deja de hardcodear la versión y consume el valor generado desde changelog.generated.ts.",
          "Help Center adopta tokens del design system (bg/card/border/text/primary) para respetar light/dark theme y consistencia visual con el resto de la app."
        ],
        "ios": [],
        "android": [],
        "backend": [
          "backend/VERSION sube a 1.0.0 como referencia estable del API en producción.",
          "La documentación de arquitectura backend deja explícito que backend/VERSION, no go.mod, es la fuente de verdad para versionado del servicio."
        ]
      }
    },
    {
      "id": "2026-05-03-platform-parity-and-stability",
      "date": "2026-05-03",
      "title": "Paridad de flujo de eventos y estabilidad general",
      "summary": "Se consolidaron mejoras de UX y fixes criticos en mobile y web para formulario, pagos y PDFs.",
      "platforms": {
        "web": [
          "Fix de descuento en PDF de contrato/cotizacion para que coincida con Finanzas.",
          "Confirmacion antes de eliminar productos, extras, equipo o insumos.",
          "Alerta inline de sobrestock en equipamiento en formulario de evento."
        ],
        "ios": [
          "Fix de crash al eliminar extra o insumo vacio en formulario de evento.",
          "Fix de descuento en PDF de contrato para mantener consistencia con pantalla financiera.",
          "Paridad de UI de equipamiento con alerta de sobrestock no bloqueante."
        ],
        "android": [
          "Boton Liquidar en pagos para autocompletar saldo pendiente.",
          "Confirmacion previa para eliminar pagos.",
          "Generacion de PDF en segundo plano para evitar congelamiento de UI."
        ],
        "backend": [
          "Contratos de API y reglas de negocio alineados con los fixes de descuentos y pagos.",
          "Refuerzo de consistencia para calculos mostrados en clientes API."
        ]
      }
    }
  ]
} as const;
