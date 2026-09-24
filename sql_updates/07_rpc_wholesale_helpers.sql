-- ============================================================
-- RPC HELPER FUNCTIONS
-- These live in the PUBLIC schema (no restriction) but write
-- into the wholesale schema. SECURITY DEFINER runs as the
-- DB owner so schema exposure settings are bypassed.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Helper: Bulk insert products
CREATE OR REPLACE FUNCTION public.wh_insert_products(p_shop_id UUID, p_records JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
  inserted INT := 0;
  r JSONB;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO wholesale.products (
      shop_id, name, barcode, buying_price, selling_price,
      current_stock, unit, min_stock_alert
    ) VALUES (
      p_shop_id,
      r->>'name',
      NULLIF(r->>'barcode', ''),
      (r->>'buying_price')::NUMERIC,
      (r->>'selling_price')::NUMERIC,
      (r->>'current_stock')::NUMERIC,
      COALESCE(NULLIF(r->>'unit', ''), 'PCS'),
      (r->>'min_stock_alert')::NUMERIC
    )
    ON CONFLICT DO NOTHING;
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

-- Helper: Bulk insert customers
CREATE OR REPLACE FUNCTION public.wh_insert_customers(p_shop_id UUID, p_records JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
  inserted INT := 0;
  r JSONB;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO wholesale.customers (shop_id, name, phone, total_credit)
    VALUES (
      p_shop_id,
      r->>'name',
      NULLIF(r->>'phone', ''),
      COALESCE((r->>'total_credit')::NUMERIC, 0)
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

-- Helper: Bulk insert suppliers
CREATE OR REPLACE FUNCTION public.wh_insert_suppliers(p_shop_id UUID, p_records JSONB)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
  inserted INT := 0;
  r JSONB;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO wholesale.suppliers (shop_id, name, phone, company, total_payable)
    VALUES (
      p_shop_id,
      r->>'name',
      NULLIF(r->>'phone', ''),
      NULLIF(r->>'company', ''),
      COALESCE((r->>'total_payable')::NUMERIC, 0)
    );
    inserted := inserted + 1;
  END LOOP;
  RETURN inserted;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
