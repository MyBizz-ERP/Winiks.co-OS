import { db } from '@/db'
import { shops, invoices, purchaseBills, customerPayments, supplierPayments, customers, suppliers } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import VaultClient from './components/VaultClient'

export const dynamic = 'force-dynamic'

export default async function VaultPage() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) redirect('/login')

    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))
    if (!shop) redirect('/erp')

    // Today's data
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const todayInvoices = await db.select({
        id: invoices.id,
        subtotal: invoices.subtotal,
        total_amount: invoices.total_amount,
        amount_paid: invoices.amount_paid,
        discount: invoices.discount,
        total_cogs: invoices.total_cogs,
        created_at: invoices.created_at,
    }).from(invoices)
        .where(eq(invoices.shop_id, shop.id))
        .orderBy(desc(invoices.created_at))

    const todayPurchases = await db.select({
        id: purchaseBills.id,
        total_amount: purchaseBills.total_amount,
        amount_paid: purchaseBills.amount_paid,
        created_at: purchaseBills.created_at,
    }).from(purchaseBills)
        .where(eq(purchaseBills.shop_id, shop.id))

    const todayCustomerPayments = await db.select({
        id: customerPayments.id,
        amount: customerPayments.amount,
        created_at: customerPayments.created_at,
    }).from(customerPayments)
        .where(eq(customerPayments.shop_id, shop.id))

    const todaySupplierPayments = await db.select({
        id: supplierPayments.id,
        amount: supplierPayments.amount,
        created_at: supplierPayments.created_at,
    }).from(supplierPayments)
        .where(eq(supplierPayments.shop_id, shop.id))

    const importedUdhaari = await db.select({
        id: customers.id,
        old_balance: customers.old_balance,
        created_at: customers.created_at,
    }).from(customers)
        .where(eq(customers.shop_id, shop.id))

    const importedPayables = await db.select({
        id: suppliers.id,
        current_balance: suppliers.current_balance,
        created_at: suppliers.created_at,
    }).from(suppliers)
        .where(eq(suppliers.shop_id, shop.id))

    return <VaultClient
        invoices={todayInvoices}
        purchases={todayPurchases}
        customerPayments={todayCustomerPayments}
        supplierPayments={todaySupplierPayments}
        importedUdhaari={importedUdhaari}
        importedPayables={importedPayables}
        shop={shop}
    />
}
