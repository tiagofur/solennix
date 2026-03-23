import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { BeforeAfterProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * BeforeAfter — Split screen "Sin vs Con Solennix".
 * Format: 9:16 Reel · ~20 seconds (600 frames @ 30fps)
 */
export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  comparisons = [
    { before: 'Cotización en Word...', after: 'PDF profesional en 60s', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
    { before: 'Finanzas en cuaderno', after: 'Dashboard financiero', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
    { before: 'Contrato por WhatsApp', after: 'Contrato PDF con tu marca', beforeLabel: 'ANTES', afterLabel: 'AHORA' },
  ],
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
      }}
    >
      <TransitionSeries>
        {/* Intro */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <IntroSlide />
        </TransitionSeries.Sequence>

        {comparisons.map((comp, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: 12 })}
            />
            <TransitionSeries.Sequence durationInFrames={140}>
              <ComparisonSlide
                before={comp.before}
                after={comp.after}
                beforeLabel={comp.beforeLabel}
                afterLabel={comp.afterLabel}
                index={i}
              />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <OutroSlide />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/** Intro — "Sin Solennix vs. Con Solennix" */
const IntroSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12 } });
  const vsOpacity = interpolate(frame, [30, 50], [0, 1], {
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
          transform: `scale(${titleScale})`,
        }}
      >
        <SolennixLogoDark size={50} animateIn={false} showWordmark={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <span style={{ fontFamily: cinzel, fontSize: 36, color: SOCIAL_COLORS.textMuted, fontWeight: 400 }}>
            Sin Solennix
          </span>
          <span
            style={{
              fontFamily: cinzel,
              fontSize: 28,
              color: SOCIAL_COLORS.gold,
              opacity: vsOpacity,
              fontWeight: 700,
            }}
          >
            vs.
          </span>
          <span style={{ fontFamily: cinzel, fontSize: 36, color: SOCIAL_COLORS.gold, fontWeight: 700 }}>
            Con Solennix
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Single comparison slide — split screen */
const ComparisonSlide: React.FC<{
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  index: number;
}> = ({ before, after, beforeLabel, afterLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Left side slides in
  const leftX = interpolate(frame, [0, 20], [-100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const leftOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Right side slides in (delayed)
  const rightX = interpolate(frame, [15, 35], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rightOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Divider
  const dividerHeight = interpolate(frame, [10, 40], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '60%',
          gap: 0,
          alignItems: 'center',
        }}
      >
        {/* BEFORE side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            opacity: leftOpacity,
            transform: `translateX(${leftX}px)`,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              color: SOCIAL_COLORS.textMuted,
            }}
          >
            {beforeLabel}
          </div>

          {/* "Bad" card */}
          <div
            style={{
              width: '80%',
              padding: '40px 30px',
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.1)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 22,
                color: SOCIAL_COLORS.textMuted,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {/* Sad emoji + text */}
              😰 {before}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 2,
            height: `${dividerHeight}%`,
            background: `linear-gradient(180deg, transparent, ${SOCIAL_COLORS.gold}, transparent)`,
            flexShrink: 0,
          }}
        />

        {/* AFTER side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            opacity: rightOpacity,
            transform: `translateX(${rightX}px)`,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              color: SOCIAL_COLORS.gold,
            }}
          >
            {afterLabel}
          </div>

          {/* "Good" card */}
          <div
            style={{
              width: '80%',
              padding: '40px 30px',
              borderRadius: 16,
              background: `linear-gradient(135deg, rgba(196,162,101,0.1), rgba(212,184,122,0.05))`,
              border: `1px solid ${SOCIAL_COLORS.goldDark}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 22,
                color: SOCIAL_COLORS.cream,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              ✨ {after}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Outro — tagline + URL */
const OutroSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textScale = spring({ frame: frame, fps, config: { damping: 10 } });
  const urlOpacity = interpolate(frame, [40, 60], [0, 1], {
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
          gap: 24,
        }}
      >
        <SolennixLogoDark size={50} animateIn showWordmark />

        <div
          style={{
            fontFamily: cinzel,
            fontSize: 32,
            fontWeight: 700,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            transform: `scale(${textScale})`,
            lineHeight: 1.4,
          }}
        >
          Tus clientes notan{'\n'}la diferencia.
        </div>

        <div
          style={{
            fontFamily: inter,
            fontSize: 14,
            fontWeight: 300,
            letterSpacing: 5.5,
            color: SOCIAL_COLORS.gold,
            opacity: urlOpacity,
          }}
        >
          CADA DETALLE IMPORTA
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 18,
            color: SOCIAL_COLORS.textMuted,
            opacity: urlOpacity,
          }}
        >
          solennix.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
