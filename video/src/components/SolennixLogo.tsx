import { loadFont } from '@remotion/google-fonts/Cinzel';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../constants';

const { fontFamily } = loadFont();

type SolennixLogoProps = {
  size?: number;
  animateIn?: boolean;
};

export const SolennixLogo: React.FC<SolennixLogoProps> = ({
  size = 48,
  animateIn = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = animateIn
    ? spring({ frame, fps, config: { damping: 200 } })
    : 1;

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div style={{
        width: size * 1.3,
        height: size * 1.3,
        backgroundColor: COLORS.accent,
        borderRadius: size * 0.35,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 ${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.15)`,
      }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={{ width: size * 0.8, height: size * 0.8 }}>
          <defs>
            <linearGradient id="gT2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4B87A"/>
              <stop offset="45%" stopColor="#C4A265"/>
              <stop offset="100%" stopColor="#B8965A"/>
            </linearGradient>
          </defs>
          <path d="M66,34 Q58,65 66,88 Q78,116 100,122 Q122,116 134,88 Q142,65 134,34 Q100,42 66,34 Z" fill="url(#gT2)"/>
          <path d="M76,38 Q72,58 76,82 Q85,104 100,112 L100,42 Q82,44 76,38 Z" fill="rgba(255,255,255,0.12)"/>
          <ellipse cx="100" cy="124" rx="6" ry="3" fill="url(#gT2)"/>
          <path d="M96,124 L96,150 Q96,156 84,159 L72,161 L72,164 A30,8 0 0,0 128,164 L128,161 L116,159 Q104,156 104,150 L104,124 Z" fill="url(#gT2)"/>
        </svg>
      </div>
      <span
        style={{
          fontFamily,
          fontSize: size * 0.75,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: COLORS.primary,
        }}
      >
        Solennix
      </span>
    </div>
  );
};
