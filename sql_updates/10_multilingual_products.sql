-- Adds multilingual support to the products table
-- Allows the POS to dynamically print the correct language without Google Translate

ALTER TABLE wholesale.products 
ADD COLUMN IF NOT EXISTS name_hi TEXT,
ADD COLUMN IF NOT EXISTS name_mr TEXT;

-- (Optional) If you have existing products and want to quickly set them to something temporary:
-- UPDATE wholesale.products SET name_hi = name, name_mr = name WHERE name_hi IS NULL;
