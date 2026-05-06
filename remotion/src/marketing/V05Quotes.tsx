import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { SOCIAL_COLORS } from '../constants';
import { TypewriterText } from '../components/TypewriterText';
import { MARKETING_FONTS, MarketingCTA, PhoneFrame } from './common';
import type { V05QuotesProps } from '../schema';

const { cinzel, inter } = MARKETING_FONTS;

export const V05_Quotes: React.FC<V05QuotesProps> = ({
  hookTimes,
  clientName,
  eventName,
  items,
  totalAmount,
  url = 'solennix.com',
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${SOCIAL_COLORS.navyDark} 0%, ${SOCIAL_COLORS.navy} 100%)`,
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={80}>
          <HookScene hookTimes={hookTimes} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={170}>
          <QuickQuoteScene clientName={clientName} eventName={eventName} items={items} totalAmount={totalAmount} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={160}>
          <PdfScene clientName={clientName} eventName={eventName} items={items} totalAmount={totalAmount} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={170}>
          <MarketingCTA
            accent="Lista para enviar"
            headline="Tu cotización queda lista."
            subheadline="Con total, PDF y tu marca en segundos."
            url={url}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const HookScene: React.FC<Pick<V05QuotesProps, 'hookTimes'>> = ({ hookTimes }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 90px',
      }}
    >
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 60,
          fontWeight: 700,
          color: SOCIAL_COLORS.cream,
          textAlign: 'center',
          lineHeight: 1.16,
          marginBottom: 22,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        ¿Cuánto te tardas
        <br />
        en cotizar?
      </div>

      <div
        style={{
          fontFamily: inter,
          fontSize: 24,
          fontWeight: 600,
          color: SOCIAL_COLORS.gold,
          textTransform: 'uppercase',
          letterSpacing: 3,
          marginBottom: 28,
          opacity: interpolate(frame, [8, 20], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Antes vs ahora
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
        {hookTimes.map((time, index) => {
          const start = 10 + index * 10;
          const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: 'clamp' });
          const slashWidth = interpolate(frame, [start + 6, start + 16], [0, 500], { extrapolateRight: 'clamp' });

          return (
            <div
              key={time}
              style={{
                position: 'relative',
                height: 92,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
              }}
            >
              <span
                style={{
                  fontFamily: inter,
                  fontSize: 36,
                  fontWeight: 700,
                  color: SOCIAL_COLORS.cream,
                  letterSpacing: 1,
                }}
              >
                {time}
              </span>
              <div
                style={{
                  position: 'absolute',
                  width: slashWidth,
                  height: 6,
                  borderRadius: 999,
                  background: '#ef4444',
                  transform: 'rotate(-10deg)',
                  boxShadow: '0 0 28px rgba(239,68,68,0.4)',
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 34,
          fontFamily: inter,
          fontSize: 28,
          fontWeight: 700,
          color: SOCIAL_COLORS.gold,
          textTransform: 'uppercase',
          letterSpacing: 4,
          opacity: interpolate(frame, [34, 48], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <TypewriterText text="Ahora: minutos." startFrame={34} charFrames={2} showCursor={false} />
      </div>
    </AbsoluteFill>
  );
};

const QuickQuoteScene: React.FC<Pick<V05QuotesProps, 'clientName' | 'eventName' | 'items' | 'totalAmount'>> = ({
  clientName,
  eventName,
  items,
  totalAmount,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const animatedTotal = Math.round(
    interpolate(frame, [56, 122], [0, parseMoney(totalAmount)], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <PhoneFrame>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, #fbf8f2 0%, #f2eee7 100%)',
            padding: '92px 52px 42px',
            transform: `scale(${0.92 + phoneScale * 0.08})`,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(196,162,101,0.14)',
              color: SOCIAL_COLORS.navyDark,
              fontFamily: inter,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            Cotización rápida
          </div>

          <div
            style={{
              fontFamily: cinzel,
              fontSize: 42,
              fontWeight: 700,
              color: SOCIAL_COLORS.navyDark,
              lineHeight: 1.15,
              marginBottom: 12,
            }}
          >
            {eventName}
          </div>

          <div
            style={{
              fontFamily: inter,
              fontSize: 23,
              color: '#475569',
              marginBottom: 26,
            }}
          >
            Cliente: {clientName}
          </div>

          <div
            style={{
              fontFamily: inter,
              fontSize: 18,
              fontWeight: 700,
              color: SOCIAL_COLORS.goldDark,
              textTransform: 'uppercase',
              letterSpacing: 2,
              marginBottom: 18,
            }}
          >
            Agregas servicios y el total se calcula solo
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginBottom: 30,
            }}
          >
            {items.map((item, index) => {
              const start = 16 + index * 16;
              const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: 'clamp' });
              const translateX = interpolate(frame, [start, start + 10], [80, 0], { extrapolateRight: 'clamp' });

              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 22px',
                    borderRadius: 24,
                    background: '#ffffff',
                    border: '1px solid rgba(27,42,74,0.08)',
                    boxShadow: '0 18px 32px rgba(15,26,46,0.08)',
                    opacity,
                    transform: `translateX(${translateX}px)`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 26,
                        fontWeight: 700,
                        color: SOCIAL_COLORS.navyDark,
                        marginBottom: 6,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 20,
                        color: '#64748b',
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 28,
                      fontWeight: 800,
                      color: SOCIAL_COLORS.goldDark,
                    }}
                  >
                    {item.price}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderRadius: 30,
              background: SOCIAL_COLORS.navyDark,
              padding: '24px 28px',
              color: SOCIAL_COLORS.cream,
              boxShadow: '0 24px 48px rgba(15,26,46,0.18)',
            }}
          >
            <div
              style={{
                fontFamily: inter,
                fontSize: 18,
                textTransform: 'uppercase',
                letterSpacing: 2,
                opacity: 0.72,
                marginBottom: 10,
              }}
            >
              Total actualizado
            </div>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 50,
                fontWeight: 700,
                color: SOCIAL_COLORS.gold,
              }}
            >
              {formatMoney(animatedTotal)}
            </div>
          </div>
        </div>
      </PhoneFrame>
    </AbsoluteFill>
  );
};

const PdfScene: React.FC<Pick<V05QuotesProps, 'clientName' | 'eventName' | 'items' | 'totalAmount'>> = ({
  clientName,
  eventName,
  items,
  totalAmount,
}) => {
  const frame = useCurrentFrame();

  const printerReveal = interpolate(frame, [0, 36], [-420, 0], { extrapolateRight: 'clamp' });
  const printerShadow = interpolate(frame, [0, 36], [0.2, 0.42], { extrapolateRight: 'clamp' });
  const stampOpacity = interpolate(frame, [42, 62], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 780,
          padding: 26,
          borderRadius: 42,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div
          style={{
            height: 160,
            borderRadius: 34,
            background: 'linear-gradient(180deg, #16243e 0%, #0f1a2e 100%)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            marginBottom: -28,
          }}
        />

        <div
          style={{
            borderRadius: 34,
            background: '#fcfbf7',
            minHeight: 1080,
            padding: '60px 48px 48px',
            transform: `translateY(${printerReveal}px)`,
            boxShadow: `0 24px 80px rgba(15,26,46,${printerShadow})`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
            <div>
              <div
                style={{
                  fontFamily: cinzel,
                  fontSize: 42,
                  fontWeight: 700,
                  color: SOCIAL_COLORS.navyDark,
                  marginBottom: 8,
                }}
              >
                PDF profesional
              </div>
              <div style={{ fontFamily: inter, fontSize: 22, color: '#64748b' }}>
                {clientName} · {eventName}
              </div>
            </div>
            <div
              style={{
                padding: '12px 18px',
                borderRadius: 999,
                background: 'rgba(196,162,101,0.14)',
                fontFamily: inter,
                fontSize: 18,
                fontWeight: 800,
                color: SOCIAL_COLORS.goldDark,
                textTransform: 'uppercase',
                letterSpacing: 2,
              }}
            >
              Logo y total listos
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {items.map((item) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(27,42,74,0.08)',
                  paddingBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 24,
                      fontWeight: 700,
                      color: SOCIAL_COLORS.navyDark,
                      marginBottom: 4,
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 18, color: '#64748b' }}>
                    {item.description}
                  </div>
                </div>
                <div style={{ fontFamily: inter, fontSize: 26, fontWeight: 800, color: SOCIAL_COLORS.navyDark }}>
                  {item.price}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 36,
              padding: '28px 30px',
              borderRadius: 28,
              background: SOCIAL_COLORS.navyDark,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontFamily: inter, fontSize: 22, color: SOCIAL_COLORS.cream }}>Total</div>
            <div style={{ fontFamily: cinzel, fontSize: 46, fontWeight: 700, color: SOCIAL_COLORS.gold }}>
              {totalAmount}
            </div>
          </div>

          <div
            style={{
              marginTop: 26,
              display: 'inline-flex',
              padding: '14px 24px',
              borderRadius: 999,
              background: 'rgba(34,197,94,0.14)',
              color: '#15803d',
              fontFamily: inter,
              fontSize: 20,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: 2,
              opacity: stampOpacity,
            }}
          >
            Enviar al cliente
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const parseMoney = (value: string) => Number(value.replace(/[^0-9.-]+/g, ''));

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
