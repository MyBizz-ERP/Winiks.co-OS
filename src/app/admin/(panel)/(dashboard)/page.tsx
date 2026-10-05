import { db } from '@/db'
import { shops } from '@/db/schema'
import { desc, sql } from 'drizzle-orm'
import AdminDashboardClient from './components/AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
    // Phase 13 Enterprise Query: Pure ORM Fetching with Raw Telemetry Subqueries
    // This allows the CEO to peer into strictly isolated Tenant partitions.
    const allShopsWithTelemetry = await db.select({
        id: shops.id,
        name: shops.name,
        phone: shops.phone,
        category_id: shops.category_id,
        owner_id: shops.owner_id,
        created_at: shops.created_at,
        is_active: shops.is_active,
        subscription_price: shops.subscription_price,
        product_count: sql<number>`(SELECT COUNT(*) FROM wholesale.products WHERE shop_id = "shops"."id")`.as('product_count'),
        invoice_count: sql<number>`(SELECT COUNT(*) FROM wholesale.invoices WHERE shop_id = "shops"."id")`.as('invoice_count'),
        customer_count: sql<number>`(SELECT COUNT(*) FROM wholesale.customers WHERE shop_id = "shops"."id")`.as('customer_count'),
    })
        .from(shops)
        .orderBy(desc(shops.created_at))

    return <AdminDashboardClient metricsData={allShopsWithTelemetry} />
}
