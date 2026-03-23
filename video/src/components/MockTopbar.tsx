import { COLORS } from '../constants';

export const MockTopbar: React.FC = () => {
  return (
    <div style={{
      padding: '16px 40px',
      paddingTop: 24,
      paddingBottom: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexShrink: 0,
    }}>
      {/* Search / Command Palette button */}
      <div style={{ flex: 1, maxWidth: 672, position: 'relative' }}>
        {/* Search icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <circle cx="11" cy="11" r="7" stroke={COLORS.textTertiary} strokeWidth="2" />
          <path d="M16 16L20 20" stroke={COLORS.textTertiary} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div style={{
          width: '100%',
          borderRadius: 16,
          backgroundColor: COLORS.surfaceAlt,
          padding: '14px 16px 14px 48px',
          fontSize: 14,
          color: COLORS.textTertiary,
          border: 'none',
        }}>
          Buscar o presiona ⌘K...
        </div>
      </div>
    </div>
  );
};
