import { loadFont } from '@remotion/google-fonts/Cinzel';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { SOCIAL_COLORS } from '../constants';

const { fontFamily } = loadFont();

type SolennixLogoDarkProps = {
  size?: number;
  animateIn?: boolean;
  showWordmark?: boolean;
  variant?: 'horizontal' | 'icon-only';
};

/**
 * Logo de Solennix para fondos navy — copa gold + texto crema.
 * Usa la copa del icon-final-filled.svg.
 */
export const SolennixLogoDark: React.FC<SolennixLogoDarkProps> = ({
  size = 48,
  animateIn = true,
  showWordmark = true,
  variant = 'horizontal',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = animateIn
    ? spring({ frame, fps, config: { damping: 200 } })
    : 1;

  const opacity = animateIn
    ? interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateRight: 'clamp' })
    : 1;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: variant === 'horizontal' ? 'row' : 'column',
        alignItems: 'center',
        gap: variant === 'horizontal' ? 16 : 12,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* Copa icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        style={{ width: size, height: size }}
      >
        <defs>
          <linearGradient id="gLogoDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SOCIAL_COLORS.goldLight} />
            <stop offset="45%" stopColor={SOCIAL_COLORS.gold} />
            <stop offset="100%" stopColor={SOCIAL_COLORS.goldDark} />
          </linearGradient>
        </defs>
        {/* Bowl */}
        <path
          d="M66,34 Q58,65 66,88 Q78,116 100,122 Q122,116 134,88 Q142,65 134,34 Q100,42 66,34 Z"
          fill="url(#gLogoDark)"
        />
        {/* Reflejo */}
        <path
          d="M76,38 Q72,58 76,82 Q85,104 100,112 L100,42 Q82,44 76,38 Z"
          fill="rgba(255,255,255,0.12)"
        />
        {/* Nodo */}
        <ellipse cx="100" cy="124" rx="6" ry="3" fill="url(#gLogoDark)" />
        {/* Tallo + base */}
        <path
          d="M96,124 L96,150 Q96,156 84,159 L72,161 L72,164 A30,8 0 0,0 128,164 L128,161 L116,159 Q104,156 104,150 L104,124 Z"
          fill="url(#gLogoDark)"
        />
        {/* Destellos */}
        <g transform="translate(132,32)" opacity="0.65">
          <line x1="0" y1="-8" x2="0" y2="8" stroke={SOCIAL_COLORS.cream} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke={SOCIAL_COLORS.cream} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="0" cy="0" r="2" fill={SOCIAL_COLORS.cream} opacity="0.5" />
        </g>
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <span
          style={{
            fontFamily,
            fontSize: size * 0.65,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: SOCIAL_COLORS.cream,
          }}
        >
          Solennix
        </span>
      )}
    </div>
  );
};
