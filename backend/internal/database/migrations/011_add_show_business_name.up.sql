-- 011 Add show business name toggle
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_business_name_in_pdf BOOLEAN DEFAULT true;
