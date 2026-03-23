import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { FeatureShowcaseProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * FeatureShowcase — "5 cosas que puedes hacer con Solennix"
 * Format: 9:16 Reel · ~30 seconds (900 frames @ 30fps)
 */
export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
  title = '5 cosas que puedes hacer con Solennix',
  features = [
    { name: 'Dashboard', description: 'Ingresos, eventos, clientes — todo en un vistazo', icon: '📊' },
    { name: 'Cotizaciones PDF', description: 'Con tu logo, desglose e IVA calculado', icon: '📄' },
    { name: 'Calendario', description: 'Nunca más olvides una fecha', icon: '📅' },
    { name: 'Inventario', description: 'Equipos, insumos y listas de compras', icon: '📦' },
    { name: 'Contratos PDF', description: 'Con tus datos y tus términos', icon: '📋' },
  ],
}) => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Title card */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <TitleCard title={title} />
        </TransitionSeries.Sequence>

        {/* Feature cards */}
        {features.map((feature, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Transition
              presentation={slide({ direction: 'from-right' })}
              timing={linearTiming({ durationInFrames: 15 })}
            />
            <TransitionSeries.Sequence durationInFrames={140}>
              <FeatureCard
                name={feature.name}
                description={feature.description}
                icon={feature.icon}
                index={i}
                isAlternate={i % 2 === 1}
              />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        {/* Closing */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 15 })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <ClosingCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/** Title card — "5 cosas que puedes hacer..." */
const TitleCard: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 10 } });
  const numberScale = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 6, mass: 2 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        <SolennixLogoDark size={50} animateIn showWordmark />

        <div
          style={{
            fontFamily: cinzel,
            fontSize: 100,
            fontWeight: 700,
            color: SOCIAL_COLORS.gold,
            transform: `scale(${numberScale})`,
          }}
        >
          5
        </div>

        <div
          style={{
            fontFamily: cinzel,
            fontSize: 38,
            fontWeight: 600,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            lineHeight: 1.4,
            transform: `scale(${scale})`,
          }}
        >
          cosas que puedes hacer con Solennix
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Individual feature card */
const FeatureCard: React.FC<{
  name: string;
  description: string;
  icon: string;
  index: number;
  isAlternate: boolean;
}> = ({ name, description, icon, index, isAlternate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgColor = isAlternate ? SOCIAL_COLORS.creamWarm : SOCIAL_COLORS.navy;
  const textColor = isAlternate ? SOCIAL_COLORS.navy : SOCIAL_COLORS.cream;
  const accentColor = isAlternate ? SOCIAL_COLORS.navy : SOCIAL_COLORS.gold;

  // Icon bounces in
  const iconScale = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 6 } });

  // Title slides up
  const titleY = interpolate(frame, [15, 35], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Description fades in
  const descOpacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Number indicator
  const numOpacity = interpolate(frame, [5, 20], [0, 0.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      {/* Big faded number in background */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: '15%',
          fontFamily: cinzel,
          fontSize: 300,
          fontWeight: 700,
          color: accentColor,
          opacity: numOpacity,
        }}
      >
        {index + 1}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 40,
          zIndex: 1,
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: 80,
            transform: `scale(${iconScale})`,
          }}
        >
          {icon}
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 42,
            fontWeight: 700,
            color: accentColor,
            textAlign: 'center',
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
          }}
        >
          {name}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 26,
            fontWeight: 300,
            color: textColor,
            textAlign: 'center',
            lineHeight: 1.6,
            opacity: descOpacity,
            maxWidth: 700,
          }}
        >
          {description}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Closing card  */
const ClosingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12 } });
  const taglineOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
        }}
      >
        <SolennixLogoDark size={60} animateIn showWordmark />

        <div
          style={{
            fontFamily: cinzel,
            fontSize: 36,
            fontWeight: 600,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            transform: `scale(${scale})`,
          }}
        >
          Todo en un solo lugar.
        </div>

        <div
          style={{
            fontFamily: inter,
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: 5.5,
            color: SOCIAL_COLORS.gold,
            opacity: taglineOpacity,
          }}
        >
          CADA DETALLE IMPORTA
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 28,
            fontWeight: 500,
            color: SOCIAL_COLORS.cream,
            opacity: taglineOpacity,
          }}
        >
          solennix.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
