ALTER TABLE users
  ADD COLUMN email_payment_receipt      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN email_event_reminder       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN email_subscription_updates BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN email_weekly_summary       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN email_marketing            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN push_enabled               BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN push_event_reminder        BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN push_payment_received      BOOLEAN NOT NULL DEFAULT true;
