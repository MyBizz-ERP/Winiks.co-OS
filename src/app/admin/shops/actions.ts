'use server'

import { supabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createShopAction(formData: FormData) {
    const shop_name = formData.get('shop_name') as string
    const owner_email = formData.get('owner_email') as string
    const category_id = formData.get('category_id') as string

    const address = formData.get('address') as string
    const whatsapp_number = formData.get('whatsapp_number') as string
    const google_review_link = formData.get('google_review_link') as string

    if (!shop_name || !owner_email || !category_id || !address || !whatsapp_number) return { error: 'Missing required fields' }

    const safeName = shop_name.replace(/\s+/g, '').substring(0, 6)
    const autoPassword = `${safeName}@123!`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: owner_email,
        password: autoPassword,
        email_confirm: true
    })

    if (authError || !authData.user) {
        console.error("Auth creation failed:", authError)
        return { error: `Auth Error: ${authError?.message}` }
    }

    const features = {
        has_gmb: formData.get('feature_gmb') === 'on',
        has_website: formData.get('feature_website') === 'on',
        has_barcode: formData.get('feature_barcode') === 'on',
        has_tax: formData.get('feature_tax') === 'on',
    }

    const { error: insertError } = await supabaseAdmin.from('shops').insert([{
        shop_name,
        owner_email,
        owner_id: authData.user.id,
        category_id,
        address,
        whatsapp_number,
        google_review_link,
        features,
        is_active: true
    }])

    if (insertError) {
        console.error("Insert error:", insertError)
        return { error: `DB Error: ${insertError.message}` }
    }

    revalidatePath('/admin/shops')
    revalidatePath('/admin/dashboard')

    // RETURNING RAW CREDS TO RENDER ON SCREEN
    return { success: true, email: owner_email, password: autoPassword }
}

export async function updateShopFeatures(formData: FormData) {
    const id = formData.get('id') as string
    if (!id) return

    const features = {
        has_gmb: formData.get('feature_gmb') === 'on',
        has_website: formData.get('feature_website') === 'on',
        has_barcode: formData.get('feature_barcode') === 'on',
        has_tax: formData.get('feature_tax') === 'on',
    }

    const is_active = formData.get('is_active') === 'on'

    await supabaseAdmin.from('shops').update({ features, is_active }).eq('id', id)

    revalidatePath(`/admin/shops/${id}`)
    revalidatePath('/admin/shops')
    redirect('/admin/shops')
}

export async function deleteShop(formData: FormData) {
    const id = formData.get('id') as string
    if (!id) return

    const { data: shop } = await supabaseAdmin.from('shops').select('owner_id').eq('id', id).single()

    await supabaseAdmin.from('shops').delete().eq('id', id)

    if (shop?.owner_id) {
        await supabaseAdmin.auth.admin.deleteUser(shop.owner_id)
    }

    revalidatePath('/admin/shops')
    revalidatePath('/admin/dashboard')
    redirect('/admin/shops')
}
