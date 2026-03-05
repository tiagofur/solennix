-- Add bring_to_event flag to product_ingredients.
-- When true, this ingredient should be transported to the event venue.
-- When false (default), it's consumed during preparation and doesn't travel.
-- Equipment items always travel regardless of this flag.
ALTER TABLE product_ingredients ADD COLUMN bring_to_event BOOLEAN NOT NULL DEFAULT false;
