import { db } from '@/db'
import { purchaseBills, supplierPayments, suppliers, shops } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientAccountsPayable from './components/ClientAccountsPayable'

export const dynamic = 'force-dynamic'

export default async function AccountsPayablePage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/admin')

    const result = await db.select({
        id: purchaseBills.id,
        purchase_no: purchaseBills.purchase_no,
        created_at: purchaseBills.created_at,
        total_amount: purchaseBills.total_amount,
        amount_paid: purchaseBills.amount_paid,
        payment_method: purchaseBills.payment_method,
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

    const payments = await db.select({
        id: supplierPayments.id,
        created_at: supplierPayments.created_at,
        amount: supplierPayments.amount,
        supplier_id: suppliers.id,
        supplier_name: suppliers.name,
        supplier_phone: suppliers.phone,
        supplier_balance: suppliers.current_balance
    }).from(supplierPayments)
        .leftJoin(suppliers, eq(supplierPayments.supplier_id, suppliers.id))
        .where(eq(supplierPayments.shop_id, shop.id))
        .orderBy(desc(supplierPayments.created_at))
        .limit(100)

    const serializedBills = result.map(i => ({
        ...i,
        type: 'BILL',
        purchase_no: i.purchase_no,
        payment_method: i.payment_method,
        total_amount: parseFloat(i.total_amount as any),
        amount_paid: parseFloat(i.amount_paid as any),
        created_at: i.created_at.toISOString()
    }))

    const serializedPayments = payments.map(i => ({
        id: i.id,
        type: 'PAYMENT',
        total_amount: 0,
        amount_paid: parseFloat(i.amount as any),
        is_archived: false,
        supplier_id: i.supplier_id,
        supplier_name: i.supplier_name,
        supplier_phone: i.supplier_phone,
        supplier_balance: i.supplier_balance,
        created_at: i.created_at.toISOString()
    }))

    const combined = [...serializedBills, ...serializedPayments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100)

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <ClientAccountsPayable data={combined} shop={shop} />
        </div>
    )
}
