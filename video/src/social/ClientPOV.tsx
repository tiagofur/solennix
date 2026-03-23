import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { ClientPOVProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * ClientPOV — Lo que ve tu cliente vs Tu realidad sin app
 * Format: 9:16 Reel · ~15 seconds (450 frames @ 30fps)
 */
export const ClientPOV: React.FC<ClientPOVProps> = ({
  clientText = 'Lo que ve tu cliente:',
  clientEvents = ['Tranquilidad', 'Presupuesto claro', 'Respuestas rápidas'],
  realityText = 'Tu realidad (sin Solennix):',
  realityEvents = ['Caos en Excel', 'Papeles perdidos', 'Estrés'],
}) => {
  return (
    <AbsoluteFill
      style={{
        background: SOCIAL_COLORS.navyDark,
      }}
    >
      <TransitionSeries>
        {/* Split Screen Chaos */}
        <TransitionSeries.Sequence durationInFrames={250}>
          <SplitScreenChaos
            clientText={clientText}
            clientEvents={clientEvents}
            realityText={realityText}
            realityEvents={realityEvents}
          />
        </TransitionSeries.Sequence>

        {/* The Solution Transition */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence durationInFrames={220}>
          <TheSolution />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const SplitScreenChaos: React.FC<ClientPOVProps> = ({
  clientText,
  clientEvents,
  realityText,
  realityEvents,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Top half slides down
  const topY = interpolate(frame, [0, 20], [-100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  // Bottom half slides up
  const botY = interpolate(frame, [10, 30], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top: Client POV (Peaceful) */}
      <div
        style={{
          flex: 1,
          background: SOCIAL_COLORS.creamWarm,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          transform: `translateY(${topY}%)`,
          borderBottom: `4px solid ${SOCIAL_COLORS.gold}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ fontFamily: cinzel, fontSize: 40, color: SOCIAL_COLORS.navy, fontWeight: 700, textAlign: 'center', marginBottom: 30 }}>
          {clientText}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
          {clientEvents.map((evt, i) => {
            const opacity = interpolate(frame, [30 + i * 20, 50 + i * 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ fontFamily: inter, fontSize: 32, color: SOCIAL_COLORS.navyLight, opacity, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: SOCIAL_COLORS.gold }}>✨</span> {evt}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Reality POV (Chaos) */}
      <div
        style={{
          flex: 1,
          background: SOCIAL_COLORS.navy,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
          transform: `translateY(${botY}%)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Chaos background elements */}
        {Array.from({ length: 10 }).map((_, i) => {
          const x = interpolate(frame, [60, 250], [Math.sin(i) * 100, Math.sin(i) * 500], { extrapolateRight: 'clamp' }) % 1080;
          const y = interpolate(frame, [60, 250], [Math.cos(i) * 100, Math.cos(i) * 500], { extrapolateRight: 'clamp' }) % 960;
          const rot = interpolate(frame, [60, 250], [0, i * 90], { extrapolateRight: 'clamp' });
          const o = interpolate(frame, [60, 80], [0, 0.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <div key={i} style={{ 
              position: 'absolute', 
              fontSize: 60, 
              left: 540 + x, 
              top: 480 + y, 
              transform: `translate(-50%, -50%) rotate(${rot}deg)`,
              opacity: o,
            }}>
              {['📄', '📈', '📱', '💭', '❓'][i % 5]}
            </div>
          );
        })}

        <div style={{ fontFamily: cinzel, fontSize: 36, color: SOCIAL_COLORS.cream, fontWeight: 700, textAlign: 'center', marginBottom: 30, zIndex: 1 }}>
          {realityText}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', zIndex: 1 }}>
          {realityEvents.map((evt, i) => {
            const opacity = interpolate(frame, [90 + i * 20, 110 + i * 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <div key={i} style={{ fontFamily: inter, fontSize: 30, color: SOCIAL_COLORS.textMuted, opacity, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#ff3b30' }}>❌</span> {evt}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TheSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12 } });
  const textOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoY = interpolate(frame, [50, 70], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const logoOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div style={{ 
        fontFamily: cinzel, 
        fontSize: 60, 
        color: SOCIAL_COLORS.gold, 
        fontWeight: 700, 
        textAlign: 'center',
        transform: `scale(${titleScale})`,
        marginBottom: 60
      }}>
        Haz que tu realidad<br/>sea tan buena<br/>como lo que ven.
      </div>

      <div style={{ 
        fontFamily: inter, 
        fontSize: 32, 
        color: SOCIAL_COLORS.cream, 
        textAlign: 'center',
        opacity: textOpacity,
        marginBottom: 80,
        fontWeight: 300,
        lineHeight: 1.5
      }}>
        Organiza tus eventos, cotizaciones<br/>y finanzas en una sola app.
      </div>

      <div style={{
        opacity: logoOpacity,
        transform: `translateY(${logoY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        <SolennixLogoDark size={60} animateIn={false} showWordmark />
        <div style={{ fontFamily: inter, fontSize: 24, letterSpacing: 6, color: SOCIAL_COLORS.gold, marginTop: 10 }}>
          CADA DETALLE IMPORTA
        </div>
      </div>
    </AbsoluteFill>
  );
};
