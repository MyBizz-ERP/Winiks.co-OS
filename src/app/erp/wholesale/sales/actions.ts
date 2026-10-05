'use server'

import { db } from "@/db"
import { eq, inArray } from "drizzle-orm"
import { invoices, invoiceItems, products, customers } from "@/db/schema/wholesale"
import { shops } from "@/db/schema/admin"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getInvoiceDetails(invoiceId: string) {
    const baseInvoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
    if (!baseInvoice.length) return null

    const items = await db.select({
        id: invoiceItems.id,
        product_id: invoiceItems.product_id,
        name: products.name,
        name_mr: products.name_mr,
        qty: invoiceItems.quantity,
        rate: invoiceItems.rate,
        total: invoiceItems.total
    }).from(invoiceItems)
        .leftJoin(products, eq(invoiceItems.product_id, products.id))
        .where(eq(invoiceItems.invoice_id, invoiceId))

    let customerName = 'Walk-in Customer'
    let customerOldDue = 0
    if (baseInvoice[0].customer_id) {
        const cust = await db.select().from(customers).where(eq(customers.id, baseInvoice[0].customer_id)).limit(1)
        if (cust.length) {
            customerName = cust[0].name
            customerOldDue = parseFloat(cust[0].old_balance as string)
        }
    }

    return {
        invoice: baseInvoice[0],
        items: items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) })),
        customerName,
        customerOldDue
    }
}

export async function updateSalesInvoice(invoiceId: string, subtotal: number, discount: number, amountPaid: number, totalCogs: number) {
    const netTotal = subtotal - discount

    const inv = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
    if (!inv.length) throw new Error("Invoice not found")

    const oldAmountPaid = parseFloat(inv[0].amount_paid as string)
    const oldNetTotal = parseFloat(inv[0].total_amount as string)

    const oldDebtCreated = oldNetTotal - oldAmountPaid > 0 ? oldNetTotal - oldAmountPaid : 0
    const newDebtCreated = netTotal - amountPaid > 0 ? netTotal - amountPaid : 0

    await db.update(invoices).set({
        subtotal: subtotal.toString(),
        discount: discount.toString(),
        total_amount: netTotal.toString(),
        amount_paid: amountPaid.toString(),
        total_cogs: totalCogs.toString()
    }).where(eq(invoices.id, invoiceId))

    if (inv[0].customer_id && (oldDebtCreated !== newDebtCreated)) {
        const debtDelta = newDebtCreated - oldDebtCreated
        const c = await db.select().from(customers).where(eq(customers.id, inv[0].customer_id)).limit(1)
        if (c.length) {
            const currentBal = parseFloat(c[0].old_balance as string)
            await db.update(customers).set({
                old_balance: (currentBal + debtDelta).toString()
            }).where(eq(customers.id, inv[0].customer_id))
        }
    }

    revalidatePath('/erp/wholesale/sales')
    revalidatePath('/erp/wholesale/udhaari')
    return { success: true }
}

export async function archiveSalesBills(billIds: string[]) {
    if (!billIds || billIds.length === 0) return;
    await db.update(invoices).set({ is_archived: true }).where(inArray(invoices.id, billIds))
    revalidatePath('/erp/wholesale/sales')
    revalidatePath('/erp/wholesale/vault')
    revalidatePath('/erp/wholesale')
}

export async function voidAndCloneSalesInvoice(invoiceId: string) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) throw new Error('Unauthorized')

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) throw new Error('No shop bound.')

    // Get components
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1)
    if (!inv || inv.shop_id !== shop.id) throw new Error('Not found')

    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoice_id, invoiceId))

    // Reverse stock
    for (const item of items) {
        const [prod] = await db.select().from(products).where(eq(products.id, item.product_id))
        if (prod) {
            await db.update(products).set({ stock: (prod.stock || 0) + item.quantity }).where(eq(products.id, item.product_id))
        }
    }

    // Reverse Udhaari
    if (inv.customer_id) {
        const [cust] = await db.select().from(customers).where(eq(customers.id, inv.customer_id))
        if (cust) {
            const currentBal = parseFloat(cust.old_balance || '0')
            const netAmount = parseFloat(inv.total_amount || '0')
            const paidAmount = parseFloat(inv.amount_paid || '0')
            const unpaid = netAmount - paidAmount

            if (unpaid > 0) {
                const newBal = currentBal - unpaid
                await db.update(customers).set({ old_balance: newBal.toString() }).where(eq(customers.id, cust.id))
            }
        }
    }

    // Capture state for POS clone
    let customerPayload = null
    if (inv.customer_id) {
        const [cust] = await db.select().from(customers).where(eq(customers.id, inv.customer_id))
        customerPayload = cust
    }

    const payload = {
        customer: customerPayload,
        items: await Promise.all(items.map(async i => {
            const [p] = await db.select().from(products).where(eq(products.id, i.product_id))
            return {
                ...p,
                qty: i.quantity,
                rate: parseFloat(i.rate)
            }
        })),
        discount: parseFloat(inv.discount || '0'),
        amountPaid: inv.amount_paid
    }

    // Nuke original
    await db.delete(invoiceItems).where(eq(invoiceItems.invoice_id, invoiceId))
    await db.delete(invoices).where(eq(invoices.id, invoiceId))

    revalidatePath('/erp/wholesale/sales')
    revalidatePath('/erp/wholesale/pos')
    return { success: true, payload }
}

