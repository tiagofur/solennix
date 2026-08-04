-- 080 Hard-remove legacy EventFormLink + PublicLead tables (unify-solicitudes Phase 4).
-- Successors: public_request_links + public_requests (migration 077 / 073).
DROP TABLE IF EXISTS public_leads;
DROP TABLE IF EXISTS event_form_links;
