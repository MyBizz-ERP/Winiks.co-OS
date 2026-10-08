import { db } from '@/db'
import { invoices, invoiceItems, customerPayments, shops, customers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientSalesHistory from './components/ClientSalesHistory'

export const dynamic = 'force-dynamic'

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
        payment_method: invoices.payment_method,
        is_archived: invoices.is_archived,
        customer_id: customers.id,
        customer_name: customers.name,
        customer_balance: customers.old_balance,
    }).from(invoices)
        .leftJoin(customers, eq(invoices.customer_id, customers.id))
        .where(eq(invoices.shop_id, shop.id))
        .orderBy(desc(invoices.created_at))
        .limit(100)

    const payments = await db.select({
        id: customerPayments.id,
        created_at: customerPayments.created_at,
        amount: customerPayments.amount,
        customer_id: customers.id,
        customer_name: customers.name,
        customer_balance: customers.old_balance,
    }).from(customerPayments)
        .leftJoin(customers, eq(customerPayments.customer_id, customers.id))
        .where(eq(customerPayments.shop_id, shop.id))
        .orderBy(desc(customerPayments.created_at))
        .limit(100)

    const serializedBills = result.map(i => ({
        ...i,
        type: 'BILL',
        payment_method: i.payment_method,
        subtotal: parseFloat(i.subtotal as any),
        discount: parseFloat(i.discount as any),
        total_amount: parseFloat(i.total_amount as any),
        amount_paid: parseFloat(i.amount_paid as any),
        customer_id: i.customer_id,
        customer_balance: parseFloat(i.customer_balance as any || '0'),
        created_at: i.created_at.toISOString()
    }))

    const serializedPayments = payments.map(i => ({
        id: i.id,
        type: 'PAYMENT',
        subtotal: 0,
        discount: 0,
        total_amount: 0,
        amount_paid: parseFloat(i.amount as any),
        customer_id: i.customer_id,
        customer_balance: parseFloat(i.customer_balance as any || '0'),
        is_archived: false,
        customer_name: i.customer_name,
        created_at: i.created_at.toISOString()
    }))

    const combined = [...serializedBills, ...serializedPayments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100)

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <ClientSalesHistory data={combined} shop={shop} />
        </div>
    )
}
