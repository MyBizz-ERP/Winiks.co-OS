-- =========================================================================
-- DATABASE PATCH: Phase 2E - Invoice Item Fetching (HOTFIX)
-- Corrected column alias mapping from the raw schema to the frontend POS shape
-- =========================================================================

CREATE OR REPLACE FUNCTION public.wh_get_invoice_items(
    p_shop_id UUID,
    p_invoice_id UUID
) RETURNS TABLE (
    id UUID,
    product_name TEXT,
    qty NUMERIC,
    price NUMERIC,
    total NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ii.id,
        ii.product_name,
        ii.quantity AS qty,
        ii.unit_price AS price,
        ii.total_price AS total
    FROM wholesale.invoice_items ii
    WHERE ii.invoice_id = p_invoice_id 
    -- Double verification to prevent tenant spoofing
    AND ii.invoice_id IN (SELECT i.id FROM wholesale.invoices i WHERE i.shop_id = p_shop_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
