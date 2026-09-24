-- =========================================================================
-- DATABASE PATCH: Phase 2D Udhaari Payment Ledger Schema
-- =========================================================================

-- 1. Create the Payment Ledger Table
CREATE TABLE IF NOT EXISTS wholesale.payment_ledger (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id   UUID NOT NULL REFERENCES wholesale.customers(id) ON DELETE CASCADE,
  amount_paid   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_mode  TEXT DEFAULT 'cash',
  notes         TEXT, -- Optional reference (e.g. cheque number)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enforce Row Level Security (Tenant Isolation)
ALTER TABLE wholesale.payment_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation: payment_ledger" ON wholesale.payment_ledger;
CREATE POLICY "Tenant isolation: payment_ledger" ON wholesale.payment_ledger
  FOR ALL USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- 3. Create the Database Transaction to Record Payments Atomically
CREATE OR REPLACE FUNCTION public.wh_record_udhaari_payment(
    p_shop_id UUID,
    p_customer_id UUID,
    p_amount_paid NUMERIC,
    p_payment_mode TEXT,
    p_notes TEXT
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_current_credit NUMERIC;
BEGIN
    -- A. Calculate the live Udhaari explicitly to ensure we never glitch
    SELECT total_credit INTO v_current_credit 
    FROM wholesale.customers 
    WHERE id = p_customer_id AND shop_id = p_shop_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found or access denied.';
    END IF;

    -- B. Insert the formal Ledger receipt
    INSERT INTO wholesale.payment_ledger (
        shop_id, customer_id, amount_paid, payment_mode, notes
    ) VALUES (
        p_shop_id, p_customer_id, p_amount_paid, p_payment_mode, p_notes
    ) RETURNING id INTO v_payment_id;

    -- C. Deduct the Cash received from their total Udhaari amount
    UPDATE wholesale.customers
    SET total_credit = v_current_credit - p_amount_paid
    WHERE id = p_customer_id AND shop_id = p_shop_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
