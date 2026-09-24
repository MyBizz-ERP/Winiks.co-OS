-- =========================================================================
-- DATABASE PATCH: Phase 2E Accounts Payable RPC Tunnels
-- To allow secure cross-schema operations on Suppliers and Purchase Bills
-- =========================================================================

-- 1. READ ALL SUPPLIERS
CREATE OR REPLACE FUNCTION public.wh_get_suppliers(p_shop_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, phone TEXT, company TEXT, total_payable NUMERIC, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, wholesale
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.phone, s.company, s.total_payable, s.created_at
  FROM wholesale.suppliers s
  WHERE s.shop_id = p_shop_id
  ORDER BY s.total_payable DESC;
END;
$$;

-- 2. CREATE A SUPPLIER
CREATE OR REPLACE FUNCTION public.wh_add_supplier(
    p_shop_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_company TEXT,
    p_total_payable NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    INSERT INTO wholesale.suppliers (shop_id, name, phone, company, total_payable)
    VALUES (p_shop_id, p_name, p_phone, p_company, p_total_payable)
    RETURNING id INTO v_new_id;
    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. EDIT A SUPPLIER (To fix typos or adjust manual payable)
CREATE OR REPLACE FUNCTION public.wh_edit_supplier(
    p_shop_id UUID,
    p_supplier_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_company TEXT,
    p_total_payable NUMERIC
) RETURNS VOID AS $$
BEGIN
    UPDATE wholesale.suppliers
    SET name = p_name, phone = p_phone, company = p_company, total_payable = p_total_payable
    WHERE id = p_supplier_id AND shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. COMMIT A PURCHASE BILL (Kharedi) + Atomically increase stock & supplier debts
CREATE OR REPLACE FUNCTION public.wh_commit_purchase_bill(
    p_shop_id UUID,
    p_supplier_id UUID, -- CAN BE NULL
    p_supplier_name TEXT, 
    p_subtotal NUMERIC,
    p_payment_mode TEXT,
    p_notes TEXT,
    p_items JSONB -- [{ product_id, product_name, quantity, unit_cost, total_cost }]
) RETURNS UUID AS $$
DECLARE
    v_bill_id UUID;
    v_item JSONB;
BEGIN
    -- 1. Create the Purchase Bill record
    INSERT INTO wholesale.purchase_bills (shop_id, supplier_id, supplier_name, subtotal, payment_mode, notes)
    VALUES (p_shop_id, p_supplier_id, p_supplier_name, p_subtotal, p_payment_mode, p_notes)
    RETURNING id INTO v_bill_id;

    -- 2. Loop through JSON array and insert items AND increase stock!
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO wholesale.purchase_items (purchase_bill_id, product_id, product_name, quantity, unit_cost, total_cost)
        VALUES (
            v_bill_id, 
            (v_item->>'product_id')::UUID, 
            v_item->>'product_name', 
            (v_item->>'quantity')::NUMERIC, 
            (v_item->>'unit_cost')::NUMERIC, 
            (v_item->>'total_cost')::NUMERIC
        );

        -- Crucially, increase inventory counts!
        UPDATE wholesale.products
        SET current_stock = current_stock + (v_item->>'quantity')::NUMERIC
        WHERE id = (v_item->>'product_id')::UUID AND shop_id = p_shop_id;
    END LOOP;

    -- 3. If credit purchase, increase Accounts Payable for the supplier
    IF p_payment_mode = 'credit' AND p_supplier_id IS NOT NULL THEN
        UPDATE wholesale.suppliers
        SET total_payable = total_payable + p_subtotal
        WHERE id = p_supplier_id AND shop_id = p_shop_id;
    END IF;

    RETURN v_bill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. READ PURCHASE BILLS (History of stock buying)
CREATE OR REPLACE FUNCTION public.wh_get_purchase_bills(p_shop_id UUID)
RETURNS TABLE (
  id UUID, supplier_name TEXT, subtotal NUMERIC, payment_mode TEXT, created_at TIMESTAMPTZ, item_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, wholesale
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pb.id, pb.supplier_name, pb.subtotal, pb.payment_mode, pb.created_at,
    (SELECT COUNT(pi.id) FROM wholesale.purchase_items pi WHERE pi.purchase_bill_id = pb.id) as item_count
  FROM wholesale.purchase_bills pb
  WHERE pb.shop_id = p_shop_id
  ORDER BY pb.created_at DESC;
END;
$$;
