import { db } from '@/db'
import { shops } from '@/db/schema/admin'
import { products, invoices, customers } from '@/db/schema/wholesale'
import { eq, sql } from 'drizzle-orm'
import CategoryDashboardClient from './components/CategoryDashboardClient'

export const dynamic = 'force-dynamic'

// NOTE: Auth is handled by the parent /admin/layout.tsx (Root Admin Guard)
// This page receives only authenticated, whitelisted super-admin requests.
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const categoryId = id.toLowerCase()

    // Fetch category-specific tenants only — strict vertical isolation
    const rawShops = await db.select().from(shops).where(eq(shops.category_id, categoryId))

    // Inject Telemetry (Resource Usage Overheads) per Tenant
    const metricsData = await Promise.all(rawShops.map(async (shop) => {
        const pCount = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.shop_id, shop.id))
        const iCount = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(eq(invoices.shop_id, shop.id))
        const cCount = await db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.shop_id, shop.id))

        return {
            ...shop,
            product_count: Number(pCount[0]?.count || 0),
            invoice_count: Number(iCount[0]?.count || 0),
            customer_count: Number(cCount[0]?.count || 0)
        }
    }))

    return (
        <CategoryDashboardClient
            metricsData={metricsData}
            categoryId={categoryId}
        />
    )
}
