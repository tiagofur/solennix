import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { SOCIAL_COLORS } from '../constants';
import { MARKETING_FONTS, MarketingCTA, PhoneFrame } from './common';
import type { V07InventoryProps } from '../schema';

const { cinzel, inter } = MARKETING_FONTS;

export const V07_Inventory: React.FC<V07InventoryProps> = ({
  inventoryItems,
  lowStockItem,
  equipmentAssignments,
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
          <InventoryScene inventoryItems={inventoryItems} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <LowStockScene lowStockItem={lowStockItem} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <EquipmentScene equipmentAssignments={equipmentAssignments} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 10 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <MarketingCTA
            accent="Antes del evento"
            headline="Inventario bajo control."
            subheadline="Alertas automáticas. Cero sorpresas."
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
        padding: '0 90px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 62,
          fontWeight: 700,
          color: SOCIAL_COLORS.cream,
          lineHeight: 1.16,
          marginBottom: 22,
          opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        ¿Tienes suficiente
        <br />
        para el sábado?
      </div>
      <div
        style={{
          fontFamily: inter,
          fontSize: 26,
          color: SOCIAL_COLORS.gold,
          textTransform: 'uppercase',
          letterSpacing: 3,
          opacity: interpolate(frame, [14, 28], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        Mejor saberlo antes
      </div>
    </AbsoluteFill>
  );
};

const InventoryScene: React.FC<Pick<V07InventoryProps, 'inventoryItems'>> = ({ inventoryItems }) => {
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
            transform: `scale(${0.92 + scale * 0.08})`,
          }}
        >
          <Img
            src={staticFile('screenshots/09-inventario.png')}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          <div
            style={{
              position: 'absolute',
              left: 36,
              right: 36,
              top: 150,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {inventoryItems.map((item, index) => {
              const start = 8 + index * 14;
              const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: 'clamp' });
              const translateX = interpolate(frame, [start, start + 10], [80, 0], { extrapolateRight: 'clamp' });

              return (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 22,
                    padding: '18px 22px',
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(27,42,74,0.08)',
                    opacity,
                    transform: `translateX(${translateX}px)`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: inter,
                        fontSize: 24,
                        fontWeight: 800,
                        color: SOCIAL_COLORS.navyDark,
                        marginBottom: 4,
                      }}
                    >
                      {item.name}
                    </div>
                    <div style={{ fontFamily: inter, fontSize: 18, color: '#64748b' }}>{item.category}</div>
                  </div>
                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: 18,
                      background: item.stock <= item.minimum ? '#fee2e2' : 'rgba(34,197,94,0.12)',
                      color: item.stock <= item.minimum ? '#b91c1c' : '#15803d',
                      fontFamily: inter,
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {item.stock} {item.unit}
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

const LowStockScene: React.FC<Pick<V07InventoryProps, 'lowStockItem'>> = ({ lowStockItem }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame % 20, [0, 10, 20], [1, 1.08, 1], {
    extrapolateRight: 'clamp',
  });
  const rotate = interpolate(frame % 40, [0, 20, 40], [-6, 6, -6], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.2,
        }}
      >
        <Img
          src={staticFile('screenshots/09-inventario.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div
        style={{
          width: 820,
          borderRadius: 36,
          background: 'rgba(24, 10, 10, 0.82)',
          border: '2px solid rgba(239,68,68,0.35)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
          padding: '42px 38px',
          transform: `scale(${pulse})`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <WarningIcon />
          </div>
          <div>
            <div
              style={{
                fontFamily: inter,
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 2,
                color: '#fca5a5',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Stock crítico
            </div>
            <div
              style={{
                fontFamily: cinzel,
                fontSize: 42,
                fontWeight: 700,
                color: SOCIAL_COLORS.cream,
              }}
            >
              {lowStockItem.name}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
        >
          <AlertStat label="Disponible" value={`${lowStockItem.stock} ${lowStockItem.unit}`} />
          <AlertStat label="Mínimo" value={`${lowStockItem.minimum} ${lowStockItem.unit}`} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EquipmentScene: React.FC<Pick<V07InventoryProps, 'equipmentAssignments'>> = ({ equipmentAssignments }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 860,
          borderRadius: 38,
          background: 'rgba(245,240,232,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '42px 36px',
          boxShadow: '0 34px 90px rgba(0,0,0,0.32)',
        }}
      >
        <div
          style={{
            fontFamily: cinzel,
            fontSize: 40,
            fontWeight: 700,
            color: SOCIAL_COLORS.navyDark,
            marginBottom: 12,
          }}
        >
          Equipo para el evento
        </div>
        <div
          style={{
            fontFamily: inter,
            fontSize: 22,
            color: '#64748b',
            marginBottom: 28,
          }}
        >
          Todo asignado antes de salir.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {equipmentAssignments.map((equipment, index) => {
            const start = 6 + index * 10;
            const opacity = interpolate(frame, [start, start + 10], [0, 1], { extrapolateRight: 'clamp' });
            const translateY = interpolate(frame, [start, start + 10], [24, 0], { extrapolateRight: 'clamp' });

            return (
              <div
                key={equipment.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 22px',
                  borderRadius: 24,
                  background: '#ffffff',
                  border: '1px solid rgba(27,42,74,0.08)',
                  opacity,
                  transform: `translateY(${translateY}px)`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: inter,
                      fontSize: 24,
                      fontWeight: 800,
                      color: SOCIAL_COLORS.navyDark,
                      marginBottom: 4,
                    }}
                  >
                    {equipment.name}
                  </div>
                  <div style={{ fontFamily: inter, fontSize: 18, color: '#64748b' }}>
                    {equipment.notes}
                  </div>
                </div>
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: 18,
                    background: 'rgba(196,162,101,0.14)',
                    fontFamily: inter,
                    fontSize: 20,
                    fontWeight: 800,
                    color: SOCIAL_COLORS.goldDark,
                  }}
                >
                  {equipment.quantity}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const AlertStat: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: '24px 22px',
        background: 'rgba(239,68,68,0.12)',
      }}
    >
      <div
        style={{
          fontFamily: inter,
          fontSize: 16,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 2,
          color: '#fca5a5',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: cinzel,
          fontSize: 34,
          fontWeight: 700,
          color: SOCIAL_COLORS.cream,
        }}
      >
        {value}
      </div>
    </div>
  );
};

const WarningIcon: React.FC = () => {
  return (
    <svg viewBox="0 0 24 24" width={44} height={44} fill="none">
      <path d="M12 3 2.5 20h19L12 3Z" fill="#ef4444" />
      <path d="M12 8v6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.2" fill="#fff" />
    </svg>
  );
};
