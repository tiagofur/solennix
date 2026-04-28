import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile, spring, useVideoConfig } from 'remotion';
import { SolennixLogoDark } from '../components/SolennixLogoDark';

/* ──────────────────────────────────────────────────────────────────────── */
/* V02 — Dashboard Square (1:1)                                            */
/* ──────────────────────────────────────────────────────────────────────── */

const DASHBOARD_APPEAR = 75; 
const KPI_VENTAS_START = 85; 
const KPI_COBRADO_START = 100;
const KPI_EVENTOS_START = 115;
const KPI_COTIZ_PENDIENTES_START = 130;
const CHART_ZOOM_START = 190; 
const CTA_TEXT_START = 340;

const COLORS = {
  navyDark: '#0a1628',
  navy: '#0f2c5e',
  cream: '#f9f7f2',
  gold: '#c4a265',
  greenSuccess: '#2dc6a1',
  warningOrange: '#ff9800',
  textMuted: '#b0bec5',
};

export const V02_DashboardSquare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: COLORS.navyDark }}>
      {/* SCENE 1: HOOK */}
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
            gap: '20px',
            opacity: interpolate(frame, [DASHBOARD_APPEAR - 10, DASHBOARD_APPEAR], [1, 0], { extrapolateRight: 'clamp' })
          }}
        >
          <span style={{ 
            fontFamily: 'Cinzel', 
            fontSize: 60, 
            fontWeight: 700, 
            color: COLORS.gold,
            letterSpacing: 4,
            lineHeight: 1.2,
            opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${interpolate(frame, [0, 75], [0.95, 1.05], { extrapolateRight: 'clamp' })})`
          }}>
            ¿CUÁNTO GANASTE
          </span>
          <span style={{ 
            fontFamily: 'Inter', 
            fontSize: 28, 
            fontWeight: 300, 
            color: COLORS.cream,
            letterSpacing: 6,
            textTransform: 'uppercase',
            opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            este mes?
          </span>
        </div>
      )}

      {/* SCENE 2: KPIS */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px', 
        padding: '0 40px',
        width: '100%',
        position: 'absolute',
        top: 150,
        zIndex: 2
      }}>
        <KPiCard text="Ventas Netas" value={frame >= KPI_VENTAS_START ? interpolate(frame, [KPI_VENTAS_START, KPI_VENTAS_START + 60], [0, 125000], { extrapolateRight: 'clamp' }) : '0'} format="$" color={COLORS.cream} startFrame={KPI_VENTAS_START} />
        <KPiCard text="Cobrado" value={frame >= KPI_COBRADO_START ? interpolate(frame, [KPI_COBRADO_START, KPI_COBRADO_START + 60], [0, 98500], { extrapolateRight: 'clamp' }) : '0'} format="$" color={COLORS.greenSuccess} startFrame={KPI_COBRADO_START} />
        <KPiCard text="Eventos" value={frame >= KPI_EVENTOS_START ? interpolate(frame, [KPI_EVENTOS_START, KPI_EVENTOS_START + 60], [0, 142], { extrapolateRight: 'clamp' }) : '0'} format="" color={COLORS.cream} startFrame={KPI_EVENTOS_START} />
        <KPiCard text="Pendientes" value={frame >= KPI_COTIZ_PENDIENTES_START ? interpolate(frame, [KPI_COTIZ_PENDIENTES_START, KPI_COTIZ_PENDIENTES_START + 60], [0, 8], { extrapolateRight: 'clamp' }) : '0'} format="" color={COLORS.warningOrange} startFrame={KPI_COTIZ_PENDIENTES_START} />
      </div>

      {/* SCENE 3: CHART */}
      {frame >= CHART_ZOOM_START && (
        <div style={{ 
          position: 'absolute', 
          top: 550, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '20px',
          opacity: interpolate(frame, [CHART_ZOOM_START, CHART_ZOOM_START + 20], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          <span style={{ fontFamily: "Inter", fontSize: 20, fontWeight: 500, color: COLORS.textMuted }}>Comparativa mensual</span>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end', 
            justifyContent: 'center', 
            gap: '15px',
            height: 180,
            padding: '24px 40px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.05)',
            width: '85%'
          }}>
            <ChartBar height="60%" color={COLORS.navy} delay={0} startFrame={CHART_ZOOM_START} />
            <ChartBar height="75%" color={COLORS.navy} delay={5} startFrame={CHART_ZOOM_START} />
            <ChartBar height="85%" color={COLORS.navy} delay={10} startFrame={CHART_ZOOM_START} />
            <ChartBar height="100%" color={COLORS.gold} delay={15} startFrame={CHART_ZOOM_START} label="+23%" />
          </div>
        </div>
      )}

      {/* SCENE 4: CTA */}
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
          gap: '24px',
          background: `radial-gradient(circle at center, ${COLORS.navy} 0%, ${COLORS.navyDark} 100%)`,
          zIndex: 10,
          opacity: interpolate(frame, [CTA_TEXT_START, CTA_TEXT_START + 15], [0, 1], { extrapolateRight: 'clamp' })
        }}>
          <SolennixLogoDark size={120} animateIn />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Cinzel', fontSize: 48, fontWeight: 700, color: COLORS.gold, letterSpacing: 2 }}>TUS NÚMEROS.</div>
            <div style={{ fontFamily: 'Cinzel', fontSize: 32, fontWeight: 400, color: COLORS.cream, letterSpacing: 1 }}>De un vistazo.</div>
          </div>
          <div style={{ background: COLORS.gold, padding: '16px 40px', borderRadius: 12, transform: `scale(${spring({ frame: frame - CTA_TEXT_START - 50, fps, config: { damping: 12 } })})` }}>
            <span style={{ fontFamily:'Inter', fontSize: 20, fontWeight: 800, color:'#0a1628', textTransform: 'uppercase' }}>Mirá el demo</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const ChartBar: React.FC<{ height: string; color: string; delay: number; startFrame: number; label?: string }> = ({ height, color, delay, startFrame, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = spring({ frame: frame - startFrame - delay, fps, config: { damping: 20 } });
  return (
    <div style={{ 
      width: 45, 
      background: color, 
      borderRadius: '8px 8px 3px 3px', 
      height: `${interpolate(grow, [0, 1], [0, parseInt(height)], { extrapolateRight: 'clamp' })}%`,
      position: 'relative',
      display: 'flex',
      justifyContent: 'center'
    }}>
      {label && frame > startFrame + delay + 10 && (
        <div style={{ 
          position: 'absolute', 
          top: -30, 
          background: COLORS.gold, 
          color: COLORS.navyDark, 
          padding: '2px 8px', 
          borderRadius: 4, 
          fontSize: 12, 
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
  const entrance = spring({ frame: frame - startFrame, fps, config: { damping: 12 } });
  if (frame < startFrame) return null;
  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(8px)',
      borderRadius: 16,
      padding: '16px',
      border: `1px solid ${color}33`,
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      gap:'4px',
      transform: `scale(${entrance})`,
    }}>
      <span style={{ fontFamily: "Inter", fontSize: 11, fontWeight: 500, color: COLORS.textMuted, textTransform: 'uppercase' }}>{text}</span>
      <div style={{ fontFamily: "Cinzel", fontSize: 24, fontWeight: 700, color: color }}>
        {format === "$" ? `$${Math.round(Number(value)).toLocaleString()}` : Math.round(Number(value))}
      </div>
    </div>
  );
};
