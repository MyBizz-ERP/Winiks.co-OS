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
