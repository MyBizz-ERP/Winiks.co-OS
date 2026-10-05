'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteSingleInvoiceAction(invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    // Hard delete. Due to ON DELETE CASCADE on invoice_items, children die too.
    // Due to lack of automated triggers, Stock and Udhaari remain exactly as they are!
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/erp/wholesale/invoices')
    return { success: true }
}

export async function reverseAndDestroyInvoiceAction(invoiceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'No active shop.' }

    const { error: rpcError } = await supabase.rpc('wh_reverse_invoice', {
        p_shop_id: shop.id,
        p_invoice_id: invoiceId
    })

    if (rpcError) {
        return { error: rpcError.message }
    }

    revalidatePath('/erp/wholesale/invoices')
    return { success: true }
}
