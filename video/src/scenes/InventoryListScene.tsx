import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS, PREMIUM_GRADIENT } from '../constants';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

const ITEMS = [
  { initials: 'VV', name: 'Vaso Vidrio', category: 'Cristalería', stock: '200', cost: '$15.00' },
  { initials: 'ST', name: 'Silla Tiffany', category: 'Mobiliario', stock: '80', cost: '$450.00' },
  { initials: 'MB', name: 'Mantel Blanco', category: 'Mantelería', stock: '15', cost: '$180.00' },
];

const BoxIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4 a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={COLORS.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={COLORS.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
    <circle cx="11" cy="11" r="7" stroke={COLORS.textSecondary} strokeWidth="2" />
    <path d="M16 16L20 20" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const InventoryListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity = interpolate(frame, [80, 90, 100, 120], [0, 0.15, 0.15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <MockSidebar activeItem="Inventario" />

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px 8px 0', overflow: 'hidden' }}>
          {/* Panel */}
          <div style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 48, border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MockTopbar />

            <div style={{ flex: 1, padding: '0 40px 40px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.text, margin: 0 }}>Inventario</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 12, background: PREMIUM_GRADIENT, color: COLORS.white, fontSize: 14, fontWeight: 700, boxShadow: '0 4px 6px -1px rgba(196, 162, 101, 0.2)' }}>
                    <PlusIcon />
                    Nuevo Ítem
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <SearchIcon />
                <div style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 12, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, fontSize: 14, color: COLORS.textSecondary }}>
                  Buscar ítems...
                </div>
              </div>

              {/* Table card */}
              <div style={{ backgroundColor: COLORS.card, overflow: 'hidden', borderRadius: 24, border: `1px solid ${COLORS.border}` }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', backgroundColor: COLORS.surfaceAlt }}>
                  {['ÍTEM', 'CATEGORÍA', 'STOCK', 'COSTO'].map((col) => (
                    <div key={col} style={{ padding: '12px 24px', fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col}
                    </div>
                  ))}
                </div>

                {/* Table rows */}
                {ITEMS.map((item, i) => {
                  const slideProgress = spring({ frame: Math.max(0, frame - (5 + i * 10)), fps, config: { damping: 15, stiffness: 120 } });
                  const translateX = interpolate(slideProgress, [0, 1], [80, 0]);
                  const rowOpacity = interpolate(slideProgress, [0, 1], [0, 1]);

                  return (
                    <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', borderTop: i > 0 ? `1px solid ${COLORS.border}` : undefined, transform: `translateX(${translateX}px)`, opacity: rowOpacity }}>
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: `${COLORS.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: COLORS.primary }}>
                          {item.initials}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{item.name}</div>
                      </div>
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 9999, backgroundColor: COLORS.surfaceAlt, color: COLORS.textSecondary, fontSize: 12 }}>{item.category}</span>
                      </div>
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, color: COLORS.text }}>{item.stock}</span>
                      </div>
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>{item.cost}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AbsoluteFill style={{ backgroundColor: COLORS.primary, opacity: flashOpacity, pointerEvents: 'none' }} />
      {/* Reusing exact same coordinates as client list "Nuevo" button */}
      <ClickHighlight x={1782} y={130} clickFrame={65} />
    </AbsoluteFill>
  );
};
