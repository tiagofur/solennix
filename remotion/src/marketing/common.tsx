import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

export const MARKETING_FONTS = {
  cinzel,
  inter,
} as const;

type PhoneFrameProps = {
  children: React.ReactNode;
  width?: number;
  height?: number;
};

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  width = 760,
  height = 1420,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        background: 'linear-gradient(180deg, #17233b 0%, #0f1a2e 100%)',
        padding: 20,
        boxShadow: '0 40px 120px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          marginLeft: -88,
          width: 176,
          height: 22,
          borderRadius: 999,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 5,
        }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 40,
          overflow: 'hidden',
          background: SOCIAL_COLORS.creamWarm,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
};

type MarketingCTAProps = {
  headline: string;
  subheadline: string;
  accent?: string;
  url?: string;
};

export const MarketingCTA: React.FC<MarketingCTAProps> = ({
  headline,
  subheadline,
  accent,
  url = 'solennix.com',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at center, ${SOCIAL_COLORS.navy} 0%, ${SOCIAL_COLORS.navyDark} 75%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 88px',
        textAlign: 'center',
      }}
    >
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 44 }}>
        <SolennixLogoDark size={130} animateIn showWordmark />
      </div>

      {accent ? (
        <div
          style={{
            fontFamily: inter,
            fontSize: 24,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 3,
            color: SOCIAL_COLORS.gold,
            marginBottom: 18,
            opacity: interpolate(frame, [12, 28], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {accent}
        </div>
      ) : null}

      <div
        style={{
          fontFamily: cinzel,
          fontSize: 58,
          fontWeight: 700,
          lineHeight: 1.14,
          color: SOCIAL_COLORS.cream,
          marginBottom: 18,
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateY(${interpolate(frame, [20, 40], [24, 0], { extrapolateRight: 'clamp' })}px)`,
        }}
      >
        {headline}
      </div>

      <div
        style={{
          fontFamily: inter,
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1.4,
          color: SOCIAL_COLORS.cream,
          maxWidth: 760,
          opacity: interpolate(frame, [34, 54], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        {subheadline}
      </div>

      <Sequence from={54} layout="none">
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
          }}
        >
          <div style={{ display: 'flex', gap: 18 }}>
            <StoreBadge type="appstore" />
            <StoreBadge type="playstore" />
          </div>
          <div
            style={{
              fontFamily: inter,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 1,
              color: SOCIAL_COLORS.gold,
            }}
          >
            {url}
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};

const StoreBadge: React.FC<{ type: 'appstore' | 'playstore' }> = ({ type }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 180 },
  });

  const label = type === 'appstore' ? 'App Store' : 'Google Play';
  const sublabel = type === 'appstore' ? 'Descarga en' : 'Disponible en';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backgroundColor: SOCIAL_COLORS.cream,
        padding: '16px 24px',
        borderRadius: 18,
        transform: `scale(${scale})`,
        boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
      }}
    >
      <svg
        viewBox={type === 'appstore' ? '0 0 814 1000' : '0 0 24 24'}
        style={{ width: type === 'appstore' ? 28 : 30, height: 30, fill: SOCIAL_COLORS.navyDark, flexShrink: 0 }}
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
            fontSize: 13,
            fontWeight: 500,
            color: SOCIAL_COLORS.navyDark,
            opacity: 0.76,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {sublabel}
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 20,
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
