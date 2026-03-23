import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../constants';
import { SolennixLogo } from '../components/SolennixLogo';
import { TypewriterText } from '../components/TypewriterText';

const { fontFamily } = loadFont();

type IntroSceneProps = {
  title?: string;
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  title = "Cómo crear clientes",
}) => {
  const frame = useCurrentFrame();

  const subtitleOpacity = interpolate(frame, [95, 115], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
        <SolennixLogo size={72} animateIn />

        <TypewriterText
          text={title}
          startFrame={30}
          charFrames={3}
          showCursor
          style={{
            fontSize: 52,
            fontWeight: 'bold',
            color: COLORS.accent,
            fontFamily,
          }}
        />

        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 22,
            color: COLORS.textSecondary,
            fontFamily,
          }}
        >
          Tutorial rápido · 30 segundos
        </div>
      </div>
    </AbsoluteFill>
  );
};
