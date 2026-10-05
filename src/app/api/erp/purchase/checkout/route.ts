import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { purchaseBills, purchaseItems, products, suppliers } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
            const [newBill] = await tx.insert(purchaseBills).values({
                shop_id: shopId,
                supplier_id: targetSupplierId,
                total_amount: totalAmount.toString(),
                amount_paid: amountPaid.toString(),
                payment_method: paymentMethod || 'CASH',
                // could add bill_ref if added to schema, otherwise ignore for now
            }).returning({ id: purchaseBills.id })

            // 3. Process Items & Update Inventory
            for (const item of cart) {
                let targetProductId = item.productId

                // If product is new, create it
                if (item.isNew || !targetProductId) {
                    const [newProd] = await tx.insert(products).values({
                        shop_id: shopId,
                        name: item.name,
                        name_mr: item.name_mr,
                        buy_rate: item.buy_rate.toString(),
                        sell_rate: item.sell_rate.toString(),
                        wholesale_rate: item.sell_rate.toString(), // Default equal to sell for now
                        stock: item.qty
                    }).returning({ id: products.id })

                    targetProductId = newProd.id
                } else {
                    // Existing product: fetch existing stock
                    const existingProduct = await tx.query.products.findFirst({
                        where: (p, { eq }) => eq(p.id, targetProductId)
                    })

                    if (existingProduct) {
                        await tx.update(products).set({
                            stock: existingProduct.stock + item.qty,
                            buy_rate: item.buy_rate.toString(),
                            sell_rate: item.sell_rate.toString()
                        }).where(eq(products.id, targetProductId))
                    }
                }

                // Insert purchase item line
                await tx.insert(purchaseItems).values({
                    purchase_bill_id: newBill.id,
                    product_id: targetProductId,
                    quantity: item.qty,
                    buy_rate: item.buy_rate.toString(),
                    sell_rate: item.sell_rate.toString(),
                    total_amount: item.total.toString(),
                })
            }

            // 4. Update Supplier Balance (Added/Subtracted Debt)
            const debtAdded = totalAmount - amountPaid
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
