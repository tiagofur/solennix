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

// ── Social Media Video Schemas ──

export const BrandIntroSchema = z.object({
  tagline: z.string().default('CADA DETALLE IMPORTA'),
  url: z.string().default('solennix.com'),
});
export type BrandIntroProps = z.infer<typeof BrandIntroSchema>;

export const PainPointsSchema = z.object({
  title: z.string().default('Levanta la mano si...'),
  items: z.array(z.string()).default([
    'Cotizás en Word o Excel',
    'Llevás las finanzas en un cuaderno',
    'No sabés cuánto ganaste este mes',
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
    'Abrí Solennix',
    'Creá un evento',
    'Agregá servicios del catálogo',
    'Generá el PDF',
  ]),
  closingQuestion: z.string().default('¿Todavía cotizás en Word?'),
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
    { title: 'Presupuestos PDF', description: 'Cotizá en minutos, no en horas', icon: '📄' },
    { title: 'Control de Pagos', description: 'Señas y saldos automáticos', icon: '💰' },
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
  launchText: z.string().default('¡NUEVA APP DISPONIBLE!'),
  subText: z.string().default('Descargala hoy y transformá tu negocio de eventos'),
});
export type CountdownLaunchProps = z.infer<typeof CountdownLaunchSchema>;

