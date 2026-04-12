import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: { key: string; label: string; description: string }[];
  currentSection?: string;
}

const SECTION_LABELS: Record<string, string> = {
  events: 'Eventos',
  client: 'Clientes',
  products: 'Productos',
  inventory: 'Inventario',
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose,
  shortcuts,
  currentSection,
}) => {
  if (!open) return null;

  const navigationShortcuts = shortcuts.filter((s) => s.key.startsWith('g '));
  const actionShortcuts = shortcuts.filter((s) => !s.key.startsWith('g ') && s.key !== '?');
  const metaShortcuts = [
    { label: '⌘K', description: 'Abrir Command Palette' },
    { label: 'Esc', description: 'Cerrar modal / cancelar' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in"
          role="dialog"
          aria-modal="true"
          aria-label="Atajos de teclado"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-text">Atajos de Teclado</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text p-1 rounded-lg hover:bg-surface-alt transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {currentSection && (
              <p className="text-xs text-text-secondary">
                Sección actual: <span className="font-semibold text-primary">{SECTION_LABELS[currentSection] || currentSection}</span>
              </p>
            )}

            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Navegación</h3>
              <div className="space-y-1.5">
                {navigationShortcuts.map((s) => (
                  <ShortcutRow key={s.key} label={s.label} description={s.description} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Acciones</h3>
              <div className="space-y-1.5">
                {actionShortcuts.map((s) => (
                  <ShortcutRow key={s.key} label={s.label} description={s.description} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Sistema</h3>
              <div className="space-y-1.5">
                {metaShortcuts.map((s) => (
                  <ShortcutRow key={s.label} label={s.label} description={s.description} />
                ))}
                <ShortcutRow label="?" description="Mostrar/ocultar esta ayuda" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

function ShortcutRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text">{description}</span>
      <kbd className="ml-4 shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-semibold bg-surface-alt border border-border rounded-md text-text-secondary">
        {label}
      </kbd>
    </div>
  );
}
