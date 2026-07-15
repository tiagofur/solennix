import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: { key: string; label: string; description: string }[];
  currentSection?: string;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose,
  shortcuts,
  currentSection,
}) => {
  const { t } = useTranslation('common');

  if (!open) return null;

  // Platform-aware modifier symbol: ⌘ on Mac, Ctrl elsewhere (#886).
  const isMac = typeof navigator !== 'undefined' &&
    (/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac/i.test(navigator.userAgent));
  const modKey = isMac ? '⌘' : 'Ctrl';

  const SECTION_LABELS: Record<string, string> = {
    events: t('nav.events'),
    client: t('nav.clients'),
    products: t('nav.products'),
    inventory: t('nav.inventory'),
  };

  const navigationShortcuts = shortcuts.filter((s) => s.key.startsWith('g '));
  const actionShortcuts = shortcuts.filter((s) => !s.key.startsWith('g ') && s.key !== '?');
  const metaShortcuts = [
    { label: `${modKey}K`, description: t('command_palette.open_command_palette') },
    { label: 'Esc', description: t('command_palette.close_modal_cancel') },
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
          aria-label={t('command_palette.keyboard_help')}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-text">{t('command_palette.keyboard_help')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary hover:text-text p-1 rounded-lg hover:bg-surface-alt transition-colors"
              aria-label={t('action.close')}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {currentSection && (
              <p className="text-xs text-text-secondary">
                {t('command_palette.current_section')}: <span className="font-semibold text-primary">{SECTION_LABELS[currentSection] || currentSection}</span>
              </p>
            )}

            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{t('command_palette.navigation_group')}</h3>
              <div className="space-y-1.5">
                {navigationShortcuts.map((s) => (
                  <ShortcutRow key={s.key} label={s.label} description={s.description} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{t('command_palette.actions_group')}</h3>
              <div className="space-y-1.5">
                {actionShortcuts.map((s) => (
                  <ShortcutRow key={s.key} label={s.label} description={s.description} />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{t('command_palette.system_group')}</h3>
              <div className="space-y-1.5">
                {metaShortcuts.map((s) => (
                  <ShortcutRow key={s.label} label={s.label} description={s.description} />
                ))}
                <ShortcutRow label="?" description={t('command_palette.toggle_help')} />
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
