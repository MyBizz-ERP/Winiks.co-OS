import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientSalesHistory from './ClientSalesHistory'
import GlobalTimeFilter from '../components/GlobalTimeFilter'
import { getDateBounds } from '../utils/timeFilter'

export const metadata = {
    title: 'Sales History & Invoices - WINIKS ERP',
}

export default async function SalesHistoryPage(props: { searchParams: Promise<{ date?: string, range?: string }> }) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get shop config and verify ownership
    const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (!shop) {
        return (
            <div className="p-8 flex items-center justify-center">
                <p className="text-red-500 font-bold">FATAL: Shop initialization missing.</p>
            </div>
        )
    }

    // Fetch master list of invoices (ordered by date descending)
    const { data: invoices } = await supabase
        .rpc('wh_get_invoices', { p_shop_id: shop.id })

    const { startIso, endIso } = getDateBounds(searchParams)
    const scopedInvoices = (invoices || []).filter((inv: any) => inv.created_at >= startIso && inv.created_at <= endIso)

    // Provide base shop data for potential receipt reprints
    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">

            <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Sales History</h1>
                    <p className="text-slate-500 mt-1 font-medium">Review past bills, filter by date, or reprint forgotten invoices.</p>
                </div>
                <GlobalTimeFilter />
            </div>

            <ClientSalesHistory initialInvoices={scopedInvoices} shopId={shop.id} shopInfo={shop} />

        </div>
    )
}
