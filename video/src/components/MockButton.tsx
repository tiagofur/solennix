import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS, PREMIUM_GRADIENT } from '../constants';

type MockButtonProps = {
  label: string;
  pressAtFrame?: number;
  variant?: 'primary' | 'outline';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
};

export const MockButton: React.FC<MockButtonProps> = ({
  label,
  pressAtFrame,
  variant = 'primary',
  icon,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let scale = 1;
  if (pressAtFrame !== undefined && frame >= pressAtFrame) {
    const localFrame = frame - pressAtFrame;
    if (localFrame < 5) {
      const down = spring({ frame: localFrame, fps, config: { damping: 15, stiffness: 300 } });
      scale = 1 - 0.05 * down;
    } else {
      const up = spring({ frame: localFrame - 5, fps, config: { damping: 200 } });
      scale = 0.95 + 0.05 * up;
    }
  }

  const isPrimary = variant === 'primary';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 16px',
      borderRadius: 12,
      background: isPrimary ? PREMIUM_GRADIENT : 'transparent',
      border: isPrimary ? 'none' : `1px solid ${COLORS.border}`,
      color: isPrimary ? COLORS.white : COLORS.textSecondary,
      fontSize: 14,
      fontWeight: 700,
      transform: `scale(${scale})`,
      boxShadow: isPrimary
        ? '0 4px 6px rgba(196, 162, 101, 0.2)'
        : '0 1px 2px rgba(0,0,0,0.05)',
      ...style,
    }}>
      {icon}
      {label}
    </div>
  );
};
