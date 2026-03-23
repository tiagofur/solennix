import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS, PREMIUM_GRADIENT } from '../constants';
import { CotizacionTutorialProps } from '../schema';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { MockFormInput } from '../components/MockFormInput';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

// ── SVG Icons ──
const ArrowLeftIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronRightIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SaveIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Step-specific icons (matching Lucide: Info, Utensils, PlusCircle, Package, FileText)
const InfoIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const UtensilsIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3m0 0v7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PlusCircleIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" />
    <path d="M8 12h8M12 8v8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const PackageIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M16.5 9.4L7.5 4.21M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={color} strokeWidth="1.8" />
    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth="1.8" />
  </svg>
);
const FileTextIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="14 2 14 8 20 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ── Step data ──
const STEPS = [
  { id: 1, title: 'General', Icon: InfoIcon },
  { id: 2, title: 'Productos', Icon: UtensilsIcon },
  { id: 3, title: 'Extras', Icon: PlusCircleIcon },
  { id: 4, title: 'Insumos', Icon: PackageIcon },
  { id: 5, title: 'Finanzas', Icon: FileTextIcon },
];

// ── Stepper Component (matches the real app) ──
const Stepper: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  const progressWidth = ((activeStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <nav style={{ position: 'relative', marginBottom: 24 }}>
      {/* Progress line background */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 40,
        right: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 2,
        transform: 'translateY(-50%)',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        {/* Animated fill */}
        <div style={{
          width: `${progressWidth}%`,
          height: '100%',
          backgroundColor: COLORS.primary,
          borderRadius: 2,
          transition: 'width 0.5s ease-in-out',
        }} />
      </div>

      {/* Step circles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        {STEPS.map((step) => {
          const isCompleted = activeStep > step.id;
          const isActive = activeStep === step.id;
          const isPending = activeStep < step.id;

          // Circle colors
          let bgColor: string = COLORS.surfaceAlt;
          let borderStyle: string = `2px solid ${COLORS.border}`;
          let iconColor: string = COLORS.textTertiary;

          if (isCompleted) {
            bgColor = COLORS.primary;
            borderStyle = 'none';
            iconColor = COLORS.white;
          } else if (isActive) {
            bgColor = COLORS.card;
            borderStyle = `2px solid ${COLORS.primary}`;
            iconColor = COLORS.primary;
          }

          return (
            <div key={step.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 28,
                backgroundColor: bgColor,
                border: borderStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isCompleted
                  ? '0 8px 20px rgba(196,162,101,0.25)'
                  : isActive
                    ? `0 12px 25px rgba(0,0,0,0.08), 0 0 0 4px ${COLORS.primary}15`
                    : 'none',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                position: 'relative',
              }}>
                {isCompleted ? (
                  <CheckIcon size={22} />
                ) : (
                  <step.Icon color={iconColor} />
                )}
                {/* Pulse glow for active */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: 32,
                    backgroundColor: `${COLORS.primary}18`,
                    filter: 'blur(6px)',
                    zIndex: -1,
                  }} />
                )}
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
                color: isActive ? COLORS.primary : isCompleted ? COLORS.primary : COLORS.textSecondary,
              }}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════
// MAIN SCENE COMPONENT
// ═══════════════════════════════════════════════════
export const CotizacionFormFillScene: React.FC<CotizacionTutorialProps> = ({
  clientName,
  eventDate,
  startTime,
  endTime,
  serviceType,
  numPeople,
  productName,
  productQty,
  productPrice,
  productTotal,
  discountValue,
  totalAmount,
  depositAmount,
}) => {
  const frame = useCurrentFrame();

  // Card entrance
  const cardOpacity = interpolate(frame, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const cardSlide = interpolate(frame, [10, 22], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // ── Step boundaries ──
  // Step 1: General (frames 0–340)
  // Step 2: Products (frames 350–580)
  // Step 5: Financials (frames 590–870)
  const step1End = 345;
  const step2Start = 350;
  const step2End = 585;
  const step5Start = 590;

  const currentStep = frame < step1End ? 1 : frame < step2End ? 2 : 5;

  // ── STEP 1 field timings ──
  const clientFocused = frame >= 30 && frame < 90;
  const dateFocused = frame >= 95 && frame < 145;
  const timeFocused = frame >= 150 && frame < 190;
  const serviceFocused = frame >= 195 && frame < 265;
  const peopleFocused = frame >= 270 && frame < 320;
  const nextBtn1Frame = 335;

  // ── STEP 2 field timings ──
  const productSelectFocused = frame >= step2Start + 20 && frame < step2Start + 80;
  const productQtyFocused = frame >= step2Start + 85 && frame < step2Start + 130;
  const subtotalVisible = frame >= step2Start + 150;
  const nextBtn2Frame = step2End - 10;

  // ── STEP 5 timings ──
  const invoiceToggleFrame = step5Start + 30;
  const invoiceChecked = frame >= invoiceToggleFrame;
  const discountFocused = frame >= step5Start + 60 && frame < step5Start + 110;
  const summaryVisible = frame >= step5Start + 130;
  const saveFrame = 865;

  // Step content transition
  const stepOpacity = (start: number) => interpolate(frame, [start, start + 15], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const stepSlide = (start: number) => interpolate(frame, [start, start + 15], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <MockSidebar activeItem="Cotización" />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', padding: '8px 8px 8px 0' }}>
          <div style={{
            flex: 1,
            backgroundColor: COLORS.surface,
            borderRadius: 48,
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            opacity: cardOpacity,
            transform: `translateY(${cardSlide}px)`,
          }}>
            <MockTopbar />

            <div style={{ flex: 1, padding: '0 40px 32px', overflow: 'auto' }}>
              {/* ── Breadcrumb ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 12, color: COLORS.textSecondary }}>
                <span>Dashboard</span>
                <ChevronRightIcon size={12} />
                <span style={{ color: COLORS.text, fontWeight: 500 }}>Nueva Cotización</span>
              </div>

              {/* ── Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 8, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary }}>
                  <ArrowLeftIcon />
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.text, margin: 0, letterSpacing: '-0.025em' }}>
                  Nuevo Evento
                </h1>
              </div>

              {/* ── Stepper ── */}
              <Stepper activeStep={currentStep} />

              {/* ══════════ STEP 1: Información General ══════════ */}
              {currentStep === 1 && (
                <div style={{ opacity: stepOpacity(15), transform: `translateY(${stepSlide(15)}px)` }}>
                  <div style={{
                    backgroundColor: COLORS.card,
                    boxShadow: '0 12px 24px -4px rgba(0,0,0,0.08)',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 36,
                    padding: 24,
                    minHeight: 400,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '20px 16px' }}>
                      {/* Cliente — span 3 */}
                      <div style={{ gridColumn: 'span 3', position: 'relative' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 8 }}>
                          <span>Cliente <span style={{ color: COLORS.error }}>*</span></span>
                          <span style={{ fontSize: 11, color: COLORS.primary, fontWeight: 600 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }}>
                              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" />
                              <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                              <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Nuevo Cliente
                          </span>
                        </label>
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: 20,
                          border: `1px solid ${clientFocused ? COLORS.primary : COLORS.border}`,
                          backgroundColor: COLORS.card,
                          boxShadow: clientFocused ? `0 0 0 3px ${COLORS.primary}18` : '0 1px 2px rgba(0,0,0,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          height: 44,
                        }}>
                          <span style={{ fontSize: 14, color: frame >= 72 ? COLORS.text : COLORS.textSecondary }}>
                            {frame >= 72 ? clientName : 'Seleccionar cliente'}
                          </span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: COLORS.textSecondary }}>
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        {/* Dropdown */}
                        {clientFocused && frame >= 45 && frame < 90 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                            backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
                            boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
                          }}>
                            {['Ana González', 'Carlos Ruiz', 'Laura Pérez'].map((opt) => {
                              const sel = opt === clientName;
                              const hi = frame >= 62 && sel;
                              return (
                                <div key={opt} style={{ padding: '10px 14px', fontSize: 13, color: COLORS.text, backgroundColor: hi ? `${COLORS.primary}10` : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${COLORS.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: COLORS.primary }}>
                                    {opt.split(' ').map(w => w[0]).join('')}
                                  </div>
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Fecha — span 3 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 8 }}>
                          Fecha del Evento <span style={{ color: COLORS.error }}>*</span>
                        </label>
                        <div style={{
                          padding: '10px 14px', borderRadius: 20,
                          border: `1px solid ${dateFocused ? COLORS.primary : COLORS.border}`,
                          backgroundColor: COLORS.card,
                          boxShadow: dateFocused ? `0 0 0 3px ${COLORS.primary}18` : '0 1px 2px rgba(0,0,0,0.04)',
                          display: 'flex', alignItems: 'center', gap: 10, height: 44,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke={dateFocused ? COLORS.primary : COLORS.textSecondary} strokeWidth="1.5" />
                            <path d="M16 2v4M8 2v4M3 10h18" stroke={dateFocused ? COLORS.primary : COLORS.textSecondary} strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          <span style={{ fontSize: 14, color: frame >= 120 ? COLORS.text : COLORS.textSecondary }}>
                            {frame >= 120 ? eventDate : 'dd/mm/aaaa'}
                          </span>
                        </div>
                      </div>

                      {/* Hora inicio — span 3 (with 2 sub-fields) */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 8 }}>Horarios</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${timeFocused ? COLORS.primary : COLORS.border}`,
                            backgroundColor: COLORS.card,
                            boxShadow: timeFocused ? `0 0 0 3px ${COLORS.primary}18` : '0 1px 2px rgba(0,0,0,0.04)',
                            display: 'flex', alignItems: 'center', gap: 8, height: 44,
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke={COLORS.textSecondary} strokeWidth="1.5" />
                              <path d="M12 6v6l4 2" stroke={COLORS.textSecondary} strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span style={{ fontSize: 13, color: frame >= 170 ? COLORS.text : COLORS.textSecondary }}>
                              {frame >= 170 ? startTime : 'Inicio'}
                            </span>
                          </div>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            display: 'flex', alignItems: 'center', gap: 8, height: 44,
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke={COLORS.textSecondary} strokeWidth="1.5" />
                              <path d="M12 6v6l4 2" stroke={COLORS.textSecondary} strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span style={{ fontSize: 13, color: frame >= 180 ? COLORS.text : COLORS.textSecondary }}>
                              {frame >= 180 ? endTime : 'Fin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tipo de Servicio — span 3 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <MockFormInput label="Tipo de Servicio" value={serviceType} placeholder="Ej: Decoración, Banquete" required typingStartFrame={205} isFocused={serviceFocused} />
                      </div>

                      {/* Número de Personas — span 3 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <MockFormInput label="Número de Personas" value={numPeople} placeholder="0" required typingStartFrame={280} isFocused={peopleFocused} />
                      </div>

                      {/* Estado — span 3 (auto Cotizado) */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 8 }}>
                          Estado <span style={{ color: COLORS.error }}>*</span>
                        </label>
                        <div style={{
                          padding: '10px 14px', borderRadius: 20,
                          border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                            <span style={{ fontSize: 14, color: COLORS.text }}>Cotizado</span>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: COLORS.textSecondary }}>
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 24, marginTop: 20 }}>
                      <div />
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 28px', borderRadius: 20, border: 'none',
                        background: PREMIUM_GRADIENT, color: COLORS.white,
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(196,162,101,0.25)',
                        opacity: frame >= nextBtn1Frame ? 0.7 : 1,
                        transform: frame >= nextBtn1Frame && frame < nextBtn1Frame + 5 ? 'scale(0.96)' : 'scale(1)',
                      }}>
                        Siguiente <ChevronRightIcon />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ STEP 2: Productos ══════════ */}
              {currentStep === 2 && (
                <div style={{ opacity: stepOpacity(step2Start), transform: `translateY(${stepSlide(step2Start)}px)` }}>
                  <div style={{
                    backgroundColor: COLORS.card,
                    boxShadow: '0 12px 24px -4px rgba(0,0,0,0.08)',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 36, padding: 24, minHeight: 400,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 500, color: COLORS.text, margin: 0 }}>
                        Selección de Productos
                      </h3>
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: 20, border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                        Agregar Producto
                      </button>
                    </div>

                    {/* Product card */}
                    <div style={{
                      backgroundColor: COLORS.surfaceAlt, padding: 16, borderRadius: 20,
                      border: `1px solid ${COLORS.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      position: 'relative',
                    }}>
                      {/* Delete button */}
                      <div style={{ position: 'absolute', top: 10, right: 10, color: COLORS.textSecondary, cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>

                      {/* Product select */}
                      <div style={{ marginBottom: 12, position: 'relative' }}>
                        <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 6, display: 'block' }}>Producto</label>
                        <div style={{
                          padding: '10px 14px', borderRadius: 20,
                          border: `1px solid ${productSelectFocused ? COLORS.primary : COLORS.border}`,
                          backgroundColor: COLORS.card,
                          boxShadow: productSelectFocused ? `0 0 0 3px ${COLORS.primary}18` : '0 1px 2px rgba(0,0,0,0.04)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 42,
                        }}>
                          <span style={{ fontSize: 13, color: frame >= step2Start + 65 ? COLORS.text : COLORS.textSecondary }}>
                            {frame >= step2Start + 65 ? productName : 'Seleccionar producto'}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M6 9l6 6 6-6" stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>

                        {/* Product dropdown */}
                        {productSelectFocused && frame >= step2Start + 35 && frame < step2Start + 80 && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                            backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
                            boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
                          }}>
                            {[
                              { name: 'Pastel 3 Pisos', price: '$2,500' },
                              { name: 'Decoración Completa', price: '$8,000' },
                              { name: 'Banquete 100 pax', price: '$15,000' },
                            ].map((p) => {
                              const sel = p.name === productName;
                              const hi = frame >= step2Start + 55 && sel;
                              return (
                                <div key={p.name} style={{
                                  padding: '10px 14px', fontSize: 13, color: COLORS.text,
                                  backgroundColor: hi ? `${COLORS.primary}10` : 'transparent',
                                  display: 'flex', justifyContent: 'space-between',
                                }}>
                                  <span>{p.name}</span>
                                  <span style={{ fontSize: 11, color: COLORS.textSecondary }}>{p.price}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Qty / Price / Discount / Total row */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {/* Cant */}
                        <div style={{ width: '18%' }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 6, display: 'block' }}>Cant.</label>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${productQtyFocused ? COLORS.primary : COLORS.border}`,
                            backgroundColor: COLORS.card,
                            boxShadow: productQtyFocused ? `0 0 0 3px ${COLORS.primary}18` : 'none',
                            fontSize: 13, color: frame >= step2Start + 105 ? COLORS.text : COLORS.textSecondary, height: 42, display: 'flex', alignItems: 'center',
                          }}>
                            {frame >= step2Start + 105 ? productQty : '0'}
                          </div>
                        </div>
                        {/* Precio Unit */}
                        <div style={{ width: '25%' }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 6, display: 'block' }}>Precio Unit.</label>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.surfaceAlt,
                            fontSize: 13, color: COLORS.textSecondary, height: 42, display: 'flex', alignItems: 'center',
                            opacity: 0.8,
                          }}>
                            {frame >= step2Start + 70 ? productPrice : '$0.00'}
                          </div>
                        </div>
                        {/* Desc */}
                        <div style={{ width: '18%' }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 6, display: 'block' }}>Desc. Unit.</label>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card,
                            fontSize: 13, color: COLORS.textSecondary, height: 42, display: 'flex', alignItems: 'center',
                          }}>$0.00</div>
                        </div>
                        {/* Total */}
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 11, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 6, display: 'block' }}>Total</label>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card,
                            fontSize: 13, fontWeight: 700, color: COLORS.text, height: 42, display: 'flex', alignItems: 'center',
                          }}>
                            {subtotalVisible ? productTotal : '$0.00'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subtotal */}
                    {subtotalVisible && (
                      <div style={{ textAlign: 'right' as const, marginTop: 16 }}>
                        <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Subtotal Productos: </span>
                        <span style={{ fontSize: 17, fontWeight: 700, color: COLORS.text }}>{productTotal}</span>
                      </div>
                    )}

                    {/* Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, marginTop: 16 }}>
                      <button style={{
                        padding: '10px 24px', borderRadius: 20, border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}>Anterior</button>
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 28px', borderRadius: 20, border: 'none',
                        background: PREMIUM_GRADIENT, color: COLORS.white,
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(196,162,101,0.25)',
                        opacity: frame >= nextBtn2Frame ? 0.7 : 1,
                        transform: frame >= nextBtn2Frame && frame < nextBtn2Frame + 5 ? 'scale(0.96)' : 'scale(1)',
                      }}>
                        Siguiente <ChevronRightIcon />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════ STEP 5: Finanzas y Contrato ══════════ */}
              {currentStep === 5 && (
                <div style={{ opacity: stepOpacity(step5Start), transform: `translateY(${stepSlide(step5Start)}px)` }}>
                  <div style={{
                    backgroundColor: COLORS.card,
                    boxShadow: '0 12px 24px -4px rgba(0,0,0,0.08)',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 36, padding: 24, minHeight: 400,
                  }}>
                    <h3 style={{ fontSize: 18, fontWeight: 500, color: COLORS.text, margin: '0 0 20px 0' }}>
                      Detalles Financieros
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                      {/* LEFT: Financial controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Facturación card */}
                        <div style={{ backgroundColor: COLORS.card, padding: 16, borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${COLORS.border}` }}>
                          <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 10, display: 'block' }}>Facturación</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: 4,
                              border: `2px solid ${invoiceChecked ? COLORS.primary : COLORS.border}`,
                              backgroundColor: invoiceChecked ? COLORS.primary : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {invoiceChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={COLORS.white} strokeWidth="3" strokeLinecap="round" /></svg>}
                            </div>
                            <span style={{ fontSize: 13, color: COLORS.text }}>Requiere factura (IVA 16%)</span>
                          </div>
                        </div>

                        {/* Descuento card */}
                        <div style={{ backgroundColor: COLORS.card, padding: 16, borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${COLORS.border}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSecondary }}>Descuento General</label>
                            <div style={{ display: 'flex', gap: 2, borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
                              <div style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, backgroundColor: COLORS.primary, color: COLORS.white }}>%</div>
                              <div style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, backgroundColor: COLORS.card, color: COLORS.textSecondary }}>$</div>
                            </div>
                          </div>
                          <div style={{
                            padding: '10px 14px', borderRadius: 20,
                            border: `1px solid ${discountFocused ? COLORS.primary : COLORS.border}`,
                            backgroundColor: COLORS.card,
                            boxShadow: discountFocused ? `0 0 0 3px ${COLORS.primary}18` : 'none',
                            fontSize: 14, color: frame >= step5Start + 90 ? COLORS.text : COLORS.textSecondary,
                            height: 42, display: 'flex', alignItems: 'center',
                          }}>
                            {frame >= step5Start + 90 ? discountValue : '0'}
                          </div>
                        </div>

                        {/* Condiciones de Pago card */}
                        <div style={{ backgroundColor: COLORS.card, padding: 16, borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: `1px solid ${COLORS.border}` }}>
                          <label style={{ fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 10, display: 'block' }}>Condiciones de Pago</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                              <label style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, display: 'block' }}>Anticipo (%)</label>
                              <div style={{ padding: '8px 12px', borderRadius: 14, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, fontSize: 13, color: COLORS.text }}>50</div>
                            </div>
                            <div>
                              <label style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, display: 'block' }}>Días Cancelación</label>
                              <div style={{ padding: '8px 12px', borderRadius: 14, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, fontSize: 13, color: COLORS.text }}>15</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Cost summary panel */}
                      <div style={{
                        backgroundColor: COLORS.surfaceAlt, padding: 24, borderRadius: 36,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: `1px solid ${COLORS.border}`,
                        opacity: summaryVisible ? 1 : 0.4,
                      }}>
                        <h4 style={{ fontSize: 17, fontWeight: 500, color: COLORS.text, margin: '0 0 16px 0' }}>Resumen de Costos</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textSecondary }}>
                            <span>Subtotal Productos:</span>
                            <span>{productTotal}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textSecondary }}>
                            <span>Subtotal Extras:</span>
                            <span>$0.00</span>
                          </div>
                          {summaryVisible && frame >= step5Start + 95 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.success, fontWeight: 500 }}>
                              <span>Descuento ({discountValue}%):</span>
                              <span>-$400.00</span>
                            </div>
                          )}
                          {summaryVisible && invoiceChecked && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textSecondary }}>
                              <span>IVA (16%):</span>
                              <span>$1,216.00</span>
                            </div>
                          )}

                          {/* Divider + Total */}
                          <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Total:</span>
                              <span style={{ fontSize: 22, fontWeight: 800, color: COLORS.primary }}>
                                {summaryVisible ? totalAmount : '$0.00'}
                              </span>
                            </div>
                          </div>

                          {/* Deposit */}
                          {summaryVisible && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B', fontWeight: 500, fontSize: 13, marginTop: 4 }}>
                              <span>Anticipo (50%):</span>
                              <span>{depositAmount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation — Save button (green) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 20, marginTop: 16 }}>
                      <button style={{
                        padding: '10px 24px', borderRadius: 20, border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      }}>Anterior</button>
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 28px', borderRadius: 20, border: 'none',
                        backgroundColor: COLORS.success, color: COLORS.white,
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(52,199,89,0.25)',
                        opacity: frame >= saveFrame ? 0.7 : 1,
                        transform: frame >= saveFrame && frame < saveFrame + 5 ? 'scale(0.96)' : 'scale(1)',
                      }}>
                        <SaveIcon /> Guardar Evento
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click highlights */}
      {currentStep === 1 && <ClickHighlight x={1720} y={880} clickFrame={nextBtn1Frame} />}
      {currentStep === 2 && <ClickHighlight x={1720} y={740} clickFrame={nextBtn2Frame} />}
      {currentStep === 5 && <ClickHighlight x={1720} y={850} clickFrame={saveFrame} />}
    </AbsoluteFill>
  );
};
