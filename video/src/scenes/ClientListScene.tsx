import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS, PREMIUM_GRADIENT } from '../constants';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

const CLIENTS = [
  { initials: 'AG', name: 'Ana González', city: 'Monterrey', phone: '55 9876 5432', email: 'ana@correo.com', events: 3, total: '$12,500' },
  { initials: 'CR', name: 'Carlos Ruiz', city: 'Guadalajara', phone: '55 4567 8901', email: 'carlos@correo.com', events: 1, total: '$8,200' },
  { initials: 'LP', name: 'Laura Pérez', city: 'CDMX', phone: '55 1122 3344', email: 'laura@correo.com', events: 5, total: '$45,000' },
];

const PhoneIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"
      stroke={COLORS.primary}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MailIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="3" stroke={COLORS.textSecondary} strokeWidth="1.5" />
    <path d="M2 7l10 7 10-7" stroke={COLORS.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
    <circle cx="11" cy="11" r="7" stroke={COLORS.textSecondary} strokeWidth="2" />
    <path d="M16 16L20 20" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ClientListScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flashOpacity = interpolate(frame, [80, 90, 100, 120], [0, 0.15, 0.15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <MockSidebar activeItem="Clientes" />

        {/* Content area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          padding: '8px 8px 8px 0',
        }}>
          {/* Panel */}
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

            {/* Content — px-10 pb-10 */}
            <div style={{ flex: 1, padding: '0 40px 40px', overflow: 'hidden' }}>
              {/* Header row: title + buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}>
                <h1 style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: COLORS.text,
                  letterSpacing: '-0.025em',
                  margin: 0,
                }}>
                  Clientes
                </h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* CSV outline button */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.card,
                    color: COLORS.text,
                    fontSize: 14,
                    fontWeight: 500,
                  }}>
                    <DownloadIcon />
                    CSV
                  </div>

                  {/* Nuevo Cliente primary button */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 20px',
                    borderRadius: 12,
                    background: PREMIUM_GRADIENT,
                    color: COLORS.white,
                    fontSize: 14,
                    fontWeight: 700,
                    boxShadow: '0 4px 6px -1px rgba(196, 162, 101, 0.2)',
                  }}>
                    <PlusIcon />
                    Nuevo Cliente
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <SearchIcon />
                <div style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.card,
                  fontSize: 14,
                  color: COLORS.textSecondary,
                }}>
                  Buscar clientes...
                </div>
              </div>

              {/* Table card */}
              <div style={{
                backgroundColor: COLORS.card,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                borderRadius: 24,
                border: `1px solid ${COLORS.border}`,
              }}>
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1fr 1fr',
                  backgroundColor: COLORS.surfaceAlt,
                }}>
                  {['CLIENTE', 'CONTACTO', 'EVENTOS', 'TOTAL'].map((col) => (
                    <div key={col} style={{
                      padding: '12px 24px',
                      fontSize: 11,
                      fontWeight: 500,
                      color: COLORS.textSecondary,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                    }}>
                      {col}
                    </div>
                  ))}
                </div>

                {/* Table rows */}
                {CLIENTS.map((client, i) => {
                  const delay = [5, 15, 25][i];
                  const slideProgress = spring({
                    frame: Math.max(0, frame - delay),
                    fps,
                    config: { damping: 15, stiffness: 120 },
                  });

                  const translateX = interpolate(slideProgress, [0, 1], [80, 0]);
                  const rowOpacity = interpolate(slideProgress, [0, 1], [0, 1]);

                  return (
                    <div
                      key={client.initials}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr 1fr 1fr',
                        borderTop: i > 0 ? `1px solid ${COLORS.border}` : undefined,
                        transform: `translateX(${translateX}px)`,
                        opacity: rowOpacity,
                      }}
                    >
                      {/* CLIENTE: avatar + name + city */}
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: `${COLORS.primary}18`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          color: COLORS.primary,
                          flexShrink: 0,
                        }}>
                          {client.initials}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>
                            {client.name}
                          </div>
                          <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                            {client.city}
                          </div>
                        </div>
                      </div>

                      {/* CONTACTO: phone + email */}
                      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PhoneIcon />
                          <span style={{ fontSize: 14, color: COLORS.primary }}>{client.phone}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MailIcon />
                          <span style={{ fontSize: 14, color: COLORS.text }}>{client.email}</span>
                        </div>
                      </div>

                      {/* EVENTOS: badge */}
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: 9999,
                          backgroundColor: `${COLORS.success}18`,
                          color: COLORS.success,
                          fontSize: 12,
                          fontWeight: 600,
                        }}>
                          {client.events}
                        </span>
                      </div>

                      {/* TOTAL */}
                      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.text }}>
                          {client.total}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flash overlay on click */}
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.primary,
          opacity: flashOpacity,
          pointerEvents: 'none',
        }}
      />

      <ClickHighlight x={1782} y={130} clickFrame={65} />
    </AbsoluteFill>
  );
};
