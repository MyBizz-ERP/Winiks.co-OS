'use server'

import { db } from "@/db"
import { eq, inArray } from "drizzle-orm"
import { purchaseBills, purchaseItems, products, suppliers } from "@/db/schema/wholesale"
import { revalidatePath } from "next/cache"

export async function getPurchaseDetails(billId: string) {
    const baseBill = await db.select().from(purchaseBills).where(eq(purchaseBills.id, billId)).limit(1)
    if (!baseBill.length) return null

    const items = await db.select({
        id: purchaseItems.id,
        product_id: purchaseItems.product_id,
        name: products.name,
        name_mr: products.name_mr,
        qty: purchaseItems.quantity,
        rate: purchaseItems.buy_rate,
        total: purchaseItems.total_amount
    }).from(purchaseItems)
        .leftJoin(products, eq(purchaseItems.product_id, products.id))
        .where(eq(purchaseItems.purchase_bill_id, billId))

    let supplierName = 'Unknown Supplier'
    let supplierOldDue = 0
    if (baseBill[0].supplier_id) {
        const supp = await db.select().from(suppliers).where(eq(suppliers.id, baseBill[0].supplier_id)).limit(1)
        if (supp.length) {
            supplierName = supp[0].name
            supplierOldDue = parseFloat(supp[0].current_balance as string)
        }
    }

    return {
        bill: baseBill[0],
        items: items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) })),
        supplierName,
        supplierOldDue
    }
}

export async function updatePurchaseBill(billId: string, totalAmount: number, amountPaid: number) {
    const bill = await db.select().from(purchaseBills).where(eq(purchaseBills.id, billId)).limit(1)
    if (!bill.length) throw new Error("Purchase Bill not found")

    const oldAmountPaid = parseFloat(bill[0].amount_paid as string)
    const oldTotal = parseFloat(bill[0].total_amount as string)

    const oldDebtCreated = oldTotal - oldAmountPaid > 0 ? oldTotal - oldAmountPaid : 0
    const newDebtCreated = totalAmount - amountPaid > 0 ? totalAmount - amountPaid : 0

    await db.update(purchaseBills).set({
        total_amount: totalAmount.toString(),
        amount_paid: amountPaid.toString()
    }).where(eq(purchaseBills.id, billId))

    if (bill[0].supplier_id && (oldDebtCreated !== newDebtCreated)) {
        const debtDelta = newDebtCreated - oldDebtCreated
        const s = await db.select().from(suppliers).where(eq(suppliers.id, bill[0].supplier_id)).limit(1)
        if (s.length) {
            const currentBal = parseFloat(s[0].current_balance as string)
            await db.update(suppliers).set({
                current_balance: (currentBal + debtDelta).toString()
            }).where(eq(suppliers.id, bill[0].supplier_id))
        }
    }
    revalidatePath('/erp/wholesale/ap')
    return { success: true }
}

export async function updateSupplierProfile(supplierId: string, formData: FormData) {
    const name = formData.get('name')?.toString()
    const phone = formData.get('phone')?.toString() || null
    const balance = formData.get('balance')?.toString() || '0'
    if (!name) throw new Error('Supplier name is required')
    await db.update(suppliers).set({ name, phone, current_balance: balance }).where(eq(suppliers.id, supplierId))
    revalidatePath('/erp/wholesale/ap')
    revalidatePath('/erp/wholesale/purchase')
}

export async function archivePurchaseBills(billIds: string[]) {
    if (!billIds || billIds.length === 0) return;
    await db.update(purchaseBills).set({ is_archived: true }).where(inArray(purchaseBills.id, billIds));
    revalidatePath("/erp/wholesale/ap");
    revalidatePath("/erp/wholesale/vault");
    revalidatePath("/erp/wholesale");
}
