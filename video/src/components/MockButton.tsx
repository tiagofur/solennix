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
    const pressProgress = spring({
      frame: frame - pressAtFrame,
      fps,
      config: { damping: 15, stiffness: 300 },
    });
    // Press down then back up
    if (frame - pressAtFrame < 5) {
      scale = 1 - 0.05 * pressProgress;
    } else {
      scale =
        0.95 +
        0.05 *
          spring({
            frame: frame - pressAtFrame - 5,
            fps,
            config: { damping: 200 },
          });
    }
  }

  const isPrimary = variant === 'primary';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 24px',
        borderRadius: 12,
        background: isPrimary ? PREMIUM_GRADIENT : 'transparent',
        border: isPrimary ? 'none' : `1px solid ${COLORS.border}`,
        color: isPrimary ? COLORS.white : COLORS.text,
        fontSize: 15,
        fontWeight: 600,
        cursor: 'pointer',
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {icon}
      {label}
    </div>
  );
};
