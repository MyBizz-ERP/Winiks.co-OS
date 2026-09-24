-- ============================================================
-- RPC: Ghost Archival Generator (JSON Dump)
-- This function extracts a hierarchal JSON blob containing
-- invoices and their nested invoice_items within a date range.
-- ============================================================

CREATE OR REPLACE FUNCTION public.wh_export_ghost_archive(
    p_shop_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, wholesale
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', i.id,
            'customer_name', i.customer_name,
            'subtotal', i.subtotal,
            'past_due', i.past_due,
            'grand_total', i.grand_total,
            'payment_mode', i.payment_mode,
            'created_at', i.created_at,
            'items', COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'product_name', ii.product_name,
                        'qty', ii.quantity,
                        'price', ii.unit_price,
                        'total', ii.total_price
                    )
                )
                FROM wholesale.invoice_items ii
                WHERE ii.invoice_id = i.id
            ), '[]'::jsonb)
        )
    )
    INTO result
    FROM wholesale.invoices i
    WHERE i.shop_id = p_shop_id
      AND i.created_at >= p_start_date
      AND i.created_at <= p_end_date;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

NOTIFY pgrst, 'reload schema';
