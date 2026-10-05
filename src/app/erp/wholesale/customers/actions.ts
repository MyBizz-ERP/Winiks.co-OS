'use server'

import { db } from '@/db'
import { shops, customers } from '@/db/schema'
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

export async function createCustomer(formData: FormData) {
    const shopId = await requireTenantLock()

    const name = formData.get('name')?.toString()
    const phone = formData.get('phone')?.toString() || null
    const oldBalanceStr = formData.get('old_balance')?.toString() || "0"

    if (!name) throw new Error("Customer name is mathematically required.")

    try {
        await db.insert(customers).values({
            shop_id: shopId,
            name,
            phone,
            old_balance: oldBalanceStr
        })
    } catch (e: any) {
        console.error(e)
        throw new Error("Failed to materialize customer payload.")
    }
    revalidatePath('/erp/wholesale/customers')
}

export async function deleteCustomer(customerId: string) {
    const shopId = await requireTenantLock()

    try {
        await db.delete(customers)
            .where(and(
                eq(customers.id, customerId),
                eq(customers.shop_id, shopId) // Double lock ensures you only delete your own customers
            ))
    } catch (e: any) {
        console.error(e)
        throw new Error("Failed to delete customer payload.")
    }
    revalidatePath('/erp/wholesale/customers')
}

export async function updateCustomer(customerId: string, formData: FormData) {
    const shopId = await requireTenantLock()

    const name = formData.get('name')?.toString()
    const phone = formData.get('phone')?.toString() || null
    const oldBalanceStr = formData.get('old_balance')?.toString() || '0'

    if (!name) throw new Error('Customer name is mathematically required.')

    try {
        await db.update(customers)
            .set({
                name,
                phone,
                old_balance: oldBalanceStr
            })
            .where(and(
                eq(customers.id, customerId),
                eq(customers.shop_id, shopId)
            ))
    } catch (e: any) {
        console.error(e)
        throw new Error('Failed to formally update customer.')
    }
    revalidatePath('/erp/wholesale/customers')
    revalidatePath('/erp/wholesale/udhaari')
}

