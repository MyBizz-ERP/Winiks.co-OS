'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addDailyExpense(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const category = formData.get('category') as string
    const amount_str = formData.get('amount') as string
    const notes = formData.get('notes') as string || ''

    const amount = amount_str ? parseFloat(amount_str) : 0
    if (!category || amount <= 0) return { error: 'Invalid expense amount' }

    const { error: rpcError } = await supabase.rpc('wh_record_expense', {
        p_shop_id: shop.id,
        p_category: category,
        p_amount: amount,
        p_notes: notes
    })

    if (rpcError) {
        console.error("Expense error:", rpcError)
        return { error: 'Failed to record expense: ' + rpcError.message }
    }

    revalidatePath('/erp/wholesale/reports')
    return { success: true }
}
