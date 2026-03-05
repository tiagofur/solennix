// Local type definitions for API responses
// These replace Supabase types and represent the data returned by our Go backend

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// ===== User =====
export interface User {
    id: string
    email: string
    name: string
    business_name: string | null
    logo_url: string | null
    brand_color: string | null
    show_business_name_in_pdf: boolean | null
    default_deposit_percent: number | null
    default_cancellation_days: number | null
    default_refund_percent: number | null
    contract_template: string | null
    plan: 'basic' | 'premium'
    stripe_customer_id: string | null
    created_at: string
    updated_at: string
}

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>
export type UserUpdate = Partial<UserInsert>

// ===== Client =====
export interface Client {
    id: string
    user_id: string
    name: string
    phone: string
    email: string | null
    address: string | null
    city: string | null
    notes: string | null
    photo_url: string | null
    total_events: number | null
    total_spent: number | null
    created_at: string
    updated_at: string
}

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at'>
export type ClientUpdate = Partial<ClientInsert>

// ===== Event =====
export interface Event {
    id: string
    user_id: string
    client_id: string
    event_date: string
    start_time: string | null
    end_time: string | null
    service_type: string
    num_people: number
    status: 'quoted' | 'confirmed' | 'completed' | 'cancelled'
    discount: number
    requires_invoice: boolean
    tax_rate: number
    tax_amount: number
    total_amount: number
    location: string | null
    city: string | null
    deposit_percent: number | null
    cancellation_days: number | null
    refund_percent: number | null
    notes: string | null
    photos: string | null
    created_at: string
    updated_at: string
}

export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at'>
export type EventUpdate = Partial<EventInsert>

// ===== Product =====
export interface Product {
    id: string
    user_id: string
    name: string
    category: string
    base_price: number
    recipe: Json | null
    image_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>
export type ProductUpdate = Partial<ProductInsert>

// ===== Inventory Item =====
export interface InventoryItem {
    id: string
    user_id: string
    ingredient_name: string
    current_stock: number
    minimum_stock: number
    unit: string
    unit_cost: number | null
    last_updated: string
    type: 'ingredient' | 'equipment'
}

export type InventoryItemInsert = Omit<InventoryItem, 'id' | 'last_updated'>
export type InventoryItemUpdate = Partial<InventoryItemInsert>

// ===== Event Product =====
export interface EventProduct {
    id: string
    event_id: string
    product_id: string
    quantity: number
    unit_price: number
    discount: number
    total_price: number | null
    created_at: string
}

export type EventProductInsert = Omit<EventProduct, 'id' | 'created_at'>
export type EventProductUpdate = Partial<EventProductInsert>

// ===== Event Extra =====
export interface EventExtra {
    id: string
    event_id: string
    description: string
    cost: number
    price: number
    exclude_utility: boolean
    created_at: string
}

export type EventExtraInsert = Omit<EventExtra, 'id' | 'created_at'>
export type EventExtraUpdate = Partial<EventExtraInsert>

// ===== Event Equipment =====
export interface EventEquipment {
    id: string
    event_id: string
    inventory_id: string
    quantity: number
    notes: string | null
    created_at: string
    equipment_name?: string
    unit?: string
    current_stock?: number
}

export type EventEquipmentInsert = Omit<EventEquipment, 'id' | 'created_at' | 'equipment_name' | 'unit' | 'current_stock'>

// ===== Equipment Conflict =====
export interface EquipmentConflict {
    inventory_id: string
    equipment_name: string
    conflicting_event_id: string
    event_date: string
    start_time: string | null
    end_time: string | null
    service_type: string
    client_name: string | null
    conflict_type: 'overlap' | 'insufficient_gap' | 'full_day'
}

// ===== Product Ingredient =====
export interface ProductIngredient {
    id: string
    product_id: string
    inventory_id: string
    quantity_required: number
    capacity?: number | null
    bring_to_event?: boolean
    created_at: string
    // Joined from inventory (flattened by backend)
    ingredient_name?: string | null
    unit?: string | null
    unit_cost?: number | null
    type?: 'ingredient' | 'equipment' | null
}

export type ProductIngredientInsert = Omit<ProductIngredient, 'id' | 'created_at'>
export type ProductIngredientUpdate = Partial<ProductIngredientInsert>

// ===== Payment =====
export interface Payment {
    id: string
    event_id: string
    user_id: string
    amount: number
    payment_date: string
    payment_method: string
    notes: string | null
    created_at: string
}

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>
export type PaymentUpdate = Partial<PaymentInsert>
