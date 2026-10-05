import { db } from '@/db'
import { shops } from '@/db/schema/admin'
import { eq } from 'drizzle-orm'
import CategoryDashboardClient from './components/CategoryDashboardClient'

export const dynamic = 'force-dynamic'

// NOTE: Auth is handled by the parent /admin/layout.tsx (Root Admin Guard)
// This page receives only authenticated, whitelisted super-admin requests.
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const categoryId = id.toLowerCase()

    // Fetch category-specific tenants only — strict vertical isolation
    const metricsData = await db.select().from(shops).where(eq(shops.category_id, categoryId))

    return (
        <CategoryDashboardClient
            metricsData={metricsData}
            categoryId={categoryId}
        />
    )
}
