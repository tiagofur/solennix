import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
  spring,
  Sequence,
} from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/* ──────────────────────────────────────────────────────────────────────── */
/* V04 — Calendario Inteligente (9:16)                                     */
/* ──────────────────────────────────────────────────────────────────────── */

export const V04_Calendar: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: SOCIAL_COLORS.navyDark }}>
      {/* 15s = 450 frames. TransitionSeries: total = Σescenas - Σtransiciones
           60 + 150 + 120 + 150 - 10 - 10 - 10 = 450 ✅ */}
      <TransitionSeries>
        {/* ESCENA 1: HOOK — 2s */}
        <TransitionSeries.Sequence durationInFrames={60}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        {/* ESCENA 2: CALENDARIO — 5s */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <CalendarScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        {/* ESCENA 3: DETALLE — 4s */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <DetailScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        {/* ESCENA 4: CTA — 5s (150 frames, nada vacío) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

// ── ESCENA 1: Hook ────────────────────────────────────────────────
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(frame, [0, 60], [0.95, 1.05], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 80px',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 64,
          fontWeight: 700,
          color: SOCIAL_COLORS.gold,
          lineHeight: 1.2,
          marginBottom: 40,
        }}
      >
        ¿QUÉ EVENTOS
      </div>
      <div
        style={{
          fontFamily: inter,
          fontSize: 32,
          fontWeight: 300,
          color: SOCIAL_COLORS.cream,
          letterSpacing: 2,
        }}
      >
        tienes esta semana?
      </div>
    </AbsoluteFill>
  );
};

// ── ESCENA 2: Calendario ──────────────────────────────────────────
const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = spring({
    frame,
    fps,
    config: { damping: 20 },
  });

  // Pulse effect simulation on event days
  const pulse = Math.sin(frame / 5) * 0.5 + 0.5;

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 40px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 100,
          fontFamily: cinzel,
          fontSize: 40,
          fontWeight: 700,
          color: SOCIAL_COLORS.gold,
          textAlign: 'center',
        }}
      >
        CALENDARIO
      </div>

      <div
        style={{
          width: '100%',
          transform: `scale(${imgScale})`,
          borderRadius: 40,
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
          border: `2px solid ${SOCIAL_COLORS.gold}33`,
        }}
      >
        <Img
          src={staticFile('screenshots/02-calendario.png')}
          style={{ width: '100%', height: 'auto' }}
        />
        
        {/* Simulated event indicator pulse */}
        <div 
          style={{
            position: 'absolute',
            top: '45%',
            left: '25%',
            width: 40,
            height: 40,
            background: SOCIAL_COLORS.gold,
            borderRadius: '50%',
            opacity: pulse * 0.6,
            filter: 'blur(8px)',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 150,
          fontFamily: inter,
          fontSize: 24,
          color: SOCIAL_COLORS.cream,
          opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Tu agenda visual. Sin sorpresas.
      </div>
    </AbsoluteFill>
  );
};

// ── ESCENA 3: Detalle ──────────────────────────────────────────────
const DetailScene: React.FC = () => {
  const frame = useCurrentFrame();

  const zoom = interpolate(frame, [0, 180], [1.1, 1.3], { extrapolateRight: 'clamp' });
  const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          transform: `scale(${zoom})`,
          filter: `blur(${interpolate(frame, [0, 20], [10, 0], { extrapolateRight: 'clamp' })}px)`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Img
          src={staticFile('screenshots/04-evento-detalle.png')}
          style={{ 
            width: '85%', 
            height: 'auto', 
            borderRadius: 30,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            border: `1px solid ${SOCIAL_COLORS.gold}33`
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: 60,
          right: 60,
          textAlign: 'center',
          background: 'rgba(15, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: '30px',
          borderRadius: 24,
          border: `1px solid ${SOCIAL_COLORS.gold}44`,
          opacity: textOpacity,
          transform: `translateY(${interpolate(frame, [20, 40], [20, 0], { extrapolateRight: 'clamp' })}px)`,
        }}
      >
        <div style={{ fontFamily: cinzel, fontSize: 32, fontWeight: 700, color: SOCIAL_COLORS.gold, marginBottom: 10 }}>
          DETALLE TOTAL
        </div>
        <div style={{ fontFamily: inter, fontSize: 20, color: SOCIAL_COLORS.cream, lineHeight: 1.4 }}>
          Toda la info de tus eventos en un solo lugar.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── ESCENA 4: CTA ─────────────────────────────────────────────────
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at center, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
      }}
    >
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 30 }}>
        <SolennixLogoDark size={120} animateIn showWordmark />
      </div>

      <div style={{ textAlign: 'center', padding: '0 60px' }}>
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 48,
            fontWeight: 700,
            color: SOCIAL_COLORS.gold,
            marginBottom: 10,
            opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          SIN EXCEL.
        </div>
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 32,
            fontWeight: 400,
            color: SOCIAL_COLORS.cream,
            opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          SIN CAOS.
        </div>
      </div>

      <Sequence from={50} layout="none">
        <div style={{ 
          marginTop: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <StoreBadge type="appstore" />
            <StoreBadge type="playstore" />
          </div>
          
          <div
            style={{
              fontFamily: inter,
              fontSize: 24,
              fontWeight: 600,
              color: SOCIAL_COLORS.gold,
              opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateRight: 'clamp' }),
              letterSpacing: 1
            }}
          >
            solennix.com
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

// ── Store Badge ───────────────────────────────────────────────────
const StoreBadge: React.FC<{ type: 'appstore' | 'playstore' }> = ({ type }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({ frame, fps, config: { damping: 12 } });

  const label = type === 'appstore' ? 'App Store' : 'Google Play';
  const sublabel = type === 'appstore' ? 'Descarga en' : 'Disponible en';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backgroundColor: SOCIAL_COLORS.cream,
        padding: '16px 28px',
        borderRadius: 16,
        transform: `scale(${badgeScale})`,
        boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
      }}
    >
      <svg
        viewBox={type === 'appstore' ? '0 0 814 1000' : '0 0 24 24'}
        style={{ width: type === 'appstore' ? 30 : 32, height: 30, fill: SOCIAL_COLORS.navyDark, flexShrink: 0 }}
      >
        {type === 'appstore' ? (
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-148.2-91.6C93.4 747.1 22 592.4 22 440.8c0-248.2 163.2-379.2 323.4-379.2 85.5 0 156.7 56.3 210.5 56.3 51.5 0 132.2-59.8 232.2-59.8 30.4 0 108.2 2.6 159.8 96.8zM546.1 131.4c23.1-27.6 39.8-65.8 39.8-104 0-5.2-.6-10.4-1.3-15.6-37.5 1.3-82.5 25.1-109.4 55.8-21.7 24.4-42.2 62.7-42.2 101.5 0 5.8.6 11.7 1.3 13.6 2.6.6 6.5 1.3 10.4 1.3 34 0 76.9-22.5 101.4-52.6z" />
        ) : (
          <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.37.6 1.23 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
        )}
      </svg>
      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontFamily: inter,
            fontSize: 14,
            fontWeight: 400,
            color: SOCIAL_COLORS.navyDark,
            opacity: 0.8,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {sublabel}
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 22,
            fontWeight: 800,
            color: SOCIAL_COLORS.navyDark,
            lineHeight: 1,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
