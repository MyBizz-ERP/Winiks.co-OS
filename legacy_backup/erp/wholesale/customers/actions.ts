'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCustomer(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const name = formData.get('name') as string
    const phone_number = formData.get('phone_number') as string
    const total_credit_str = formData.get('total_credit') as string

    if (!name || name.trim() === '') return { error: 'Customer Name is required' }

    const total_credit = total_credit_str ? parseFloat(total_credit_str) : 0

    const { error: insertError } = await supabase.rpc('wh_add_customer', {
        p_shop_id: shop.id,
        p_name: name,
        p_phone: phone_number || null,
        p_total_credit: total_credit
    })

    if (insertError) {
        console.error("Add customer error:", insertError)
        return { error: 'Failed to add customer: ' + insertError.message }
    }

    revalidatePath('/erp/wholesale/customers')
    return { success: true }
}

export async function recordLedgerPayment(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const customer_id = formData.get('customer_id') as string
    const amount_paid_str = formData.get('amount_paid') as string
    const payment_mode = formData.get('payment_mode') as string || 'cash'
    const notes = formData.get('notes') as string

    if (!customer_id || !amount_paid_str) return { error: 'Missing required inputs' }

    const amount_paid = parseFloat(amount_paid_str)
    if (amount_paid <= 0) return { error: 'Amount must be greater than zero' }

    const { error: rpcError } = await supabase.rpc('wh_record_udhaari_payment', {
        p_shop_id: shop.id,
        p_customer_id: customer_id,
        p_amount_paid: amount_paid,
        p_payment_mode: payment_mode,
        p_notes: notes || null
    })

    if (rpcError) {
        console.error("Ledger payment error:", rpcError)
        return { error: 'Failed to record payment' }
    }

    revalidatePath('/erp/wholesale/customers')
    return { success: true }
}

export async function editCustomer(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const customer_id = formData.get('id') as string
    const name = formData.get('name') as string
    const phone_number = formData.get('phone_number') as string
    const total_credit_str = formData.get('total_credit') as string

    if (!customer_id) return { error: 'Customer ID missing' }
    if (!name || name.trim() === '') return { error: 'Customer Name is required' }

    const total_credit = total_credit_str ? parseFloat(total_credit_str) : 0

    const { error: updateError } = await supabase.rpc('wh_edit_customer', {
        p_shop_id: shop.id,
        p_customer_id: customer_id,
        p_name: name,
        p_phone: phone_number || null,
        p_total_credit: total_credit
    })

    if (updateError) {
        console.error("Edit customer error:", updateError)
        return { error: 'Failed to update customer: ' + updateError.message }
    }

    revalidatePath('/erp/wholesale/customers')
    return { success: true }
}
