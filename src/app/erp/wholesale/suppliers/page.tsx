import { db } from '@/db'
import { shops, suppliers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SupplierClient from './components/SupplierClient'

export const dynamic = 'force-dynamic'

export default async function WholesaleSuppliersPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/erp')

    const allSuppliers = await db.select()
        .from(suppliers)
        .where(eq(suppliers.shop_id, shop.id))
        .orderBy(desc(suppliers.created_at))

    return <SupplierClient initialSuppliers={allSuppliers} />
}
