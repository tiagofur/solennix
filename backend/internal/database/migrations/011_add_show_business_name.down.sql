-- 011 Remove show business name toggle
ALTER TABLE users DROP COLUMN IF EXISTS show_business_name_in_pdf;
