'use server'

import { db } from '@/db'
import { shops, suppliers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// Strictly extracts the cryptographically isolated Tenant UUID based on Auth Token
async function requireTenantLock() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("CRITICAL_LOCK: Unauthorized execution.")

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("CRITICAL_LOCK: Tenant isolation boundary violation.")
    return shop.id
}

export async function createSupplier(formData: FormData) {
    const shopId = await requireTenantLock()

    const name = formData.get('name')?.toString()
    const phone = formData.get('phone')?.toString() || null
    const oldBalanceStr = formData.get('current_balance')?.toString() || "0"

    if (!name) throw new Error("Supplier name is mathematically required.")

    try {
        await db.insert(suppliers).values({
            shop_id: shopId,
            name,
            phone,
            current_balance: oldBalanceStr
        })
    } catch (e: any) {
        console.error(e)
        throw new Error("Failed to materialize supplier payload.")
    }
    revalidatePath('/erp/wholesale/suppliers')
}

export async function deleteSupplier(supplierId: string) {
    const shopId = await requireTenantLock()

    try {
        await db.delete(suppliers)
            .where(and(
                eq(suppliers.id, supplierId),
                eq(suppliers.shop_id, shopId) // Double lock ensures you only delete your own suppliers
            ))
    } catch (e: any) {
        console.error(e)
        throw new Error("Failed to delete supplier payload.")
    }
    revalidatePath('/erp/wholesale/suppliers')
}

export async function updateSupplier(supplierId: string, formData: FormData) {
    const shopId = await requireTenantLock()

    const name = formData.get('name')?.toString()
    const phone = formData.get('phone')?.toString() || null
    const oldBalanceStr = formData.get('current_balance')?.toString() || '0'

    if (!name) throw new Error('Supplier name is mathematically required.')

    try {
        await db.update(suppliers)
            .set({
                name,
                phone,
                current_balance: oldBalanceStr
            })
            .where(and(
                eq(suppliers.id, supplierId),
                eq(suppliers.shop_id, shopId)
            ))
    } catch (e: any) {
        console.error(e)
        throw new Error('Failed to formally update supplier.')
    }
    revalidatePath('/erp/wholesale/suppliers')
    revalidatePath('/erp/wholesale/udhaari')
}

