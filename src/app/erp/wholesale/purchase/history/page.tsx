import { db } from '@/db'
import { purchaseBills, purchaseItems, suppliers, products, shops } from '@/db/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KharediHistoryClient from './components/KharediHistoryClient'

export const dynamic = 'force-dynamic'

export default async function PurchaseHistoryPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/login')

    // Fetch all purchase bills for this shop
    const bills = await db.select({
        id: purchaseBills.id,
        purchase_no: purchaseBills.purchase_no,
        supplier_id: purchaseBills.supplier_id,
        supplier_name: suppliers.name,
        supplier_phone: suppliers.phone,
        supplier_balance: suppliers.current_balance,
        total_amount: purchaseBills.total_amount,
        amount_paid: purchaseBills.amount_paid,
        payment_method: purchaseBills.payment_method,
        bill_date: purchaseBills.bill_date,
        created_at: purchaseBills.created_at,
    }).from(purchaseBills)
        .leftJoin(suppliers, eq(purchaseBills.supplier_id, suppliers.id))
        .where(eq(purchaseBills.shop_id, shop.id))
        .orderBy(desc(purchaseBills.created_at))
        .limit(200)

    const billIds = bills.map(b => b.id)

    // Batch fetch line items
    const rawItems = billIds.length > 0 ? await db.select({
        id: purchaseItems.id,
        purchase_bill_id: purchaseItems.purchase_bill_id,
        product_id: purchaseItems.product_id,
        product_name: products.name,
        product_name_mr: products.name_mr,
        quantity: purchaseItems.quantity,
        buy_rate: purchaseItems.buy_rate,
        sell_rate: purchaseItems.sell_rate,
        total_amount: purchaseItems.total_amount,
    }).from(purchaseItems)
        .leftJoin(products, eq(purchaseItems.product_id, products.id))
        .where(inArray(purchaseItems.purchase_bill_id, billIds))
        : []

    // Map items to bills
    const itemsByBill = new Map<string, any[]>()
    for (const item of rawItems) {
        const list = itemsByBill.get(item.purchase_bill_id) || []
        list.push({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name || 'Item',
            product_name_mr: item.product_name_mr || '',
            quantity: item.quantity,
            buy_rate: parseFloat(item.buy_rate as any || '0'),
            sell_rate: parseFloat(item.sell_rate as any || '0'),
            total_amount: parseFloat(item.total_amount as any || '0'),
        })
        itemsByBill.set(item.purchase_bill_id, list)
    }

    const serializedBills = bills.map(b => ({
        id: b.id,
        purchase_no: b.purchase_no,
        supplier_id: b.supplier_id,
        supplier_name: b.supplier_name || 'Local Vendor',
        supplier_phone: b.supplier_phone || null,
        supplier_balance: parseFloat(b.supplier_balance as any || '0'),
        total_amount: parseFloat(b.total_amount as any || '0'),
        amount_paid: parseFloat(b.amount_paid as any || '0'),
        payment_method: b.payment_method || 'CASH',
        created_at: b.created_at.toISOString(),
        items: itemsByBill.get(b.id) || []
    }))

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <KharediHistoryClient bills={serializedBills} shop={shop} />
        </div>
    )
}
