import { z } from 'zod';

export const ClientTutorialSchema = z.object({
  clientName: z.string().default('María García López'),
  clientPhone: z.string().default('55 1234 5678'),
  clientEmail: z.string().default('maria@correo.com'),
  clientAddress: z.string().default('Av. Reforma 234, Col. Centro'),
  clientCity: z.string().default('Ciudad de México'),
  clientNotes: z.string().default('Cliente VIP'),
});

export type ClientTutorialProps = z.infer<typeof ClientTutorialSchema>;

export const InventoryTutorialSchema = z.object({
  itemName: z.string().default('Hielo (Bolsa 5kg)'),
  itemCategory: z.string().default('Consumible'),
  itemStock: z.string().default('50'),
  itemMinStock: z.string().default('10'),
  itemUnit: z.string().default('Bolsas'),
  itemCost: z.string().default('35.00'),
});

export type InventoryTutorialProps = z.infer<typeof InventoryTutorialSchema>;

export const ProductTutorialSchema = z.object({
  productName: z.string().default('Pastel Fondant 3 Pisos'),
  productCategory: z.string().default('Pastelería'),
  productPrice: z.string().default('2,500.00'),
});

export type ProductTutorialProps = z.infer<typeof ProductTutorialSchema>;

export const CotizacionTutorialSchema = z.object({
  // Step 1: General Info
  clientName: z.string().default('Ana González'),
  eventDate: z.string().default('28/03/2026'),
  startTime: z.string().default('18:00'),
  endTime: z.string().default('23:00'),
  serviceType: z.string().default('Decoración y Banquete'),
  numPeople: z.string().default('150'),
  // Step 2: Products
  productName: z.string().default('Decoración Completa'),
  productQty: z.string().default('1'),
  productPrice: z.string().default('$8,000.00'),
  productTotal: z.string().default('$8,000.00'),
  // Step 5: Financials
  discountValue: z.string().default('5'),
  totalAmount: z.string().default('$8,816.00'),
  depositAmount: z.string().default('$4,408.00'),
});

export type CotizacionTutorialProps = z.infer<typeof CotizacionTutorialSchema>;

// ── Social Media Video Schemas ──

export const BrandIntroSchema = z.object({
  tagline: z.string().default('CADA DETALLE IMPORTA'),
  url: z.string().default('solennix.com'),
});
export type BrandIntroProps = z.infer<typeof BrandIntroSchema>;

export const PainPointsSchema = z.object({
  title: z.string().default('Levanta la mano si...'),
  items: z.array(z.string()).default([
    'Haces cotizaciones en Word o Excel',
    'Llevas las finanzas en una libreta',
    'No sabes cuánto ganaste este mes',
    'Tu agenda está en 3 apps distintas',
    'Tus cambios tardan 1 hora',
  ]),
  closingLine: z.string().default('Hay una mejor manera.'),
});
export type PainPointsProps = z.infer<typeof PainPointsSchema>;

export const BeforeAfterSchema = z.object({
  comparisons: z.array(z.object({
    before: z.string(),
    after: z.string(),
    beforeLabel: z.string(),
    afterLabel: z.string(),
  })).default([
    { before: 'Cotización en Word...', after: 'PDF profesional en 60s', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
    { before: 'Finanzas en cuaderno', after: 'Dashboard financiero', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
    { before: 'Contrato por WhatsApp', after: 'Contrato PDF con tu marca', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
  ]),
});
export type BeforeAfterProps = z.infer<typeof BeforeAfterSchema>;

export const FeatureShowcaseSchema = z.object({
  title: z.string().default('5 cosas que puedes hacer con Solennix'),
  features: z.array(z.object({
    name: z.string(),
    description: z.string(),
    icon: z.string(),
  })).default([
    { name: 'Dashboard', description: 'Ingresos, eventos, clientes — todo en un vistazo', icon: '📊' },
    { name: 'Cotizaciones PDF', description: 'Con tu logo, desglose e IVA calculado', icon: '📄' },
    { name: 'Calendario', description: 'Nunca más olvides una fecha', icon: '📅' },
    { name: 'Inventario', description: 'Equipos, insumos y listas de compras', icon: '📦' },
    { name: 'Contratos PDF', description: 'Con tus datos y tus términos', icon: '📋' },
  ]),
});
export type FeatureShowcaseProps = z.infer<typeof FeatureShowcaseSchema>;

export const QuoteInSecondsSchema = z.object({
  title: z.string().default('Cotización profesional en 60 segundos'),
  steps: z.array(z.string()).default([
    'Abre Solennix',
    'Crea un evento',
    'Agrega servicios del catálogo',
    'Genera el PDF',
  ]),
  closingQuestion: z.string().default('¿Todavía haces cotizaciones en Word?'),
});
export type QuoteInSecondsProps = z.infer<typeof QuoteInSecondsSchema>;

// ── Fase 2: Expansión ──

export const ClientPOVSchema = z.object({
  clientText: z.string().default('Lo que ve tu cliente:'),
  clientEvents: z.array(z.string()).default([
    'Tranquilidad absoluta',
    'Presupuesto claro',
    'Respuesta rápida',
  ]),
  realityText: z.string().default('Tu realidad (sin Solennix):'),
  realityEvents: z.array(z.string()).default([
    'Caos en Excel',
    'Papeles perdidos',
    'Estrés infinito',
  ]),
});
export type ClientPOVProps = z.infer<typeof ClientPOVSchema>;

export const FeatureCarouselSchema = z.object({
  slides: z.array(z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string(),
  })).default([
    { title: 'Presupuestos PDF', description: 'Cotiza en minutos, no en horas', icon: '📄' },
    { title: 'Control de Pagos', description: 'Anticipos y saldos automáticos', icon: '💰' },
    { title: 'Calendario Visual', description: 'Tus fechas siempre organizadas', icon: '📅' },
    { title: 'Inventario Exacto', description: 'Stock, insumos y compras', icon: '📦' },
  ])
});
export type FeatureCarouselProps = z.infer<typeof FeatureCarouselSchema>;

export const TestimonialTemplateSchema = z.object({
  clientName: z.string().default('Juan Pérez'),
  clientRole: z.string().default('Event Planner'),
  testimonial: z.string().default('Desde que uso Solennix, mi tiempo rinde el doble. Mis clientes aman lo rápido que cotizo y yo recuperé mis fines de semana.'),
  stars: z.number().min(1).max(5).default(5),
});
export type TestimonialTemplateProps = z.infer<typeof TestimonialTemplateSchema>;

export const CountdownLaunchSchema = z.object({
  launchText: z.string().default('TODO EN ORDEN'),
  subText: z.string().default('Clientes, eventos, pagos y cotizaciones en una sola app'),
});
export type CountdownLaunchProps = z.infer<typeof CountdownLaunchSchema>;

export const ChaosToOrderSchema = z.object({
  tagline: z.string().default('Todo tu negocio de eventos.\nUna sola app. Cero caos.'),
  url: z.string().default('solennix.com'),
});
export type ChaosToOrderProps = z.infer<typeof ChaosToOrderSchema>;

export const V05QuotesSchema = z.object({
  hookTimes: z.array(z.string()).default(['30 minutos', '1 hora', 'medio día']),
  clientName: z.string().default('Sofía Martínez'),
  eventName: z.string().default('Boda Jardín Primavera'),
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      price: z.string(),
    }),
  ).default([
    { name: 'Banquete premium', description: '120 invitados', price: '$42,000' },
    { name: 'Decoración floral', description: 'Mesa principal y ceremonia', price: '$18,500' },
    { name: 'DJ y audio', description: '5 horas de servicio', price: '$9,800' },
  ]),
  totalAmount: z.string().default('$70,300'),
  url: z.string().default('solennix.com'),
});
export type V05QuotesProps = z.infer<typeof V05QuotesSchema>;

export const V06PaymentsSchema = z.object({
  alertCount: z.number().default(4),
  pendingAmount: z.string().default('$28,400'),
  payments: z.array(
    z.object({
      label: z.string(),
      method: z.string(),
      amount: z.string(),
      status: z.enum(['paid', 'pending']),
    }),
  ).default([
    { label: 'Anticipo inicial', method: 'Transferencia', amount: '$12,000', status: 'paid' },
    { label: 'Segundo pago', method: 'Tarjeta', amount: '$8,400', status: 'paid' },
    { label: 'Saldo final', method: 'Pendiente', amount: '$8,000', status: 'pending' },
  ]),
  url: z.string().default('solennix.com'),
});
export type V06PaymentsProps = z.infer<typeof V06PaymentsSchema>;

export const V07InventorySchema = z.object({
  inventoryItems: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      stock: z.number(),
      minimum: z.number(),
      unit: z.string(),
    }),
  ).default([
    { name: 'Sillas Tiffany', category: 'Mobiliario', stock: 140, minimum: 100, unit: 'pzas' },
    { name: 'Manteles marfil', category: 'Textiles', stock: 32, minimum: 18, unit: 'pzas' },
    { name: 'Copas de cristal', category: 'Cristalería', stock: 18, minimum: 24, unit: 'pzas' },
  ]),
  lowStockItem: z.object({
    name: z.string(),
    stock: z.number(),
    minimum: z.number(),
    unit: z.string(),
  }).default({
    name: 'Copas de cristal',
    stock: 18,
    minimum: 24,
    unit: 'pzas',
  }),
  equipmentAssignments: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      notes: z.string(),
    }),
  ).default([
    { name: 'Cabina DJ', quantity: '1 set', notes: 'Escenario principal' },
    { name: 'Letras gigantes', quantity: '4 piezas', notes: 'Recepción jardín' },
    { name: 'Luces uplight', quantity: '12 piezas', notes: 'Pasillo y pista' },
  ]),
  url: z.string().default('solennix.com'),
});
export type V07InventoryProps = z.infer<typeof V07InventorySchema>;
