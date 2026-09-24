-- =========================================================================
-- DATABASE POS TRANSACTION ENGINE: Partial Payments & Udhaari Math
-- =========================================================================

-- 1. ADD NEW COLUMNS TO INVOICES TO TRACK PARTIAL PAYMENTS
ALTER TABLE wholesale.invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE wholesale.invoices ADD COLUMN IF NOT EXISTS new_due_added NUMERIC(10, 2) DEFAULT 0;

-- 2. CREATE A SECURITY DEFINER RPC TO HANDLE THE POS TRANSACTION
CREATE OR REPLACE FUNCTION public.wh_complete_pos_transaction(
    p_shop_id UUID,
    p_customer_id TEXT, -- Might be a UUID string, or 'NEW_...' text
    p_customer_name TEXT,
    p_subtotal NUMERIC,
    p_past_due NUMERIC,
    p_grand_total NUMERIC,
    p_amount_paid NUMERIC,
    p_new_due_added NUMERIC,
    p_payment_mode TEXT,
    p_cart JSONB -- Array of { product_id, name, qty, price, total, unit }
) RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_actual_customer_id UUID := NULL;
    v_item JSONB;
BEGIN
    -- 1. Resolve Customer Identity
    IF p_customer_id IS NOT NULL AND p_customer_id != '' THEN
        IF p_customer_id LIKE 'NEW_%' THEN
            -- Create a new customer on the fly
            INSERT INTO wholesale.customers (shop_id, name, total_credit)
            VALUES (p_shop_id, p_customer_name, p_new_due_added)
            RETURNING id INTO v_actual_customer_id;
        ELSE
            v_actual_customer_id := p_customer_id::UUID;
            -- Update existing customer's Udhaari
            UPDATE wholesale.customers
            SET total_credit = total_credit + p_new_due_added
            WHERE id = v_actual_customer_id AND shop_id = p_shop_id;
        END IF;
    END IF;

    -- 2. Insert Invoice
    INSERT INTO wholesale.invoices (
        shop_id, customer_id, customer_name,
        subtotal, past_due, grand_total, amount_paid, new_due_added, payment_mode
    ) VALUES (
        p_shop_id, v_actual_customer_id, p_customer_name,
        p_subtotal, p_past_due, p_grand_total, p_amount_paid, p_new_due_added, p_payment_mode
    ) RETURNING id INTO v_invoice_id;

    -- 3. Insert Invoice Items and Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
    LOOP
        -- Insert Line Item
        INSERT INTO wholesale.invoice_items (
            invoice_id, product_id, product_name, quantity, unit_price, total_price, unit
        ) VALUES (
            v_invoice_id,
            (v_item->>'product_id')::UUID,
            v_item->>'name',
            (v_item->>'qty')::NUMERIC,
            (v_item->>'price')::NUMERIC,
            (v_item->>'total')::NUMERIC,
            v_item->>'unit'
        );

        -- Deduct Stock (Ensure it doesn't go below 0 optionally - here we just subtract)
        UPDATE wholesale.products
        SET current_stock = current_stock - (v_item->>'qty')::NUMERIC
        WHERE id = (v_item->>'product_id')::UUID AND shop_id = p_shop_id;
    END LOOP;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
