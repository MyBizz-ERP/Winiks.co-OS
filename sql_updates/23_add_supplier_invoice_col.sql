-- ============================================================
-- WHOLESALE SCHEMA EXTENSION: Supplier Invoice Number
-- Run this in Supabase SQL Editor
-- ============================================================
ALTER TABLE wholesale.purchase_bills ADD COLUMN IF NOT EXISTS supplier_invoice_no TEXT;

NOTIFY pgrst, 'reload schema';
