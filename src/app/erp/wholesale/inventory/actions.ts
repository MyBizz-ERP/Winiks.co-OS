'use server'

import { db } from "@/db"
import { products, purchaseItems, purchaseBills, suppliers, invoiceItems } from "@/db/schema/wholesale"
import { shops } from "@/db/schema/admin"
import { createClient } from "@/utils/supabase/server"
import { eq, desc, inArray, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// High-Security Tenant Resolution Layer
async function getActiveShopId() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized Access")

    const shopRecord = await db.select().from(shops).where(eq(shops.owner_id, user.id)).limit(1)
    if (!shopRecord || shopRecord.length === 0) {
        throw new Error("No active shop found for this tenant")
    }
    return shopRecord[0].id
}

export async function getInventory() {
    try {
        const shopId = await getActiveShopId()
        const inventory = await db.select()
            .from(products)
            .where(eq(products.shop_id, shopId))
            .orderBy(desc(products.created_at))

        return { success: true, data: inventory }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function addProduct(formData: FormData) {
    try {
        const shopId = await getActiveShopId()

        const name = formData.get("name") as string
        const name_mr = formData.get("name_mr") as string
        const buy_rate = formData.get("buy_rate") ? parseFloat(formData.get("buy_rate") as string) : 0
        const sell_rate = formData.get("sell_rate") ? parseFloat(formData.get("sell_rate") as string) : 0
        const wholesale_rate = formData.get("wholesale_rate") ? parseFloat(formData.get("wholesale_rate") as string) : sell_rate
        const min_wholesale_qty = formData.get("min_wholesale_qty") ? parseInt(formData.get("min_wholesale_qty") as string) : 12
        const stock = formData.get("stock") ? parseInt(formData.get("stock") as string) : 0
        const min_stock = formData.get("min_stock") ? parseInt(formData.get("min_stock") as string) : 5

        if (!name || isNaN(sell_rate)) {
            throw new Error("Product Name and Sell Rate are strictly required.")
        }

        await db.insert(products).values({
            shop_id: shopId,
            name,
            name_mr,
            buy_rate: buy_rate.toString(),
            sell_rate: sell_rate.toString(),
            wholesale_rate: wholesale_rate.toString(),
            min_wholesale_qty: isNaN(min_wholesale_qty) ? 12 : min_wholesale_qty,
            stock,
            min_stock
        })

        revalidatePath("/erp/wholesale/inventory")
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getProductPurchaseHistory(productId: string) {
    try {
        const history = await db.select({
            date: purchaseBills.bill_date,
            supplierName: suppliers.name,
            qty: purchaseItems.quantity,
            buyRate: purchaseItems.buy_rate
        })
            .from(purchaseItems)
            .innerJoin(purchaseBills, eq(purchaseItems.purchase_bill_id, purchaseBills.id))
            .innerJoin(suppliers, eq(purchaseBills.supplier_id, suppliers.id))
            .where(eq(purchaseItems.product_id, productId))
            .orderBy(desc(purchaseBills.bill_date))
            .limit(15)

        return { success: true, data: history }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function updateInventoryItem(formData: FormData) {
    try {
        const id = formData.get("id") as string
        const name = formData.get("name") as string
        const name_mr = formData.get("name_mr") as string
        const buy_rate = formData.get("buy_rate") ? parseFloat(formData.get("buy_rate") as string) : 0
        const sell_rate = formData.get("sell_rate") ? parseFloat(formData.get("sell_rate") as string) : 0
        const wholesale_rate = formData.get("wholesale_rate") ? parseFloat(formData.get("wholesale_rate") as string) : sell_rate
        const min_wholesale_qty = formData.get("min_wholesale_qty") ? parseInt(formData.get("min_wholesale_qty") as string) : 12
        const stock = formData.get("stock") ? parseInt(formData.get("stock") as string) : 0

        if (!id || !name) throw new Error("Product ID and Name required")

        await db.update(products).set({
            name,
            name_mr,
            buy_rate: buy_rate.toString(),
            sell_rate: sell_rate.toString(),
            wholesale_rate: wholesale_rate.toString(),
            min_wholesale_qty: isNaN(min_wholesale_qty) ? 12 : min_wholesale_qty,
            stock
        }).where(eq(products.id, id))

        revalidatePath("/erp/wholesale/inventory")
        revalidatePath("/erp/wholesale/pos")
        revalidatePath("/erp/wholesale/purchase")
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// Shopify-Style Inline Quick Edit Action
export async function quickUpdateProductField(id: string, field: 'sell_rate' | 'wholesale_rate' | 'min_wholesale_qty' | 'stock' | 'buy_rate', value: any) {
    try {
        const shopId = await getActiveShopId()

        const updateData: any = {}
        if (field === 'sell_rate' || field === 'wholesale_rate' || field === 'buy_rate') {
            const num = parseFloat(String(value))
            if (isNaN(num)) throw new Error("Invalid rate number")
            updateData[field] = num.toString()
        } else if (field === 'min_wholesale_qty' || field === 'stock') {
            const num = parseInt(String(value), 10)
            if (isNaN(num)) throw new Error("Invalid quantity number")
            updateData[field] = num
        }

        await db.update(products)
            .set(updateData)
            .where(eq(products.id, id))

        revalidatePath("/erp/wholesale/inventory")
        revalidatePath("/erp/wholesale/pos")
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function bulkAddProducts(items: any[]) {
    try {
        const shopId = await getActiveShopId()

        // We wrap bulk insertions mapping tenant id correctly
        const payload = items.map(item => ({
            shop_id: shopId,
            name: item.name,
            name_mr: item.name_mr,
            buy_rate: (item.buy_rate || 0).toString(),
            sell_rate: (item.sell_rate || 0).toString(),
            wholesale_rate: (item.wholesale_rate || item.sell_rate || 0).toString(),
            min_wholesale_qty: item.min_wholesale_qty ? parseInt(item.min_wholesale_qty, 10) : 12,
            stock: item.stock || 0,
            min_stock: item.min_stock || 5
        }))

        // Run batch insert
        await db.insert(products).values(payload)

        revalidatePath("/erp/wholesale/inventory")
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function bulkDeleteProducts(productIds: string[]) {
    try {
        if (!productIds || productIds.length === 0) return { success: true, deletedCount: 0 }
        const shopId = await getActiveShopId()

        // Check if any products are referenced in invoices or purchases
        const usedInInvoices = await db.select({ productId: invoiceItems.product_id })
            .from(invoiceItems)
            .where(inArray(invoiceItems.product_id, productIds))
        const invoiceProdIds = new Set(usedInInvoices.map(i => i.productId))

        const usedInPurchases = await db.select({ productId: purchaseItems.product_id })
            .from(purchaseItems)
            .where(inArray(purchaseItems.product_id, productIds))
        const purchaseProdIds = new Set(usedInPurchases.map(p => p.productId))

        const safeToDeleteIds = productIds.filter(id => !invoiceProdIds.has(id) && !purchaseProdIds.has(id))
        const blockedCount = productIds.length - safeToDeleteIds.length

        if (safeToDeleteIds.length > 0) {
            await db.delete(products)
                .where(and(eq(products.shop_id, shopId), inArray(products.id, safeToDeleteIds)))
        }

        revalidatePath("/erp/wholesale/inventory")
        revalidatePath("/erp/wholesale/pos")
        revalidatePath("/erp/wholesale/purchase")

        if (blockedCount > 0) {
            return {
                success: true,
                deletedCount: safeToDeleteIds.length,
                blockedCount,
                message: `Deleted ${safeToDeleteIds.length} products. ${blockedCount} product(s) could not be deleted because they are locked to historical sales or purchase records.`
            }
        }

        return { success: true, deletedCount: safeToDeleteIds.length }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

