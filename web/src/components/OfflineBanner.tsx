import React from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/useToast';
import i18n from '@/i18n/config';

/**
 * Global offline detection banner (#887). Renders a fixed-top persistent
 * banner when `navigator.onLine` is false. When the connection restores,
 * the banner disappears and a positive "back online" toast fires.
 *
 * Rendered as a sibling of ToastContainer in Layout — NOT a toast itself
 * because toasts auto-dismiss in 3s, but offline state must persist.
 */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation('common');
  const wasOfflineRef = React.useRef(false);

  // Fire a "back online" toast on the online→offline→online transition.
  React.useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      useToast.getState().addToast(
        i18n.t('common:offline.back_online'),
        'success',
      );
    }
  }, [isOnline]);

  if (isOnline) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 bg-warning text-white text-sm font-semibold shadow-md"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t('offline.banner_title')}</span>
      <span className="hidden sm:inline font-normal opacity-90">
        — {t('offline.banner_description')}
      </span>
    </div>
  );
};
