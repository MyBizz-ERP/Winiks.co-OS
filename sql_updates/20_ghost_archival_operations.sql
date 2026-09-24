-- ============================================================
-- RPC: Delete Ghost Archive Range (Clear Sales History)
-- Deletes a specific timeframe of invoices. Because `invoice_items`
-- has ON DELETE CASCADE, all line items vanish instantly.
-- This does NOT restore stock or udhaari.
-- ============================================================
CREATE OR REPLACE FUNCTION public.wh_delete_ghost_archive(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
BEGIN
    DELETE FROM wholesale.invoices
    WHERE shop_id = p_shop_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date;
END;
$$;


-- ============================================================
-- RPC: Re-import Ghost Archive
-- Safely re-injects JSON payload into invoices & invoice_items
-- without triggering POS database stock/udhaari deduction math.
-- ============================================================
CREATE OR REPLACE FUNCTION public.wh_reimport_ghost_archive(
    p_shop_id UUID,
    p_payload JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
    inv JSONB;
    itm JSONB;
BEGIN
    FOR inv IN SELECT * FROM jsonb_array_elements(p_payload)
    LOOP
        -- Insert invoice, gracefully bypassing if it already exists (ON CONFLICT)
        INSERT INTO wholesale.invoices (
            id, shop_id, customer_name, subtotal, 
            past_due, grand_total, payment_mode, created_at
        ) 
        VALUES (
            (inv->>'id')::UUID,
            p_shop_id,
            inv->>'customer_name',
            COALESCE((inv->>'subtotal')::NUMERIC, 0),
            COALESCE((inv->>'past_due')::NUMERIC, 0),
            COALESCE((inv->>'grand_total')::NUMERIC, 0),
            COALESCE(inv->>'payment_mode', 'cash'),
            (inv->>'created_at')::TIMESTAMPTZ
        )
        ON CONFLICT (id) DO NOTHING;

        -- If it inserted or already existed, we must ensure items exist
        FOR itm IN SELECT * FROM jsonb_array_elements(inv->'items')
        LOOP
            -- We don't have UUIDs for items in JSON, so we just insert blindly
            -- Wait, to prevent duplication if invoice already exists, we should delete old items or simply 
            -- skip item insertion if invoice insertion was skipped.
            -- A simpler logic: Delete all items for this invoice ID if it exists, then re-insert to guarantee mirror matching.
            
            -- Flush any existing line items for clean slate
            DELETE FROM wholesale.invoice_items WHERE invoice_id = (inv->>'id')::UUID;

            INSERT INTO wholesale.invoice_items (
                invoice_id, product_name, quantity, unit_price, total_price
            ) VALUES (
                (inv->>'id')::UUID,
                itm->>'product_name',
                COALESCE((itm->>'qty')::NUMERIC, 0),
                COALESCE((itm->>'price')::NUMERIC, 0),
                COALESCE((itm->>'total')::NUMERIC, 0)
            );
        END LOOP;
        
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
