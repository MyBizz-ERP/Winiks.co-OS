import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientSuppliersLedger from './ClientSuppliersLedger'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Accounts Payable & Suppliers - WINIKS ERP',
}

export default async function SuppliersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get shop config
    const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', user.id)
        .single()

    if (!shop) {
        return (
            <div className="p-8 flex items-center justify-center">
                <p className="text-red-500 font-bold">FATAL: Shop initialization missing.</p>
            </div>
        )
    }

    // Fetch suppliers & recent purchase bills
    const { data: suppliers } = await supabase.rpc('wh_get_suppliers', { p_shop_id: shop.id })
    const { data: purchaseBills } = await supabase.rpc('wh_get_purchase_bills', { p_shop_id: shop.id })

    return (
        <div className="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Accounts Payable</h1>
                <p className="text-slate-500 mt-1 font-medium">Manage suppliers and track your payable debt.</p>
            </div>

            <ClientSuppliersLedger
                initialSuppliers={suppliers || []}
                initialPurchaseBills={purchaseBills || []}
                shopId={shop.id}
                products={[]} // Removed from server
            />
        </div>
    )
}
