import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { COLORS } from '../constants';

type MockFormInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  typingStartFrame: number;
  charFrames?: number;
  isFocused?: boolean;
  gridColumn?: string;
};

export const MockFormInput: React.FC<MockFormInputProps> = ({
  label,
  value,
  placeholder = '',
  required = false,
  typingStartFrame,
  charFrames = 2,
  isFocused = false,
  gridColumn,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = Math.max(0, frame - typingStartFrame);
  const charsVisible = Math.min(value.length, Math.floor(localFrame / charFrames));
  const displayValue = frame >= typingStartFrame ? value.slice(0, charsVisible) : '';
  const isTyping = frame >= typingStartFrame && charsVisible < value.length;

  const cursorOpacity = isTyping
    ? (Math.floor((localFrame / (fps * 0.5)) % 2) === 0 ? 1 : 0)
    : 0;

  const focusRingOpacity = isFocused
    ? interpolate(frame, [typingStartFrame - 5, typingStartFrame], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const showPlaceholder = !displayValue && !isTyping;

  return (
    <div style={{ gridColumn }}>
      <label style={{
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        color: COLORS.textSecondary,
        marginBottom: 8,
      }}>
        {label}{required && <span style={{ color: COLORS.error }}> *</span>}
      </label>
      <div style={{
        width: '100%',
        padding: 12,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.card,
        fontSize: 16,
        color: showPlaceholder ? COLORS.textTertiary : COLORS.text,
        boxShadow: focusRingOpacity > 0
          ? `0 1px 2px rgba(0,0,0,0.05), 0 0 0 3px rgba(196, 162, 101, ${focusRingOpacity * 0.2})`
          : '0 1px 2px rgba(0,0,0,0.05)',
        minHeight: 20,
      }}>
        {showPlaceholder ? placeholder : displayValue}
        {isTyping && <span style={{ opacity: cursorOpacity, color: COLORS.primary }}>|</span>}
      </div>
    </div>
  );
};
