-- ============================================================
-- RPC: Complete Purchase POS Transaction (Kharedi)
-- Automatically Upserts Inventory, Updates Supplier Ledgers,
-- and records the Purchase Bill in a single atomic sweep.
-- ============================================================
CREATE OR REPLACE FUNCTION public.wh_complete_purchase_transaction(
    p_shop_id UUID,
    p_supplier_id UUID,
    p_supplier_name TEXT,
    p_subtotal NUMERIC,
    p_amount_paid NUMERIC,
    p_new_due_added NUMERIC,
    p_payment_mode TEXT,
    p_cart JSONB,
    p_supplier_invoice_no TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
    new_purchase_id UUID;
    itm JSONB;
    v_product_id UUID;
BEGIN
    -- 1. Create the Purchase Bill record
    INSERT INTO wholesale.purchase_bills (
        shop_id, supplier_id, supplier_name, subtotal, payment_mode, supplier_invoice_no
    ) VALUES (
        p_shop_id, p_supplier_id, p_supplier_name, p_subtotal, p_payment_mode, p_supplier_invoice_no
    ) RETURNING id INTO new_purchase_id;

    -- 2. Process each item in the cart (Upsert Inventory & Log Item)
    FOR itm IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        -- Check if product exists by name in this shop
        SELECT id INTO v_product_id 
        FROM wholesale.products 
        WHERE shop_id = p_shop_id AND name = (itm->>'name')
        LIMIT 1;

        IF v_product_id IS NOT NULL THEN
            -- UPDATE existing product stock & rates
            UPDATE wholesale.products
            SET 
                current_stock = current_stock + (itm->>'qty')::NUMERIC,
                buying_price = (itm->>'buy_rate')::NUMERIC,
                selling_price = (itm->>'sell_rate')::NUMERIC,
                name_mr = COALESCE((itm->>'name_mr'), name_mr)
            WHERE id = v_product_id;
        ELSE
            -- INSERT new product directly from Kharedi POS
            INSERT INTO wholesale.products (
                shop_id, name, name_mr, unit, buying_price, selling_price, current_stock
            ) VALUES (
                p_shop_id, 
                (itm->>'name'), 
                (itm->>'name_mr'),
                COALESCE(itm->>'unit', 'PCS'),
                (itm->>'buy_rate')::NUMERIC,
                (itm->>'sell_rate')::NUMERIC,
                (itm->>'qty')::NUMERIC
            ) RETURNING id INTO v_product_id;
        END IF;

        -- INSERT the purchase_item line
        INSERT INTO wholesale.purchase_items (
            purchase_bill_id, product_id, product_name, quantity, unit_cost, total_cost
        ) VALUES (
            new_purchase_id,
            v_product_id,
            (itm->>'name'),
            (itm->>'qty')::NUMERIC,
            (itm->>'buy_rate')::NUMERIC,
            ((itm->>'qty')::NUMERIC * (itm->>'buy_rate')::NUMERIC)
        );
    END LOOP;

    -- 3. Update the Supplier's Udhaari (Accounts Payable 'Den')
    IF p_supplier_id IS NOT NULL AND p_new_due_added > 0 THEN
        UPDATE wholesale.suppliers
        SET total_payable = total_payable + p_new_due_added
        WHERE id = p_supplier_id;
    END IF;

    RETURN new_purchase_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
