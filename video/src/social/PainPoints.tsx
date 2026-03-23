import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { PainPointsProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * PainPoints — "Levanta la mano si..." with animated checkmarks.
 * Format: 1:1 Feed · ~15 seconds (450 frames @ 30fps)
 */
export const PainPoints: React.FC<PainPointsProps> = ({
  title = 'Levanta la mano si...',
  items = [
    'Cotizás en Word o Excel',
    'Llevás las finanzas en un cuaderno',
    'No sabés cuánto ganaste este mes',
    'Tu agenda está en 3 apps distintas',
    'Tus cambios tardan 1 hora',
  ],
  closingLine = 'Hay una mejor manera.',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title fade in ──
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [10, 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Gold line ──
  const lineWidth = interpolate(frame, [280, 310], [0, 500], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Closing line ──
  const closingOpacity = interpolate(frame, [320, 345], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const closingY = interpolate(frame, [320, 345], [15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Tagline + URL ──
  const footerOpacity = interpolate(frame, [370, 395], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: SOCIAL_COLORS.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          width: '100%',
        }}
      >
        {/* Logo */}
        <SolennixLogoDark size={48} animateIn showWordmark />

        {/* Title */}
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 48,
            fontWeight: 700,
            color: SOCIAL_COLORS.gold,
            textAlign: 'center',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>

        {/* Checklist items */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: 700,
          }}
        >
          {items.map((item, i) => (
            <CheckItem key={i} text={item} index={i} />
          ))}
        </div>

        {/* Gold separator line */}
        <div
          style={{
            width: lineWidth,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${SOCIAL_COLORS.gold}, transparent)`,
            marginTop: 10,
          }}
        />

        {/* Closing line */}
        <div
          style={{
            fontFamily: inter,
            fontSize: 28,
            fontWeight: 300,
            color: SOCIAL_COLORS.cream,
            textAlign: 'center',
            opacity: closingOpacity,
            transform: `translateY(${closingY}px)`,
          }}
        >
          {closingLine}
        </div>

        {/* Tagline + URL */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            opacity: footerOpacity,
          }}
        >
          <div
            style={{
              fontFamily: inter,
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: 5.5,
              color: SOCIAL_COLORS.gold,
            }}
          >
            CADA DETALLE IMPORTA
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 26,
              fontWeight: 500,
              color: SOCIAL_COLORS.cream,
            }}
          >
            solennix.com
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Single animated check item */
const CheckItem: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Each item appears staggered
  const startFrame = 60 + index * 40;

  const itemOpacity = interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const itemX = interpolate(frame, [startFrame, startFrame + 15], [-30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Checkbox check animation
  const checkScale = frame >= startFrame + 10
    ? spring({ frame: frame - (startFrame + 10), fps, config: { damping: 8 } })
    : 0;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity: itemOpacity,
        transform: `translateX(${itemX}px)`,
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          border: `2px solid ${SOCIAL_COLORS.gold}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          style={{
            width: 18,
            height: 18,
            transform: `scale(${checkScale})`,
          }}
        >
          <path
            d="M5 12l5 5L20 7"
            fill="none"
            stroke={SOCIAL_COLORS.gold}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text */}
      <span
        style={{
          fontFamily: inter,
          fontSize: 26,
          color: SOCIAL_COLORS.cream,
          fontWeight: 400,
        }}
      >
        {text}
      </span>
    </div>
  );
};
