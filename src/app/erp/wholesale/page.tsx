import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { invoices, products, customers } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import WholesaleDashboardClient from './components/WholesaleDashboardClient'

export const dynamic = 'force-dynamic'

export default async function WholesaleDashboardPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
        redirect('/login')
    }

    // Identify Tenant Map
    const { data: shop } = await supabase
        .from('shops')
        .select('id, name')
        .eq('owner_id', authData.user.id)
        .single()

    if (!shop) redirect('/login')

    // Fetch Last 30 Days Invoices for Graphing & Metrics
    const activeInvoices = await db.select()
        .from(invoices)
        .where(
            sql`${invoices.shop_id} = ${shop.id} AND ${invoices.created_at} > NOW() - INTERVAL '30 days'`
        )
        .orderBy(desc(invoices.created_at))

    // Fetch Low Stock Products
    const lowStockAlerts = await db.select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        min_stock: products.min_stock
    })
        .from(products)
        .where(
            sql`${products.shop_id} = ${shop.id} AND ${products.stock} <= ${products.min_stock}`
        )
        .orderBy(products.stock)
        .limit(10)

    // Aggregate Metric Totals
    const [customerCountResult] = await db.select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(eq(customers.shop_id, shop.id))

    const [productCountResult] = await db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.shop_id, shop.id))

    const [recentBills] = await db.select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(sql`${invoices.shop_id} = ${shop.id} AND ${invoices.created_at} > NOW() - INTERVAL '24 hours'`)

    const payload = {
        shopName: shop.name,
        invoices: activeInvoices,
        lowStock: lowStockAlerts,
        stats: {
            totalCustomers: Number(customerCountResult.count || 0),
            totalProducts: Number(productCountResult.count || 0),
            invoicesToday: Number(recentBills.count || 0)
        }
    }

    return <WholesaleDashboardClient payload={payload} />
}
