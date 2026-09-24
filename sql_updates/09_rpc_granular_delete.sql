-- ============================================================
-- Granular Deletion RPC
-- Deletes invoices and their items between two dates for a specific shop
-- Does NOT affect stock or customer udhaari balances.
-- ============================================================

CREATE OR REPLACE FUNCTION public.wh_delete_invoices_range(p_shop_id UUID, p_start_date TIMESTAMP, p_end_date TIMESTAMP)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
  deleted_count INT := 0;
BEGIN
  -- We must get the count of invoices first
  SELECT COUNT(id) INTO deleted_count 
  FROM wholesale.invoices 
  WHERE shop_id = p_shop_id 
  AND created_at >= p_start_date 
  AND created_at <= p_end_date;

  -- Delete items first (Cascade should handle this but manual is safer)
  DELETE FROM wholesale.invoice_items 
  WHERE invoice_id IN (
    SELECT id FROM wholesale.invoices 
    WHERE shop_id = p_shop_id 
    AND created_at >= p_start_date 
    AND created_at <= p_end_date
  );

  -- Delete the invoices
  DELETE FROM wholesale.invoices 
  WHERE shop_id = p_shop_id 
  AND created_at >= p_start_date 
  AND created_at <= p_end_date;

  RETURN deleted_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
