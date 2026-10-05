import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { shops, customers, customerPayments } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
        if (!shop) return NextResponse.json({ error: 'No shop found' }, { status: 404 })

        const { customerId, amount } = await req.json()
        if (!customerId || !amount) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

        const [cust] = await db.select({ old_balance: customers.old_balance })
            .from(customers)
            .where(and(eq(customers.id, customerId), eq(customers.shop_id, shop.id)))

        if (!cust) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

        const prevBal = parseFloat(cust.old_balance)
        const newBalance = Math.max(0, prevBal - amount)

        // Drizzle Transaction to ensure both update and log happen safely
        await db.transaction(async (tx) => {
            await tx.update(customers)
                .set({ old_balance: newBalance.toString() })
                .where(and(eq(customers.id, customerId), eq(customers.shop_id, shop.id)))

            await tx.insert(customerPayments).values({
                shop_id: shop.id,
                customer_id: customerId,
                amount: amount.toString()
            })
        })

        return NextResponse.json({ success: true, newBalance })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
