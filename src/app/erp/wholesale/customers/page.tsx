import { db } from '@/db'
import { shops, customers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CustomerClient from './components/CustomerClient'

export const dynamic = 'force-dynamic'

export default async function WholesaleCustomersPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/erp')

    const allCustomers = await db.select()
        .from(customers)
        .where(eq(customers.shop_id, shop.id))
        .orderBy(desc(customers.created_at))

    return <CustomerClient initialCustomers={allCustomers} />
}
