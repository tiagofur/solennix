import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../constants';
import { Checkmark } from '../components/Checkmark';

const { fontFamily } = loadFont();

type SaveSceneProps = {
  successMessage?: string;
};

export const SaveScene: React.FC<SaveSceneProps> = ({
  successMessage = "¡Cliente creado con éxito!",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Loading dots: each dot appears sequentially
  const dot1Opacity = interpolate(frame, [0, 3], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dot2Opacity = interpolate(frame, [3, 6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const dot3Opacity = interpolate(frame, [6, 9], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const loadingOpacity = interpolate(frame, [0, 3, 15, 20], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Success text springs in
  const textScale = frame >= 50
    ? spring({
        frame: frame - 50,
        fps,
        config: { damping: 10, stiffness: 150 },
      })
    : 0;

  const textOpacity = interpolate(textScale, [0, 0.5, 1], [0, 0.5, 1]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* Loading text */}
        <div
          style={{
            opacity: loadingOpacity,
            fontSize: 24,
            color: COLORS.textSecondary,
            fontFamily,
            position: 'absolute',
          }}
        >
          Guardando
          <span style={{ opacity: dot1Opacity }}>.</span>
          <span style={{ opacity: dot2Opacity }}>.</span>
          <span style={{ opacity: dot3Opacity }}>.</span>
        </div>

        {/* Checkmark */}
        <Checkmark size={120} startFrame={20} />

        {/* Success text */}
        <div
          style={{
            transform: `scale(${textScale})`,
            opacity: textOpacity,
            fontSize: 32,
            fontWeight: 'bold',
            color: COLORS.text,
            fontFamily,
            textAlign: 'center',
          }}
        >
          {successMessage}
        </div>
      </div>
    </AbsoluteFill>
  );
};
