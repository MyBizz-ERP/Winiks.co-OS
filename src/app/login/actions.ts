'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function loginTenant(formData: FormData) {
    const shopId = formData.get('shopId') as string
    const password = formData.get('password') as string

    if (!shopId || !password) return

    // Transparent ID to hidden Supabase entity mapper
    const email = `shop${shopId}@winiks.app`

    const supabase = await createClient()

    // 1. Authenticate credentials
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !authData.user) {
        redirect('/login?error=invalid_credentials')
    }

    // 2. Get the shop row for this user (RLS allows owner to read own row)
    const { data: shop } = await supabase
        .from('shops')
        .select('id, is_active, category_id')
        .eq('owner_id', authData.user.id)
        .single()

    if (!shop) redirect('/login?error=unauthorized_framework')
    if (!shop.is_active) redirect('/login?error=suspended')

    const slug = (shop.category_id ?? '').toLowerCase()

    // 3. Route to the correct ERP module
    if (slug.includes('wholesale')) {
        redirect('/erp/wholesale')
    } else if (slug.includes('salon')) {
        redirect('/erp/salon')
    } else {
        redirect('/login?error=unauthorized_framework')
    }
}
