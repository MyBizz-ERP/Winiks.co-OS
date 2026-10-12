'use server'

import { db } from '@/db'
import { shops, customers } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

async function requireTenantLock() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("CRITICAL_LOCK: Unauthorized execution.")

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("CRITICAL_LOCK: Tenant isolation boundary violation.")
    return shop.id
}

export async function quickCreateCustomer(data: {
    name: string
    phone?: string | null
    customer_type?: 'RETAIL' | 'WHOLESALE'
    old_balance?: string | number
}) {
    const shopId = await requireTenantLock()
    if (!data.name || !data.name.trim()) throw new Error("Customer name is required.")

    const [newCustomer] = await db.insert(customers).values({
        shop_id: shopId,
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        customer_type: data.customer_type || 'RETAIL',
        old_balance: (data.old_balance || '0').toString()
    }).returning()

    revalidatePath('/erp/wholesale/pos')
    revalidatePath('/erp/wholesale/customers')

    return newCustomer
}
