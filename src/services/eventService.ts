import { supabase, getCurrentUserId } from '../lib/supabase';
import { Database } from '../types/supabase';

type Event = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];
type EventProductInsert = Database['public']['Tables']['event_products']['Insert'];

export const eventService = {
  async getAll() {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clients (name)
      `)
      .eq('user_id', userId)
      .order('event_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByDateRange(start: string, end: string) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clients (name)
      `)
      .eq('user_id', userId)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date');
    
    if (error) throw error;
    return data;
  },

  async getByClientId(clientId: string) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .order('event_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Event> {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clients (*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Evento no encontrado');
    return data as Event;
  },

  async create(event: EventInsert): Promise<Event> {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, user_id: userId } as any)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al crear el evento');
    return data;
  },

  async update(id: string, event: EventUpdate): Promise<Event> {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Evento no encontrado');
    }
    
    const { data, error } = await supabase
      .from('events')
      // @ts-expect-error - Supabase type inference issue
      .update(event)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Error al actualizar el evento');
    return data as Event;
  },

  async delete(id: string) {
    const userId = await getCurrentUserId();
    // First verify ownership
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('Evento no encontrado');
    }
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  },

  async getUpcoming(limit: number = 5) {
    const userId = await getCurrentUserId();
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clients (name)
      `)
      .eq('user_id', userId)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async addProducts(eventId: string, products: { productId: string, quantity: number, unitPrice: number, discount?: number }[]) {
    if (products.length === 0) return;

    const records: EventProductInsert[] = products.map(p => ({
      event_id: eventId,
      product_id: p.productId,
      quantity: p.quantity,
      unit_price: p.unitPrice,
      discount: p.discount || 0
    }));
    
    const { error } = await supabase
      .from('event_products')
      .insert(records as any);
      
    if (error) throw error;
  },

  async getProducts(eventId: string) {
    const { data, error } = await supabase
      .from('event_products')
      .select(`
        *,
        products (name)
      `)
      .eq('event_id', eventId);
      
    if (error) throw error;
    return data;
  },

  async updateProducts(eventId: string, products: { productId: string, quantity: number, unitPrice: number, discount?: number }[]) {
      // Delete existing products for this event
      const { error: deleteError } = await supabase
        .from('event_products')
        .delete()
        .eq('event_id', eventId);
        
      if (deleteError) throw deleteError;
      
      // Add new products
      return this.addProducts(eventId, products);
  },

  async addExtras(eventId: string, extras: { description: string, cost: number, price: number, exclude_utility?: boolean }[]) {
    if (extras.length === 0) return;

    const records = extras.map(e => ({
      event_id: eventId,
      description: e.description,
      cost: e.cost,
      price: e.price,
      exclude_utility: e.exclude_utility || false
    }));

    const { error } = await supabase
      .from('event_extras')
      .insert(records as any);

    if (error) throw error;
  },

  async getExtras(eventId: string) {
    const { data, error } = await supabase
      .from('event_extras')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data;
  },

  async updateExtras(eventId: string, extras: { description: string, cost: number, price: number, exclude_utility?: boolean }[]) {
      // Delete existing extras for this event
      const { error: deleteError } = await supabase
        .from('event_extras')
        .delete()
        .eq('event_id', eventId);

      if (deleteError) throw deleteError;

      // Add new extras
      return this.addExtras(eventId, extras);
  },

  async updateItems(
    eventId: string,
    products: { productId: string; quantity: number; unitPrice: number; discount?: number }[],
    extras: { description: string; cost: number; price: number; exclude_utility?: boolean }[],
  ) {
    // @ts-expect-error - Supabase type inference issue with RPC
    const { error } = await supabase.rpc('update_event_items', {
      p_event_id: eventId,
      products_json: products,
      extras_json: extras,
    });

    if (error) throw error;
  }
};
