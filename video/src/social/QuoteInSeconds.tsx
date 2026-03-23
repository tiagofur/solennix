import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { QuoteInSecondsProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * QuoteInSeconds — "Cotización profesional en 60 segundos"
 * Format: 9:16 Reel · ~15 seconds (450 frames @ 30fps)
 */
export const QuoteInSeconds: React.FC<QuoteInSecondsProps> = ({
  title = 'Cotización profesional en 60 segundos',
  steps = [
    'Abrí Solennix',
    'Creá un evento',
    'Agregá servicios del catálogo',
    'Generá el PDF',
  ],
  closingQuestion = '¿Todavía cotizás en Word?',
}) => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {/* Title */}
        <TransitionSeries.Sequence durationInFrames={100}>
          <TitleSlide title={title} />
        </TransitionSeries.Sequence>

        {/* Steps */}
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: 10 })}
            />
            <TransitionSeries.Sequence durationInFrames={70}>
              <StepSlide step={step} stepNumber={i + 1} totalSteps={steps.length} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        {/* PDF reveal */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />
        <TransitionSeries.Sequence durationInFrames={80}>
          <PdfRevealSlide />
        </TransitionSeries.Sequence>

        {/* Closing question */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <ClosingSlide question={closingQuestion} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

/** Title — big text */
const TitleSlide: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 10 } });

  // Timer animation
  const timerOpacity = interpolate(frame, [40, 55], [0, 1], {
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
        padding: 60,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
        <SolennixLogoDark size={50} animateIn showWordmark />

        <div
          style={{
            fontFamily: cinzel,
            fontSize: 44,
            fontWeight: 700,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            lineHeight: 1.3,
            transform: `scale(${scale})`,
          }}
        >
          {title}
        </div>

        {/* Animated timer icon */}
        <div
          style={{
            fontSize: 48,
            opacity: timerOpacity,
          }}
        >
          ⏱️
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Individual step */
const StepSlide: React.FC<{ step: string; stepNumber: number; totalSteps: number }> = ({
  step,
  stepNumber,
  totalSteps,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numberScale = spring({ frame, fps, config: { damping: 6, mass: 2 } });
  const textOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const textY = interpolate(frame, [15, 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Progress bar
  const progress = stepNumber / totalSteps;
  const barWidth = interpolate(frame, [5, 30], [0, progress * 100], {
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
        padding: 60,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        {/* Step number */}
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 120,
            fontWeight: 700,
            color: SOCIAL_COLORS.gold,
            transform: `scale(${numberScale})`,
            lineHeight: 1,
          }}
        >
          {stepNumber}
        </div>

        {/* Step text */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 32,
            fontWeight: 400,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
            lineHeight: 1.4,
            maxWidth: 600,
          }}
        >
          {step}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: 400,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
          }}
        >
          <div
            style={{
              width: `${barWidth}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${SOCIAL_COLORS.goldDark}, ${SOCIAL_COLORS.goldLight})`,
              borderRadius: 2,
            }}
          />
        </div>

        {/* Step indicator */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 14,
            color: SOCIAL_COLORS.textMuted,
            letterSpacing: 2,
          }}
        >
          PASO {stepNumber} DE {totalSteps}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** PDF reveal — the "magic moment" */
const PdfRevealSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 8 },
  });

  const checkScale = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 6 },
  });

  const glowOpacity = interpolate(frame, [20, 40, 60], [0, 0.15, 0.08], {
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
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${SOCIAL_COLORS.gold} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          zIndex: 1,
        }}
      >
        {/* PDF mockup card */}
        <div
          style={{
            width: 300,
            height: 400,
            background: SOCIAL_COLORS.white,
            borderRadius: 12,
            transform: `scale(${cardScale})`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(196,162,101,0.2)`,
            display: 'flex',
            flexDirection: 'column',
            padding: 24,
            gap: 12,
          }}
        >
          {/* PDF Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: SOCIAL_COLORS.navy }} />
            <div>
              <div style={{ width: 80, height: 8, borderRadius: 4, backgroundColor: SOCIAL_COLORS.navy }} />
              <div style={{ width: 50, height: 6, borderRadius: 3, backgroundColor: '#ccc', marginTop: 4 }} />
            </div>
          </div>
          <div style={{ width: '100%', height: 1, backgroundColor: SOCIAL_COLORS.gold, marginTop: 4 }} />

          {/* PDF Lines */}
          {[100, 80, 90, 70, 85, 60, 95, 75].map((w, i) => (
            <div
              key={i}
              style={{
                width: `${w}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: i % 3 === 0 ? '#e0e0e0' : '#f0f0f0',
              }}
            />
          ))}

          {/* Total line */}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontFamily: inter, fontSize: 10, fontWeight: 700, color: SOCIAL_COLORS.navy }}>TOTAL</div>
            <div style={{ fontFamily: inter, fontSize: 14, fontWeight: 700, color: SOCIAL_COLORS.gold }}>$12,500.00</div>
          </div>
        </div>

        {/* Text */}
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 28,
            fontWeight: 600,
            color: SOCIAL_COLORS.gold,
            textAlign: 'center',
            transform: `scale(${checkScale})`,
          }}
        >
          ¡LISTO!
        </div>

        <div
          style={{
            fontFamily: inter,
            fontSize: 20,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            opacity: interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          Cotización profesional con tu marca
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Closing — provocative question */
const ClosingSlide: React.FC<{ question: string }> = ({ question }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const questionScale = spring({ frame, fps, config: { damping: 10 } });
  const footerOpacity = interpolate(frame, [40, 60], [0, 1], {
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
        padding: 60,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 40,
            fontWeight: 700,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            lineHeight: 1.3,
            transform: `scale(${questionScale})`,
          }}
        >
          {question}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: footerOpacity }}>
          <SolennixLogoDark size={50} animateIn={false} showWordmark />
          <div style={{ fontFamily: inter, fontSize: 22, fontWeight: 400, letterSpacing: 5.5, color: SOCIAL_COLORS.gold }}>
            CADA DETALLE IMPORTA
          </div>
          <div style={{ fontFamily: inter, fontSize: 28, fontWeight: 500, color: SOCIAL_COLORS.cream }}>solennix.com</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
