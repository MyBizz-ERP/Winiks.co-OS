import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { shops, products, customers, invoices, invoiceItems } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
        if (!shop) return NextResponse.json({ error: 'No shop found' }, { status: 404 })

        const { cart, customerId, customerName, discount, amountPaid, subtotal, netTotal, paymentMethod } = await req.json()

        let finalCustomerId = customerId
        if (customerId === 'NEW' && customerName) {
            const [cust] = await db.insert(customers).values({ shop_id: shop.id, name: customerName, old_balance: '0' }).returning({ id: customers.id })
            finalCustomerId = cust.id
        }

        if (!cart || cart.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

        // Calculate total COGS
        let totalCogs = 0
        for (const item of cart) {
            const [product] = await db.select({ buy_rate: products.buy_rate }).from(products)
                .where(and(eq(products.id, item.id), eq(products.shop_id, shop.id)))
            totalCogs += (parseFloat(product?.buy_rate || '0') * item.qty)
        }

        // Generate sequential invoice no
        const [seqResult] = await db.select({ maxSeq: sql<number>`COALESCE(MAX(invoice_no), 0)` }).from(invoices).where(eq(invoices.shop_id, shop.id))
        const nextSeq = (seqResult?.maxSeq || 0) + 1

        // Create invoice
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

        // 1. Bulk Insert Invoice Items Array
        const itemsToInsert = cart.map((item: any) => ({
            invoice_id: invoice.id,
            product_id: item.id,
            quantity: item.qty,
            rate: item.rate.toString(),
            total: (item.qty * item.rate).toString()
        }))

        if (itemsToInsert.length > 0) {
            await db.insert(invoiceItems).values(itemsToInsert)

            // 2. Atomic Stock Decrement (Concurrent Promise Arrays)
            await Promise.all(cart.map((item: any) =>
                db.update(products)
                    .set({ stock: sql`${products.stock} - ${item.qty}` })
                    .where(eq(products.id, item.id))
            ))
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
