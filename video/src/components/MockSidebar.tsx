import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Cinzel';
import { COLORS, PREMIUM_GRADIENT, NAV_ITEMS } from '../constants';

const { fontFamily: cinzelFont } = loadFont();

type MockSidebarProps = {
  activeItem?: string;
  highlightFrame?: number;
};

const IconShape: React.FC<{ type: string; color: string }> = ({
  type,
  color,
}) => {
  const size = 20;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: type === 'grid' ? 4 : size / 2,
        backgroundColor: color,
        opacity: 0.7,
        flexShrink: 0,
      }}
    />
  );
};

export const MockSidebar: React.FC<MockSidebarProps> = ({
  activeItem = 'Dashboard',
  highlightFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightProgress =
    highlightFrame > 0
      ? spring({
          frame: Math.max(0, frame - highlightFrame),
          fps,
          config: { damping: 200 },
        })
      : activeItem
        ? 1
        : 0;

  return (
    <div
      style={{
        width: 256,
        height: '100%',
        backgroundColor: COLORS.bg,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: COLORS.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: COLORS.primary,
              fontSize: 16,
              fontWeight: 'bold',
              fontFamily: cinzelFont,
            }}
          >
            S
          </span>
        </div>
        <span
          style={{
            fontFamily: cinzelFont,
            fontSize: 20,
            fontWeight: 600,
            color: COLORS.primary,
            letterSpacing: '0.05em',
          }}
        >
          Solennix
        </span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
        const isActive = item.name === activeItem;
        const bgOpacity = isActive ? highlightProgress : 0;

        return (
          <div
            key={item.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 12,
              backgroundColor:
                bgOpacity > 0
                  ? `rgba(196, 162, 101, ${bgOpacity})`
                  : 'transparent',
              position: 'relative',
            }}
          >
            <IconShape
              type={item.icon}
              color={
                isActive && bgOpacity > 0.5
                  ? COLORS.white
                  : COLORS.textSecondary
              }
            />
            <span
              style={{
                fontSize: 15,
                fontWeight: isActive ? 600 : 400,
                color:
                  isActive && bgOpacity > 0.5
                    ? COLORS.white
                    : COLORS.textSecondary,
              }}
            >
              {item.name}
            </span>
          </div>
        );
      })}

      {/* User profile at bottom */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: PREMIUM_GRADIENT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.white,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          T
        </div>
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}
          >
            Tomas
          </div>
          <div style={{ fontSize: 12, color: COLORS.textTertiary }}>
            Plan Pro
          </div>
        </div>
      </div>
    </div>
  );
};
