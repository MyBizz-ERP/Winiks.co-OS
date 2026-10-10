import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { purchaseBills, purchaseItems, products, suppliers } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: authData } = await supabase.auth.getUser()

        if (!authData?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get payload
        const { cart, supplierId, supplierName, billRef, totalAmount, amountPaid, paymentMethod } = await req.json()

        if (!cart || cart.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
        }

        const shopIdResponse = await db.query.shops.findFirst({
            where: (shops, { eq }) => eq(shops.owner_id, authData.user.id),
            columns: { id: true }
        })

        if (!shopIdResponse) {
            return NextResponse.json({ error: 'Tenant identity missing.' }, { status: 400 })
        }

        const shopId = shopIdResponse.id

        // Transaction Execution
        const result = await db.transaction(async (tx) => {

            // 1. Resolve Supplier
            let targetSupplierId = supplierId
            if (supplierId === 'NEW' || !supplierId) {
                const [newSupp] = await tx.insert(suppliers).values({
                    shop_id: shopId,
                    name: supplierName || 'Local Vendor'
                }).returning({ id: suppliers.id })
                targetSupplierId = newSupp.id
            }

            // 2. Create Purchase Bill
            const [seqResult] = await tx.select({ maxSeq: sql<number>`COALESCE(MAX(purchase_no), 0)` }).from(purchaseBills).where(eq(purchaseBills.shop_id, shopId))
            const nextSeq = (seqResult?.maxSeq || 0) + 1

            const [newBill] = await tx.insert(purchaseBills).values({
                shop_id: shopId,
                purchase_no: nextSeq,
                supplier_id: targetSupplierId,
                total_amount: Math.round(totalAmount).toString(),
                amount_paid: Math.round(amountPaid).toString(),
                payment_method: paymentMethod || 'CASH',
                // could add bill_ref if added to schema, otherwise ignore for now
            }).returning({ id: purchaseBills.id, purchase_no: purchaseBills.purchase_no })

            // 3. Process Items & Update Inventory (Concurrent Array Mapping)
            const mapPromises = cart.map(async (item: any) => {
                let targetProductId = item.productId

                if (item.isNew || !targetProductId) {
                    const [newProd] = await tx.insert(products).values({
                        shop_id: shopId,
                        name: item.name,
                        name_mr: item.name_mr,
                        buy_rate: item.buy_rate.toString(),
                        sell_rate: item.sell_rate.toString(),
                        wholesale_rate: item.sell_rate.toString(),
                        stock: item.qty
                    }).returning({ id: products.id })
                    targetProductId = newProd.id
                } else {
                    await tx.update(products).set({
                        stock: sql`${products.stock} + ${item.qty}`,
                        buy_rate: item.buy_rate.toString(),
                        sell_rate: item.sell_rate.toString()
                    }).where(eq(products.id, targetProductId))
                }

                return {
                    purchase_bill_id: newBill.id,
                    product_id: targetProductId,
                    quantity: item.qty,
                    buy_rate: item.buy_rate.toString(),
                    sell_rate: item.sell_rate.toString(),
                    total_amount: item.total.toString(),
                }
            })

            const purchaseItemsArray = await Promise.all(mapPromises)

            // Execute isolated bulk insert bridging 1 query instead of N
            if (purchaseItemsArray.length > 0) {
                await tx.insert(purchaseItems).values(purchaseItemsArray)
            }

            // 4. Update Supplier Balance (Added/Subtracted Debt)
            const debtAdded = Math.round(totalAmount - amountPaid)
            const existingSupplier = await tx.query.suppliers.findFirst({
                where: (s, { eq }) => eq(s.id, targetSupplierId)
            })

            if (existingSupplier) {
                const oldBalance = parseFloat(existingSupplier.current_balance) || 0
                await tx.update(suppliers).set({
                    current_balance: (oldBalance + debtAdded).toString()
                }).where(eq(suppliers.id, targetSupplierId))
            }

            return { success: true, billId: newBill.id }
        })

        return NextResponse.json(result)

    } catch (e: any) {
        console.error('Purchase Checkout Error:', e)
        return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
    }
}
