import React from 'react';
import { useTranslation } from 'react-i18next';

type Status = 'pending' | 'approved' | 'rejected';

interface PaymentStatusBadgeProps {
  status: Status;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation('payments');

  const styles: Record<Status, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  );
};
