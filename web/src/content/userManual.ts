/**
 * Public user manual — journey-first content for /help/manual.
 * One narrative per article; screenshots/callouts vary by platform.
 */

export type ManualPlatform = "web" | "ios" | "android";
export type ManualLang = "es" | "en";

export const MANUAL_PLATFORM_KEY = "solennix.manual.platform";
export const MANUAL_PLATFORMS: ManualPlatform[] = ["web", "ios", "android"];

export interface ManualLocalizedStep {
  text: string;
  /** Platform-specific UI hint (sidebar vs tab bar, etc.) */
  callouts?: Partial<Record<ManualPlatform, string>>;
  /**
   * Image basename under /help/manual/{platform}/
   * e.g. "crear-cliente-1.png" → /help/manual/web/crear-cliente-1.png
   */
  image?: string;
}

export interface ManualLocalizedArticle {
  title: string;
  description: string;
  intro: string;
  steps: ManualLocalizedStep[];
  tip?: string;
  why?: string;
}

export interface ManualArticle {
  slug: string;
  /** Order inside the main journey (1-based). */
  order: number;
  durationMin: number;
  /** Platforms that already have real screenshots committed. */
  screenshotsReady: Partial<Record<ManualPlatform, boolean>>;
  es: ManualLocalizedArticle;
  en: ManualLocalizedArticle;
}

export const MANUAL_ARTICLES: ManualArticle[] = [
  {
    slug: "que-es-solennix",
    order: 1,
    durationMin: 2,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Qué es Solennix",
      description: "Para qué sirve la app y qué vas a lograr con ella.",
      intro:
        "Solennix es la suite para organizadores de eventos en LATAM: clientes, catálogo, inventario, cotizaciones, contratos y pagos en un solo lugar. Dejá de pelear con WhatsApp y planillas.",
      why: "Cuando entendés el mapa, cada pantalla deja de ser un menú y se convierte en un paso de tu operación.",
      steps: [
        {
          text: "Pensá Solennix en este orden: Cliente → Productos e inventario → Evento → Cotización → Contrato y pagos.",
          image: "que-es-solennix-1.png",
        },
        {
          text: "Web es ideal para armar cotizaciones y finanzas en la computadora. iOS y Android sirven para chequear en el lugar del evento y capturar datos al vuelo.",
          callouts: {
            web: "En Web el menú principal está en la barra lateral izquierda.",
            ios: "En iOS navegás con la barra de pestañas inferior (HIG).",
            android: "En Android usás la navegación inferior y acciones Material.",
          },
        },
        {
          text: "Los datos se sincronizan entre plataformas: creás un cliente en el celular y lo cotizás en la web.",
        },
      ],
      tip: "El primer win no es “explorar todo el menú”: es llegar a una cotización profesional con un cliente real (o de prueba).",
    },
    en: {
      title: "What is Solennix",
      description: "What the app is for and what you’ll achieve with it.",
      intro:
        "Solennix is the suite for event organizers in LATAM: clients, catalog, inventory, quotes, contracts, and payments in one place. Stop juggling WhatsApp and spreadsheets.",
      why: "Once you know the map, every screen stops being a menu and becomes a step in your operation.",
      steps: [
        {
          text: "Think of Solennix in this order: Client → Products & inventory → Event → Quote → Contract & payments.",
          image: "que-es-solennix-1.png",
        },
        {
          text: "Web is ideal for building quotes and finances on a computer. iOS and Android are great for on-site checks and quick capture.",
          callouts: {
            web: "On Web, the main menu is in the left sidebar.",
            ios: "On iOS, you navigate with the bottom tab bar (HIG).",
            android: "On Android, you use bottom navigation and Material actions.",
          },
        },
        {
          text: "Data syncs across platforms: create a client on your phone and quote them on the web.",
        },
      ],
      tip: "Your first win isn’t “browse every menu item” — it’s a professional quote for a real (or sample) client.",
    },
  },
  {
    slug: "cuenta-y-acceso",
    order: 2,
    durationMin: 3,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Cuenta y acceso",
      description: "Crear tu cuenta, iniciar sesión y entrar al panel.",
      intro:
        "Con una sola cuenta usás Web, iOS y Android. Empezá en el plan Gratis y subí de plan cuando lo necesites.",
      steps: [
        {
          text: "Abrí solennix.com y tocá Crear cuenta (o Iniciar sesión si ya tenés una).",
          image: "cuenta-y-acceso-1.png",
          callouts: {
            web: "Desde la landing: botones de registro e inicio de sesión en el encabezado.",
            ios: "Abrí la app desde el App Store e iniciá con el mismo correo.",
            android: "Abrí la app desde Play Store e iniciá con el mismo correo.",
          },
        },
        {
          text: "Completá nombre, correo y contraseña. Confirmá el correo si te lo pedimos.",
          image: "cuenta-y-acceso-2.png",
        },
        {
          text: "Al entrar vas al Dashboard: resumen de eventos, pagos y accesos rápidos.",
          image: "cuenta-y-acceso-3.png",
        },
      ],
      tip: "Usá el mismo correo en todas las plataformas. Si no ves datos en el celular, cerrá sesión y volvé a entrar.",
    },
    en: {
      title: "Account & sign-in",
      description: "Create your account, sign in, and open the dashboard.",
      intro:
        "One account works on Web, iOS, and Android. Start on Free and upgrade when you need to.",
      steps: [
        {
          text: "Open solennix.com and tap Create account (or Sign in if you already have one).",
          image: "cuenta-y-acceso-1.png",
          callouts: {
            web: "From the landing page: register and sign-in buttons in the header.",
            ios: "Open the app from the App Store and sign in with the same email.",
            android: "Open the app from Play Store and sign in with the same email.",
          },
        },
        {
          text: "Enter name, email, and password. Confirm your email if we ask for it.",
          image: "cuenta-y-acceso-2.png",
        },
        {
          text: "After sign-in you land on the Dashboard: events, payments, and quick actions.",
          image: "cuenta-y-acceso-3.png",
        },
      ],
      tip: "Use the same email on every platform. If mobile looks empty, sign out and sign back in.",
    },
  },
  {
    slug: "crear-cliente",
    order: 3,
    durationMin: 3,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Crear un cliente",
      description: "Alta del contacto que contratará el evento.",
      intro:
        "Todo evento cuelga de un cliente. Guardá nombre, teléfono y notas: después vas a cotizar y cobrar sin buscar en el chat.",
      steps: [
        {
          text: "Andá a Clientes en el menú principal.",
          image: "crear-cliente-1.png",
          callouts: {
            web: "Barra lateral → Clientes.",
            ios: "Pestaña o sección Clientes.",
            android: "Navegación → Clientes.",
          },
        },
        {
          text: "Tocá Nuevo cliente (o el botón +).",
          image: "crear-cliente-2.png",
        },
        {
          text: "Completá al menos nombre y un medio de contacto. Guardá.",
          image: "crear-cliente-3.png",
        },
        {
          text: "En el detalle del cliente vas a ver su historial de eventos cuando los crees.",
          image: "crear-cliente-4.png",
        },
      ],
      tip: "Para practicar usá un cliente de prueba, por ejemplo “Sofía & Martín — Demo”. Después podés archivarlo o borrarlo.",
    },
    en: {
      title: "Create a client",
      description: "Add the contact who will book the event.",
      intro:
        "Every event belongs to a client. Save name, phone, and notes — then quote and collect without digging through chats.",
      steps: [
        {
          text: "Go to Clients in the main menu.",
          image: "crear-cliente-1.png",
          callouts: {
            web: "Sidebar → Clients.",
            ios: "Clients tab or section.",
            android: "Navigation → Clients.",
          },
        },
        {
          text: "Tap New client (or the + button).",
          image: "crear-cliente-2.png",
        },
        {
          text: "Fill in at least a name and one contact method. Save.",
          image: "crear-cliente-3.png",
        },
        {
          text: "On the client detail you’ll see their event history once you create events.",
          image: "crear-cliente-4.png",
        },
      ],
      tip: "Practice with a sample client such as “Sofia & Martin — Demo”. You can archive or delete it later.",
    },
  },
  {
    slug: "crear-producto",
    order: 4,
    durationMin: 4,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Crear un producto",
      description: "Armá el catálogo de lo que vendés y cotizás.",
      intro:
        "Un producto es lo que ofrecés al cliente: paquete de decoración, menú, DJ, rental, etc. Sin productos, la cotización no tiene líneas que sumar.",
      steps: [
        {
          text: "Andá a Productos en el menú.",
          image: "crear-producto-1.png",
          callouts: {
            web: "Barra lateral → Productos.",
            ios: "Sección Productos.",
            android: "Navegación → Productos.",
          },
        },
        {
          text: "Tocá Nuevo producto.",
          image: "crear-producto-2.png",
        },
        {
          text: "Definí nombre, precio y una descripción clara (lo que el cliente va a leer en la cotización).",
          image: "crear-producto-3.png",
        },
        {
          text: "Guardá. Ya podés sumarlo a un evento o a una cotización rápida.",
          image: "crear-producto-4.png",
        },
      ],
      tip: "Empezá con 1–3 productos estrella. No hace falta el catálogo completo el primer día. Las recetas (ingredientes de inventario) las podés sumar después.",
    },
    en: {
      title: "Create a product",
      description: "Build the catalog of what you sell and quote.",
      intro:
        "A product is what you offer the client: décor package, menu, DJ, rental, etc. Without products, a quote has no line items.",
      steps: [
        {
          text: "Go to Products in the menu.",
          image: "crear-producto-1.png",
          callouts: {
            web: "Sidebar → Products.",
            ios: "Products section.",
            android: "Navigation → Products.",
          },
        },
        {
          text: "Tap New product.",
          image: "crear-producto-2.png",
        },
        {
          text: "Set name, price, and a clear description (what the client will read on the quote).",
          image: "crear-producto-3.png",
        },
        {
          text: "Save. You can now add it to an event or a quick quote.",
          image: "crear-producto-4.png",
        },
      ],
      tip: "Start with 1–3 flagship products. You don’t need a full catalog on day one. Recipes (inventory ingredients) can come later.",
    },
  },
  {
    slug: "crear-inventario",
    order: 5,
    durationMin: 4,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Crear un ítem de inventario",
      description: "Equipos e insumos con control de stock.",
      intro:
        "El inventario es lo físico: mesas, luces, vajilla, insumos. Te sirve para no sobrecomprometer stock y, más adelante, para recetas de productos.",
      steps: [
        {
          text: "Andá a Inventario en el menú.",
          image: "crear-inventario-1.png",
          callouts: {
            web: "Barra lateral → Inventario.",
            ios: "Sección Inventario.",
            android: "Navegación → Inventario.",
          },
        },
        {
          text: "Tocá Nuevo ítem (equipo o insumo, según corresponda).",
          image: "crear-inventario-2.png",
        },
        {
          text: "Completá nombre, cantidad disponible y unidad si aplica. Guardá.",
          image: "crear-inventario-3.png",
        },
        {
          text: "Con el stock cargado, al armar eventos podés ver qué tenés disponible.",
          image: "crear-inventario-4.png",
        },
      ],
      tip: "Producto = lo que cobrás. Inventario = lo que usás. En el onboarding alcanza con un ítem demo (por ejemplo “Sillas Tiffany × 20”).",
    },
    en: {
      title: "Create an inventory item",
      description: "Equipment and supplies with stock control.",
      intro:
        "Inventory is the physical stuff: tables, lights, dishware, supplies. It keeps you from overbooking stock and later powers product recipes.",
      steps: [
        {
          text: "Go to Inventory in the menu.",
          image: "crear-inventario-1.png",
          callouts: {
            web: "Sidebar → Inventory.",
            ios: "Inventory section.",
            android: "Navigation → Inventory.",
          },
        },
        {
          text: "Tap New item (equipment or supply, as appropriate).",
          image: "crear-inventario-2.png",
        },
        {
          text: "Enter name, available quantity, and unit if needed. Save.",
          image: "crear-inventario-3.png",
        },
        {
          text: "With stock loaded, you can see what’s available when you plan events.",
          image: "crear-inventario-4.png",
        },
      ],
      tip: "Product = what you charge for. Inventory = what you use. For onboarding, one demo item is enough (e.g. “Tiffany chairs × 20”).",
    },
  },
  {
    slug: "crear-evento",
    order: 6,
    durationMin: 5,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Crear un evento",
      description: "Fecha, cliente y el contenedor de la operación.",
      intro:
        "El evento es el “caso” del trabajo: boda, XV, corporativo. Ahí se concentran productos, extras, equipo, finanzas y checklist.",
      steps: [
        {
          text: "Andá a Eventos y tocá Nuevo evento.",
          image: "crear-evento-1.png",
          callouts: {
            web: "Barra lateral → Eventos → Nuevo.",
            ios: "Pestaña Eventos → Nuevo.",
            android: "Eventos → acción Nueva.",
          },
        },
        {
          text: "Elegí el cliente (el que creaste antes), nombre del evento y fecha.",
          image: "crear-evento-2.png",
        },
        {
          text: "Completá ubicación y tipo si los tenés. Guardá el borrador.",
          image: "crear-evento-3.png",
        },
        {
          text: "En el detalle del evento vas a sumar productos y armar la cotización.",
          image: "crear-evento-4.png",
        },
      ],
      tip: "Si aún no sabés la fecha exacta, usá una tentativa: lo importante es tener el contenedor ligado al cliente.",
    },
    en: {
      title: "Create an event",
      description: "Date, client, and the container for the job.",
      intro:
        "An event is the job case: wedding, quinceañera, corporate. It holds products, extras, equipment, finances, and checklists.",
      steps: [
        {
          text: "Go to Events and tap New event.",
          image: "crear-evento-1.png",
          callouts: {
            web: "Sidebar → Events → New.",
            ios: "Events tab → New.",
            android: "Events → New action.",
          },
        },
        {
          text: "Pick the client (the one you created), event name, and date.",
          image: "crear-evento-2.png",
        },
        {
          text: "Add location and type if you have them. Save the draft.",
          image: "crear-evento-3.png",
        },
        {
          text: "On the event detail you’ll add products and build the quote.",
          image: "crear-evento-4.png",
        },
      ],
      tip: "If the exact date isn’t final, use a tentative one — what matters is the container linked to the client.",
    },
  },
  {
    slug: "armar-cotizacion",
    order: 7,
    durationMin: 6,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Armar una cotización",
      description: "Sumá productos del catálogo y calculá el total.",
      intro:
        "Acá se junta todo: cliente + evento + productos. La cotización es lo que le mandás al cliente para que diga “sí”.",
      steps: [
        {
          text: "Abrí el evento y entrá a la sección de productos / cotización.",
          image: "armar-cotizacion-1.png",
          callouts: {
            web: "Detalle del evento → pestaña o bloque de productos y finanzas.",
            ios: "Detalle del evento → productos / presupuesto.",
            android: "Detalle del evento → productos / presupuesto.",
          },
        },
        {
          text: "Agregá uno o más productos del catálogo que creaste.",
          image: "armar-cotizacion-2.png",
        },
        {
          text: "Ajustá cantidades y precios si el paquete es a medida.",
          image: "armar-cotizacion-3.png",
        },
        {
          text: "Revisá el total. Si hace falta, sumá extras o notas visibles para el cliente.",
          image: "armar-cotizacion-4.png",
        },
      ],
      tip: "También podés usar Cotización rápida desde el menú cuando querés un PDF sin armar todo el evento todavía — ideal para el primer contacto.",
    },
    en: {
      title: "Build a quote",
      description: "Add catalog products and calculate the total.",
      intro:
        "This is where it comes together: client + event + products. The quote is what you send so the client can say “yes”.",
      steps: [
        {
          text: "Open the event and go to products / quote.",
          image: "armar-cotizacion-1.png",
          callouts: {
            web: "Event detail → products and finances tab or section.",
            ios: "Event detail → products / budget.",
            android: "Event detail → products / budget.",
          },
        },
        {
          text: "Add one or more products from the catalog you created.",
          image: "armar-cotizacion-2.png",
        },
        {
          text: "Adjust quantities and prices if the package is custom.",
          image: "armar-cotizacion-3.png",
        },
        {
          text: "Review the total. Add extras or client-facing notes if needed.",
          image: "armar-cotizacion-4.png",
        },
      ],
      tip: "You can also use Quick quote from the menu when you want a PDF before building a full event — great for first contact.",
    },
  },
  {
    slug: "compartir-cotizacion",
    order: 8,
    durationMin: 4,
    screenshotsReady: { web: true, ios: true },
    es: {
      title: "Compartir la cotización",
      description: "PDF o enlace profesional para el cliente.",
      intro:
        "El cierre del primer viaje: que el cliente vea algo prolijo. Eso es lo que genera confianza y recomendaciones.",
      steps: [
        {
          text: "Desde el evento o cotización rápida, generá el PDF de cotización.",
          image: "compartir-cotizacion-1.png",
          callouts: {
            web: "Botón de exportar / PDF en el flujo de cotización del evento o en Cotización rápida.",
            ios: "Acción de compartir / PDF en el detalle.",
            android: "Acción de compartir / PDF en el detalle.",
          },
        },
        {
          text: "Revisá que nombre del cliente, ítems y total se vean correctos.",
          image: "compartir-cotizacion-2.png",
        },
        {
          text: "Enviá el PDF por el canal que uses (WhatsApp, mail) o compartí el enlace del portal si está habilitado.",
          image: "compartir-cotizacion-3.png",
        },
      ],
      tip: "¡Listo el primer circuito! Después podés seguir con contrato, pagos y checklist del día del evento — eso ya es el día a día en Solennix.",
    },
    en: {
      title: "Share the quote",
      description: "Professional PDF or link for your client.",
      intro:
        "Close the first journey: your client sees something polished. That’s what builds trust and referrals.",
      steps: [
        {
          text: "From the event or quick quote, generate the quote PDF.",
          image: "compartir-cotizacion-1.png",
          callouts: {
            web: "Export / PDF on the event quote flow or Quick quote.",
            ios: "Share / PDF action on the detail screen.",
            android: "Share / PDF action on the detail screen.",
          },
        },
        {
          text: "Check that client name, line items, and total look right.",
          image: "compartir-cotizacion-2.png",
        },
        {
          text: "Send the PDF on your usual channel (WhatsApp, email) or share the client portal link if enabled.",
          image: "compartir-cotizacion-3.png",
        },
      ],
      tip: "First loop done! Next come contract, payments, and the day-of checklist — that’s everyday Solennix.",
    },
  },
];

export function getManualArticle(slug: string): ManualArticle | undefined {
  return MANUAL_ARTICLES.find((a) => a.slug === slug);
}

export function getLocalizedArticle(
  article: ManualArticle,
  lang: ManualLang
): ManualLocalizedArticle {
  return lang === "en" ? article.en : article.es;
}

export function manualImageSrc(
  platform: ManualPlatform,
  filename: string
): string {
  return `/help/manual/${platform}/${filename}`;
}

export function nextArticleSlug(slug: string): string | undefined {
  const sorted = [...MANUAL_ARTICLES].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((a) => a.slug === slug);
  if (idx < 0 || idx >= sorted.length - 1) return undefined;
  return sorted[idx + 1]?.slug;
}

export function prevArticleSlug(slug: string): string | undefined {
  const sorted = [...MANUAL_ARTICLES].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((a) => a.slug === slug);
  if (idx <= 0) return undefined;
  return sorted[idx - 1]?.slug;
}

export const MANUAL_UI = {
  es: {
    hubTitle: "Manual de uso",
    hubSubtitle:
      "Aprendé Solennix paso a paso: de cero a tu primera cotización profesional.",
    journeyTitle: "Viaje principal",
    journeyName: "De cero a tu primera cotización",
    journeyDesc:
      "Ocho pasos: cuenta, cliente, producto, inventario, evento, cotización y cómo compartirla.",
    startCta: "Empezar el viaje",
    allSteps: "Todos los pasos",
    platformLabel: "Estoy usando",
    platformHint: "Las capturas y tips se adaptan a tu plataforma.",
    minutes: "min",
    stepOf: "Paso {n} de {total}",
    next: "Siguiente",
    prev: "Anterior",
    backToManual: "Volver al manual",
    backToHelp: "Centro de ayuda",
    tip: "Tip",
    why: "Por qué importa",
    screenshotPending: "Captura en camino",
    screenshotPendingBody:
      "El texto ya está listo. Las capturas de {platform} se publican por fases (Web primero).",
    platforms: {
      web: "Web",
      ios: "iOS",
      android: "Android",
    } as Record<ManualPlatform, string>,
    openArticle: "Abrir guía",
  },
  en: {
    hubTitle: "User manual",
    hubSubtitle:
      "Learn Solennix step by step: from zero to your first professional quote.",
    journeyTitle: "Main journey",
    journeyName: "From zero to your first quote",
    journeyDesc:
      "Eight steps: account, client, product, inventory, event, quote, and how to share it.",
    startCta: "Start the journey",
    allSteps: "All steps",
    platformLabel: "I’m using",
    platformHint: "Screenshots and tips adapt to your platform.",
    minutes: "min",
    stepOf: "Step {n} of {total}",
    next: "Next",
    prev: "Previous",
    backToManual: "Back to manual",
    backToHelp: "Help center",
    tip: "Tip",
    why: "Why it matters",
    screenshotPending: "Screenshot coming soon",
    screenshotPendingBody:
      "The guide text is ready. {platform} screenshots ship in phases (Web first).",
    platforms: {
      web: "Web",
      ios: "iOS",
      android: "Android",
    } as Record<ManualPlatform, string>,
    openArticle: "Open guide",
  },
} as const;
