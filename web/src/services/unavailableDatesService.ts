import { api } from '../lib/api';

export interface UnavailableDate {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface UnavailableDateInput {
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
}

export const unavailableDatesService = {
  getDates: async (start: string, end: string): Promise<UnavailableDate[]> => {
    try {
      const response = await api.get<UnavailableDate[]>(`/unavailable-dates?start=${start}&end=${end}`);
      return response || [];
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
      throw error;
    }
  },

  addDates: async (data: UnavailableDateInput): Promise<UnavailableDate> => {
    const response = await api.post<UnavailableDate>('/unavailable-dates', data);
    return response;
  },

  updateDate: async (id: string, data: UnavailableDateInput): Promise<UnavailableDate> => {
    const response = await api.put<UnavailableDate>(`/unavailable-dates/${id}`, data);
    return response;
  },

  removeDate: async (id: string): Promise<void> => {
    await api.delete<any>(`/unavailable-dates/${id}`);
  }
};
