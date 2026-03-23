import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Sequence } from 'remotion';
import { loadFont as loadCinzel } from '@remotion/google-fonts/Cinzel';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { SOCIAL_COLORS } from '../constants';
import { TestimonialTemplateProps } from '../schema';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

const { fontFamily: cinzel } = loadCinzel();
const { fontFamily: inter } = loadInter();

/**
 * TestimonialTemplate — Review animado con estrellas
 * Format: 9:16 y 1:1
 */
export const TestimonialTemplate: React.FC<TestimonialTemplateProps> = ({
  clientName = 'Juan Pérez',
  clientRole = 'Event Planner',
  testimonial = 'Desde que uso Solennix, mi tiempo rinde el doble. Mis clientes aman lo rápido que cotizo y yo recuperé mis fines de semana.',
  stars = 5,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background intro
  const bgScale = spring({ frame, fps, config: { damping: 14 } });

  // Text fade
  const textO = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textY = interpolate(frame, [20, 40], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Footer fade
  const footerO = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: SOCIAL_COLORS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10%' }}>
      
      {/* The Review Card */}
      <div style={{
        width: '100%',
        maxWidth: 800,
        backgroundColor: SOCIAL_COLORS.creamWarm,
        borderRadius: 24,
        padding: '10% 8%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
        boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
        transform: `scale(${bgScale})`,
        border: `1px solid ${SOCIAL_COLORS.goldLight}`
      }}>
        
        {/* Quote Icon */}
        <div style={{ fontFamily: cinzel, fontSize: 100, color: SOCIAL_COLORS.gold, lineHeight: 0.5, opacity: 0.3, marginBottom: -20, marginTop: 20 }}>
          "
        </div>

        {/* Testimonial Text */}
        <div style={{
          fontFamily: inter,
          fontSize: 36,
          fontWeight: 400,
          color: SOCIAL_COLORS.navy,
          textAlign: 'center',
          lineHeight: 1.5,
          opacity: textO,
          transform: `translateY(${textY}px)`,
          fontStyle: 'italic'
        }}>
          {testimonial}
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const isFilled = i < stars;
            const starScale = spring({ frame: Math.max(0, frame - 30 - i * 5), fps, config: { damping: 10 } });
            return (
              <svg key={i} viewBox="0 0 24 24" style={{ width: 40, height: 40, transform: `scale(${starScale})`, fill: isFilled ? SOCIAL_COLORS.gold : 'transparent', stroke: SOCIAL_COLORS.gold, strokeWidth: 1.5 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            );
          })}
        </div>

        {/* Client Name & Role */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, opacity: footerO, marginTop: 10 }}>
          <div style={{ fontFamily: cinzel, fontSize: 28, fontWeight: 700, color: SOCIAL_COLORS.navyDark }}>
            {clientName}
          </div>
          <div style={{ fontFamily: inter, fontSize: 20, color: SOCIAL_COLORS.textMuted, letterSpacing: 2 }}>
            {clientRole.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Discreet Logo at bottom */}
      <div style={{ position: 'absolute', bottom: 50, opacity: footerO }}>
        <SolennixLogoDark size={40} animateIn={false} showWordmark />
      </div>

    </AbsoluteFill>
  );
};
