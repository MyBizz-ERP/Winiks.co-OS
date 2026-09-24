-- ==========================================
-- PHASE 2: WHOLESALE ERP ISOLATED SCHEMA
-- Execute this entirely inside your Supabase SQL Editor
-- ==========================================

-- 1. Create the brand new isolated schema (folder) for the Wholesale ERP
CREATE SCHEMA IF NOT EXISTS wholesale;

-- 2. Ensure our Next.js backend (Service Role) can bypass locks
GRANT ALL PRIVILEGES ON SCHEMA wholesale TO service_role;

-- 3. WHOLESALE INVENTORY (Products)
CREATE TABLE wholesale.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    barcode VARCHAR(100),
    buying_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'PCS',      -- e.g., 'PCS', 'BOX', 'KG'
    min_stock_alert NUMERIC(10, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. WHOLESALE CUSTOMERS (CRM & Udhaari Tracker)
CREATE TABLE wholesale.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    total_credit NUMERIC(12, 2) DEFAULT 0.00, -- Strictly tracks Udhaari (Debt owed by this customer)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Restore Master DB Privileges for the new tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA wholesale TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA wholesale TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA wholesale TO authenticated;

-- Enable RLS locks so tenants can never see cross-shop data
ALTER TABLE wholesale.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.customers ENABLE ROW LEVEL SECURITY;
