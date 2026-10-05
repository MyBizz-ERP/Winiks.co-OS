import { db } from '@/db'
import { purchaseBills, suppliers, shops } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientAccountsPayable from './components/ClientAccountsPayable'

export default async function AccountsPayablePage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/admin')

    const result = await db.select({
        id: purchaseBills.id,
        created_at: purchaseBills.created_at,
        total_amount: purchaseBills.total_amount,
        amount_paid: purchaseBills.amount_paid,
        is_archived: purchaseBills.is_archived,
        supplier_id: suppliers.id,
        supplier_name: suppliers.name,
        supplier_phone: suppliers.phone,
        supplier_balance: suppliers.current_balance
    }).from(purchaseBills)
        .leftJoin(suppliers, eq(purchaseBills.supplier_id, suppliers.id))
        .where(eq(purchaseBills.shop_id, shop.id))
        .orderBy(desc(purchaseBills.created_at))
        .limit(100)

    const serialized = result.map(i => ({
        ...i,
        total_amount: parseFloat(i.total_amount as any),
        amount_paid: parseFloat(i.amount_paid as any),
        created_at: i.created_at.toISOString()
    }))

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <ClientAccountsPayable data={serialized} shop={shop} />
        </div>
    )
}
