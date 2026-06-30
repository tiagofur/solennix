import React from "react";

/**
 * Shared react-day-picker theming for the events calendar and the event-form
 * date picker. Extracted byte-identical from `EventList.tsx` so both pickers
 * share the exact same `.rdp-unavailable` strikethrough (REQ-1 visual parity)
 * without duplicated CSS (REQ-8, REQ-11). Editing this affects BOTH consumers.
 */
export const dayPickerStyles = (
  <style>{`
              .rdp-root {
                  --rdp-cell-size: 45px;
                  --rdp-accent-color: var(--color-primary);
                  --rdp-accent-background-color: color-mix(in srgb, var(--color-primary), transparent 90%);
                  margin: 0;
                  width: 100%;
              }
              .rdp-months { justify-content: center; width: 100%; }
              .rdp-month { width: 100%; max-width: 400px; }
              .rdp-table { width: 100%; max-width: 100%; }
              .rdp-head_cell {
                  text-transform: uppercase;
                  font-size: 0.75rem;
                  font-weight: 700;
                  color: var(--color-text-secondary);
                  padding-bottom: 1rem;
              }
              .rdp-nav_button { color: var(--color-primary); }
              .rdp-nav_button:hover { color: var(--color-primary-dark); }
              .rdp-caption_label {
                  font-size: 1.125rem;
                  font-weight: 700;
                  color: var(--color-text);
                  text-transform: capitalize;
              }
              .rdp-day_button {
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  justify-content: flex-start !important;
                  height: 56px !important;
                  width: var(--rdp-cell-size) !important;
                  padding: 5px 0 0 !important;
                  background: transparent !important;
                  border: none !important;
                  border-radius: 0 !important;
                  gap: 2px;
                  cursor: pointer;
              }
              .rdp-day_button:disabled { cursor: default; opacity: 0.4; }
              .rdp-day_button:focus-visible {
                  outline: none !important;
                  box-shadow: 0 0 0 2px var(--rdp-background-color), 0 0 0 4px var(--rdp-accent-color) !important;
                  border-radius: 4px !important;
              }
              .rdp-day-number {
                  width: 32px;
                  height: 32px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 50%;
                  font-size: 0.875rem;
                  font-weight: 500;
                  color: var(--color-text);
                  flex-shrink: 0;
                  transition: background-color 0.15s;
              }
              .rdp-selected .rdp-day-number {
                  background-color: var(--color-primary) !important;
                  color: #ffffff !important;
                  font-weight: bold;
              }
              .rdp-today:not(.rdp-selected) .rdp-day-number {
                  border: 2px solid var(--color-primary);
                  color: var(--color-primary);
                  font-weight: bold;
              }
              .rdp-day_button:hover:not([disabled]) .rdp-day-number {
                  background-color: var(--rdp-accent-background-color);
                  color: var(--color-primary);
              }
              .rdp-selected .rdp-day_button:hover:not([disabled]) .rdp-day-number {
                  filter: brightness(0.9);
              }
              .rdp-day_outside .rdp-day-number {
                  color: var(--color-text-tertiary) !important;
                  opacity: 0.4;
              }
              .rdp-unavailable .rdp-day-number {
                  background-color: var(--color-surface-alt) !important;
                  color: var(--color-text-tertiary) !important;
                  text-decoration: line-through;
              }
              .rdp-day-dots {
                  display: flex;
                  gap: 2px;
                  align-items: center;
                  justify-content: center;
                  height: 6px;
                  min-height: 6px;
              }
              .rdp-day-dot {
                  width: 5px;
                  height: 5px;
                  border-radius: 50%;
                  flex-shrink: 0;
              }
              .rdp-day-overflow {
                  font-size: 9px;
                  line-height: 1;
                  color: var(--color-text-secondary);
                  font-weight: 500;
              }
            `}</style>
);
