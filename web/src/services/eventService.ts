import { api } from '../lib/api';
import { Event, EventInsert, EventUpdate, EventEquipment, EventSupply, EquipmentConflict, EquipmentSuggestion, SupplySuggestion, PaginatedResponse, PaginationParams } from '../types/entities';
import type { components, operations } from '../types/api';

// Helper for type safety on joined data
type EventWithClient = Event & { client?: { name: string; id?: string; phone?: string } | null };

/**
 * EventProduct as declared by the backend contract. The join field the
 * backend attaches is `product_name` (optional string, comes from a SQL
 * join) — NOT the legacy `products: { name: ... }` shape that used to be
 * returned by an earlier version of the repository.
 */
export type EventProduct = components['schemas']['EventProduct'];

/**
 * EventExtra as declared by the backend contract.
 */
export type EventExtra = components['schemas']['EventExtra'];

/**
 * EventPhoto as declared by the backend contract. The backend owns
 * the photo array server-side (persisted as a JSON array on the event row)
 * and exposes `GET/POST/DELETE /api/events/{id}/photos` endpoints. The
 * Web used to serialize the array client-side via `PUT /api/events/{id}`;
 * that path is legacy and is being replaced with the dedicated endpoints.
 */
export type EventPhoto = components['schemas']['EventPhoto'];

/**
 * Body shape for `POST /api/events/{id}/photos`. Only `url` is required
 * — the backend generates the id, timestamps and any thumbnail metadata.
 */
export type EventPhotoCreateRequest = components['schemas']['EventPhotoCreateRequest'];

/**
 * Query parameters accepted by the advanced event search endpoint.
 * The backend requires at least one non-empty filter — if the caller passes
 * all empty values the request is rejected with 400.
 */
export type EventSearchFilters = NonNullable<
  NonNullable<operations['searchEvents']['parameters']['query']>
>;

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

  /**
   * Advanced search using the backend's `GET /api/events/search` endpoint.
   * The backend supports: free-text query (`q`, matches service_type, location,
   * city and client name with pg_trgm fuzzy on the client name), status,
   * date range, and client id. At least one filter must be non-empty or the
   * backend rejects the request with 400.
   *
   * Prefer this over client-side filtering of `getAll()` because the backend
   * owns the FTS indexes and the filter logic — Web-side `.filter()` was the
   * source of divergence when new event fields were added (e.g. city vs
   * location).
   */
  async searchAdvanced(filters: EventSearchFilters): Promise<EventWithClient[]> {
    // Drop empty values so the URLSearchParams query only carries what the
    // caller actually wants to filter on. Empty strings would be interpreted
    // as intentional filters by the backend and fail validation.
    const params: Record<string, string> = {};
    if (filters.q) params.q = filters.q;
    if (filters.status) params.status = filters.status;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.client_id) params.client_id = filters.client_id;
    return api.get<EventWithClient[]>('/events/search', params);
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

  async getProducts(eventId: string): Promise<EventProduct[]> {
    return api.get<EventProduct[]>(`/events/${eventId}/products`);
  },

  async getExtras(eventId: string): Promise<EventExtra[]> {
    return api.get<EventExtra[]>(`/events/${eventId}/extras`);
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

  // Photo Management — uses the dedicated /api/events/{id}/photos endpoints
  // instead of round-tripping the photos array via PUT /api/events/{id}.
  // The backend owns the photo list server-side so the client never has
  // to parse JSON strings or re-serialize the whole array on add/delete.

  async getEventPhotos(eventId: string): Promise<EventPhoto[]> {
    return api.get<EventPhoto[]>(`/events/${eventId}/photos`);
  },

  async addEventPhoto(eventId: string, req: EventPhotoCreateRequest): Promise<EventPhoto> {
    return api.post<EventPhoto>(`/events/${eventId}/photos`, req);
  },

  async deleteEventPhoto(eventId: string, photoId: string): Promise<void> {
    return api.delete(`/events/${eventId}/photos/${photoId}`);
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
