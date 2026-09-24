-- =========================================================================
-- DATABASE PATCH: Phase 2 RPC Tunnels for Cross-Schema API Insertions
-- By default, Supabase REST only exposes the 'public' schema.
-- Rather than forcing the admin to reconfigure web dashboard API settings,
-- we use these Public RPC endpoints to securely tunnel data into the Vault.
-- =========================================================================

-- 1. Single Product Insertion Tunnel
CREATE OR REPLACE FUNCTION public.wh_add_product(
    p_shop_id UUID,
    p_name TEXT,
    p_barcode TEXT,
    p_buying_price NUMERIC,
    p_selling_price NUMERIC,
    p_current_stock NUMERIC,
    p_unit TEXT,
    p_min_stock_alert NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO wholesale.products (
        shop_id, name, barcode, buying_price, selling_price, current_stock, unit, min_stock_alert
    ) VALUES (
        p_shop_id, p_name, p_barcode, p_buying_price, p_selling_price, p_current_stock, p_unit, p_min_stock_alert
    ) RETURNING id INTO v_new_id;
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Single Customer Insertion Tunnel
CREATE OR REPLACE FUNCTION public.wh_add_customer(
    p_shop_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_total_credit NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO wholesale.customers (
        shop_id, name, phone, total_credit
    ) VALUES (
        p_shop_id, p_name, p_phone, p_total_credit
    ) RETURNING id INTO v_new_id;
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bulk CSV Initialization Tunnels
CREATE OR REPLACE FUNCTION public.wh_bulk_insert_products(
    p_payload JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO wholesale.products (shop_id, name, barcode, buying_price, selling_price, current_stock, unit, min_stock_alert)
    SELECT 
        (elem->>'shop_id')::UUID,
        elem->>'name',
        elem->>'barcode',
        (elem->>'buying_price')::NUMERIC,
        (elem->>'selling_price')::NUMERIC,
        (elem->>'current_stock')::NUMERIC,
        elem->>'unit',
        (elem->>'min_stock_alert')::NUMERIC
    FROM jsonb_array_elements(p_payload) AS elem;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.wh_bulk_insert_customers(
    p_payload JSONB
) RETURNS VOID AS $$
BEGIN
    INSERT INTO wholesale.customers (shop_id, name, phone, total_credit)
    SELECT 
        (elem->>'shop_id')::UUID,
        elem->>'name',
        elem->>'phone',
        (elem->>'total_credit')::NUMERIC
    FROM jsonb_array_elements(p_payload) AS elem;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
