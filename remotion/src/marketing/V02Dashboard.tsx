import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile, spring, useVideoConfig } from 'remotion';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

/* ──────────────────────────────────────────────────────────────────────── */
/* V02 — Dashboard: Tu Centro de Comando                                  */
/* Duration total: 600 frames (≈20s a 30fps)                              */
/* ──────────────────────────────────────────────────────────────────────── */

const HOOK_START = 1;        
const DASHBOARD_APPEAR = 75; 
const KPI_VENTAS_START = 85; 
const KPI_COBRADO_START = 100;
const KPI_EVENTOS_START = 115;
const KPI_COTIZ_PENDIENTES_START = 130;
const CHART_ZOOM_START = 190; 
const CTA_TEXT_START = 340;

// Paleta Dashboard — inspirada en UI de Solennix
const COLORS = {
  navyDark: '#0a1628',
  navy: '#0f2c5e',
  cream: '#f9f7f2',
  gold: '#c4a265',
  greenSuccess: '#2dc6a1',
  warningOrange: '#ff9800',
  textMuted: '#b0bec5',
};

/* ──────────────────────────────────────────────────────────────────────── */
/* COMPOSITION PRINCIPAL                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

export const V02_Dashboard: React.FC = () => {
  return (
    <AbsoluteFill 
      style={{ 
        background: COLORS.navyDark,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px'
      }}
    >
      <V02_Main />
    </AbsoluteFill>
  );
};

const V02_Main = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {/* ════════════════════════════════════════════════════════ */}
      {/* SCENE 1: HOOK — Pregunta inicial                          */}
      {/* ════════════════════════════════════════════════════════ */}

      {frame < DASHBOARD_APPEAR && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: '24px',
            opacity: interpolate(frame, [DASHBOARD_APPEAR - 10, DASHBOARD_APPEAR], [1, 0], { extrapolateRight: 'clamp' })
          }}
        >
          <span style={{ 
            fontFamily: 'Cinzel', 
            fontSize: 72, 
            fontWeight: 700, 
            color: COLORS.gold,
            letterSpacing: 4,
            lineHeight: 1.2,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${interpolate(frame, [0, 75], [0.95, 1.05], { extrapolateRight: 'clamp' })})`
          }}>
            ¿CUÁNTO<br/>GANASTE
          </span>
          <span style={{ 
            fontFamily: 'Inter', 
            fontSize: 32, 
            fontWeight: 300, 
            color: COLORS.cream,
            letterSpacing: 8,
            textTransform: 'uppercase',
            opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(frame, [20, 35], [20, 0], { extrapolateRight: 'clamp' })}px)`
          }}>
            este mes?
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SCENE 2: REVEAL KPIS                                     */}
      {/* ════════════════════════════════════════════════════════ */}

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '32px', 
        padding: '0 48px',
        width: '100%',
        position: 'absolute',
        top: 300,
        zIndex: 2
      }}>

        {/* KPI 1: Ventas Netas */}
        <KPiCard 
          text="Ventas Netas"
          value={frame >= KPI_VENTAS_START ? interpolate(frame, [KPI_VENTAS_START, KPI_VENTAS_START + 60], [0, 125000], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : '0'}
          format="$"
          color={COLORS.cream}
          startFrame={KPI_VENTAS_START}
        />

        {/* KPI 2: Cobrado */}
        <KPiCard 
          text="Cobrado"
          value={frame >= KPI_COBRADO_START ? interpolate(frame, [KPI_COBRADO_START, KPI_COBRADO_START + 60], [0, 98500], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : '0'}
          format="$"
          color={COLORS.greenSuccess}
          startFrame={KPI_COBRADO_START}
        />

        {/* KPI 3: Eventos */}
        <KPiCard 
          text="Eventos Activos"
          value={frame >= KPI_EVENTOS_START ? interpolate(frame, [KPI_EVENTOS_START, KPI_EVENTOS_START + 60], [0, 142], { extrapolateRight: 'clamp' }) : '0'}
          format=""
          color={COLORS.cream}
          startFrame={KPI_EVENTOS_START}
        />

        {/* KPI 4: Cotizaciones pendientes */}
        <KPiCard 
          text="Pendientes"
          value={frame >= KPI_COTIZ_PENDIENTES_START ? interpolate(frame, [KPI_COTIZ_PENDIENTES_START, KPI_COTIZ_PENDIENTES_START + 60], [0, 8], { extrapolateRight: 'clamp' }) : '0'}
          format=""
          color={COLORS.warningOrange}
          startFrame={KPI_COTIZ_PENDIENTES_START}
        />

      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* SCENE 4: Gráfico (Zoom animation)                          */}
      {/* ════════════════════════════════════════════════════════ */}

      {frame >= CHART_ZOOM_START && (
        <div style={{ 
          position: 'absolute', 
          top: 950, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '32px',
          opacity: interpolate(frame, [CHART_ZOOM_START, CHART_ZOOM_START + 20], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          <span style={{ fontFamily: "Inter", fontSize: 24, fontWeight: 500, color: COLORS.textMuted }}>Comparativa mensual</span>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            justifyContent: 'center', 
            gap: '20px',
            height: 240,
            padding: '32px 64px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 32,
            border: '1px solid rgba(255,255,255,0.05)',
            width: '90%'
          }}>
            {/* Bar 1 */}
            <ChartBar height="60%" color={COLORS.navy} delay={0} startFrame={CHART_ZOOM_START} />
            {/* Bar 2 */}
            <ChartBar height="75%" color={COLORS.navy} delay={5} startFrame={CHART_ZOOM_START} />
            {/* Bar 3 */}
            <ChartBar height="85%" color={COLORS.navy} delay={10} startFrame={CHART_ZOOM_START} />
            {/* Bar 4 (Highlight) */}
            <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <ChartBar height="100%" color={COLORS.gold} delay={15} startFrame={CHART_ZOOM_START} label="+23%" />
            </div>
          </div>

          <span style={{ fontFamily: "Inter", fontSize: 18, fontWeight: 400, color: COLORS.textMuted }}>Marzo vs Abril vs Mayo vs Junio</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SCENE 5: Beneficio + CTA                                   */}
      {/* ════════════════════════════════════════════════════════ */}

      {frame >= CTA_TEXT_START && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          background: `radial-gradient(circle at center, ${COLORS.navy} 0%, ${COLORS.navyDark} 100%)`,
          zIndex: 10,
          opacity: interpolate(frame, [CTA_TEXT_START, CTA_TEXT_START + 15], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          <SolennixLogoDark size={180} animateIn />
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontFamily: 'Cinzel', 
              fontSize: 64, 
              fontWeight: 700, 
              color: COLORS.gold, 
              letterSpacing: 4,
              opacity: interpolate(frame, [CTA_TEXT_START + 15, CTA_TEXT_START + 30], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame, [CTA_TEXT_START + 15, CTA_TEXT_START + 30], [20, 0], { extrapolateRight: 'clamp' })}px)`
            }}>
              TUS NÚMEROS.
            </div>
            <div style={{ 
              fontFamily: 'Cinzel', 
              fontSize: 48, 
              fontWeight: 400, 
              color: COLORS.cream, 
              letterSpacing: 2,
              opacity: interpolate(frame, [CTA_TEXT_START + 25, CTA_TEXT_START + 40], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `translateY(${interpolate(frame, [CTA_TEXT_START + 25, CTA_TEXT_START + 40], [20, 0], { extrapolateRight: 'clamp' })}px)`
            }}>
              De un vistazo.
            </div>
          </div>
          
          <span style={{ 
            fontFamily: 'Inter', 
            fontSize: 28, 
            fontWeight: 300, 
            color: COLORS.textMuted,
            opacity: interpolate(frame, [CTA_TEXT_START + 40, CTA_TEXT_START + 55], [0, 1], { extrapolateRight: 'clamp' })
          }}>
            Sin Excel. De una vez por todas.
          </span>
          
          {/* CTA Button */}
          <div style={{ 
              marginTop: '40px',
              background: COLORS.gold,
              padding: '24px 60px',
              borderRadius: 20,
              boxShadow: '0 12px 48px rgba(196,162,101,0.4)',
              transform: `scale(${spring({ frame: frame - CTA_TEXT_START - 50, fps, config: { damping: 12 } })})`,
              opacity: interpolate(frame, [CTA_TEXT_START + 50, CTA_TEXT_START + 60], [0, 1], { extrapolateRight: 'clamp' })
            }}>
              <span style={{ 
                fontFamily:'Inter', 
                fontSize: 28, 
                fontWeight: 800, 
                color:'#0a1628',
                textTransform: 'uppercase',
                letterSpacing: 2
              }}>Mirá el demo</span>
          </div>

        </div>
      )}
    </>
  );
};

/* ──────────────────────────────────────────────────────────────────────── */
/* KPI CARD COMPONENT — Animación cont-up                                */
/* ──────────────────────────────────────────────────────────────────────── */

const ChartBar: React.FC<{ height: string; color: string; delay: number; startFrame: number; label?: string }> = ({ height, color, delay, startFrame, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const grow = spring({
    frame: frame - startFrame - delay,
    fps,
    config: { damping: 20 }
  });

  return (
    <div style={{ 
      width: 60, 
      background: color, 
      borderRadius: '12px 12px 4px 4px', 
      height: `${interpolate(grow, [0, 1], [0, parseInt(height)], { extrapolateRight: 'clamp' })}%`,
      boxShadow: color === COLORS.gold ? `0 0 40px ${color}44` : 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflow: 'visible'
    }}>
      {label && frame > startFrame + delay + 10 && (
        <div style={{ 
          position: 'absolute', 
          top: -40, 
          background: COLORS.gold, 
          color: COLORS.navyDark, 
          padding: '4px 12px', 
          borderRadius: 8, 
          fontSize: 16, 
          fontWeight: 800,
          opacity: interpolate(frame, [startFrame + delay + 10, startFrame + delay + 20], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateY(${interpolate(frame, [startFrame + delay + 10, startFrame + delay + 20], [10, 0], { extrapolateRight: 'clamp' })}px)`
        }}>
          {label}
        </div>
      )}
    </div>
  );
};

const KPiCard: React.FC<{ text: string; value: number | string; format: string; color: string; startFrame: number }> = ({ text, value, format, color, startFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12 }
  });

  if (frame < startFrame) return null;

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(8px)',
      borderRadius: 24,
      padding: '24px',
      border: `2px solid ${color}33`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      gap:'8px',
      transform: `scale(${entrance})`,
      opacity: interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateRight: 'clamp' })
    }}>
      <span style={{ 
        fontFamily: "Inter", 
        fontSize: 14, 
        fontWeight: 500, 
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1
      }}>{text}</span>
      <div style={{ 
        fontFamily: "Cinzel", 
        fontSize: 36, 
        fontWeight: 700, 
        color: color,
        textShadow: `0 0 20px ${color}44`
      }}>
        {format === "$" ? `$${Math.round(Number(value)).toLocaleString()}` : Number(value) >= 1000 ? `${(Number(value)/1000).toFixed(1)}k` : Math.round(Number(value))}
      </div>
    </div>
  );
};
