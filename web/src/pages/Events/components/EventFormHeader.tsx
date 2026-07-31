import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EventFormHeaderProps {
  isEdit: boolean;
  eventId?: string;
  onBack: () => void;
  onViewSummary: () => void;
}

export const EventFormHeader: React.FC<EventFormHeaderProps> = ({
  isEdit,
  eventId,
  onBack,
  onViewSummary,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const backAria = t('events:form.back_to_calendar_aria');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary"
          aria-label={backAria}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          {isEdit ? t('events:form.title_edit') : t('events:form.title_new')}
        </h1>
      </div>
      {isEdit && eventId && (
        <button
          type="button"
          onClick={onViewSummary}
          className="inline-flex items-center px-4 py-2 border border-border rounded-xl shadow-xs text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors"
        >
          <FileText className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          {t('events:list.actions.view_summary')}
        </button>
      )}
    </div>
  );
};
