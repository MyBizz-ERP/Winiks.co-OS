-- ============================================================
-- RPC READ FUNCTIONS for wholesale schema
-- Since wholesale schema isn't exposed via PostgREST by default,
-- these public functions act as a secure data bridge.
-- Run in Supabase SQL Editor.
-- ============================================================

-- Read products for the calling tenant
CREATE OR REPLACE FUNCTION public.wh_get_products(p_shop_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, barcode TEXT, buying_price NUMERIC,
  selling_price NUMERIC, current_stock NUMERIC, unit TEXT,
  min_stock_alert NUMERIC, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.barcode, p.buying_price,
         p.selling_price, p.current_stock, p.unit,
         p.min_stock_alert, p.created_at
  FROM wholesale.products p
  WHERE p.shop_id = p_shop_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Read customers for the calling tenant
CREATE OR REPLACE FUNCTION public.wh_get_customers(p_shop_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, phone TEXT, total_credit NUMERIC, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.phone, c.total_credit, c.created_at
  FROM wholesale.customers c
  WHERE c.shop_id = p_shop_id
  ORDER BY c.total_credit DESC;
END;
$$;

-- Read invoices for the calling tenant
CREATE OR REPLACE FUNCTION public.wh_get_invoices(p_shop_id UUID)
RETURNS TABLE (
  id UUID, customer_name TEXT, subtotal NUMERIC, past_due NUMERIC,
  grand_total NUMERIC, payment_mode TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.customer_name, i.subtotal, i.past_due,
         i.grand_total, i.payment_mode, i.created_at
  FROM wholesale.invoices i
  WHERE i.shop_id = p_shop_id
  ORDER BY i.created_at DESC;
END;
$$;

-- DANGER ZONE: Clear all wholesale data for a shop (owner-initiated)
CREATE OR REPLACE FUNCTION public.wh_clear_all_data(p_shop_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
BEGIN
  DELETE FROM wholesale.invoice_items WHERE invoice_id IN (
    SELECT id FROM wholesale.invoices WHERE shop_id = p_shop_id
  );
  DELETE FROM wholesale.invoices WHERE shop_id = p_shop_id;
  DELETE FROM wholesale.customers WHERE shop_id = p_shop_id;
  DELETE FROM wholesale.suppliers WHERE shop_id = p_shop_id;
  DELETE FROM wholesale.products WHERE shop_id = p_shop_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
