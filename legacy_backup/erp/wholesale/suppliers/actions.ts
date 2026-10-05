'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addSupplier(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const company = formData.get('company') as string
    const total_payable_str = formData.get('total_payable') as string

    if (!name || name.trim() === '') return { error: 'Supplier Name is required' }

    const total_payable = total_payable_str ? parseFloat(total_payable_str) : 0

    const { error } = await supabase.rpc('wh_add_supplier', {
        p_shop_id: shop.id,
        p_name: name,
        p_phone: phone || null,
        p_company: company || null,
        p_total_payable: total_payable
    })

    if (error) {
        console.error("Add supplier error:", error)
        return { error: 'Failed to add supplier: ' + error.message }
    }

    revalidatePath('/erp/wholesale/suppliers')
    return { success: true }
}

export async function editSupplier(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const company = formData.get('company') as string
    const total_payable_str = formData.get('total_payable') as string

    if (!id || !name || name.trim() === '') return { error: 'Invalid data' }

    const total_payable = total_payable_str ? parseFloat(total_payable_str) : 0

    const { error } = await supabase.rpc('wh_edit_supplier', {
        p_shop_id: shop.id,
        p_supplier_id: id,
        p_name: name,
        p_phone: phone || null,
        p_company: company || null,
        p_total_payable: total_payable
    })

    if (error) {
        return { error: 'Failed to update supplier: ' + error.message }
    }

    revalidatePath('/erp/wholesale/suppliers')
    return { success: true }
}

export async function commitPurchaseBill(payload: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    // payload includes { supplier_id (optional), supplier_name, subtotal, payment_mode, notes, items }
    const { error } = await supabase.rpc('wh_commit_purchase_bill', {
        p_shop_id: shop.id,
        p_supplier_id: payload.supplier_id || null,
        p_supplier_name: payload.supplier_name,
        p_subtotal: payload.subtotal,
        p_payment_mode: payload.payment_mode || 'cash',
        p_notes: payload.notes || null,
        p_items: payload.items
    })

    if (error) {
        console.error("Purchase bill error:", error)
        return { error: 'Failed to commit purchase: ' + error.message }
    }

    revalidatePath('/erp/wholesale/suppliers')
    revalidatePath('/erp/wholesale/inventory')
    return { success: true }
}

export async function recordSupplierPayment(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const supplier_id = formData.get('supplier_id') as string
    const amount_str = formData.get('amount') as string
    const payment_mode = formData.get('payment_mode') as string || 'cash'
    const notes = formData.get('notes') as string || ''

    const amount = amount_str ? parseFloat(amount_str) : 0
    if (!supplier_id || amount <= 0) return { error: 'Invalid payment amount' }

    const { error: rpcError } = await supabase.rpc('wh_record_supplier_payment', {
        p_shop_id: shop.id,
        p_supplier_id: supplier_id,
        p_amount_paid: amount,
        p_payment_mode: payment_mode,
        p_notes: notes
    })

    if (rpcError) {
        console.error("Supplier payment error:", rpcError)
        return { error: 'Failed to record payment: ' + rpcError.message }
    }

    revalidatePath('/erp/wholesale/suppliers')
    revalidatePath('/erp/wholesale/reports')
    return { success: true }
}
