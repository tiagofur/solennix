ALTER TABLE users
  DROP COLUMN IF EXISTS email_payment_receipt,
  DROP COLUMN IF EXISTS email_event_reminder,
  DROP COLUMN IF EXISTS email_subscription_updates,
  DROP COLUMN IF EXISTS email_weekly_summary,
  DROP COLUMN IF EXISTS email_marketing,
  DROP COLUMN IF EXISTS push_enabled,
  DROP COLUMN IF EXISTS push_event_reminder,
  DROP COLUMN IF EXISTS push_payment_received;
