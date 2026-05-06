import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { SOCIAL_COLORS } from '../constants';
import { Checkmark } from '../components/Checkmark';
import { MARKETING_FONTS, MarketingCTA, PhoneFrame } from './common';
import type { V06PaymentsProps } from '../schema';

const { cinzel, inter } = MARKETING_FONTS;

export const V06_Payments: React.FC<V06PaymentsProps> = ({
  alertCount,
  pendingAmount,
  payments,
  url = 'solennix.com',
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SOCIAL_COLORS.navyDark} 0%, ${SOCIAL_COLORS.navy} 100%)`,
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={60}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <AlertsScene alertCount={alertCount} pendingAmount={pendingAmount} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <PaymentsScene payments={payments} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <MarketingCTA
            accent="Control total"
            headline="Sabés quién pagó."
            subheadline="Y cuánto te deben. Siempre."
            url={url}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 96px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 66,
          fontWeight: 700,
          color: SOCIAL_COLORS.cream,
          lineHeight: 1.14,
          marginBottom: 24,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        ¿Quién pagó
        <br />
        y quién no?
      </div>
      <div
        style={{
          fontFamily: inter,
          fontSize: 28,
          color: SOCIAL_COLORS.gold,
          textTransform: 'uppercase',
          letterSpacing: 3,
          opacity: interpolate(frame, [14, 28], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Sin perseguir mensajes
      </div>
    </AbsoluteFill>
  );
};

const AlertsScene: React.FC<Pick<V06PaymentsProps, 'alertCount' | 'pendingAmount'>> = ({
  alertCount,
  pendingAmount,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const badgePulse = interpolate(frame % 24, [0, 12, 24], [1, 1.1, 1], {
    extrapolateRight: 'clamp',
  });

  const overlayOpacity = interpolate(frame, [18, 38], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <PhoneFrame>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: SOCIAL_COLORS.creamWarm,
            padding: '88px 40px 40px',
            transform: `scale(${0.92 + scale * 0.08})`,
          }}
        >
          <Img
            src={staticFile('screenshots/01-dashboard.png')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 44,
              right: 44,
              top: 640,
              height: 280,
              borderRadius: 28,
              background: `rgba(196,162,101,${0.12 + overlayOpacity * 0.1})`,
              border: `2px solid rgba(196,162,101,${0.4 + overlayOpacity * 0.4})`,
              boxShadow: `0 0 0 14px rgba(196,162,101,${overlayOpacity * 0.12})`,
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 562,
              right: 56,
              padding: '18px 24px',
              borderRadius: 999,
              background: '#fee2e2',
              transform: `scale(${badgePulse})`,
              boxShadow: '0 18px 40px rgba(239,68,68,0.28)',
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 18,
                fontWeight: 800,
                color: '#b91c1c',
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              {alertCount} alertas
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 56,
              right: 56,
              bottom: 84,
              borderRadius: 26,
              padding: '24px 26px',
              background: 'rgba(15,26,46,0.88)',
              color: SOCIAL_COLORS.cream,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 18,
                fontWeight: 700,
                color: SOCIAL_COLORS.gold,
                textTransform: 'uppercase',
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              Cobros por cerrar
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 42, fontWeight: 700 }}>{pendingAmount}</div>
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};

const PaymentsScene: React.FC<Pick<V06PaymentsProps, 'payments'>> = ({ payments }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <PhoneFrame>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: SOCIAL_COLORS.creamWarm,
            transform: `scale(${0.93 + scale * 0.07})`,
          }}
        >
          <Img
            src={staticFile('screenshots/05-evento-pagos.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div
            style={{
              position: 'absolute',
              left: 40,
              right: 40,
              top: 110,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {payments.map((payment, index) => {
              const start = 8 + index * 16;
              const opacity = interpolate(frame, [start, start + 12], [0, 1], { extrapolateRight: 'clamp' });
              const translateY = interpolate(frame, [start, start + 12], [20, 0], { extrapolateRight: 'clamp' });

              return (
                <div
                  key={payment.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 22px',
                    borderRadius: 22,
                    background: 'rgba(245,240,232,0.94)',
                    border: '1px solid rgba(27,42,74,0.08)',
                    opacity,
                    transform: `translateY(${translateY}px)`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 23,
                        fontWeight: 800,
                        color: SOCIAL_COLORS.navyDark,
                        marginBottom: 6,
                      }}
                    >
                      {payment.label}
                    </div>
                    <div style={{ fontFamily: inter, fontSize: 18, color: '#64748b' }}>
                      {payment.method}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 24,
                        fontWeight: 800,
                        color: SOCIAL_COLORS.goldDark,
                      }}
                    >
                      {payment.amount}
                    </div>
                    {payment.status === 'paid' ? (
                      <Checkmark size={56} startFrame={start + 4} />
                    ) : (
                      <div
                        style={{
                          padding: '8px 14px',
                          borderRadius: 999,
                          background: '#fee2e2',
                          fontFamily: inter,
                          fontSize: 16,
                          fontWeight: 800,
                          color: '#b91c1c',
                          textTransform: 'uppercase',
                          letterSpacing: 1,
                        }}
                      >
                        pendiente
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};
