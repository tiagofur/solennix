import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { BrandIntroProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * BrandIntro — Premium logo reveal + tagline.
 * Usable como intro/outro de cualquier video social.
 * ~5 segundos (150 frames @ 30fps)
 */
export const BrandIntro: React.FC<BrandIntroProps> = ({
  tagline = 'CADA DETALLE IMPORTA',
  url = 'solennix.com',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Particles ──
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const radius = interpolate(frame, [20, 80], [0, 300 + i * 20], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const particleOpacity = interpolate(frame, [20, 50, 80], [0, 0.5, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, opacity: particleOpacity, size: 2 + (i % 3) };
  });

  // ── Gold line expand ──
  const lineWidth = interpolate(frame, [70, 100], [0, 400], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineOpacity = interpolate(frame, [70, 80, 130, 150], [0, 0.6, 0.6, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Tagline letter spacing animation ──
  const taglineOpacity = interpolate(frame, [85, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const taglineSpacing = interpolate(frame, [85, 110], [20, 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── URL fade in ──
  const urlOpacity = interpolate(frame, [110, 125], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Background glow ──
  const glowOpacity = interpolate(frame, [0, 30, 60], [0, 0.08, 0.04], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${SOCIAL_COLORS.gold} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '50%',
            top: '45%',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: SOCIAL_COLORS.goldLight,
            transform: `translate(${p.x}px, ${p.y}px)`,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <SolennixLogoDark size={80} animateIn variant="icon-only" showWordmark={false} />

        {/* Wordmark */}
        <div style={{ overflow: 'hidden', opacity: frame >= 15 ? 1 : 0 }}>
          {frame >= 15 ? <WordmarkReveal /> : <span style={{ fontFamily: cinzel, fontSize: 56, visibility: 'hidden' }}>Solennix</span>}
        </div>

        {/* Gold line */}
        <div
          style={{
            width: lineWidth,
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${SOCIAL_COLORS.gold} 20%, ${SOCIAL_COLORS.goldLight} 50%, ${SOCIAL_COLORS.gold} 80%, transparent 100%)`,
            opacity: lineOpacity,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 18,
            fontWeight: 300,
            letterSpacing: taglineSpacing,
            color: SOCIAL_COLORS.gold,
            opacity: taglineOpacity,
            textAlign: 'center',
          }}
        >
          {tagline}
        </div>

        {/* URL */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 16,
            fontWeight: 400,
            color: SOCIAL_COLORS.textMuted,
            opacity: urlOpacity,
            textAlign: 'center',
          }}
        >
          {url}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Animated wordmark using Cinzel */
const WordmarkReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12 } });
  const opacity = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <span
      style={{
        fontFamily: cinzel,
        fontSize: 56,
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: SOCIAL_COLORS.cream,
        transform: `scale(${scale})`,
        opacity,
        display: 'inline-block',
      }}
    >
      Solennix
    </span>
  );
};
