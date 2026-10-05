import { db } from '@/db'
import { shops, customers, invoices } from '@/db/schema'
import { eq, gte, desc, sql } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import UdhaariClient from './components/UdhaariClient'

export const dynamic = 'force-dynamic'

export default async function UdhaariPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/erp')

    const allCustomers = await db.select().from(customers)
        .where(eq(customers.shop_id, shop.id))
        .orderBy(desc(customers.old_balance))

    return <UdhaariClient customers={allCustomers} shopId={shop.id} />
}
