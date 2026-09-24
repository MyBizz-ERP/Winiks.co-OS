-- ============================================================
-- WHOLESALE ERP: COMPLETE ISOLATED DATABASE SCHEMA
-- Run this ENTIRE script in your Supabase SQL Editor once.
-- This creates a physically separate 'wholesale' schema that
-- is 100% isolated from the Admin 'public' schema.
-- ============================================================

-- 1. PATCH: Add missing columns to public.shops if not already done
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. CREATE THE ISOLATED WHOLESALE SCHEMA
CREATE SCHEMA IF NOT EXISTS wholesale;

-- 3. PRODUCT CATALOG TABLE
-- Every row is stamped with shop_id, making it mathematically isolated.
CREATE TABLE IF NOT EXISTS wholesale.products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  barcode       TEXT,
  buying_price  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'PCS',
  min_stock_alert NUMERIC(10, 2) DEFAULT 5,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CUSTOMER / UDHAARI LEDGER TABLE
CREATE TABLE IF NOT EXISTS wholesale.customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  total_credit  NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Udhaari balance
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVOICE (BILL) TABLE
CREATE TABLE IF NOT EXISTS wholesale.invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id   UUID REFERENCES wholesale.customers(id) ON DELETE SET NULL,
  customer_name TEXT, -- Denormalized for fast printing even after customer deletion
  subtotal      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  past_due      NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Udhaari snapshot at time of billing
  grand_total   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_mode  TEXT DEFAULT 'cash', -- 'cash', 'udhaari', 'partial'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVOICE LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS wholesale.invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES wholesale.invoices(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES wholesale.products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL, -- Denormalized for history integrity
  quantity      NUMERIC(10, 2) NOT NULL,
  unit_price    NUMERIC(10, 2) NOT NULL, -- Overridden price at time of sale
  total_price   NUMERIC(10, 2) NOT NULL,
  unit          TEXT DEFAULT 'PCS'
);

-- ============================================================
-- 7. ROW LEVEL SECURITY (THE VAULT LOCK)
-- These policies enforce that Shop A CANNOT ever read Shop B's records.
-- ============================================================

ALTER TABLE wholesale.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.invoice_items ENABLE ROW LEVEL SECURITY;

-- Drop any old policies first to prevent conflicts
DROP POLICY IF EXISTS "Tenant isolation: products" ON wholesale.products;
DROP POLICY IF EXISTS "Tenant isolation: customers" ON wholesale.customers;
DROP POLICY IF EXISTS "Tenant isolation: invoices" ON wholesale.invoices;
DROP POLICY IF EXISTS "Tenant isolation: invoice_items" ON wholesale.invoice_items;

-- THE MATHEMATICAL VAULT LOCK on each table
CREATE POLICY "Tenant isolation: products" ON wholesale.products
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation: customers" ON wholesale.customers
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation: invoices" ON wholesale.invoices
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- invoice_items inherits isolation via the invoice join
CREATE POLICY "Tenant isolation: invoice_items" ON wholesale.invoice_items
  FOR ALL USING (invoice_id IN (
    SELECT i.id FROM wholesale.invoices i
    JOIN public.shops s ON s.id = i.shop_id
    WHERE s.owner_id = auth.uid()
  ));

-- ============================================================
-- 8. FORCE SUPABASE API TO SEE THE NEW SCHEMA
-- ============================================================
NOTIFY pgrst, 'reload schema';
