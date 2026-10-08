'use server'

import { db } from "@/db"
import { shops, customers, suppliers } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createClient } from "@/utils/supabase/server"

export async function updateReceiptSettings(data: { name_mr: string, address: string, address_mr: string }) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    await db.update(shops)
        .set({
            name_mr: data.name_mr,
            address: data.address,
            address_mr: data.address_mr,
        })
        .where(eq(shops.owner_id, authData.user.id))

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

    await db.update(shops).set({ owner_pin: pin }).where(eq(shops.id, shop.id))
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
    const { createClient: createServiceClient } = require('@supabase/supabase-js')
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
