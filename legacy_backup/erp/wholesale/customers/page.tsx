import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientCustomerLedger from './ClientCustomerLedger'

export const dynamic = 'force-dynamic'

export default async function CustomersLedgerPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: shop } = await supabase
        .from('shops')
        .select('id, shop_name, address, phone_number, is_active')
        .eq('owner_id', user.id)
        .single()

    if (!shop || !shop.is_active) {
        redirect('/login?error=account_suspended_contact_support')
    }

    const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shop.id)
        .order('name', { ascending: true })

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customers & Udhaari</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Record Udhaari payments and manage your client roster.</p>
            </div>
            <ClientCustomerLedger initialCustomers={customers || []} shopInfo={shop} />
        </div>
    )
}
