import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS, PREMIUM_GRADIENT } from '../constants';
import { ClientTutorialProps } from '../schema';
import { MockSidebar } from '../components/MockSidebar';
import { MockTopbar } from '../components/MockTopbar';
import { MockFormInput } from '../components/MockFormInput';
import { MockButton } from '../components/MockButton';
import { ClickHighlight } from '../components/ClickHighlight';

const { fontFamily } = loadFont();

const ArrowLeftIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CameraIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke={COLORS.textTertiary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="4" stroke={COLORS.textTertiary} strokeWidth="1.5" />
  </svg>
);

const SaveIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FormFillScene: React.FC<ClientTutorialProps> = ({
  clientName,
  clientPhone,
  clientEmail,
  clientAddress,
  clientCity,
  clientNotes,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOpacity = interpolate(frame, [20, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardSlide = interpolate(frame, [20, 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Focus states for each field
  const nameIsFocused = frame >= 40 && frame < 110;
  const phoneIsFocused = frame >= 110 && frame < 180;
  const emailIsFocused = frame >= 180 && frame < 250;
  const addressIsFocused = frame >= 250 && frame < 320;
  const cityIsFocused = frame >= 320 && frame < 390;
  const notesIsFocused = frame >= 390 && frame < 460;

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
            opacity: cardOpacity,
            transform: `translateY(${cardSlide}px)`,
          }}>
            <MockTopbar />

            {/* Scrollable content area — px-10 pb-10 */}
            <div style={{ flex: 1, padding: '0 40px 40px', overflow: 'auto' }}>
              {/* Header: back button + title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 32,
              }}>
                {/* Back button — p-2 rounded-full hover:bg-surface-alt */}
                <div style={{
                  padding: 8,
                  borderRadius: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.textSecondary,
                }}>
                  <ArrowLeftIcon />
                </div>
                <h1 style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.text,
                  margin: 0,
                }}>
                  Nuevo Cliente
                </h1>
              </div>

              {/* Form card — bg-card shadow-sm border border-border px-4 py-8 rounded-3xl sm:p-10 */}
              <div style={{
                backgroundColor: COLORS.card,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 24,
                padding: 40,
              }}>
                {/* space-y-6 equivalent */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Photo upload — centered */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      backgroundColor: COLORS.surfaceAlt,
                      border: `2px solid ${COLORS.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <CameraIcon />
                    </div>
                  </div>

                  {/* Form grid — grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-6 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: 24,
                  }}>
                    {/* Nombre Completo — sm:col-span-6 */}
                    <div style={{ gridColumn: 'span 6' }}>
                      <MockFormInput
                        label="Nombre Completo"
                        value={clientName}
                        placeholder="Nombre del cliente"
                        required
                        typingStartFrame={50}
                        isFocused={nameIsFocused}
                      />
                    </div>

                    {/* Email — sm:col-span-3 (comes first in the real form) */}
                    <div style={{ gridColumn: 'span 3' }}>
                      <MockFormInput
                        label="Correo Electrónico"
                        value={clientEmail}
                        placeholder="ejemplo@correo.com"
                        typingStartFrame={180}
                        isFocused={emailIsFocused}
                      />
                    </div>

                    {/* Teléfono — sm:col-span-3 */}
                    <div style={{ gridColumn: 'span 3' }}>
                      <MockFormInput
                        label="Teléfono"
                        value={clientPhone}
                        placeholder="00 0000 0000"
                        required
                        typingStartFrame={110}
                        isFocused={phoneIsFocused}
                      />
                    </div>

                    {/* Dirección — sm:col-span-4 */}
                    <div style={{ gridColumn: 'span 4' }}>
                      <MockFormInput
                        label="Dirección"
                        value={clientAddress}
                        placeholder="Calle, Número, Colonia"
                        typingStartFrame={250}
                        isFocused={addressIsFocused}
                      />
                    </div>

                    {/* Ciudad — sm:col-span-2 */}
                    <div style={{ gridColumn: 'span 2' }}>
                      <MockFormInput
                        label="Ciudad"
                        value={clientCity}
                        placeholder="Ciudad"
                        typingStartFrame={320}
                        isFocused={cityIsFocused}
                      />
                    </div>

                    {/* Notas — sm:col-span-6 */}
                    <div style={{ gridColumn: 'span 6' }}>
                      <MockFormInput
                        label="Notas"
                        value={clientNotes}
                        placeholder="Notas opcionales"
                        typingStartFrame={390}
                        isFocused={notesIsFocused}
                      />
                    </div>
                  </div>

                  {/* Footer — border-t border-border + flex justify-end gap-3 pt-6 */}
                  <div style={{
                    borderTop: `1px solid ${COLORS.border}`,
                    paddingTop: 24,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 12,
                  }}>
                    {/* Cancel button */}
                    <MockButton
                      label="Cancelar"
                      variant="outline"
                      style={{
                        padding: '10px 24px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 500,
                        color: COLORS.textSecondary,
                      }}
                    />

                    {/* Save button */}
                    <MockButton
                      label="Guardar Cliente"
                      variant="primary"
                      pressAtFrame={470}
                      icon={<SaveIcon />}
                      style={{
                        padding: '10px 32px',
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClickHighlight x={1050} y={780} clickFrame={470} />
    </AbsoluteFill>
  );
};
