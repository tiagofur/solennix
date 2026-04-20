export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    paginated: (page?: number, limit?: number, sort?: string, order?: string) =>
      ['clients', 'paginated', { page, limit, sort, order }] as const,
    detail: (id: string) => ['clients', id] as const,
  },
  events: {
    all: ['events'] as const,
    paginated: (page?: number, limit?: number, sort?: string, order?: string) =>
      ['events', 'paginated', { page, limit, sort, order }] as const,
    detail: (id: string) => ['events', id] as const,
    products: (eventId: string) => ['events', eventId, 'products'] as const,
    extras: (eventId: string) => ['events', eventId, 'extras'] as const,
    equipment: (eventId: string) => ['events', eventId, 'equipment'] as const,
    supplies: (eventId: string) => ['events', eventId, 'supplies'] as const,
    staff: (eventId: string) => ['events', eventId, 'staff'] as const,
    photos: (eventId: string) => ['events', eventId, 'photos'] as const,
    upcoming: (limit: number) => ['events', 'upcoming', limit] as const,
    dateRange: (start: string, end: string) => ['events', 'range', start, end] as const,
    byClient: (clientId: string) => ['events', 'byClient', clientId] as const,
    search: (filters: Record<string, string | undefined>) =>
      ['events', 'search', filters] as const,
  },
  products: {
    all: ['products'] as const,
    paginated: (page?: number, limit?: number, sort?: string, order?: string) =>
      ['products', 'paginated', { page, limit, sort, order }] as const,
    detail: (id: string) => ['products', id] as const,
    ingredients: (productId: string) => ['products', productId, 'ingredients'] as const,
    ingredientsBatch: (productIds: string[]) =>
      ['products', 'ingredients', 'batch', ...productIds] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    paginated: (page?: number, limit?: number, sort?: string, order?: string) =>
      ['inventory', 'paginated', { page, limit, sort, order }] as const,
    detail: (id: string) => ['inventory', id] as const,
  },
  staff: {
    all: ['staff'] as const,
    paginated: (page?: number, limit?: number, sort?: string, order?: string) =>
      ['staff', 'paginated', { page, limit, sort, order }] as const,
    detail: (id: string) => ['staff', id] as const,
    availability: (date: string) => ['staff', 'availability', date] as const,
    assignments: (staffId: string) => ['staff', staffId, 'assignments'] as const,
    // Ola 2 — staff teams (cuadrillas).
    teams: ['staff', 'teams'] as const,
    team: (id: string) => ['staff', 'teams', id] as const,
  },
  payments: {
    byEvent: (eventId: string) => ['payments', 'event', eventId] as const,
    byDateRange: (start: string, end: string) => ['payments', 'range', start, end] as const,
    byEventIds: (eventIds: string[]) => ['payments', 'byEventIds', ...[...eventIds].sort()] as const,
    // Prefix used to invalidate every active byEventIds query regardless of
    // its specific event-id list. TanStack Query v5 invalidateQueries does
    // partial-from-the-start key matching, so this prefix matches all keys
    // shaped ['payments', 'byEventIds', ...].
    byEventIdsPrefix: ['payments', 'byEventIds'] as const,
  },
  search: {
    results: (query: string) => ['search', query] as const,
  },
  subscription: {
    status: ['subscription', 'status'] as const,
  },
  admin: {
    users: ['admin', 'users'] as const,
    stats: ['admin', 'stats'] as const,
  },
  eventFormLinks: {
    all: ['eventFormLinks'] as const,
  },
  unavailableDates: {
    all: ['unavailableDates'] as const,
    byRange: (start: string, end: string) =>
      ['unavailableDates', 'range', start, end] as const,
  },
  planLimits: ['planLimits'] as const,
} as const;
