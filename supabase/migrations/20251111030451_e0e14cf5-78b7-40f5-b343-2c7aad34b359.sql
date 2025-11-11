-- Add currency column to products table
ALTER TABLE products ADD COLUMN currency text DEFAULT 'USD';