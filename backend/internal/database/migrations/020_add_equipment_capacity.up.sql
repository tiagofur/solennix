-- Add capacity field to product_ingredients for equipment items.
-- capacity = how many product units one piece of equipment can handle.
-- NULL means fixed quantity (use quantity_required as-is, no scaling).
-- Non-NULL means: equipment_needed = CEIL(event_product_qty / capacity)
ALTER TABLE product_ingredients ADD COLUMN capacity NUMERIC DEFAULT NULL;
