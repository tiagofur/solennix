import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export const paymentService = {
  async getByEventId(eventId: string) {
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('*')
      .eq('event_id', eventId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByPaymentDateRange(startDate: string, endDate: string) {
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('*')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByEventIds(eventIds: string[]) {
    if (!eventIds.length) return [];
    const { data, error } = await (supabase as any)
      .from('payments')
      .select('*')
      .in('event_id', eventIds)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(payment: PaymentInsert) {
    const { data, error } = await (supabase as any)
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, payment: PaymentUpdate) {
    const { data, error } = await (supabase as any)
      .from('payments')
      .update(payment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await (supabase as any)
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
