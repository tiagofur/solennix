import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../hooks/useToast';
import { unavailableDatesService, UnavailableDate } from '../../../services/unavailableDatesService';
import clsx from 'clsx';
import { logError } from '../../../lib/errorHandler';
import { format, type Locale } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const pickDateFnsLocale = (lang: string | undefined): Locale =>
  lang?.startsWith('en') ? enUS : es;

interface UnavailableDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (date: UnavailableDate) => void;
  onDelete: (id: string) => void;
  createUnavailableDates?: (data: { start_date: string; end_date: string; reason?: string }) => Promise<UnavailableDate>;
  deleteUnavailableDate?: (id: string) => Promise<void>;
  initialDate?: string; // yyyy-MM-dd, pre-fills the add form (e.g. from right-click)
}

export const UnavailableDatesModal: React.FC<UnavailableDatesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  createUnavailableDates,
  deleteUnavailableDate,
  initialDate,
}) => {
  const { t, i18n } = useTranslation('calendar');
  const dfnsLocale = useMemo(() => pickDateFnsLocale(i18n.language), [i18n.language]);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingBlocks, setFetchingBlocks] = useState(false);
  const [blocks, setBlocks] = useState<UnavailableDate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    start_date: today,
    end_date: today,
    reason: '',
  });

  const fetchBlocks = useCallback(async () => {
    setFetchingBlocks(true);
    try {
      const data = await unavailableDatesService.getDates('2020-01-01', '2035-12-31');
      setBlocks(data);
    } catch (error) {
      logError('Failed to fetch unavailable date blocks', error);
      // silently ignore — calendar still works without the list
    } finally {
      setFetchingBlocks(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prefill = initialDate ?? today;
    setFormData({ start_date: prefill, end_date: prefill, reason: '' });
    setShowForm(!!initialDate);
    fetchBlocks();
  }, [isOpen, initialDate, today, fetchBlocks]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      if (deleteUnavailableDate) {
        await deleteUnavailableDate(id);
      } else {
        await unavailableDatesService.removeDate(id);
      }
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      onDelete(id);
      addToast(t('action.delete'), 'success');
    } catch (error) {
      logError('Error deleting date block', error);
      addToast(t('error.unblock_failed'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const newDate = createUnavailableDates
        ? await createUnavailableDates(formData)
        : await unavailableDatesService.addDates(formData);
      addToast(t('block.save'), 'success');
      setBlocks((prev) => [...prev, newDate].sort((a, b) => a.start_date.localeCompare(b.start_date)));
      onSave(newDate);
      setFormData({ start_date: today, end_date: today, reason: '' });
      setShowForm(false);
    } catch (error) {
      logError('Error blocking dates', error);
      addToast(t('error.block_failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatBlockRange = (block: UnavailableDate) => {
    if (block.start_date === block.end_date) {
      return format(parseLocalDate(block.start_date), 'd MMM yyyy', { locale: dfnsLocale });
    }
    return `${format(parseLocalDate(block.start_date), 'd MMM', { locale: dfnsLocale })} — ${format(parseLocalDate(block.end_date), 'd MMM yyyy', { locale: dfnsLocale })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fallback-bg">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden fade-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface-alt/50 shrink-0">
          <h2 className="text-xl font-bold flex items-center text-text">
            <Lock className="h-5 w-5 mr-3 text-primary" />
            {t('blocked_dates.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors p-2 hover:bg-surface rounded-full"
            aria-label={t('action.cancel')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Existing blocks list */}
          {fetchingBlocks ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : blocks.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-3">
                <CalendarIcon className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="text-text-secondary text-sm">{t('blocked_dates.empty')}</p>
              <p className="text-text-tertiary text-xs mt-1">{t('blocked_dates.empty_subtitle')}</p>
            </div>
          ) : (
            blocks.length > 0 && (
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">
                        {formatBlockRange(block)}
                      </p>
                      {block.reason && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate">
                          {block.reason}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(block.id)}
                      disabled={deletingId === block.id}
                      className="ml-3 p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      aria-label={t('action.delete')}
                    >
                      {deletingId === block.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-error border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Add new block form / button */}
          {showForm ? (
            <div className="border border-border rounded-xl p-4 space-y-4 bg-surface-alt/30">
              <h3 className="text-sm font-semibold text-text">{t('block.range_title')}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text mb-1.5">
                      {t('block.start_date')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text mb-1.5">
                      {t('block.end_date')} *
                    </label>
                    <input
                      type="date"
                      required
                      min={formData.start_date}
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">
                    {t('block.reason_label')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('block.reason_placeholder_range')}
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-text-secondary bg-surface-alt border border-border rounded-xl hover:bg-surface transition-colors"
                  >
                    {t('action.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                      'flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all flex items-center justify-center',
                      loading
                        ? 'bg-primary/70 cursor-not-allowed'
                        : 'premium-gradient hover:opacity-90',
                    )}
                  >
                    {t('block.save')}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-border text-sm font-medium text-text-secondary rounded-xl hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t('block.add_range')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-alt/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text bg-surface-alt hover:bg-surface border border-border rounded-xl transition-colors"
          >
            {t('action.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
