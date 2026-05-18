import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import eventReviewService, { EventReview, ReviewVisibility } from '@/services/eventReviewService';

const QUERY_KEY = ['reviews', 'organizer'];

export const ReviewsPage: React.FC = () => {
  const { t, i18n } = useTranslation('reviews');
  const queryClient = useQueryClient();

  const [draftResponses, setDraftResponses] = useState<Record<string, string>>({});

  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => eventReviewService.listOrganizerReviews(),
  });

  const saveResponseMutation = useMutation({
    mutationFn: ({ id, responseText }: { id: string; responseText: string }) =>
      eventReviewService.updateOrganizerResponse(id, responseText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: ReviewVisibility }) =>
      eventReviewService.updateVisibility(id, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const sortedReviews = useMemo(
    () => [...reviews].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()),
    [reviews],
  );

  const formatDate = (value: string) => {
    const locale = i18n.language.startsWith('en') ? 'en-US' : 'es-MX';
    try {
      return new Date(value).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  };

  if (isLoading) {
    return (
      <div className="h-56 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-text-secondary">{t('organizer.loading_error')}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-text">{t('organizer.title')}</h1>
      </div>

      {sortedReviews.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-text-secondary">
          {t('organizer.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review) => {
            const currentDraft = draftResponses[review.id] ?? review.organizer_response ?? '';
            const stars = '★'.repeat(review.rating) + '☆'.repeat(Math.max(0, 5 - review.rating));
            return (
              <article key={review.id} className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-text">{review.client_name || t('organizer.unknown_client')}</h2>
                    <p className="text-sm text-text-secondary">
                      {review.event_label || t('organizer.unknown_event')} · {formatDate(review.submitted_at)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary" aria-label={t('organizer.rating_aria')}>
                    {stars}
                  </span>
                </header>

                {review.comment && <p className="text-text">{review.comment}</p>}

                <div className="grid md:grid-cols-[220px,1fr] gap-4 items-start">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-2">
                      {t('organizer.visibility_label')}
                    </label>
                    <select
                      value={review.visibility}
                      onChange={(e) => {
                        visibilityMutation.mutate({
                          id: review.id,
                          visibility: e.target.value as ReviewVisibility,
                        });
                      }}
                      disabled={visibilityMutation.isPending}
                      className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text"
                    >
                      <option value="private">{t('organizer.visibility_private')}</option>
                      <option value="public">{t('organizer.visibility_public')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-2">
                      {t('organizer.response_label')}
                    </label>
                    <textarea
                      rows={3}
                      value={currentDraft}
                      onChange={(e) =>
                        setDraftResponses((prev) => ({
                          ...prev,
                          [review.id]: e.target.value,
                        }))
                      }
                      placeholder={t('organizer.response_placeholder')}
                      className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-text outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          saveResponseMutation.mutate({
                            id: review.id,
                            responseText: currentDraft,
                          })
                        }
                        disabled={saveResponseMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        {t('organizer.save_response')}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
