import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { COLORS } from '../constants';

type CheckmarkProps = {
  size?: number;
  startFrame?: number;
};

export const Checkmark: React.FC<CheckmarkProps> = ({
  size = 120,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - startFrame);

  // Circle draw animation
  const circleProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 200 },
  });
  const circumference = Math.PI * (size - 8);
  const circleDashoffset = circumference * (1 - circleProgress);

  // Checkmark draw animation (delayed slightly)
  const checkProgress = spring({
    frame: Math.max(0, localFrame - 8),
    fps,
    config: { damping: 15, stiffness: 200 },
  });
  const checkLength = size * 0.6;
  const checkDashoffset = checkLength * (1 - checkProgress);

  // Scale bounce
  const scale = spring({
    frame: localFrame,
    fps,
    config: { damping: 8 },
  });

  if (frame < startFrame) return null;

  const center = size / 2;
  const radius = (size - 8) / 2;

  return (
    <div style={{ transform: `scale(${scale})`, display: 'inline-flex' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={COLORS.success}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circleDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        {/* Checkmark */}
        <path
          d={`M ${size * 0.3} ${size * 0.5} L ${size * 0.45} ${size * 0.65} L ${size * 0.7} ${size * 0.35}`}
          fill="none"
          stroke={COLORS.success}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={checkLength}
          strokeDashoffset={checkDashoffset}
        />
      </svg>
    </div>
  );
};
