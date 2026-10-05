import { db } from '@/db'
import { shops, products, customers, invoices } from '@/db/schema'
import { eq, desc, gte, sql } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import POSClient from './components/POSClient'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select({
        id: shops.id,
        name: shops.name,
        name_mr: shops.name_mr,
        phone: shops.phone,
        address: shops.address,
        address_mr: shops.address_mr
    })
        .from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/erp')

    const [productList, customerList] = await Promise.all([
        db.select().from(products).where(eq(products.shop_id, shop.id)).orderBy(products.name),
        db.select().from(customers).where(eq(customers.shop_id, shop.id)).orderBy(customers.name),
    ])

    return <POSClient products={productList} customers={customerList} shop={shop} />
}
