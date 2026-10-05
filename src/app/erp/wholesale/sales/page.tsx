import { db } from '@/db'
import { invoices, invoiceItems, shops, customers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientSalesHistory from './components/ClientSalesHistory'

export default async function SalesHistoryPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/admin')

    const result = await db.select({
        id: invoices.id,
        created_at: invoices.created_at,
        subtotal: invoices.subtotal,
        discount: invoices.discount,
        total_amount: invoices.total_amount,
        amount_paid: invoices.amount_paid,
        is_archived: invoices.is_archived,
        customer_name: customers.name,
    }).from(invoices)
        .leftJoin(customers, eq(invoices.customer_id, customers.id))
        .where(eq(invoices.shop_id, shop.id))
        .orderBy(desc(invoices.created_at))
        .limit(100)

    const serialized = result.map(i => ({
        ...i,
        subtotal: parseFloat(i.subtotal as any),
        discount: parseFloat(i.discount as any),
        total_amount: parseFloat(i.total_amount as any),
        amount_paid: parseFloat(i.amount_paid as any),
        created_at: i.created_at.toISOString()
    }))

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <ClientSalesHistory data={serialized} shop={shop} />
        </div>
    )
}
