import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import eventReviewService from '@/services/eventReviewService';

type PageState = 'loading' | 'ready' | 'success' | 'unavailable';

export const PublicReviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation('reviews');

  const [state, setState] = useState<PageState>('loading');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [allowPublic, setAllowPublic] = useState(false);
  const [metaLabel, setMetaLabel] = useState<string>('');
  const [organizerName, setOrganizerName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('unavailable');
      return;
    }

    let cancelled = false;

    const load = async () => {
      setState('loading');
      try {
        const meta = await eventReviewService.getPublicReviewRequest(token);
        if (cancelled) return;

        setAllowPublic(meta.allow_public_testimonials);
        setMetaLabel(meta.event_label || '');
        setOrganizerName(meta.organizer_name || '');

        if (meta.allow_public_testimonials) {
          setVisibility('public');
        }

        setState('ready');
      } catch {
        if (cancelled) return;
        setState('unavailable');
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      await eventReviewService.submitPublicReview(token, {
        rating,
        comment: comment.trim() || undefined,
        visibility,
      });
      setState('success');
    } catch {
      setError(t('public.submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (state === 'unavailable') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-surface p-8 text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">{t('public.unavailable_title')}</h1>
          <p className="text-text-secondary">{t('public.unavailable_desc')}</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="max-w-lg w-full rounded-2xl border border-border bg-surface p-8 text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">{t('public.success_title')}</h1>
          <p className="text-text-secondary">{t('public.success_desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-surface p-6 md:p-8">
        <h1 className="text-2xl font-bold text-text">{t('public.title')}</h1>
        <p className="mt-2 text-text-secondary">{t('public.subtitle')}</p>
        {(metaLabel || organizerName) && (
          <p className="mt-2 text-sm text-text-secondary">
            {metaLabel}
            {metaLabel && organizerName ? ' · ' : ''}
            {organizerName}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-text-secondary mb-2">{t('public.rating_label')}</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="p-1"
                  aria-label={t('public.rating_aria', { value })}
                >
                  <Star
                    className={`h-7 w-7 ${value <= rating ? 'fill-primary text-primary' : 'text-border'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-semibold text-text-secondary mb-2">
              {t('public.comment_label')}
            </label>
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={t('public.comment_placeholder')}
            />
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-semibold text-text-secondary mb-2">
              {t('public.visibility_label')}
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="private">{t('public.visibility_private')}</option>
              <option value="public" disabled={!allowPublic}>
                {t('public.visibility_public')}
              </option>
            </select>
            {!allowPublic && (
              <p className="mt-2 text-xs text-text-secondary">{t('public.visibility_public_disabled')}</p>
            )}
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary text-white font-semibold py-2.5 hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? t('public.submitting') : t('public.submit')}
          </button>
        </form>
      </div>
    </div>
  );
};
