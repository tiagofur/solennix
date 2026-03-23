import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { COLORS } from '../constants';

type CursorPosition = { frame: number; x: number; y: number };

type CursorProps = {
  positions: CursorPosition[];
  clickAtFrames?: number[];
};

export const Cursor: React.FC<CursorProps> = ({
  positions,
  clickAtFrames = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find current segment
  let x = positions[0]?.x ?? 0;
  let y = positions[0]?.y ?? 0;

  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i];
    const to = positions[i + 1];
    if (frame >= from.frame && frame <= to.frame) {
      x = interpolate(frame, [from.frame, to.frame], [from.x, to.x], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      y = interpolate(frame, [from.frame, to.frame], [from.y, to.y], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      break;
    } else if (frame > to.frame) {
      x = to.x;
      y = to.y;
    }
  }

  // Click animation -- small scale pulse
  let clickScale = 1;
  for (const clickFrame of clickAtFrames) {
    if (frame >= clickFrame && frame < clickFrame + 10) {
      const progress = spring({
        frame: frame - clickFrame,
        fps,
        config: { damping: 15, stiffness: 300 },
      });
      clickScale =
        1 -
        0.15 * progress +
        0.15 *
          spring({
            frame: frame - clickFrame - 3,
            fps,
            config: { damping: 200 },
          });
    }
  }

  // Don't show cursor before first position
  if (frame < (positions[0]?.frame ?? 0)) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 1000,
        transform: `scale(${clickScale})`,
        pointerEvents: 'none',
      }}
    >
      {/* SVG arrow cursor */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill={COLORS.white}
          stroke={COLORS.text}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
