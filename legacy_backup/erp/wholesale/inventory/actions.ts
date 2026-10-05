'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function getShopId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { supabase: null, shopId: null }
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    return { supabase, shopId: shop?.id ?? null }
}

export async function addProductManual(formData: FormData) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    const name = formData.get('name') as string
    const name_mr = formData.get('name_mr') as string
    const barcode = formData.get('barcode') as string
    const buying_price = parseFloat(formData.get('buying_price') as string) || 0
    const selling_price = parseFloat(formData.get('selling_price') as string) || 0
    const current_stock = parseFloat(formData.get('current_stock') as string) || 0
    const min_stock_alert = parseFloat(formData.get('min_stock_alert') as string) || 5
    const unit = (formData.get('unit') as string) || 'PCS'

    if (!name?.trim()) return { error: 'Product Name (English) is required.' }

    // 🛡️ STRONG DUPLICATE GUARD: Check if exact name exists
    // Bypassing RLS here by using raw query might fail if RLS is strict, but server supabase client has service role? No, createClient uses user identity.
    // If the user is logged in, they can read 'products' for their shop_id.
    const { data: existing } = await supabase
        .from('products')
        .select('id')
        .ilike('name', `${name.trim()}`) // Case-insensitive exact match
        .eq('shop_id', shopId)
        .limit(1)

    if (existing && existing.length > 0) {
        return { error: `DUPLICATE REJECTED: A product named "${name}" already exists in your inventory.` }
    }

    // Insert new product
    // Fallback: If DB enforces RLS blocking writes except via RPC, we can use wh_insert_products RPC with 1 record.
    const { error } = await supabase.rpc('wh_insert_products', {
        p_shop_id: shopId,
        p_records: [{
            name: name.trim(),
            name_mr: name_mr?.trim() || null,
            barcode: barcode?.trim() || '',
            buying_price,
            selling_price,
            current_stock,
            unit,
            min_stock_alert
        }]
    })

    if (error) {
        return { error: 'Failed to add product: ' + error.message }
    }

    revalidatePath('/erp/wholesale/inventory')
    return { success: true }
}
export async function uploadInventoryCsv(formData: FormData) { return { error: 'CSV disabled' } }
