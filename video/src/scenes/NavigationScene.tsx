import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../constants';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

type NavigationSceneProps = {
  targetItem?: string;
};

export const NavigationScene: React.FC<NavigationSceneProps> = ({
  targetItem = 'Clientes',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const layoutOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const activeItem = frame >= 50 ? targetItem : 'Dashboard';

  const headingOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headingSlide = interpolate(frame, [60, 80], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const clickYMap: Record<string, number> = {
    Clientes: 283,
    Inventario: 410,
  };
  const clickY = clickYMap[targetItem] || 283;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily, opacity: layoutOpacity }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <MockSidebar activeItem={activeItem} highlightFrame={50} />

        {/* Content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          padding: '8px 8px 8px 0',
        }}>
          {/* Panel */}
          <div style={{
            flex: 1,
            backgroundColor: COLORS.surface,
            borderRadius: 48,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <MockTopbar />

            {/* Scrollable content area */}
            <div style={{ flex: 1, padding: '0 40px 40px' }}>
              <div style={{
                opacity: headingOpacity,
                transform: `translateY(${headingSlide}px)`,
                fontSize: 24,
                fontWeight: 900,
                color: COLORS.text,
                letterSpacing: '-0.025em',
              }}>
                {targetItem}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClickHighlight x={155} y={clickY} clickFrame={50} />
    </AbsoluteFill>
  );
};
