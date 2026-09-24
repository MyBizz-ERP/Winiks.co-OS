-- ==========================================
-- Backend Security Vault Audit (Row Level Security)
-- ==========================================

-- 1. Ensure RLS is active on Wholesale tables
ALTER TABLE wholesale.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale.customers ENABLE ROW LEVEL SECURITY;

-- 2. Scour and drop any old/empty policies that might exist
DROP POLICY IF EXISTS "Tenant Isolation for Wholesale Products" ON wholesale.products;
DROP POLICY IF EXISTS "Tenant Isolation for Wholesale Customers" ON wholesale.customers;

-- 3. THE TRUE VAULT LOCK
-- This is the mathematical rule that guarantees Shop A can NEVER see Shop B's data underneath the hood. 
-- It explicitly checks the authenticated user's ID against the `shops` reference.

CREATE POLICY "Tenant Isolation for Wholesale Products" 
ON wholesale.products
FOR ALL
USING (
  shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
);

CREATE POLICY "Tenant Isolation for Wholesale Customers"
ON wholesale.customers
FOR ALL
USING (
  shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
);
