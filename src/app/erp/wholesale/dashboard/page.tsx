import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function WholesaleDashboard(props: { searchParams: Promise<{ date?: string }> }) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('id, shop_name').eq('owner_id', user.id).single()

    if (!shop) redirect('/login')

    // Fetch Live Stats via secure RPC (Bypassing restricted schema)
    const [productsRes, customersRes, invoicesRes] = await Promise.all([
        supabase.rpc('wh_get_products', { p_shop_id: shop.id }),
        supabase.rpc('wh_get_customers', { p_shop_id: shop.id }),
        supabase.rpc('wh_get_invoices', { p_shop_id: shop.id }),
    ])

    const products = productsRes.data || []
    const customers = customersRes.data || []
    const invoices = invoicesRes.data || []

    const targetDate = searchParams.date || new Date().toISOString().split('T')[0]

    const lowStockItems = products.filter((p: any) => Number(p.current_stock) <= Number(p.min_stock_alert))
    const totalUdhaari = customers.reduce((sum: number, c: any) => sum + Number(c.total_credit), 0)
    const todaySales = invoices
        .filter((inv: any) => new Date(inv.created_at).toISOString().startsWith(targetDate))
        .reduce((sum: number, inv: any) => sum + Number(inv.grand_total), 0)

    const suppliers = await supabase.from('suppliers').select('*').eq('shop_id', shop.id)
    const suppliersList = suppliers.data || []
    const totalDen = suppliersList.reduce((sum: number, s: any) => sum + Number(s.total_payable), 0)

    const stats = [
        { label: "Today's Revenue", value: `₹${todaySales.toLocaleString('en-IN')}`, sub: 'Collected Today', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700' },
        { label: 'Total Udhaari Due', value: `₹${totalUdhaari.toLocaleString('en-IN')}`, sub: `${customers.filter((c: any) => c.total_credit > 0).length} debtors`, color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700' },
        { label: 'Total Den (Payable)', value: `₹${totalDen.toLocaleString('en-IN')}`, sub: `${suppliersList.filter((s: any) => s.total_payable > 0).length} suppliers`, color: 'bg-rose-50 border-rose-200', textColor: 'text-rose-700' },
        { label: 'Catalog Size', value: products.length, sub: 'Unique products', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' }
    ]

    return (
        <div className="p-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Good Morning 👋</h1>
                <p className="text-slate-500 mt-1 font-medium">Here is your live business snapshot for today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
                {stats.map(stat => (
                    <div key={stat.label} className={`bg-white rounded-2xl border ${stat.color} p-6 shadow-sm`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{stat.label}</p>
                        <p className={`text-3xl font-black ${stat.textColor} tracking-tight`}>{stat.value}</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">{stat.sub}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="mb-10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Access</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { href: '/erp/wholesale/pos', label: 'New Sale', icon: '⚡', desc: 'Start billing now' },
                        { href: '/erp/wholesale/inventory', label: 'Inventory', icon: '📦', desc: 'Manage stock' },
                        { href: '/erp/wholesale/customers', label: 'Customers', icon: '👥', desc: 'View Udhaari' },
                        { href: '/erp/wholesale/invoices', label: 'Sales History', icon: '🧾', desc: 'Past bills' },
                    ].map(action => (
                        <a key={action.href} href={action.href} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer">
                            <span className="text-2xl group-hover:scale-110 transition-transform inline-block">{action.icon}</span>
                            <p className="font-bold text-slate-800 mt-3">{action.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    )
}
