import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../constants';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

export const NavigationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const layoutOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const activeItem = frame >= 50 ? 'Clientes' : 'Dashboard';

  const headingOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const headingSlide = interpolate(frame, [60, 80], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily, opacity: layoutOpacity }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <MockSidebar activeItem={activeItem} highlightFrame={50} />

        {/* Content area — matches Layout.tsx: flex-1 flex flex-col min-w-0 overflow-hidden lg:py-2 lg:pr-2 */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          padding: '8px 8px 8px 0',
        }}>
          {/* Panel — bg-surface-grouped lg:rounded-[3rem] lg:border border-border lg:shadow-xl */}
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

            {/* Scrollable content area — px-10 pb-10 */}
            <div style={{ flex: 1, padding: '0 40px 40px' }}>
              <div style={{
                opacity: headingOpacity,
                transform: `translateY(${headingSlide}px)`,
                fontSize: 24,
                fontWeight: 900,
                color: COLORS.text,
                letterSpacing: '-0.025em',
              }}>
                Clientes
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClickHighlight x={155} y={395} clickFrame={50} />
    </AbsoluteFill>
  );
};
