import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { FeatureCarouselProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * FeatureCarousel — Simulación de carrusel de Instagram
 * Format: 1:1 Feed · ~20-25 seconds
 */
export const FeatureCarousel: React.FC<FeatureCarouselProps> = ({
  slides = [
    { title: 'Presupuestos PDF', description: 'Cotizá en minutos, no en horas', icon: '📄' },
    { title: 'Control de Pagos', description: 'Señas y saldos automáticos', icon: '💰' },
    { title: 'Calendario Visual', description: 'Tus fechas siempre organizadas', icon: '📅' },
    { title: 'Inventario Exacto', description: 'Stock, insumos y compras', icon: '📦' },
  ]
}) => {
  return (
    <AbsoluteFill style={{ background: SOCIAL_COLORS.navy }}>
      <TransitionSeries>
        {/* Intro */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <IntroSlide title="Todo lo que necesitas" subtitle="Para llevar tu negocio al siguiente nivel" />
        </TransitionSeries.Sequence>

        {/* Carousel Slides */}
        {slides.map((slideData, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Transition
              presentation={slide({ direction: 'from-right' })}
              timing={linearTiming({ durationInFrames: 25 })} // slower swipe for carousel feel
            />
            <TransitionSeries.Sequence durationInFrames={150}>
              <CarouselSlide
                title={slideData.title}
                description={slideData.description}
                icon={slideData.icon}
                index={i}
                total={slides.length}
              />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        {/* Outro */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <OutroSlide />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const IntroSlide: React.FC<{ title: string, subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = interpolate(frame, [0, 20], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleO = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  const subY = interpolate(frame, [15, 35], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subO = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, ${SOCIAL_COLORS.navyLight} 0%, transparent 70%)`, opacity: 0.5 }} />

      <div style={{ transform: `translateY(${titleY}px)`, opacity: titleO, fontFamily: cinzel, fontSize: 60, color: SOCIAL_COLORS.gold, fontWeight: 700, textAlign: 'center', zIndex: 1, marginBottom: 20 }}>
        {title}
      </div>
      <div style={{ transform: `translateY(${subY}px)`, opacity: subO, fontFamily: inter, fontSize: 32, color: SOCIAL_COLORS.cream, fontWeight: 300, textAlign: 'center', zIndex: 1 }}>
        {subtitle}
      </div>
      
      {/* Swipe indicator */}
      <div style={{ position: 'absolute', bottom: 60, display: 'flex', alignItems: 'center', gap: 10, opacity: interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
        <span style={{ fontSize: 30 }}>👉</span>
        <span style={{ fontFamily: inter, fontSize: 24, color: SOCIAL_COLORS.textMuted }}>Deslizá</span>
      </div>
    </AbsoluteFill>
  );
};

const CarouselSlide: React.FC<{ title: string, description: string, icon: string, index: number, total: number }> = ({ title, description, icon, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide-in elements
  const iconScale = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 12 } });
  
  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, backgroundColor: SOCIAL_COLORS.navy }}>
      
      {/* App Mockup Card container */}
      <div style={{ 
        width: '100%', 
        height: '70%', 
        backgroundColor: SOCIAL_COLORS.creamWarm,
        borderRadius: 30,
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 30,
        border: `2px solid ${SOCIAL_COLORS.goldDark}`
      }}>
        <div style={{ fontSize: 120, transform: `scale(${iconScale})` }}>{icon}</div>
        <div style={{ fontFamily: cinzel, fontSize: 50, color: SOCIAL_COLORS.navyDark, fontWeight: 700, textAlign: 'center' }}>
          {title}
        </div>
        <div style={{ fontFamily: inter, fontSize: 34, color: SOCIAL_COLORS.textMuted, textAlign: 'center', lineHeight: 1.4, maxWidth: '90%' }}>
          {description}
        </div>
      </div>

      {/* Pagination dots */}
      <div style={{ position: 'absolute', bottom: 80, display: 'flex', gap: 12 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            backgroundColor: i === index ? SOCIAL_COLORS.gold : 'rgba(255,255,255,0.2)',
            transition: 'background-color 0.3s'
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const OutroSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoY = interpolate(frame, [0, 20], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoO = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{ transform: `translateY(${logoY}px)`, opacity: logoO, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        <SolennixLogoDark size={80} animateIn={false} showWordmark />
        <div style={{ fontFamily: cinzel, fontSize: 44, color: SOCIAL_COLORS.cream, fontWeight: 600, textAlign: 'center' }}>
          Empezá hoy.
        </div>
        <div style={{ fontFamily: inter, fontSize: 24, letterSpacing: 6, color: SOCIAL_COLORS.gold, marginTop: 20 }}>
          SOLENNIX.COM
        </div>
      </div>
    </AbsoluteFill>
  );
};
