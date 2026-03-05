import { api } from '../lib/api';
import { Client, Product, InventoryItem } from '../types/entities';

type SearchEntity = 'client' | 'event' | 'product' | 'inventory';

export type SearchResult = {
    id: string;
    type: SearchEntity;
    title: string;
    subtitle?: string;
    meta?: string;
    status?: string;
    /** Screen name to navigate to (adapted for React Navigation) */
    screen: string;
    params?: Record<string, string>;
};

export type SearchResults = {
    client: SearchResult[];
    event: SearchResult[];
    product: SearchResult[];
    inventory: SearchResult[];
};

const EMPTY_RESULTS: SearchResults = {
    client: [],
    event: [],
    product: [],
    inventory: [],
};

const normalizeQuery = (query: string) => query.trim().toLowerCase();

const limitResults = <T>(items: T[], limit: number) => items.slice(0, limit);

const mapClientResults = (clients: Client[]): SearchResult[] =>
    clients.map((client) => {
        const subtitleParts = [client.phone, client.email].filter(Boolean);
        return {
            id: client.id,
            type: 'client',
            title: client.name,
            subtitle: subtitleParts.join(' - '),
            meta: client.city || undefined,
            screen: 'ClientDetail',
            params: { id: client.id },
        };
    });

const mapProductResults = (products: Product[]): SearchResult[] =>
    products.map((product) => ({
        id: product.id,
        type: 'product',
        title: product.name,
        subtitle: product.category || undefined,
        meta: product.base_price ? `$${product.base_price.toFixed(2)}` : undefined,
        screen: 'ProductForm',
        params: { id: product.id },
    }));

const mapInventoryResults = (items: InventoryItem[]): SearchResult[] =>
    items.map((item) => ({
        id: item.id,
        type: 'inventory',
        title: item.ingredient_name,
        subtitle: `${item.type === 'equipment' ? 'Equipo' : 'Insumo'} - ${item.unit}`,
        meta: `Stock: ${item.current_stock} ${item.unit}`,
        screen: 'InventoryForm',
        params: { id: item.id },
    }));

const mapEventResults = (events: any[]): SearchResult[] =>
    events.map((event) => ({
        id: event.id,
        type: 'event',
        title: event.service_type,
        subtitle: event.client?.name || undefined,
        meta: event.event_date,
        status: event.status,
        screen: 'EventSummary',
        params: { id: event.id },
    }));

export const searchService = {
    async searchAll(query: string, limit: number = 6): Promise<SearchResults> {
        const term = normalizeQuery(query);
        if (!term) return EMPTY_RESULTS;

        const response = await api.get<{
            clients: Client[];
            products: Product[];
            inventory: InventoryItem[];
            events: any[];
        }>(`/search?q=${encodeURIComponent(term)}`);

        return {
            client: limitResults(mapClientResults(response.clients || []), limit),
            product: limitResults(mapProductResults(response.products || []), limit),
            inventory: limitResults(mapInventoryResults(response.inventory || []), limit),
            event: limitResults(mapEventResults(response.events || []), limit),
        };
    },
};
