ALTER TABLE public_profile_views DROP COLUMN IF EXISTS country_code;
ALTER TABLE public_profile_views DROP COLUMN IF EXISTS device_class;

DROP INDEX IF EXISTS idx_site_page_views_device_time;
DROP INDEX IF EXISTS idx_site_page_views_time;
DROP INDEX IF EXISTS idx_site_page_views_page_time;
DROP TABLE IF EXISTS site_page_views;
