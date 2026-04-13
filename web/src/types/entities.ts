// Application-level entity types.
//
// FUENTE DE VERDAD: backend/docs/openapi.yaml (v1.0, freezeado en SUPER_PLAN
// Wave 1 T-02). Los tipos se regeneran automáticamente desde el spec en
// src/types/api.ts vía `npm run openapi:types` (corre en prebuild/check).
//
// Este archivo re-exporta los schemas del contrato bajo nombres
// idiomáticos y declara extensiones LOCALES solo para:
//   1. Campos JOIN que el backend adjunta pero aún no declara en el spec
//      (por ej. EventEquipment.equipment_name, ProductIngredient.inventory)
//   2. Tipos `*Insert` / `*Update` derivados que el Web usa para requests
//      de creación/edición (no están en el spec).
//
// Cuando el backend actualice el spec, borrá acá lo que ya esté declarado
// en components['schemas']. Cualquier divergencia entre lo que el código
// Web asume y lo que el spec dice es un bug: siempre gana el spec.

import type { components } from './api';

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// ===== User =====
// El spec define plan como enum [basic, pro]. El Web tenía 'basic' | 'premium'
// — el valor 'premium' es legacy de cuando existían 3 tiers; hoy se usa
// solamente para gifts (tracked en el backend como campos separados). Se
// mantiene el override acá hasta que el spec o la UI se reconcilien; cambiar
// uno u otro requiere refactor cross-platform (ver engram memory
// 'Simplified Subscription Plans to Basic and Premium across platforms').
type UserSchema = components['schemas']['User'];
export type User = Omit<UserSchema, 'plan'> & {
    plan: 'basic' | 'premium'
}

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at' | 'role'>
export type UserUpdate = Partial<UserInsert>

// ===== Client =====
export type Client = components['schemas']['Client']

export type ClientInsert =
    Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'email' | 'address' | 'city' | 'notes' | 'photo_url' | 'total_events' | 'total_spent'> & {
        email?: string | null
        address?: string | null
        city?: string | null
        notes?: string | null
        photo_url?: string | null
        total_events?: number | null
        total_spent?: number | null
    }
export type ClientUpdate = Partial<Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ===== Event =====
export type Event = components['schemas']['Event']

export type EventInsert =
    Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'client' | 'start_time' | 'end_time' | 'location' | 'city' | 'deposit_percent' | 'cancellation_days' | 'refund_percent' | 'notes' | 'photos'> & {
        start_time?: string | null
        end_time?: string | null
        location?: string | null
        city?: string | null
        deposit_percent?: number | null
        cancellation_days?: number | null
        refund_percent?: number | null
        notes?: string | null
        photos?: string | null
    }
export type EventUpdate = Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'client'>>

// ===== Product =====
export type Product = components['schemas']['Product']

export type ProductInsert =
    Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'recipe' | 'is_active' | 'image_url'> & {
        recipe?: string | null
        is_active?: boolean
        image_url?: string | null
    }
export type ProductUpdate = Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ===== Inventory Item =====
export type InventoryItem = components['schemas']['InventoryItem']

export type InventoryItemInsert = Omit<InventoryItem, 'id' | 'user_id' | 'last_updated'>
export type InventoryItemUpdate = Partial<InventoryItemInsert>

// ===== Event Product =====
// Alias to the contract type — EventProduct already has the `product_name`
// join field declared in the spec (fixed as part of Fase 2).
export type EventProduct = components['schemas']['EventProduct']

export type EventProductInsert = Omit<EventProduct, 'id' | 'created_at' | 'product_name'>
export type EventProductUpdate = Partial<EventProductInsert>

// ===== Event Extra =====
export type EventExtra = components['schemas']['EventExtra']

export type EventExtraInsert = Omit<EventExtra, 'id' | 'created_at'>
export type EventExtraUpdate = Partial<EventExtraInsert>

// ===== Event Equipment =====
// Spec declares the core shape; `equipment_name`, `unit` y `current_stock`
// son joins del backend no documentados en el spec. Se mantienen acá como
// extensiones opcionales hasta que el spec los formalice.
type EventEquipmentSchema = components['schemas']['EventEquipment']
export type EventEquipment = EventEquipmentSchema & {
    equipment_name?: string
    unit?: string
    current_stock?: number
}

export type EventEquipmentInsert = Omit<EventEquipmentSchema, 'id' | 'created_at'>

// ===== Equipment Suggestion =====
export type EquipmentSuggestion = components['schemas']['EquipmentSuggestion']

// ===== Equipment Conflict =====
// El spec declara `conflict_type` como string abierto; el Web lo quiere
// tipado a un union. Se aplica el narrow acá, asumiendo que el backend
// sólo devuelve esos 3 valores (verificar si aparece uno nuevo).
type EquipmentConflictSchema = components['schemas']['EquipmentConflict']
export type EquipmentConflict = Omit<EquipmentConflictSchema, 'conflict_type'> & {
    conflict_type: 'overlap' | 'insufficient_gap' | 'full_day'
}

// ===== Event Supply =====
// Mismo patrón que EventEquipment: joins locales sobre el schema del spec.
type EventSupplySchema = components['schemas']['EventSupply']
export type EventSupply = EventSupplySchema & {
    supply_name?: string
    unit?: string
    current_stock?: number
}

export type EventSupplyInsert = Omit<EventSupplySchema, 'id' | 'created_at'>

// ===== Supply Suggestion =====
export type SupplySuggestion = components['schemas']['SupplySuggestion']

// ===== Product Ingredient =====
// Spec declara la shape básica; el backend también devuelve un `inventory`
// nested con datos del InventoryItem joined. Tipado acá para consumer
// convenience — debería moverse al spec del backend en algún momento.
type ProductIngredientSchema = components['schemas']['ProductIngredient']
export type ProductIngredient = ProductIngredientSchema

export type ProductIngredientInsert = Omit<ProductIngredient, 'id' | 'created_at'>
export type ProductIngredientUpdate = Partial<ProductIngredientInsert>

// ===== Payment =====
export type Payment = components['schemas']['Payment']

export type PaymentInsert = Omit<Payment, 'id' | 'user_id' | 'created_at'>
export type PaymentUpdate = Partial<PaymentInsert>

// ===== Event Form Link =====
export interface EventFormLink {
    id: string
    user_id: string
    token: string
    label?: string
    status: 'active' | 'used' | 'expired'
    submitted_event_id?: string
    submitted_client_id?: string
    url: string
    expires_at: string
    used_at?: string
    created_at: string
    updated_at: string
}

// ===== Pagination =====
// Wrapper genérico — el spec declara PaginatedXxxResponse concretos por
// entidad. El Web usa PaginatedResponse<T> genéricamente para reutilizar
// lógica de paginación. Es una capa del Web, no del contrato.
export interface PaginatedResponse<T> {
    data: T[]
    total: number
    page: number
    limit: number
    total_pages: number
}

export interface PaginationParams {
    page?: number
    limit?: number
    sort?: string
    order?: 'asc' | 'desc'
}
