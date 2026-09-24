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

// ─────────────────────────────────────────
// UPLOAD: PRODUCTS (via RPC - bypasses schema restriction)
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// UPLOAD: CUSTOMERS (via RPC)
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// UPLOAD: SUPPLIERS (via RPC)
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GHOST ARCHIVAL: EXPORT BILLS AS JSON
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GHOST ARCHIVAL: DELETE HISTORY RANGE
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// GHOST ARCHIVAL: RE-IMPORT JSON
// ─────────────────────────────────────────
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
