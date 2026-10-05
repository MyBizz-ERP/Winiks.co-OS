import WholesaleSidebar from './WholesaleSidebar'
import ClientMobileNav from './ClientMobileNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function WholesaleLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: shop } = await supabase
        .from('shops')
        .select('shop_name, is_active')
        .eq('owner_id', user.id)
        .single()

    if (!shop || !shop.is_active) redirect('/login?error=suspended')

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            <WholesaleSidebar shopName={shop.shop_name} />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0 relative">
                {children}
            </main>
            <ClientMobileNav />
        </div>
    )
}
