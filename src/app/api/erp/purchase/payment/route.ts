import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { shops, suppliers, supplierPayments } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
        if (!shop) return NextResponse.json({ error: 'No shop found' }, { status: 404 })

        const { supplierId, amount } = await req.json()
        if (!supplierId || !amount) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

        const [sup] = await db.select({ current_balance: suppliers.current_balance })
            .from(suppliers)
            .where(and(eq(suppliers.id, supplierId), eq(suppliers.shop_id, shop.id)))

        if (!sup) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })

        const prevBal = parseFloat(sup.current_balance)
        const newBalance = Math.max(0, prevBal - amount)

        // Drizzle Transaction to ensure both update and log happen safely
        await db.transaction(async (tx) => {
            await tx.update(suppliers)
                .set({ current_balance: newBalance.toString() })
                .where(and(eq(suppliers.id, supplierId), eq(suppliers.shop_id, shop.id)))

            await tx.insert(supplierPayments).values({
                shop_id: shop.id,
                supplier_id: supplierId,
                amount: amount.toString()
            })
        })

        return NextResponse.json({ success: true, newBalance })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
