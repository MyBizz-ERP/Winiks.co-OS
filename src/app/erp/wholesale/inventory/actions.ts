'use server'

import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function uploadInventoryCsv(formData: FormData) {
    const file = formData.get('csv_file') as File
    if (!file || file.size === 0) return { error: 'No file uploaded' }

    // 1. Verify Tenant Identity
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized Security Breach' }

    // 2. Fetch Verified Shop Access
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Tenant record not found' }

    try {
        const text = await file.text()

        // Parse generic CSV respecting newlines
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0)

        const productsToInsert = []

        // Loop mapping to the template: Name,Barcode,BuyPrice,SellPrice,Stock,Unit,MinAlert
        // Starting at 1 to skip the Header row!
        for (let i = 1; i < rows.length; i++) {
            const columns = rows[i].split(',')
            if (columns.length >= 7) {
                productsToInsert.push({
                    shop_id: shop.id, // Strictly locking the inventory to this specific owner
                    name: columns[0].replace(/"/g, '').trim(),
                    barcode: columns[1].replace(/"/g, '').trim() || `GEN-${Date.now()}-${i}`,
                    buying_price: parseFloat(columns[2]) || 0,
                    selling_price: parseFloat(columns[3]) || 0,
                    current_stock: parseFloat(columns[4]) || 0,
                    unit: columns[5].replace(/"/g, '').trim().toUpperCase() || 'PCS',
                    min_stock_alert: parseFloat(columns[6]) || 5
                })
            }
        }

        if (productsToInsert.length === 0) return { error: 'No valid products could be extracted.' }

        // 3. Batch Insert into the strictly isolated `wholesale` Database Space
        // Using Admin Bypasser because RLS on cross-schema table insertion can sometimes throw edge-case errors before policies are perfectly tuned. The Tenant lock is enforced directly by `shop_id` mapped from auth in Step 2.
        const { error: insertError } = await supabaseAdmin.schema('wholesale').from('products').insert(productsToInsert)

        if (insertError) {
            console.error("Database Injection Error:", insertError)
            return { error: 'Failed to inject payload into database.' }
        }

        // Standardize cache reload
        revalidatePath('/erp/wholesale/inventory')
        return { success: true }

    } catch (err) {
        console.error(err)
        return { error: 'Processing crash. Unreadable template format.' }
    }
}

export async function addProduct(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop config missing' }

    const name = formData.get('name') as string
    const barcode = formData.get('barcode') as string
    const buying_price = formData.get('buying_price') as string
    const selling_price = formData.get('selling_price') as string
    const current_stock = formData.get('current_stock') as string
    const unit = formData.get('unit') as string
    const min_stock_alert = formData.get('min_stock_alert') as string

    if (!name || name.trim() === '') return { error: 'Product name is required' }

    const { error: insertError } = await supabase.rpc('wh_add_product', {
        p_shop_id: shop.id,
        p_name: name,
        p_barcode: barcode || null,
        p_buying_price: buying_price ? parseFloat(buying_price) : 0,
        p_selling_price: selling_price ? parseFloat(selling_price) : 0,
        p_current_stock: current_stock ? parseFloat(current_stock) : 0,
        p_unit: unit || 'PCS',
        p_min_stock_alert: min_stock_alert ? parseFloat(min_stock_alert) : 5
    })

    if (insertError) {
        console.error("Add product error:", insertError)
        return { error: 'Failed to add product: ' + insertError.message }
    }

    revalidatePath('/erp/wholesale/inventory')
    return { success: true }
}
