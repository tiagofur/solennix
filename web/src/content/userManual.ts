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

export type ManualJourneyId = "first-quote" | "day-to-day";

export interface ManualArticle {
  slug: string;
  /** Global reading order across journeys (1-based). */
  order: number;
  /** Which journey group this article belongs to. */
  journey: ManualJourneyId;
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
    journey: "first-quote",
    durationMin: 2,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 3,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 3,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 4,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 4,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 5,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 6,
    screenshotsReady: { web: true, ios: true, android: true },
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
    journey: "first-quote",
    durationMin: 4,
    screenshotsReady: { web: true, ios: true, android: true },
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
  {
    slug: "registrar-pago",
    order: 9,
    journey: "day-to-day",
    durationMin: 4,
    screenshotsReady: { web: true, ios: true, android: true },
    es: {
      title: "Registrar un pago",
      description: "Cobrás seña o saldo y dejás el historial claro.",
      intro:
        "Después de la cotización aceptada, el dinero entra por el evento: seña, cuotas o liquidación. Registrar cada pago evita discusiones y te da un panel de cobros confiable.",
      why: "Un organizador profesional no “recuerda” en WhatsApp cuánto le falta cobrar: lo ve en Solennix.",
      steps: [
        {
          text: "Abrí el evento y entrá a Pagos y saldo (control de ingresos del evento).",
          image: "registrar-pago-1.png",
          callouts: {
            web: "Eventos → abrí el evento → Ver pagos del evento. Ahí ves total, pagado y saldo pendiente.",
            ios: "Detalle del evento → Pagos, o acceso desde Más.",
            android: "Detalle del evento → Pagos, o acceso desde el menú inferior/Más.",
          },
        },
        {
          text: "Tocá $ Pago (o Registrar pago), completá monto, fecha y método, y confirmá.",
          image: "registrar-pago-2.png",
          callouts: {
            web: "En el modal podés usar el atajo SALDO para cobar el pendiente completo.",
            ios: "Completá monto y método en el formulario de pago.",
            android: "Completá monto y método en el formulario de pago.",
          },
        },
        {
          text: "Revisá el historial: total pagado, saldo pendiente y el avance (por ejemplo 33% completado).",
          image: "registrar-pago-3.png",
        },
      ],
      tip: "Si el cliente te manda comprobante, anotá la referencia del transfer en la nota del pago. El menú Cobros también lista comprobantes pendientes de revisión.",
    },
    en: {
      title: "Record a payment",
      description: "Collect a deposit or balance and keep a clear history.",
      intro:
        "After a quote is accepted, money is tracked on the event: deposit, installments, or final settlement. Recording each payment avoids disputes and keeps your cashboard trustworthy.",
      why: "A professional organizer doesn’t “remember” outstanding balances in WhatsApp — they see them in Solennix.",
      steps: [
        {
          text: "Open the event and go to Payments & balance (event cash control).",
          image: "registrar-pago-1.png",
          callouts: {
            web: "Events → open the event → View event payments. You’ll see total, paid, and remaining balance.",
            ios: "Event detail → Payments, or via More.",
            android: "Event detail → Payments, or via bottom nav / More.",
          },
        },
        {
          text: "Tap $ Payment (or Record payment), enter amount, date, and method, then confirm.",
          image: "registrar-pago-2.png",
          callouts: {
            web: "In the modal, use the BALANCE shortcut to collect the full remaining amount.",
            ios: "Fill amount and method on the payment form.",
            android: "Fill amount and method on the payment form.",
          },
        },
        {
          text: "Review the history: total paid, remaining balance, and progress (e.g. 33% complete).",
          image: "registrar-pago-3.png",
        },
      ],
      tip: "If the client sends a receipt, note the transfer reference on the payment. The Payments inbox also lists receipts pending review.",
    },
  },
  {
    slug: "portal-del-cliente",
    order: 10,
    journey: "day-to-day",
    durationMin: 5,
    screenshotsReady: { web: true, ios: false, android: false },
    es: {
      title: "Portal del cliente",
      description: "Compartí un enlace privado para que el cliente vea y pague con profesionalismo.",
      intro:
        "El portal es la cara prolija de tu operación: el cliente ve su evento, el estado de pagos y puede subir comprobantes sin perseguirte por WhatsApp.",
      why: "Es lo que más genera recomendación: se siente como una agencia, no como un chat desordenado.",
      steps: [
        {
          text: "Abrí el resumen del evento. En la tarjeta Portal del cliente tocá Generar enlace.",
          image: "portal-del-cliente-1.png",
          callouts: {
            web: "Eventos → abrí el evento (resumen) → bloque Portal del cliente.",
            ios: "Detalle del evento → sección de enlace / portal del cliente.",
            android: "Detalle del evento → sección de enlace / portal del cliente.",
          },
        },
        {
          text: "Copiá el enlace o compartilo por WhatsApp. Podés rotarlo o revocarlo cuando quieras por seguridad.",
          image: "portal-del-cliente-2.png",
          callouts: {
            web: "Botones Copiar, WhatsApp, Rotar y Revocar en la misma tarjeta.",
            ios: "Acciones de compartir y gestionar el enlace en el detalle.",
            android: "Acciones de compartir y gestionar el enlace en el detalle.",
          },
        },
        {
          text: "Abrí el enlace como lo vería tu cliente: resumen del evento, pagos y acciones disponibles.",
          image: "portal-del-cliente-3.png",
        },
      ],
      tip: "Si sospechás que el link se filtró, usá Rotar: el enlace viejo deja de funcionar y generás uno nuevo al instante.",
    },
    en: {
      title: "Client portal",
      description: "Share a private link so clients can view and pay professionally.",
      intro:
        "The portal is the polished face of your operation: clients see their event, payment status, and can upload receipts without chasing you on WhatsApp.",
      why: "This is what drives referrals — it feels like an agency, not a messy chat.",
      steps: [
        {
          text: "Open the event summary. On the Client portal card, tap Generate link.",
          image: "portal-del-cliente-1.png",
          callouts: {
            web: "Events → open the event (summary) → Client portal card.",
            ios: "Event detail → client portal / share link section.",
            android: "Event detail → client portal / share link section.",
          },
        },
        {
          text: "Copy the link or share it via WhatsApp. You can rotate or revoke it anytime for security.",
          image: "portal-del-cliente-2.png",
          callouts: {
            web: "Copy, WhatsApp, Rotate, and Revoke on the same card.",
            ios: "Share and manage-link actions on the detail screen.",
            android: "Share and manage-link actions on the detail screen.",
          },
        },
        {
          text: "Open the link as your client would: event summary, payments, and available actions.",
          image: "portal-del-cliente-3.png",
        },
      ],
      tip: "If you suspect the link leaked, use Rotate: the old URL stops working and you get a new one immediately.",
    },
  },
  {
    slug: "checklist-del-evento",
    order: 11,
    journey: "day-to-day",
    durationMin: 4,
    screenshotsReady: { web: true, ios: false, android: false },
    es: {
      title: "Checklist del evento",
      description: "Tareas del día del evento generadas desde productos, equipo e insumos.",
      intro:
        "El checklist junta lo que hay que preparar y llevar: se arma solo a partir de lo que cargaste en el evento (productos, equipo, insumos y extras marcados).",
      why: "El día del evento no es momento de improvisar: marcar tareas evita olvidos y alinea al equipo.",
      steps: [
        {
          text: "Abrí el evento y tocá Ver checklist del evento en la barra de secciones.",
          image: "checklist-del-evento-1.png",
          callouts: {
            web: "En el resumen del evento: pestaña Checklist (muestra el % completado).",
            ios: "Detalle del evento → Checklist.",
            android: "Detalle del evento → Checklist.",
          },
        },
        {
          text: "Revisá las tareas autogeneradas. Marcá las que ya estén listas (setup, carga, montaje, etc.).",
          image: "checklist-del-evento-2.png",
        },
        {
          text: "Seguí el avance (por ejemplo 50% completado). Si falta algo, volvé al evento y sumá productos/equipo/insumos.",
          image: "checklist-del-evento-3.png",
        },
      ],
      tip: "Si el checklist está vacío, agregá productos, equipo o extras con “incluir en checklist” en el formulario del evento.",
    },
    en: {
      title: "Event checklist",
      description: "Day-of tasks generated from products, equipment, and supplies.",
      intro:
        "The checklist pulls together what you need to prepare and bring — built automatically from what you loaded on the event (products, equipment, supplies, and flagged extras).",
      why: "Event day is not the time to improvise: checking off tasks prevents misses and aligns the team.",
      steps: [
        {
          text: "Open the event and tap View event checklist in the section bar.",
          image: "checklist-del-evento-1.png",
          callouts: {
            web: "On the event summary: Checklist tab (shows % complete).",
            ios: "Event detail → Checklist.",
            android: "Event detail → Checklist.",
          },
        },
        {
          text: "Review auto-generated tasks. Check off what is already done (setup, load-in, install, etc.).",
          image: "checklist-del-evento-2.png",
        },
        {
          text: "Track progress (e.g. 50% complete). If something is missing, return to the event and add products/equipment/supplies.",
          image: "checklist-del-evento-3.png",
        },
      ],
      tip: "If the checklist is empty, add products, equipment, or extras with “include in checklist” on the event form.",
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

export function articlesByJourney(journey: ManualJourneyId): ManualArticle[] {
  return MANUAL_ARTICLES.filter((a) => a.journey === journey).sort(
    (a, b) => a.order - b.order
  );
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

export const MANUAL_JOURNEYS: Record<
  ManualJourneyId,
  { es: { title: string; name: string; desc: string }; en: { title: string; name: string; desc: string } }
> = {
  "first-quote": {
    es: {
      title: "Viaje principal",
      name: "De cero a tu primera cotización",
      desc: "Cuenta, cliente, producto, inventario, evento, cotización y cómo compartirla.",
    },
    en: {
      title: "Main journey",
      name: "From zero to your first quote",
      desc: "Account, client, product, inventory, event, quote, and how to share it.",
    },
  },
  "day-to-day": {
    es: {
      title: "Día a día",
      name: "Cobros y operación",
      desc: "Después del primer win: registrar pagos y llevar el evento hasta el cobro total.",
    },
    en: {
      title: "Day to day",
      name: "Collections & operations",
      desc: "After the first win: record payments and run the event through full collection.",
    },
  },
};

export const MANUAL_UI = {
  es: {
    hubTitle: "Manual de uso",
    hubSubtitle:
      "Aprendé Solennix paso a paso: de cero a tu primera cotización y el día a día.",
    journeyTitle: "Viaje principal",
    journeyName: "De cero a tu primera cotización",
    journeyDesc:
      "Ocho pasos: cuenta, cliente, producto, inventario, evento, cotización y cómo compartirla.",
    startCta: "Empezar el viaje",
    allSteps: "Todos los pasos",
    platformLabel: "Estoy usando",
    platformHint: "Las capturas y tips se adaptan a tu plataforma (Web, iOS y Android).",
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
      "El texto ya está listo. Las capturas de {platform} para este paso se publican por fases.",
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
      "Learn Solennix step by step: from zero to your first quote and everyday ops.",
    journeyTitle: "Main journey",
    journeyName: "From zero to your first quote",
    journeyDesc:
      "Eight steps: account, client, product, inventory, event, quote, and how to share it.",
    startCta: "Start the journey",
    allSteps: "All steps",
    platformLabel: "I’m using",
    platformHint: "Screenshots and tips adapt to your platform (Web, iOS, and Android).",
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
      "The guide text is ready. {platform} screenshots for this step ship in phases.",
    platforms: {
      web: "Web",
      ios: "iOS",
      android: "Android",
    } as Record<ManualPlatform, string>,
    openArticle: "Open guide",
  },
} as const;
