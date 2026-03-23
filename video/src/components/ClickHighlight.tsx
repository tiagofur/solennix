import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { COLORS } from '../constants';

type ClickHighlightProps = {
  x: number;
  y: number;
  clickFrame: number;
  color?: string;
  size?: number;
};

export const ClickHighlight: React.FC<ClickHighlightProps> = ({
  x,
  y,
  clickFrame,
  color = COLORS.primary,
  size = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < clickFrame || frame > clickFrame + fps) return null;

  const localFrame = frame - clickFrame;

  // Inner circle: quick scale up then hold
  const innerScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 200 },
  });

  // Outer ripple: expands and fades
  const rippleScale = interpolate(localFrame, [0, fps * 0.6], [0.3, 1.5], {
    extrapolateRight: 'clamp',
  });
  const rippleOpacity = interpolate(localFrame, [0, fps * 0.4, fps * 0.8], [0.5, 0.3, 0], {
    extrapolateRight: 'clamp',
  });

  // Overall fade out
  const overallOpacity = interpolate(localFrame, [fps * 0.5, fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      zIndex: 1000,
      pointerEvents: 'none',
      opacity: overallOpacity,
    }}>
      {/* Outer ripple */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        transform: `scale(${rippleScale})`,
        opacity: rippleOpacity,
      }} />
      {/* Inner dot */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 12,
        height: 12,
        marginLeft: -6,
        marginTop: -6,
        borderRadius: '50%',
        backgroundColor: color,
        transform: `scale(${innerScale})`,
        opacity: 0.6,
      }} />
    </div>
  );
};
