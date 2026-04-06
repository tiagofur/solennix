import { api } from '../lib/api';
import { Event, EventInsert, EventUpdate, EventEquipment, EventSupply, EquipmentConflict, EquipmentSuggestion, SupplySuggestion, PaginatedResponse, PaginationParams } from '../types/entities';

// Helper for type safety on joined data
type EventWithClient = Event & { clients?: { name: string } | null };

export const eventService = {
  async getAll(): Promise<EventWithClient[]> {
    return api.get<EventWithClient[]>('/events');
  },

  async getPage(params: PaginationParams = {}): Promise<PaginatedResponse<EventWithClient>> {
    return api.get<PaginatedResponse<EventWithClient>>('/events', {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      ...(params.sort && { sort: params.sort }),
      ...(params.order && { order: params.order }),
    });
  },

  async getByDateRange(start: string, end: string): Promise<EventWithClient[]> {
    return api.get<EventWithClient[]>('/events', { start, end });
  },

  async getByClientId(clientId: string): Promise<EventWithClient[]> {
    return api.get<EventWithClient[]>('/events', { client_id: clientId });
  },

  async getById(id: string): Promise<EventWithClient> {
    return api.get<EventWithClient>(`/events/${id}`);
  },

  async create(event: EventInsert): Promise<Event> {
    return api.post<Event>('/events', event);
  },

  async update(id: string, event: EventUpdate): Promise<Event> {
    return api.put<Event>(`/events/${id}`, event);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/events/${id}`);
  },

  async getUpcoming(limit: number = 5): Promise<EventWithClient[]> {
    return api.get<EventWithClient[]>('/events/upcoming', { limit: limit.toString() });
  },

  // Products & Extras Management

  async getProducts(eventId: string) {
    return api.get<any[]>(`/events/${eventId}/products`);
  },

  async getExtras(eventId: string) {
    return api.get<any[]>(`/events/${eventId}/extras`);
  },

  async updateItems(
    eventId: string,
    products: { productId: string; quantity: number; unitPrice: number; discount?: number }[],
    extras: { description: string; cost: number; price: number; exclude_utility?: boolean; include_in_checklist?: boolean }[],
    equipment?: { inventoryId: string; quantity: number; notes?: string }[],
    supplies?: { inventoryId: string; quantity: number; unitCost: number; source: 'stock' | 'purchase'; excludeCost?: boolean }[],
  ) {
    // Map frontend structure to backend expected JSON
    // Backend expects: { products: [{product_id, ...}], extras: [...], equipment: [...], supplies: [...] }
    const backendProducts = products.map(p => ({
      product_id: p.productId,
      quantity: p.quantity,
      unit_price: p.unitPrice,
      discount: p.discount || 0
    }));

    const backendExtras = extras.map(e => ({
      description: e.description,
      cost: e.cost,
      price: e.price,
      exclude_utility: e.exclude_utility || false,
      include_in_checklist: e.include_in_checklist !== false
    }));

    const payload: Record<string, unknown> = {
      products: backendProducts,
      extras: backendExtras
    };

    if (equipment) {
      payload.equipment = equipment.map(eq => ({
        inventory_id: eq.inventoryId,
        quantity: eq.quantity,
        notes: eq.notes || null
      }));
    }

    if (supplies) {
      payload.supplies = supplies.map(s => ({
        inventory_id: s.inventoryId,
        quantity: s.quantity,
        unit_cost: s.unitCost,
        source: s.source,
        exclude_cost: s.excludeCost || false
      }));
    }

    return api.put(`/events/${eventId}/items`, payload);
  },

  // Equipment Management

  async getEquipment(eventId: string): Promise<EventEquipment[]> {
    return api.get<EventEquipment[]>(`/events/${eventId}/equipment`);
  },

  async checkEquipmentConflicts(params: {
    event_date: string;
    start_time?: string | null;
    end_time?: string | null;
    inventory_ids: string[];
    exclude_event_id?: string;
  }): Promise<EquipmentConflict[]> {
    return api.post<EquipmentConflict[]>('/events/equipment/conflicts', params);
  },

  async getEquipmentSuggestions(products: { product_id: string; quantity: number }[]): Promise<EquipmentSuggestion[]> {
    return api.post('/events/equipment/suggestions', { products });
  },

  // Supply Management

  async getSupplies(eventId: string): Promise<EventSupply[]> {
    return api.get<EventSupply[]>(`/events/${eventId}/supplies`);
  },

  async getSupplySuggestions(products: { product_id: string; quantity: number }[]): Promise<SupplySuggestion[]> {
    return api.post('/events/supplies/suggestions', { products });
  },

  // Compatibility methods for legacy calls (if any individual update is used)
  async addProducts(eventId: string, products: { productId: string, quantity: number, unitPrice: number, discount?: number }[]) {
    // Fetch existing, append, update? 
    // Or just fail. Given typical usage, updateItems is preferred.
    // For safety, let's implement via get+update pattern if critical, but for now I'll assume updateItems is the main path.
    // Actually, let's just log a warning or throw "Not Implemented" if it's not used.
    // To be safe, I'll implement it by fetching existing products first.
    const existing = await this.getProducts(eventId);
    const existingMapped = existing.map((p: any) => ({
      productId: p.product_id,
      quantity: p.quantity,
      unitPrice: p.unit_price,
      discount: p.discount
    }));
    // Append new
    const merged = [...existingMapped, ...products];
    const extras = await this.getExtras(eventId); // Need extras to not lose them
    const extrasMapped = extras.map((e: any) => ({
      description: e.description,
      cost: e.cost,
      price: e.price,
      exclude_utility: e.exclude_utility,
      include_in_checklist: e.include_in_checklist
    }));

    return this.updateItems(eventId, merged, extrasMapped);
  },

  async updateProducts(eventId: string, products: { productId: string, quantity: number, unitPrice: number, discount?: number }[]) {
    // Just update products, keep extras
    const extras = await this.getExtras(eventId);
    const extrasMapped = extras.map((e: any) => ({
      description: e.description,
      cost: e.cost,
      price: e.price,
      exclude_utility: e.exclude_utility,
      include_in_checklist: e.include_in_checklist
    }));
    return this.updateItems(eventId, products, extrasMapped);
  },

  async updateExtras(eventId: string, extras: { description: string, cost: number, price: number, exclude_utility?: boolean; include_in_checklist?: boolean }[]) {
    // Just update extras, keep products
    const products = await this.getProducts(eventId);
    const productsMapped = products.map((p: any) => ({
      productId: p.product_id,
      quantity: p.quantity,
      unitPrice: p.unit_price,
      discount: p.discount
    }));
    return this.updateItems(eventId, productsMapped, extras);
  }
};
