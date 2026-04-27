export interface User {
  id: string;
  email: string;
  name: string;
  business_name?: string;
  logo_url?: string;
  brand_color?: string;
  show_business_name_in_pdf?: boolean;
  plan: string;
  role?: string;
  stripe_customer_id?: string;
  default_deposit_percent?: number;
  default_cancellation_days?: number;
  default_refund_percent?: number;
  contract_template?: string | null;
  preferred_language?: string;
  // Notification preferences
  email_payment_receipt?: boolean;
  email_event_reminder?: boolean;
  email_subscription_updates?: boolean;
  email_weekly_summary?: boolean;
  email_marketing?: boolean;
  push_enabled?: boolean;
  push_event_reminder?: boolean;
  push_payment_received?: boolean;
}
