-- ============================================================
-- WHOLESALE SCHEMA EXTENSION: Suppliers + Purchase Bills
-- Run this in Supabase SQL Editor AFTER 05_wholesale_complete_schema.sql
-- ============================================================

-- 1. SUPPLIERS TABLE (Who the shop buys stock from)
CREATE TABLE IF NOT EXISTS wholesale.suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  company       TEXT,
  total_payable NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Accounts Payable balance
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PURCHASE BILLS TABLE (When owner buys stock - Kharedi)
CREATE TABLE IF NOT EXISTS wholesale.purchase_bills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES wholesale.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT, -- Denormalized for history integrity
  subtotal      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_mode  TEXT DEFAULT 'cash', -- 'cash', 'credit', 'partial'
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PURCHASE BILL LINE ITEMS
CREATE TABLE IF NOT EXISTS wholesale.purchase_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_bill_id UUID NOT NULL REFERENCES wholesale.purchase_bills(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES wholesale.products(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL, -- Denormalized
  quantity        NUMERIC(10, 2) NOT NULL,
  unit_cost       NUMERIC(10, 2) NOT NULL,
  total_cost      NUMERIC(10, 2) NOT NULL
);

-- ============================================================
-- 4. RLS VAULT LOCKS on new tables
-- ============================================================
ALTER TABLE wholesale.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation: suppliers" ON wholesale.suppliers;
DROP POLICY IF EXISTS "Tenant isolation: purchase_bills" ON wholesale.purchase_bills;
DROP POLICY IF EXISTS "Tenant isolation: purchase_items" ON wholesale.purchase_items;

CREATE POLICY "Tenant isolation: suppliers" ON wholesale.suppliers
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation: purchase_bills" ON wholesale.purchase_bills
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE POLICY "Tenant isolation: purchase_items" ON wholesale.purchase_items
  FOR ALL USING (purchase_bill_id IN (
    SELECT pb.id FROM wholesale.purchase_bills pb
    JOIN public.shops s ON s.id = pb.shop_id
    WHERE s.owner_id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
