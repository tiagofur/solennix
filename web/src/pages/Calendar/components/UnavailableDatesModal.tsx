import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Plus, Trash2, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../hooks/useToast';
import { unavailableDatesService, UnavailableDate } from '../../../services/unavailableDatesService';
import { logError } from '../../../lib/errorHandler';
import { format, type Locale } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
      <Card
        variant="glass"
        padding="none"
        className="w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-surface-alt/50 shrink-0">
          <h2 className="text-xl font-bold flex items-center text-text">
            <Lock className="h-5 w-5 mr-3 text-primary" />
            {t('blocked_dates.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors p-2 hover:bg-surface rounded-full active-ios-scale"
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
              <p className="text-text-secondary text-sm font-medium">{t('blocked_dates.empty')}</p>
              <p className="text-text-tertiary text-xs mt-1">{t('blocked_dates.empty_subtitle')}</p>
            </div>
          ) : (
            blocks.length > 0 && (
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-3 bg-surface-alt/45 rounded-xl border border-border/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text">
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
                      className="ml-3 p-1.5 text-text-tertiary hover:text-error hover:bg-error/10 rounded-lg transition-colors shrink-0 disabled:opacity-50 active-ios-scale"
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
            <Card variant="glass" padding="sm" className="border-primary/20 space-y-4 bg-surface-alt/10">
              <h3 className="text-sm font-bold text-text">{t('block.range_title')}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      {t('block.start_date')} *
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                      {t('block.end_date')} *
                    </label>
                    <Input
                      type="date"
                      required
                      min={formData.start_date}
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    {t('block.reason_label')}
                  </label>
                  <Input
                    type="text"
                    placeholder={t('block.reason_placeholder_range')}
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="glass"
                    onClick={() => setShowForm(false)}
                    className="flex-1 active-ios-scale"
                  >
                    {t('action.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={loading}
                    className="flex-1 active-ios-scale font-bold text-white premium-gradient"
                  >
                    {t('block.save')}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border text-sm font-semibold text-text-secondary rounded-xl hover:border-primary/50 hover:text-primary transition-all active-ios-scale bg-surface-alt/25"
            >
              <Plus className="h-4 w-4" />
              {t('block.add_range')}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-alt/50 shrink-0">
          <Button
            type="button"
            variant="glass"
            onClick={onClose}
            className="w-full active-ios-scale font-semibold text-text-secondary hover:text-text"
          >
            {t('action.cancel')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
