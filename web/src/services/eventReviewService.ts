import { api } from '@/lib/api';

export type ReviewVisibility = 'private' | 'public';

export interface PublicReviewMeta {
  event_date?: string;
  event_label?: string;
  organizer_name?: string;
  allow_public_testimonials: boolean;
}

export interface EventReview {
  id: string;
  event_id: string;
  user_id: string;
  client_id: string;
  review_request_id?: string;
  rating: number;
  comment?: string;
  visibility: ReviewVisibility;
  organizer_response?: string;
  responded_at?: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  event_label?: string;
  organizer_name?: string;
  public_slug?: string;
}

class EventReviewService {
  async getPublicReviewRequest(token: string): Promise<PublicReviewMeta> {
    const response = await api.get<{ data: PublicReviewMeta }>(`/public/reviews/${token}`);
    return response.data;
  }

  async submitPublicReview(
    token: string,
    payload: { rating: number; comment?: string; visibility?: ReviewVisibility },
  ): Promise<EventReview> {
    const response = await api.post<{ data: EventReview }>(`/public/reviews/${token}`, payload);
    return response.data;
  }

  async listOrganizerReviews(): Promise<EventReview[]> {
    const response = await api.get<{ data: EventReview[] }>('/reviews');
    return response.data || [];
  }

  async updateOrganizerResponse(id: string, responseText?: string): Promise<EventReview> {
    const response = await api.patch<{ data: EventReview }>(`/reviews/${id}/response`, {
      response: responseText?.trim() ? responseText.trim() : null,
    });
    return response.data;
  }

  async updateVisibility(id: string, visibility: ReviewVisibility): Promise<EventReview> {
    const response = await api.patch<{ data: EventReview }>(`/reviews/${id}/visibility`, {
      visibility,
    });
    return response.data;
  }
}

export default new EventReviewService();
