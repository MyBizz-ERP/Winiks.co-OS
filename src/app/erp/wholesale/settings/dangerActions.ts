'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteInvoicesByDate(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string

    if (!startDate || !endDate) {
        return { error: 'Both start and end dates are required.' }
    }

    // Add time boundaries to dates (start of day to end of day)
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop not found.' }

    // Call the granular delete RPC
    const { error } = await supabase.rpc('wh_delete_ghost_archive', {
        p_shop_id: shop.id,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString()
    })

    if (error) return { error: `Delete failed: ${error.message}` }

    revalidatePath('/erp/wholesale/invoices')
    revalidatePath('/erp/wholesale/dashboard')

    return { success: true, message: `Successfully cleared invoice history for the chosen date range.` }
}
