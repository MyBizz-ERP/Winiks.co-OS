'use server'

import { db } from "@/db"
import { customers, shops, invoices } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function addManualUdhaariDebt(customerId: string, amount: number) {
    if (!amount || amount <= 0) throw new Error('Invalid Debt Amount')

    // Auth security
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("Shop isolation boundary violation")

    // Insert dummy invoice for Vault reporting
    await db.insert(invoices).values({
        shop_id: shop.id,
        customer_id: customerId,
        subtotal: amount.toString(),
        total_amount: amount.toString(),
        amount_paid: "0",
        discount: "0",
        total_cogs: "0",
        payment_method: "CASH"
    })

    // Find the customer
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId))
    if (!customer) throw new Error("Customer not found")

    const newBalance = parseFloat(customer.old_balance) + amount
    await db.update(customers).set({ old_balance: newBalance.toString() }).where(eq(customers.id, customerId))

    revalidatePath("/erp/wholesale/udhaari")
    return { success: true }
}

export async function createManualCustomer(formData: FormData) {
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const oldBalance = parseFloat(formData.get('oldBalance') as string) || 0

    if (!name) throw new Error("Customer Name is required")

    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error("Unauthorized")

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error("Shop isolation boundary violation")

    await db.insert(customers).values({
        shop_id: shop.id,
        name,
        phone,
        old_balance: oldBalance.toString()
    })

    revalidatePath("/erp/wholesale/udhaari")
    return { success: true }
}
