'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'

async function getShopId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { supabase: null, shopId: null }
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    return { supabase, shopId: shop?.id ?? null }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UPLOAD: PRODUCTS (via RPC - bypasses schema restriction)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function uploadProductsCsv(formData: FormData) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    const file = formData.get('csv_file') as File
    if (!file || file.size === 0) return { error: 'No file selected.' }

    const text = await file.text()
    const { data: rows, errors } = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (errors.length > 0) return { error: `CSV parse error: ${errors[0].message}` }

    const records = (rows as any[]).map(r => ({
        name: r['Product Name']?.trim() || r['name']?.trim(),
        barcode: r['Barcode']?.trim() || r['barcode']?.trim() || '',
        buying_price: parseFloat(r['Buy Price'] || r['buying_price']) || 0,
        selling_price: parseFloat(r['Sell Price'] || r['selling_price']) || 0,
        current_stock: parseFloat(r['Current Stock'] || r['current_stock']) || 0,
        unit: r['Unit']?.trim() || r['unit']?.trim() || 'PCS',
        min_stock_alert: parseFloat(r['Min Stock Alert'] || r['min_stock_alert']) || 5,
    })).filter(r => r.name)

    if (records.length === 0) return { error: 'No valid rows found. Check your column headers match the template exactly.' }

    const { data, error } = await supabase.rpc('wh_insert_products', {
        p_shop_id: shopId,
        p_records: records
    })

    if (error) return { error: `Upload failed: ${error.message}` }

    revalidatePath('/erp/wholesale/inventory')
    return { success: true, count: data as number }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UPLOAD: CUSTOMERS (via RPC)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function uploadCustomersCsv(formData: FormData) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    const file = formData.get('csv_file') as File
    if (!file || file.size === 0) return { error: 'No file selected.' }

    const text = await file.text()
    const { data: rows } = Papa.parse(text, { header: true, skipEmptyLines: true })

    const records = (rows as any[]).map(r => ({
        name: r['Customer Name']?.trim() || r['name']?.trim(),
        phone: r['Phone']?.trim() || r['phone']?.trim() || '',
        total_credit: parseFloat(r['Udhaari Balance'] || r['total_credit']) || 0,
    })).filter(r => r.name)

    if (records.length === 0) return { error: 'No valid rows found.' }

    const { data, error } = await supabase.rpc('wh_insert_customers', {
        p_shop_id: shopId,
        p_records: records
    })

    if (error) return { error: `Upload failed: ${error.message}` }

    revalidatePath('/erp/wholesale/customers')
    return { success: true, count: data as number }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UPLOAD: SUPPLIERS (via RPC)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function uploadSuppliersCsv(formData: FormData) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    const file = formData.get('csv_file') as File
    if (!file || file.size === 0) return { error: 'No file selected.' }

    const text = await file.text()
    const { data: rows } = Papa.parse(text, { header: true, skipEmptyLines: true })

    const records = (rows as any[]).map(r => ({
        name: r['Supplier Name']?.trim() || r['name']?.trim(),
        phone: r['Phone']?.trim() || r['phone']?.trim() || '',
        company: r['Company']?.trim() || r['company']?.trim() || '',
        total_payable: parseFloat(r['Amount Owed'] || r['total_payable']) || 0,
    })).filter(r => r.name)

    if (records.length === 0) return { error: 'No valid rows found.' }

    const { data, error } = await supabase.rpc('wh_insert_suppliers', {
        p_shop_id: shopId,
        p_records: records
    })

    if (error) return { error: `Upload failed: ${error.message}` }

    return { success: true, count: data as number }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GHOST ARCHIVAL: EXPORT BILLS AS JSON
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function exportInvoicesAsJson(fromDate: string, toDate: string) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    // Cover the full end date (23:59:59)
    const start = new Date(fromDate).toISOString()
    const end = new Date(toDate)
    end.setHours(23, 59, 59, 999)

    const { data, error } = await supabase.rpc('wh_export_ghost_archive', {
        p_shop_id: shopId,
        p_start_date: start,
        p_end_date: end.toISOString()
    })

    if (error) {
        return { error: 'Postgres Extraction Error: ' + error.message }
    }

    return {
        shop_id: shopId,
        exported_at: new Date().toISOString(),
        date_range: { from: fromDate, to: toDate },
        invoices: data // This is the massive JSONB dump from Postgres
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GHOST ARCHIVAL: DELETE HISTORY RANGE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function deleteGhostArchive(fromDate: string, toDate: string) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    const start = new Date(fromDate).toISOString()
    const end = new Date(toDate)
    end.setHours(23, 59, 59, 999)

    const { error } = await supabase.rpc('wh_delete_ghost_archive', {
        p_shop_id: shopId,
        p_start_date: start,
        p_end_date: end.toISOString()
    })

    if (error) return { error: error.message }

    revalidatePath('/erp/wholesale/invoices')
    return { success: true }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GHOST ARCHIVAL: RE-IMPORT JSON
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function importGhostArchive(jsonData: any) {
    const { supabase, shopId } = await getShopId()
    if (!supabase || !shopId) return { error: 'Authentication failed.' }

    if (!jsonData || !jsonData.invoices || !Array.isArray(jsonData.invoices)) {
        return { error: 'Invalid Archive File Format. Missing invoices array.' }
    }

    const { error } = await supabase.rpc('wh_reimport_ghost_archive', {
        p_shop_id: shopId,
        p_payload: jsonData.invoices
    })

    if (error) return { error: error.message }

    revalidatePath('/erp/wholesale/invoices')
    return { success: true }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UPDATE: OWNER PIN (for Day-End Reports access)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function updateOwnerPin(formData: FormData) {
    'use server'
    const newPin = formData.get('new_pin') as string
    const confirmPin = formData.get('confirm_pin') as string

    if (!newPin || !/^[0-9]{4,8}$/.test(newPin)) {
        return { error: 'PIN must be 4 to 8 numeric digits only.' }
    }
    if (newPin !== confirmPin) {
        return { error: 'PINs do not match. Please try again.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop not found.' }

    const { error } = await supabase.rpc('wh_update_owner_pin', {
        p_shop_id: shop.id,
        p_new_pin: newPin
    })
    if (error) {
        // Fallback: direct update if RPC not available yet (before migration)
        const { error: updError } = await supabase
            .from('shops')
            .update({ owner_pin: newPin })
            .eq('id', shop.id)
        if (updError) return { error: updError.message }
    }

    return { success: true }
}

// ─────────────────────────────────────────
// UPDATE: SHOP IDENTITY (LOCALIZATION)
// ─────────────────────────────────────────
export async function updateShopIdentity(formData: FormData) {
    'use server'
    const shop_name_mr = formData.get('shop_name_mr') as string
    const address = formData.get('address') as string
    const address_mr = formData.get('address_mr') as string
    const phone_number = formData.get('phone_number') as string

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) return { error: 'Shop not found.' }

    const { error } = await supabase
        .from('shops')
        .update({
            shop_name_mr: shop_name_mr || null,
            address: address || null,
            address_mr: address_mr || null,
            phone_number: phone_number || null
        })
        .eq('id', shop.id)

    if (error) return { error: error.message }
    return { success: true }
}

