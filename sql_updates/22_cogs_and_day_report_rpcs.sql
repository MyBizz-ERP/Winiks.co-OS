-- =========================================================================
-- DATABASE POS TRANSACTION ENGINE V2: COGS (Cost of Goods Sold) Tracking
-- =========================================================================

-- 1. ADD COGS TRACKING COLUMNS TO INVOICES
ALTER TABLE wholesale.invoice_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE wholesale.invoice_items ADD COLUMN IF NOT EXISTS total_cost NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE wholesale.invoices ADD COLUMN IF NOT EXISTS total_cogs NUMERIC(10, 2) DEFAULT 0;

-- 2. REPLACE POS RPC TO INJECT COGS
CREATE OR REPLACE FUNCTION public.wh_complete_pos_transaction(
    p_shop_id UUID,
    p_customer_id TEXT,
    p_customer_name TEXT,
    p_subtotal NUMERIC,
    p_past_due NUMERIC,
    p_grand_total NUMERIC,
    p_amount_paid NUMERIC,
    p_new_due_added NUMERIC,
    p_payment_mode TEXT,
    p_cart JSONB
) RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_actual_customer_id UUID := NULL;
    v_item JSONB;
    v_total_cogs NUMERIC(10, 2) := 0;
BEGIN
    -- 1. Resolve Customer Identity
    IF p_customer_id IS NOT NULL AND p_customer_id != '' THEN
        IF p_customer_id LIKE 'NEW_%' THEN
            INSERT INTO wholesale.customers (shop_id, name, total_credit)
            VALUES (p_shop_id, p_customer_name, p_new_due_added)
            RETURNING id INTO v_actual_customer_id;
        ELSE
            v_actual_customer_id := p_customer_id::UUID;
            UPDATE wholesale.customers
            SET total_credit = total_credit + p_new_due_added
            WHERE id = v_actual_customer_id AND shop_id = p_shop_id;
        END IF;
    END IF;

    -- 2. First Pass: Calculate Total COGS from Cart payload
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        v_total_cogs := v_total_cogs + ((v_item->>'qty')::NUMERIC * (v_item->>'buy_rate')::NUMERIC);
    END LOOP;

    -- 3. Insert Invoice
    INSERT INTO wholesale.invoices (
        shop_id, customer_id, customer_name,
        subtotal, past_due, grand_total, amount_paid, new_due_added, payment_mode, total_cogs
    ) VALUES (
        p_shop_id, v_actual_customer_id, p_customer_name,
        p_subtotal, p_past_due, p_grand_total, p_amount_paid, p_new_due_added, p_payment_mode, v_total_cogs
    ) RETURNING id INTO v_invoice_id;

    -- 4. Insert Invoice Items and Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        INSERT INTO wholesale.invoice_items (
            invoice_id, product_id, product_name, quantity, unit_price, total_price, unit, unit_cost, total_cost
        ) VALUES (
            v_invoice_id,
            (v_item->>'product_id')::UUID,
            v_item->>'name',
            (v_item->>'qty')::NUMERIC,
            (v_item->>'price')::NUMERIC,
            (v_item->>'total')::NUMERIC,
            v_item->>'unit',
            (v_item->>'buy_rate')::NUMERIC,
            ((v_item->>'qty')::NUMERIC * (v_item->>'buy_rate')::NUMERIC)
        );

        UPDATE wholesale.products
        SET current_stock = current_stock - (v_item->>'qty')::NUMERIC
        WHERE id = (v_item->>'product_id')::UUID AND shop_id = p_shop_id;
    END LOOP;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
