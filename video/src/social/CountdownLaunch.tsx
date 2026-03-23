import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { CountdownLaunchProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * CountdownLaunch — Lanzamiento 3,2,1 explosivo
 * Format: 9:16 Reel
 */
export const CountdownLaunch: React.FC<CountdownLaunchProps> = ({
  launchText = '¡NUEVA APP DISPONIBLE!',
  subText = 'Descargala hoy y transformá tu negocio de eventos',
}) => {
  return (
    <AbsoluteFill style={{ background: SOCIAL_COLORS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Number 3 */}
      <Sequence from={0} durationInFrames={30}>
        <CountdownNumber num="3" />
      </Sequence>
      
      {/* Number 2 */}
      <Sequence from={30} durationInFrames={30}>
        <CountdownNumber num="2" />
      </Sequence>

      {/* Number 1 */}
      <Sequence from={60} durationInFrames={30}>
        <CountdownNumber num="1" />
      </Sequence>

      {/* Explosion & Launch */}
      <Sequence from={90}>
        <LaunchSequence text={launchText} sub={subText} />
      </Sequence>

    </AbsoluteFill>
  );
};

const CountdownNumber: React.FC<{ num: string }> = ({ num }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Heavy slam
  const s = spring({ frame, fps, config: { damping: 10, mass: 2, stiffness: 200 } });
  
  // Fade out quickly at the end
  const o = interpolate(frame, [20, 30], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  // Glitch/shake
  const x = interpolate(frame, [0, 5, 10, 15], [0, 10, -10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        fontFamily: cinzel,
        fontSize: 400,
        fontWeight: 700,
        color: SOCIAL_COLORS.gold,
        transform: `scale(${s}) translateX(${x}px)`,
        textShadow: `0 0 50px ${SOCIAL_COLORS.goldDark}`,
        opacity: o,
      }}>
        {num}
      </div>
      
      {/* Radial pulse */}
      <div style={{
        position: 'absolute',
        width: 1000,
        height: 1000,
        borderRadius: '50%',
        border: `10px solid ${SOCIAL_COLORS.goldLight}`,
        transform: `scale(${s * 2})`,
        opacity: interpolate(frame, [0, 20], [1, 0]),
      }} />
    </AbsoluteFill>
  );
};

const LaunchSequence: React.FC<{ text: string, sub: string }> = ({ text, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Flash bang
  const flashO = interpolate(frame, [0, 10], [1, 0], { extrapolateRight: 'clamp' });

  // Scale up title
  const tScale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 12 } });
  
  // Phone mockup slides up
  const pY = interpolate(frame, [15, 35], [500, 150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  
  // Subtitle fade
  const subO = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: SOCIAL_COLORS.navyDark }}>
      
      {/* Flash */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: SOCIAL_COLORS.white, opacity: flashO, zIndex: 10 }} />

      <div style={{ position: 'absolute', top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, zIndex: 2 }}>
        <SolennixLogoDark size={60} animateIn={true} showWordmark />
        
        <div style={{
          fontFamily: cinzel,
          fontSize: 60,
          fontWeight: 700,
          color: SOCIAL_COLORS.gold,
          textAlign: 'center',
          lineHeight: 1.1,
          transform: `scale(${tScale})`,
          textShadow: `0 10px 30px rgba(0,0,0,0.5)`,
        }}>
          {text.split(' ').map((word, i) => <div key={i}>{word}</div>)}
        </div>

        <div style={{
          fontFamily: inter,
          fontSize: 28,
          color: SOCIAL_COLORS.cream,
          fontWeight: 300,
          textAlign: 'center',
          maxWidth: 600,
          opacity: subO,
        }}>
          {sub}
        </div>
      </div>

      {/* Abstract Mockup Phones */}
      <div style={{
        position: 'absolute',
        top: '50%',
        display: 'flex',
        gap: 40,
        transform: `translateY(${pY}px)`,
        zIndex: 1,
      }}>
        <div style={{ width: 300, height: 600, backgroundColor: SOCIAL_COLORS.creamWarm, borderRadius: 40, border: `8px solid ${SOCIAL_COLORS.navy}`, boxShadow: `0 -20px 50px rgba(0,0,0,0.5)`, transform: 'rotate(-5deg) translateY(40px)' }} />
        <div style={{ width: 300, height: 600, backgroundColor: SOCIAL_COLORS.gold, borderRadius: 40, border: `8px solid ${SOCIAL_COLORS.navy}`, boxShadow: `0 -20px 50px rgba(0,0,0,0.5)`, transform: 'rotate(5deg)' }} />
      </div>

    </AbsoluteFill>
  );
};
