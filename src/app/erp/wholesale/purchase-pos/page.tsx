import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientPurchasePos from './ClientPurchasePos'

export const dynamic = 'force-dynamic'

export default async function PurchasePosPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: shop } = await supabase
        .from('shops')
        .select('id, shop_name, address, phone_number')
        .eq('owner_id', user.id)
        .single()

    if (!shop) {
        redirect('/login?error=database_cache_sync_required_run_notify_pgrst')
    }

    return (
        <main className="w-full h-full bg-slate-100">
            <ClientPurchasePos shopInfo={shop} />
        </main>
    )
}
