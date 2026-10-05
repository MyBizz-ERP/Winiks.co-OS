'use server'

import { db } from "@/db"
import { products, purchaseItems, purchaseBills, suppliers } from "@/db/schema/wholesale"
import { shops } from "@/db/schema/admin"
import { createClient } from "@/utils/supabase/server"
import { eq, desc } from "drizzle-orm"
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
        const stock = formData.get("stock") ? parseInt(formData.get("stock") as string) : 0

        if (!id || !name) throw new Error("Product ID and Name required")

        await db.update(products).set({
            name,
            name_mr,
            buy_rate: buy_rate.toString(),
            sell_rate: sell_rate.toString(),
            wholesale_rate: wholesale_rate.toString(),
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
