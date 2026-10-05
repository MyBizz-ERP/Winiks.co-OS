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
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("Tenant Not Found")

    if (type === 'udhaari') {
        const exist = await db.select().from(customers).where(eq(customers.shop_id, shop.id))
        const existNames = new Set(exist.map(e => e.name.toLowerCase()))

        const payload = rows
            .map(r => ({
                shop_id: shop.id,
                name: String(r.Name || 'Legacy Customer'),
                phone: r.Phone ? String(r.Phone) : null,
                old_balance: String(r.Old_Balance || '0')
            }))
            .filter(p => !existNames.has(p.name.toLowerCase()))

        if (payload.length > 0) {
            await db.insert(customers).values(payload)
        } else {
            throw new Error("No unique records found. Data may have been already imported.")
        }
    }

    if (type === 'payable') {
        const exist = await db.select().from(suppliers).where(eq(suppliers.shop_id, shop.id))
        const existNames = new Set(exist.map(e => e.name.toLowerCase()))

        const payload = rows
            .map(r => ({
                shop_id: shop.id,
                name: String(r.Name || 'Legacy Supplier'),
                phone: r.Phone ? String(r.Phone) : null,
                current_balance: String(r.Current_Balance || '0')
            }))
            .filter(p => !existNames.has(p.name.toLowerCase()))

        if (payload.length > 0) {
            await db.insert(suppliers).values(payload)
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
