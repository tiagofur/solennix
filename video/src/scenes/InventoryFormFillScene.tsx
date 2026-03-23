import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS, PREMIUM_GRADIENT } from '../constants';
import { InventoryTutorialProps } from '../schema';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { MockFormInput } from '../components/MockFormInput';
import { MockButton } from '../components/MockButton';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

const ArrowLeftIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const BoxIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4 a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={COLORS.textTertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const SaveIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const InventoryFormFillScene: React.FC<InventoryTutorialProps> = ({
  itemName,
  itemCategory,
  itemStock,
  itemMinStock,
  itemUnit,
  itemCost,
}) => {
  const frame = useCurrentFrame();

  const nameIsFocused = frame >= 40 && frame < 110;
  const categoryIsFocused = frame >= 110 && frame < 180;
  const unitIsFocused = frame >= 180 && frame < 250;
  const costIsFocused = frame >= 250 && frame < 320;
  const stockIsFocused = frame >= 320 && frame < 390;
  const minStockIsFocused = frame >= 390 && frame < 460;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, fontFamily }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <MockSidebar activeItem="Inventario" />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 8px 8px 0', overflow: 'hidden' }}>
          <div style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: 48, border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <MockTopbar />

            <div style={{ flex: 1, padding: '0 40px 40px', overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ padding: 8, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary }}><ArrowLeftIcon /></div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: 0 }}>Nuevo Ítem de Inventario</h1>
              </div>

              <div style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 24, padding: 40 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
                    {/* Fila 1 */}
                    <div style={{ gridColumn: 'span 8' }}>
                      <MockFormInput label="Nombre del Ítem *" value={itemName} placeholder="Ej. Hielo" required typingStartFrame={50} isFocused={nameIsFocused} />
                    </div>
                    <div style={{ gridColumn: 'span 4', position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 8 }}>Tipo *</label>
                      <div style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: `1px solid ${categoryIsFocused ? COLORS.primary : COLORS.border}`,
                        backgroundColor: COLORS.card,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: categoryIsFocused ? `0 0 0 4px ${COLORS.primary}20` : 'none',
                        transition: 'all 0.2s',
                        height: 45,
                      }}>
                        <span style={{ fontSize: 14, color: COLORS.text }}>{frame >= 140 ? "Insumo (Consumible)" : "Seleccionar..."}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: categoryIsFocused && frame >= 120 && frame < 180 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: COLORS.textSecondary }}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>

                      {categoryIsFocused && frame >= 125 && frame < 180 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          backgroundColor: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 12,
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                          zIndex: 50,
                          overflow: 'hidden',
                        }}>
                          {["Insumo (Consumible)", "Insumo por Evento", "Activo / Equipo"].map((opt, i) => {
                            const isSelected = i === 0; 
                            const rowHighlight = frame >= 135 && isSelected;
                            return (
                              <div key={opt} style={{
                                padding: '10px 16px',
                                fontSize: 13,
                                color: COLORS.text,
                                backgroundColor: rowHighlight ? `${COLORS.primary}12` : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                transition: 'all 0.1s',
                              }}>
                                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rowHighlight ? COLORS.primary : 'transparent' }} />
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Fila 2 */}
                    <div style={{ gridColumn: 'span 6', position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: COLORS.textSecondary, marginBottom: 8 }}>Unidad (kg, l, pza, etc.) *</label>
                      <div style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: `1px solid ${unitIsFocused ? COLORS.primary : COLORS.border}`,
                        backgroundColor: COLORS.card,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: unitIsFocused ? `0 0 0 4px ${COLORS.primary}20` : 'none',
                        transition: 'all 0.2s',
                        height: 45,
                      }}>
                        <span style={{ fontSize: 14, color: COLORS.text }}>{frame >= 210 ? itemUnit : "Selecciona una unidad"}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: unitIsFocused && frame >= 195 && frame < 250 ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: COLORS.textSecondary }}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>

                      {unitIsFocused && frame >= 195 && frame < 250 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: 4,
                          backgroundColor: COLORS.card,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 12,
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                          zIndex: 50,
                          maxHeight: 230,
                          overflow: 'hidden',
                        }}>
                          {["Selecciona una unidad", "Pieza (pza)", "Kilogramos (kg)", "Gramos (g)", "Litros (l)", "Mililitros (ml)", "Caja", "Paquete", "Servicio"].map((opt, i) => {
                            const isSelected = i === 1; 
                            const rowHighlight = frame >= 200 && isSelected;
                            return (
                              <div key={opt} style={{
                                padding: '10px 16px',
                                fontSize: 13,
                                color: i === 0 ? COLORS.textSecondary : COLORS.text,
                                backgroundColor: rowHighlight ? '#4242421a' : 'transparent', // Gris sutil parecido a captura
                                cursor: 'pointer',
                                transition: 'all 0.1s',
                              }}>
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                      <MockFormInput label="Stock Actual *" value={itemStock} placeholder="0" typingStartFrame={330} isFocused={stockIsFocused} />
                    </div>
                    <div style={{ gridColumn: 'span 3' }}>
                      <MockFormInput label="Stock Mínimo *" value={itemMinStock} placeholder="0" typingStartFrame={400} isFocused={minStockIsFocused} />
                    </div>

                    {/* Fila 3 */}
                    <div style={{ gridColumn: 'span 4' }}>
                      <MockFormInput label="Costo Unitario ($)" value={itemCost} placeholder="0.00" typingStartFrame={260} isFocused={costIsFocused} />
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <MockButton label="Cancelar" variant="outline" />
                    <MockButton label="Guardar Ítem" variant="primary" pressAtFrame={470} icon={<SaveIcon />} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ClickHighlight x={1750} y={540} clickFrame={470} />
    </AbsoluteFill>
  );
};
