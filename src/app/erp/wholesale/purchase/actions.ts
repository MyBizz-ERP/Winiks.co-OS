'use server'

import { db } from "@/db"
import { eq, and } from "drizzle-orm"
import { purchaseBills, purchaseItems, products, suppliers } from "@/db/schema/wholesale"
import { shops } from "@/db/schema/admin"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function voidAndClonePurchaseBill(purchaseBillId: string) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error('Unauthorized')

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error('No shop bound.')

    // 1. Fetch Purchase Bill
    const [bill] = await db.select()
        .from(purchaseBills)
        .where(and(eq(purchaseBills.id, purchaseBillId), eq(purchaseBills.shop_id, shop.id)))
        .limit(1)

    if (!bill) throw new Error('Purchase bill not found or does not belong to your shop.')

    // 2. Fetch purchase items
    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchase_bill_id, purchaseBillId))

    // 3. Transactionally reverse stock, reverse supplier balance, build clone payload, and delete bill
    const payload = await db.transaction(async (tx) => {
        // A. Reverse stock increment (decrement products.stock by purchased quantity)
        for (const item of items) {
            const [prod] = await tx.select().from(products).where(eq(products.id, item.product_id)).limit(1)
            if (prod) {
                const currentStock = prod.stock || 0
                const updatedStock = Math.max(0, currentStock - item.quantity)
                await tx.update(products).set({ stock: updatedStock }).where(eq(products.id, item.product_id))
            }
        }

        // B. Reverse Supplier Balance
        let supplierPayload: any = null
        if (bill.supplier_id) {
            const [supp] = await tx.select().from(suppliers).where(eq(suppliers.id, bill.supplier_id)).limit(1)
            if (supp) {
                const debtAdded = Math.round(parseFloat(bill.total_amount || '0') - parseFloat(bill.amount_paid || '0'))
                const currentBal = parseFloat(supp.current_balance || '0')
                const newBal = currentBal - debtAdded
                await tx.update(suppliers).set({ current_balance: newBal.toString() }).where(eq(suppliers.id, supp.id))
                supplierPayload = {
                    id: supp.id,
                    name: supp.name,
                    current_balance: newBal.toString()
                }
            }
        }

        // C. Build Cart Items payload for Kharedi Clone
        const cartPayload = await Promise.all(items.map(async (i) => {
            const [p] = await tx.select().from(products).where(eq(products.id, i.product_id)).limit(1)
            return {
                tempId: crypto.randomUUID(),
                productId: i.product_id,
                name: p?.name || 'Item',
                name_mr: p?.name_mr || '',
                buy_rate: parseFloat(i.buy_rate),
                sell_rate: parseFloat(i.sell_rate || p?.sell_rate || '0'),
                wholesale_rate: p?.wholesale_rate ? parseFloat(p.wholesale_rate) : parseFloat(i.sell_rate || '0'),
                min_wholesale_qty: p?.min_wholesale_qty ?? 12,
                qty: i.quantity,
                total: parseFloat(i.total_amount),
                isNew: false
            }
        }))

        // D. Delete purchase items & bill
        await tx.delete(purchaseItems).where(eq(purchaseItems.purchase_bill_id, purchaseBillId))
        await tx.delete(purchaseBills).where(eq(purchaseBills.id, purchaseBillId))

        return {
            selectedSupplier: supplierPayload,
            cart: cartPayload,
            amountPaid: bill.amount_paid,
            billRef: bill.purchase_no ? `KHAREDI-P0${bill.purchase_no.toString().padStart(3, '0')}` : bill.id.slice(0, 8).toUpperCase(),
            paymentMethod: bill.payment_method || 'CASH'
        }
    })

    revalidatePath('/erp/wholesale/purchase/history')
    revalidatePath('/erp/wholesale/purchase')
    revalidatePath('/erp/wholesale/inventory')
    revalidatePath('/erp/wholesale/suppliers')
    revalidatePath('/erp/wholesale/ap')
    revalidatePath('/erp/wholesale/vault')

    return { success: true, payload }
}
