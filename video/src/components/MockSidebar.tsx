import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Cinzel';
import { COLORS, NAV_ITEMS } from '../constants';

const { fontFamily: cinzelFont } = loadFont();

type MockSidebarProps = {
  activeItem?: string;
  highlightFrame?: number;
};

// Simple SVG icons matching lucide style
const NavIcon: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const s = 20; // icon size
  const sw = 1.8; // stroke width

  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={sw} />
      </svg>
    ),
    calendar: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth={sw} />
        <path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    ),
    calculator: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth={sw} />
        <rect x="8" y="6" width="8" height="4" rx="1" stroke={color} strokeWidth={sw} />
        <circle cx="9" cy="14" r="0.8" fill={color} />
        <circle cx="15" cy="14" r="0.8" fill={color} />
        <circle cx="9" cy="18" r="0.8" fill={color} />
        <circle cx="15" cy="18" r="0.8" fill={color} />
      </svg>
    ),
    zap: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    ),
    users: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth={sw} />
        <path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke={color} strokeWidth={sw} />
        <circle cx="17" cy="7" r="3" stroke={color} strokeWidth={sw} />
        <path d="M22 21v-2a3 3 0 00-3-3h-1" stroke={color} strokeWidth={sw} />
      </svg>
    ),
    package: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <path d="M16.5 9.4L7.5 4.21M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={color} strokeWidth={sw} />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth={sw} />
      </svg>
    ),
    boxes: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="8" height="8" rx="1" stroke={color} strokeWidth={sw} />
        <rect x="14" y="2" width="8" height="8" rx="1" stroke={color} strokeWidth={sw} />
        <rect x="2" y="14" width="8" height="8" rx="1" stroke={color} strokeWidth={sw} />
        <rect x="14" y="14" width="8" height="8" rx="1" stroke={color} strokeWidth={sw} />
      </svg>
    ),
    settings: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={sw} />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth={sw} />
      </svg>
    ),
  };

  return <div style={{ width: s, height: s, flexShrink: 0 }}>{icons[type] || null}</div>;
};

export const MockSidebar: React.FC<MockSidebarProps> = ({
  activeItem = 'Dashboard',
  highlightFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const highlightProgress = highlightFrame > 0
    ? spring({ frame: Math.max(0, frame - highlightFrame), fps, config: { damping: 200 } })
    : 1;

  return (
    <div style={{
      width: 256,
      height: '100%',
      backgroundColor: COLORS.bg,
      padding: '16px 16px',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        marginBottom: 16,
        height: 64,
      }}>
        <div style={{
          width: 36,
          height: 36,
          backgroundColor: COLORS.accent,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={{ width: 22, height: 22 }}>
            <defs>
              <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4B87A"/>
                <stop offset="45%" stopColor="#C4A265"/>
                <stop offset="100%" stopColor="#B8965A"/>
              </linearGradient>
            </defs>
            <path d="M66,34 Q58,65 66,88 Q78,116 100,122 Q122,116 134,88 Q142,65 134,34 Q100,42 66,34 Z" fill="url(#gT)"/>
            <path d="M76,38 Q72,58 76,82 Q85,104 100,112 L100,42 Q82,44 76,38 Z" fill="rgba(255,255,255,0.12)"/>
            <ellipse cx="100" cy="124" rx="6" ry="3" fill="url(#gT)"/>
            <path d="M96,124 L96,150 Q96,156 84,159 L72,161 L72,164 A30,8 0 0,0 128,164 L128,161 L116,159 Q104,156 104,150 L104,124 Z" fill="url(#gT)"/>
          </svg>
        </div>
        <span style={{
          fontFamily: cinzelFont,
          fontSize: 20,
          fontWeight: 600,
          color: COLORS.primary,
          letterSpacing: '0.05em',
        }}>
          Solennix
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '0 12px' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.name === activeItem;
          const opacity = isActive ? highlightProgress : 1;

          const bgColor = isActive && highlightProgress > 0.5
            ? COLORS.primary
            : 'transparent';
          const textColor = isActive && highlightProgress > 0.5
            ? COLORS.white
            : COLORS.textSecondary;
          const shadow = isActive && highlightProgress > 0.5
            ? '0 4px 6px rgba(196, 162, 101, 0.2)'
            : 'none';

          return (
            <div
              key={item.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 16,
                backgroundColor: bgColor,
                boxShadow: shadow,
                opacity,
              }}
            >
              <NavIcon type={item.icon} color={textColor} />
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: textColor,
              }}>
                {item.name}
              </span>
            </div>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div style={{
        borderTop: `1px solid ${COLORS.border}`,
        paddingTop: 16,
        marginTop: 8,
      }}>
        {/* User card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          backgroundColor: `${COLORS.surfaceAlt}80`,
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          marginBottom: 12,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.white,
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            T
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Tomas</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              tomas@solennix.com
            </div>
          </div>
        </div>

        {/* Theme + Logout buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            borderRadius: 12,
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" stroke={COLORS.text} strokeWidth="2" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={COLORS.text} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            borderRadius: 12,
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={COLORS.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
