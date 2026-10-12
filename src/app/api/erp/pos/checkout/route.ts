import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { shops, products, customers, invoices, invoiceItems } from '@/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
        if (!shop) return NextResponse.json({ error: 'No shop found' }, { status: 404 })

        const { cart, customerId, customerName, customerType, customerPhone, discount, amountPaid, subtotal, netTotal, paymentMethod } = await req.json()

        if (!cart || cart.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

        let finalCustomerId = customerId
        if (customerId === 'NEW' && customerName) {
            const [cust] = await db.insert(customers).values({
                shop_id: shop.id,
                name: customerName,
                customer_type: customerType || 'RETAIL',
                phone: customerPhone || null,
                old_balance: '0'
            }).returning({ id: customers.id })
            finalCustomerId = cust.id
        }

        // 1. ULTRA-FAST SINGLE-QUERY COGS CALCULATION (O(1) round-trip instead of N queries)
        const cartProductIds = cart.map((item: any) => item.id)
        const productRows = await db.select({ id: products.id, buy_rate: products.buy_rate })
            .from(products)
            .where(and(inArray(products.id, cartProductIds), eq(products.shop_id, shop.id)))

        const buyRateMap = new Map<string, number>()
        productRows.forEach(p => {
            buyRateMap.set(p.id, parseFloat(p.buy_rate || '0'))
        })

        let totalCogs = 0
        for (const item of cart) {
            const buyRate = buyRateMap.get(item.id) || 0
            totalCogs += buyRate * item.qty
        }

        // 2. Generate sequential invoice no
        const [seqResult] = await db.select({ maxSeq: sql<number>`COALESCE(MAX(invoice_no), 0)` })
            .from(invoices)
            .where(eq(invoices.shop_id, shop.id))
        const nextSeq = (seqResult?.maxSeq || 0) + 1

        // 3. Create invoice
        const [invoice] = await db.insert(invoices).values({
            shop_id: shop.id,
            invoice_no: nextSeq,
            customer_id: finalCustomerId === 'NEW' ? null : (finalCustomerId || null),
            subtotal: Math.round(subtotal).toString(),
            total_amount: Math.round(netTotal).toString(),
            discount: Math.round(discount).toString(),
            total_cogs: totalCogs.toString(),
            amount_paid: Math.round(amountPaid).toString(),
            payment_method: paymentMethod || 'CASH',
        }).returning({ id: invoices.id, invoice_no: invoices.invoice_no })

        // 4. Bulk Insert Invoice Items Array
        const itemsToInsert = cart.map((item: any) => ({
            invoice_id: invoice.id,
            product_id: item.id,
            quantity: item.qty,
            rate: item.rate.toString(),
            total: (item.qty * item.rate).toString()
        }))

        if (itemsToInsert.length > 0) {
            await db.insert(invoiceItems).values(itemsToInsert)

            // 5. Atomic Stock Decrements in single batch SQL query
            const caseStatements = cart.map((item: any) =>
                sql`WHEN id = ${item.id}::uuid THEN stock - ${Number(item.qty)}`
            )
            const idList = cart.map((item: any) => sql`${item.id}::uuid`)

            await db.execute(sql`
                UPDATE wholesale.products
                SET stock = CASE
                    ${sql.join(caseStatements, sql` `)}
                    ELSE stock
                END
                WHERE id IN (${sql.join(idList, sql`, `)}) AND shop_id = ${shop.id}::uuid
            `)
        }

        // Update customer Udhaari if linked
        if (finalCustomerId && finalCustomerId !== 'NEW') {
            const [cust] = await db.select({ old_balance: customers.old_balance }).from(customers)
                .where(and(eq(customers.id, finalCustomerId), eq(customers.shop_id, shop.id)))
            if (cust) {
                const prevBal = parseFloat(cust.old_balance)
                const unpaid = netTotal - amountPaid
                const newBalance = prevBal + unpaid
                await db.update(customers).set({ old_balance: newBalance.toString() })
                    .where(eq(customers.id, finalCustomerId))
            }
        }

        return NextResponse.json({ success: true, invoiceId: invoice.id })
    } catch (err: any) {
        console.error('POS Checkout Error:', err)
        return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
    }
}
