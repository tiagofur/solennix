import { Folder, Composition } from 'remotion';
import { ClientTutorial } from './tutorials/ClientTutorial';
import { InventoryTutorial } from './tutorials/InventoryTutorial';
import { ProductTutorial } from './tutorials/ProductTutorial';
import { CotizacionTutorial } from './tutorials/CotizacionTutorial';
import {
  ClientTutorialSchema,
  InventoryTutorialSchema,
  ProductTutorialSchema,
  CotizacionTutorialSchema,
  BrandIntroSchema,
  PainPointsSchema,
  BeforeAfterSchema,
  FeatureShowcaseSchema,
  QuoteInSecondsSchema,
  ClientPOVSchema,
  FeatureCarouselSchema,
  TestimonialTemplateSchema,
  CountdownLaunchSchema,
} from './schema';
import { FPS, DURATION_FRAMES, COTIZACION_DURATION_FRAMES, SOCIAL_FPS, SOCIAL_FORMATS } from './constants';
import { BrandIntro } from './social/BrandIntro';
import { PainPoints } from './social/PainPoints';
import { BeforeAfter } from './social/BeforeAfter';
import { FeatureShowcase } from './social/FeatureShowcase';
import { QuoteInSeconds } from './social/QuoteInSeconds';
import { ClientPOV } from './social/ClientPOV';
import { FeatureCarousel } from './social/FeatureCarousel';
import { TestimonialTemplate } from './social/TestimonialTemplate';
import { CountdownLaunch } from './social/CountdownLaunch';

export const RemotionRoot = () => {
  return (
    <>
      {/* ═══ TUTORIALES (1920×1080) ═══ */}
      <Folder name="Tutoriales">
        <Composition
          id="ClientTutorial"
          component={ClientTutorial}
          schema={ClientTutorialSchema}
          durationInFrames={DURATION_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            clientName: 'María García López',
            clientPhone: '55 1234 5678',
            clientEmail: 'maria@correo.com',
            clientAddress: 'Av. Reforma 234, Col. Centro',
            clientCity: 'Ciudad de México',
            clientNotes: 'Cliente VIP',
          }}
        />
        <Composition
          id="InventoryTutorial"
          component={InventoryTutorial}
          schema={InventoryTutorialSchema}
          durationInFrames={DURATION_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            itemName: 'Hielo (Bolsa 5kg)',
            itemCategory: 'Consumible',
            itemStock: '50',
            itemMinStock: '10',
            itemUnit: 'Bolsas',
            itemCost: '35.00',
          }}
        />
        <Composition
          id="ProductTutorial"
          component={ProductTutorial}
          schema={ProductTutorialSchema}
          durationInFrames={DURATION_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            productName: 'Pastel Fondant 3 Pisos',
            productCategory: 'Pastelería',
            productPrice: '2,500.00',
          }}
        />
        <Composition
          id="CotizacionTutorial"
          component={CotizacionTutorial}
          schema={CotizacionTutorialSchema}
          durationInFrames={COTIZACION_DURATION_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            clientName: 'Ana González',
            eventDate: '28/03/2026',
            startTime: '18:00',
            endTime: '23:00',
            serviceType: 'Decoración y Banquete',
            numPeople: '150',
            productName: 'Decoración Completa',
            productQty: '1',
            productPrice: '$8,000.00',
            productTotal: '$8,000.00',
            discountValue: '5',
            totalAmount: '$8,816.00',
            depositAmount: '$4,408.00',
          }}
        />
      </Folder>

      {/* ═══ INSTAGRAM / REDES SOCIALES ═══ */}
      <Folder name="Instagram">
        {/* BrandIntro — Reel (9:16) */}
        <Composition
          id="BrandIntro-Reel"
          component={BrandIntro}
          schema={BrandIntroSchema}
          durationInFrames={150}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            tagline: 'CADA DETALLE IMPORTA',
            url: 'solennix.com',
          }}
        />
        {/* BrandIntro — Feed (1:1) */}
        <Composition
          id="BrandIntro-Feed"
          component={BrandIntro}
          schema={BrandIntroSchema}
          durationInFrames={150}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.FEED.width}
          height={SOCIAL_FORMATS.FEED.height}
          defaultProps={{
            tagline: 'CADA DETALLE IMPORTA',
            url: 'solennix.com',
          }}
        />
        {/* PainPoints — Feed (1:1) */}
        <Composition
          id="PainPoints"
          component={PainPoints}
          schema={PainPointsSchema}
          durationInFrames={450}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.FEED.width}
          height={SOCIAL_FORMATS.FEED.height}
          defaultProps={{
            title: 'Levanta la mano si...',
            items: [
              'Cotizás en Word o Excel',
              'Llevás las finanzas en un cuaderno',
              'No sabés cuánto ganaste este mes',
              'Tu agenda está en 3 apps distintas',
              'Tus cambios tardan 1 hora',
            ],
            closingLine: 'Hay una mejor manera.',
          }}
        />
        {/* BeforeAfter — Reel (9:16) */}
        <Composition
          id="BeforeAfter"
          component={BeforeAfter}
          schema={BeforeAfterSchema}
          durationInFrames={600}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            comparisons: [
              { before: 'Cotización en Word...', after: 'PDF profesional en 60s', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
              { before: 'Finanzas en cuaderno', after: 'Dashboard financiero', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
              { before: 'Contrato por WhatsApp', after: 'Contrato PDF con tu marca', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
            ],
          }}
        />
        {/* FeatureShowcase — Reel (9:16) */}
        <Composition
          id="FeatureShowcase"
          component={FeatureShowcase}
          schema={FeatureShowcaseSchema}
          durationInFrames={900}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            title: '5 cosas que puedes hacer con Solennix',
            features: [
              { name: 'Dashboard', description: 'Ingresos, eventos, clientes — todo en un vistazo', icon: '📊' },
              { name: 'Cotizaciones PDF', description: 'Con tu logo, desglose e IVA calculado', icon: '📄' },
              { name: 'Calendario', description: 'Nunca más olvides una fecha', icon: '📅' },
              { name: 'Inventario', description: 'Equipos, insumos y listas de compras', icon: '📦' },
              { name: 'Contratos PDF', description: 'Con tus datos y tus términos', icon: '📋' },
            ],
          }}
        />
        {/* QuoteInSeconds — Reel (9:16) */}
        <Composition
          id="QuoteInSeconds"
          component={QuoteInSeconds}
          schema={QuoteInSecondsSchema}
          durationInFrames={450}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            title: 'Cotización profesional en 60 segundos',
            steps: [
              'Abrí Solennix',
              'Creá un evento',
              'Agregá servicios del catálogo',
              'Generá el PDF',
            ],
            closingQuestion: '¿Todavía cotizás en Word?',
          }}
        />

        {/* ═══ REDES SOCIALES FASE 2 ═══ */}
        <Composition
          id="ClientPOV"
          component={ClientPOV}
          schema={ClientPOVSchema}
          durationInFrames={450}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            clientText: 'Lo que ve tu cliente:',
            clientEvents: ['Tranquilidad absoluta', 'Presupuesto claro', 'Respuesta rápida'],
            realityText: 'Tu realidad (sin Solennix):',
            realityEvents: ['Caos en Excel', 'Papeles perdidos', 'Estrés infinito'],
          }}
        />
        <Composition
          id="FeatureCarousel"
          component={FeatureCarousel}
          schema={FeatureCarouselSchema}
          durationInFrames={750}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.FEED.width}
          height={SOCIAL_FORMATS.FEED.height}
          defaultProps={{
            slides: [
              { title: 'Presupuestos PDF', description: 'Cotizá en minutos, no en horas', icon: '📄' },
              { title: 'Control de Pagos', description: 'Señas y saldos automáticos', icon: '💰' },
              { title: 'Calendario Visual', description: 'Tus fechas siempre organizadas', icon: '📅' },
              { title: 'Inventario Exacto', description: 'Stock, insumos y compras', icon: '📦' },
            ]
          }}
        />
        <Composition
          id="TestimonialTemplate-Reel"
          component={TestimonialTemplate}
          schema={TestimonialTemplateSchema}
          durationInFrames={300}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            clientName: 'Juan Pérez',
            clientRole: 'Event Planner',
            testimonial: 'Desde que uso Solennix, mi tiempo rinde el doble. Mis clientes aman lo rápido que cotizo y yo recuperé mis fines de semana.',
            stars: 5,
          }}
        />
        <Composition
          id="TestimonialTemplate-Feed"
          component={TestimonialTemplate}
          schema={TestimonialTemplateSchema}
          durationInFrames={300}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.FEED.width}
          height={SOCIAL_FORMATS.FEED.height}
          defaultProps={{
            clientName: 'Juan Pérez',
            clientRole: 'Event Planner',
            testimonial: 'Desde que uso Solennix, mi tiempo rinde el doble. Mis clientes aman lo rápido que cotizo y yo recuperé mis fines de semana.',
            stars: 5,
          }}
        />
        <Composition
          id="CountdownLaunch"
          component={CountdownLaunch}
          schema={CountdownLaunchSchema}
          durationInFrames={450}
          fps={SOCIAL_FPS}
          width={SOCIAL_FORMATS.REEL.width}
          height={SOCIAL_FORMATS.REEL.height}
          defaultProps={{
            launchText: '¡NUEVA APP DISPONIBLE!',
            subText: 'Descargala hoy y transformá tu negocio de eventos',
          }}
        />
      </Folder>
    </>
  );
};
