-- =========================================================================
-- DATABASE PATCH: Phase 2 RPC Tunnels for Cross-Schema API Updates
-- To bypass the PostgREST schema lock for the Edit forms, we construct
-- specific UPDATE proxy functions that map to `wholesale.customers` 
-- and `wholesale.products`.
-- =========================================================================

-- 1. Edit Customer Tunnel
CREATE OR REPLACE FUNCTION public.wh_edit_customer(
    p_shop_id UUID,
    p_customer_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_total_credit NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE wholesale.customers
    SET 
        name = p_name,
        phone = p_phone,
        total_credit = p_total_credit
    WHERE 
        id = p_customer_id AND shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Edit Product Tunnel
CREATE OR REPLACE FUNCTION public.wh_edit_product(
    p_shop_id UUID,
    p_product_id UUID,
    p_name TEXT,
    p_barcode TEXT,
    p_buying_price NUMERIC,
    p_selling_price NUMERIC,
    p_current_stock NUMERIC,
    p_unit TEXT,
    p_min_stock_alert NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE wholesale.products
    SET 
        name = p_name,
        barcode = p_barcode,
        buying_price = p_buying_price,
        selling_price = p_selling_price,
        current_stock = p_current_stock,
        unit = p_unit,
        min_stock_alert = p_min_stock_alert
    WHERE 
        id = p_product_id AND shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
