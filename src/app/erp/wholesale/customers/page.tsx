import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientCustomerLedger from './ClientCustomerLedger'

export default async function CustomersLedgerPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('*').eq('owner_id', user.id).single()
    if (!shop || !shop.is_active) {
        return <div className="p-10 text-red-600 font-bold">Your shop is inactive or suspended.</div>
    }

    const { data: customers } = await supabase
        .rpc('wh_get_customers', { p_shop_id: shop.id })

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-8 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Ledger</h1>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Record Udhaari payments and manage your client roster.</p>
                </div>
            </div>

            <ClientCustomerLedger initialCustomers={customers || []} />
        </div>
    )
}
