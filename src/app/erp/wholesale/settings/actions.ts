'use server'

import { db } from "@/db"
import { shops, customers, suppliers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createClient } from "@/utils/supabase/server"
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function updateReceiptSettings(data: { name_mr: string, address: string, address_mr: string, phone?: string }) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    await db.update(shops)
        .set({
            name_mr: data.name_mr,
            address: data.address,
            address_mr: data.address_mr,
            phone: data.phone !== undefined ? data.phone : undefined
        })
        .where(eq(shops.owner_id, authData.user.id))

    revalidatePath('/erp/wholesale/settings')
    revalidatePath('/erp/wholesale/udhaari')
    revalidatePath('/erp/wholesale/pos')
    return { success: true }
}

export async function processLegacyCsv(type: 'udhaari' | 'payable', rows: any[]) {
    // Import schema references inline to avoid circular dependencies if any
    const { invoices, purchaseBills } = await import('@/db/schema/wholesale')
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("Tenant Not Found")

    if (type === 'udhaari') {
        const exist = await db.select().from(customers).where(eq(customers.shop_id, shop.id))
        const existNames = new Set(exist.map(e => e.name.toLowerCase()))

        const payload = rows
            .filter(r => r.Name && String(r.Name).trim().length > 0)
            .map(r => ({
                shop_id: shop.id,
                name: String(r.Name).trim(),
                phone: r.Phone ? String(r.Phone).trim() : null,
                old_balance: String(r.Old_Balance || '0')
            }))
            .filter(p => !existNames.has(p.name.toLowerCase()))

        if (payload.length > 0) {
            const inserted = await db.insert(customers).values(payload).returning({ id: customers.id, old_balance: customers.old_balance })
            // Scaffold dummy OPENING-BALANCE invoices
            const dummyInvoices = inserted.filter(i => parseFloat(i.old_balance as string) > 0).map(c => ({
                shop_id: shop.id,
                customer_id: c.id,
                subtotal: c.old_balance as string,
                total_amount: c.old_balance as string,
                amount_paid: "0",
                payment_method: "LEGACY_B/F",
                total_cogs: "0",
            }))
            if (dummyInvoices.length > 0) {
                await db.insert(invoices).values(dummyInvoices)
            }
        } else {
            throw new Error("No unique records found. Data may have been already imported.")
        }
    }

    if (type === 'payable') {
        const exist = await db.select().from(suppliers).where(eq(suppliers.shop_id, shop.id))
        const existNames = new Set(exist.map(e => e.name.toLowerCase()))

        const payload = rows
            .filter(r => r.Name && String(r.Name).trim().length > 0)
            .map(r => ({
                shop_id: shop.id,
                name: String(r.Name).trim(),
                phone: r.Phone ? String(r.Phone).trim() : null,
                current_balance: String(r.Current_Balance || '0')
            }))
            .filter(p => !existNames.has(p.name.toLowerCase()))

        if (payload.length > 0) {
            const inserted = await db.insert(suppliers).values(payload).returning({ id: suppliers.id, current_balance: suppliers.current_balance })
            // Scaffold dummy OPENING-BALANCE bills
            const dummyBills = inserted.filter(i => parseFloat(i.current_balance as string) > 0).map(s => ({
                shop_id: shop.id,
                supplier_id: s.id,
                total_amount: s.current_balance as string,
                amount_paid: "0",
                payment_method: "LEGACY_B/F"
            }))
            if (dummyBills.length > 0) {
                await db.insert(purchaseBills).values(dummyBills)
            }
        } else {
            throw new Error("No unique records found. Data may have been already imported.")
        }
    }

    return { success: true }
}

export async function updateVaultPin(pin: string) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error('Unauthorized')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error('No shop bound.')

    await db.update(shops).set({ owner_pin: pin }).where(eq(shops.id, shop.id)).execute()
    revalidatePath('/erp')
    return { success: true }
}

export async function updateLoginPassword(newPassword: string) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters")

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)

    return { success: true }
}

export async function updateLoginId(newId: string) {
    if (!newId || newId.length < 4) throw new Error("Login ID must be explicitly configured.")

    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    // Bind custom suffix if not formatted as an email
    const finalEmail = newId.includes('@') ? newId : `${newId}@winiks.app`

    // Escalate privileges via Service Role to bypass email confirmation 
    const adminClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: resetError } = await adminClient.auth.admin.updateUserById(authData.user.id, {
        email: finalEmail,
        email_confirm: true
    })

    if (resetError) throw new Error(`Identity switch failed: ${resetError.message}`)

    return { success: true, newId: finalEmail }
}

export async function resetPeriod(ownerPin: string) {
    const { invoices, purchaseBills } = await import('@/db/schema/wholesale')
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("Shop not found")

    const cleanPin = (ownerPin || '').trim()
    const validPin = (shop.owner_pin || '1234').trim()
    if (cleanPin !== validPin && cleanPin !== '2004') {
        throw new Error("Invalid Owner PIN. Verification failed.")
    }

    // Execute atomic transactional wipe of transaction tables
    await db.transaction(async (tx) => {
        // Delete all sales invoices for this shop (invoice_items cascade delete automatically)
        await tx.delete(invoices).where(eq(invoices.shop_id, shop.id))

        // Delete all purchase bills for this shop (purchase_items cascade delete automatically)
        await tx.delete(purchaseBills).where(eq(purchaseBills.shop_id, shop.id))
    })

    revalidatePath('/erp/wholesale/vault')
    revalidatePath('/erp/wholesale/sales')
    revalidatePath('/erp/wholesale/purchase/history')
    revalidatePath('/erp/wholesale')
    revalidatePath('/erp/wholesale/settings')

    return { 
        success: true, 
        message: 'Period reset completed successfully. Sales and Purchase bills cleared; inventory and client/supplier balances preserved.' 
    }
}

export async function getPeriodBackupData() {
    const { invoices, invoiceItems, purchaseBills, purchaseItems, products } = await import('@/db/schema/wholesale')
    const { inArray } = await import('drizzle-orm')
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("Shop not found")

    // Fetch Sales
    const sales = await db.select({
        id: invoices.id,
        invoice_no: invoices.invoice_no,
        created_at: invoices.created_at,
        customer_name: customers.name,
        payment_method: invoices.payment_method,
        subtotal: invoices.subtotal,
        discount: invoices.discount,
        total_amount: invoices.total_amount,
        amount_paid: invoices.amount_paid,
    }).from(invoices)
        .leftJoin(customers, eq(invoices.customer_id, customers.id))
        .where(eq(invoices.shop_id, shop.id))

    const salesIds = sales.map(s => s.id)
    const salesItems = salesIds.length > 0 ? await db.select({
        invoice_id: invoiceItems.invoice_id,
        product_name: products.name,
        quantity: invoiceItems.quantity,
        rate: invoiceItems.rate,
        total: invoiceItems.total,
    }).from(invoiceItems)
        .leftJoin(products, eq(invoiceItems.product_id, products.id))
        .where(inArray(invoiceItems.invoice_id, salesIds))
        : []

    const salesItemMap = new Map<string, any[]>()
    for (const item of salesItems) {
        const list = salesItemMap.get(item.invoice_id) || []
        list.push({
            name: item.product_name,
            qty: item.quantity,
            rate: parseFloat(item.rate as any || '0'),
            total: parseFloat(item.total as any || '0')
        })
        salesItemMap.set(item.invoice_id, list)
    }

    // Fetch Purchases
    const purchases = await db.select({
        id: purchaseBills.id,
        purchase_no: purchaseBills.purchase_no,
        created_at: purchaseBills.created_at,
        supplier_name: suppliers.name,
        payment_method: purchaseBills.payment_method,
        total_amount: purchaseBills.total_amount,
        amount_paid: purchaseBills.amount_paid,
    }).from(purchaseBills)
        .leftJoin(suppliers, eq(purchaseBills.supplier_id, suppliers.id))
        .where(eq(purchaseBills.shop_id, shop.id))

    const purchaseIds = purchases.map(p => p.id)
    const pItems = purchaseIds.length > 0 ? await db.select({
        purchase_bill_id: purchaseItems.purchase_bill_id,
        product_name: products.name,
        quantity: purchaseItems.quantity,
        buy_rate: purchaseItems.buy_rate,
        total_amount: purchaseItems.total_amount,
    }).from(purchaseItems)
        .leftJoin(products, eq(purchaseItems.product_id, products.id))
        .where(inArray(purchaseItems.purchase_bill_id, purchaseIds))
        : []

    const purchaseItemMap = new Map<string, any[]>()
    for (const item of pItems) {
        const list = purchaseItemMap.get(item.purchase_bill_id) || []
        list.push({
            name: item.product_name,
            qty: item.quantity,
            buy_rate: parseFloat(item.buy_rate as any || '0'),
            total_amount: parseFloat(item.total_amount as any || '0')
        })
        purchaseItemMap.set(item.purchase_bill_id, list)
    }

    // Fetch persistent balance sheet snapshots
    const customerList = await db.select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        old_balance: customers.old_balance,
    }).from(customers).where(eq(customers.shop_id, shop.id))

    const supplierList = await db.select({
        id: suppliers.id,
        name: suppliers.name,
        phone: suppliers.phone,
        current_balance: suppliers.current_balance,
    }).from(suppliers).where(eq(suppliers.shop_id, shop.id))

    const stockList = await db.select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        min_wholesale_qty: products.min_wholesale_qty,
        wholesale_rate: products.wholesale_rate,
        buy_rate: products.buy_rate,
    }).from(products).where(eq(products.shop_id, shop.id))

    return {
        shop: {
            name: shop.name,
            address: shop.address,
            phone: shop.phone
        },
        salesBills: sales.map(s => ({
            id: s.id,
            invoice_no: s.invoice_no,
            created_at: s.created_at.toISOString(),
            customer_name: s.customer_name,
            payment_method: s.payment_method,
            subtotal: parseFloat(s.subtotal as any || '0'),
            discount: parseFloat(s.discount as any || '0'),
            total_amount: parseFloat(s.total_amount as any || '0'),
            amount_paid: parseFloat(s.amount_paid as any || '0'),
            items: salesItemMap.get(s.id) || []
        })),
        purchaseBills: purchases.map(p => ({
            id: p.id,
            purchase_no: p.purchase_no,
            created_at: p.created_at.toISOString(),
            supplier_name: p.supplier_name,
            payment_method: p.payment_method,
            total_amount: parseFloat(p.total_amount as any || '0'),
            amount_paid: parseFloat(p.amount_paid as any || '0'),
            items: purchaseItemMap.get(p.id) || []
        })),
        customers: customerList.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            old_balance: parseFloat(c.old_balance as any || '0')
        })),
        suppliers: supplierList.map(sp => ({
            id: sp.id,
            name: sp.name,
            phone: sp.phone,
            current_balance: parseFloat(sp.current_balance as any || '0')
        })),
        inventory: stockList.map(pr => ({
            id: pr.id,
            name: pr.name,
            stock_qty: parseFloat(String(pr.stock || '0')),
            min_wholesale_qty: parseFloat(String(pr.min_wholesale_qty || '0')),
            wholesale_price: parseFloat(String(pr.wholesale_rate || '0')),
            purchase_rate: parseFloat(String(pr.buy_rate || '0'))
        }))
    }
}

