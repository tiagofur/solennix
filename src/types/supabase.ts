export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      payments: {
        Row: {
          id: string
          event_id: string
          user_id: string
          amount: number
          payment_date: string
          payment_method: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          amount: number
          payment_date?: string
          payment_method?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          amount?: number
          payment_date?: string
          payment_method?: string
          notes?: string | null
          created_at?: string
        }
      }
      event_products: {
        Row: {
          id: string
          event_id: string
          product_id: string
          quantity: number
          unit_price: number
          discount: number
          total_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          product_id: string
          quantity?: number
          unit_price: number
          discount?: number
          total_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          discount?: number
          total_price?: number | null
          created_at?: string
        }
      }
      event_extras: {
        Row: {
          id: string
          event_id: string
          description: string
          cost: number
          price: number
          exclude_utility: boolean
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          description: string
          cost?: number
          price?: number
          exclude_utility?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          description?: string
          cost?: number
          price?: number
          exclude_utility?: boolean
          created_at?: string
        }
      }
      product_ingredients: {
        Row: {
          id: string
          product_id: string
          inventory_id: string
          quantity_required: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          inventory_id: string
          quantity_required: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          inventory_id?: string
          quantity_required?: number
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          business_name: string | null
          default_deposit_percent: number | null
          default_cancellation_days: number | null
          default_refund_percent: number | null
          plan: 'basic' | 'premium'
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          business_name?: string | null
          default_deposit_percent?: number | null
          default_cancellation_days?: number | null
          default_refund_percent?: number | null
          plan?: 'basic' | 'premium'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          business_name?: string | null
          default_deposit_percent?: number | null
          default_cancellation_days?: number | null
          default_refund_percent?: number | null
          plan?: 'basic' | 'premium'
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          phone: string
          email: string | null
          address: string | null
          city: string | null
          notes: string | null
          total_events: number | null
          total_spent: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          phone: string
          email?: string | null
          address?: string | null
          city?: string | null
          notes?: string | null
          total_events?: number | null
          total_spent?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          phone?: string
          email?: string | null
          address?: string | null
          city?: string | null
          notes?: string | null
          total_events?: number | null
          total_spent?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          event_date: string
          start_time?: string | null
          end_time?: string | null
          service_type: string
          num_people: number
          status?: 'quoted' | 'confirmed' | 'completed' | 'cancelled'
          discount?: number
          requires_invoice?: boolean
          tax_rate?: number
          tax_amount?: number
          total_amount: number
          location?: string | null
          city?: string | null
          deposit_percent?: number | null
          cancellation_days?: number | null
          refund_percent?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          event_date?: string
          start_time?: string | null
          end_time?: string | null
          service_type?: string
          num_people?: number
          status?: 'quoted' | 'confirmed' | 'completed' | 'cancelled'
          discount?: number
          requires_invoice?: boolean
          tax_rate?: number
          tax_amount?: number
          total_amount?: number
          location?: string | null
          city?: string | null
          deposit_percent?: number | null
          cancellation_days?: number | null
          refund_percent?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          base_price: number
          recipe: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          base_price: number
          recipe?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          base_price?: number
          recipe?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          ingredient_name: string
          current_stock?: number
          minimum_stock?: number
          unit: string
          unit_cost?: number | null
          last_updated?: string
          type?: 'ingredient' | 'equipment'
        }
        Update: {
          id?: string
          user_id?: string
          ingredient_name?: string
          current_stock?: number
          minimum_stock?: number
          unit?: string
          unit_cost?: number | null
          last_updated?: string
          type?: 'ingredient' | 'equipment'
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
