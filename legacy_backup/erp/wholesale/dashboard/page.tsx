import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GlobalTimeFilter from '../components/GlobalTimeFilter'
import { getDateBounds } from '../utils/timeFilter'
import Link from 'next/link'
import { Zap, Package, Users, ScrollText, PackageOpen, AlertTriangle, TrendingUp, ShoppingBag } from 'lucide-react'
import DashboardGreeting from './DashboardGreeting'

export default async function WholesaleDashboard(props: { searchParams: Promise<{ date?: string, range?: string }> }) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('id, shop_name').eq('owner_id', user.id).single()
    if (!shop) redirect('/login')

    const [productsRes, customersRes, invoicesRes] = await Promise.all([
        supabase.rpc('wh_get_products', { p_shop_id: shop.id }),
        supabase.rpc('wh_get_customers', { p_shop_id: shop.id }),
        supabase.rpc('wh_get_invoices', { p_shop_id: shop.id }),
    ])

    const products = productsRes.data || []
    const customers = customersRes.data || []
    const invoices = invoicesRes.data || []

    const { startIso, endIso } = getDateBounds(searchParams)
    const scopedInvoices = invoices.filter((inv: any) => inv.created_at >= startIso && inv.created_at <= endIso)
    const lowStockItems = products.filter((p: any) => Number(p.current_stock) <= Number(p.min_stock_alert))
    const recentInvoices = scopedInvoices.slice(0, 8)

    const currentRange = (await searchParams).range || 'TODAY'

    let timeLabel = "Today's data"
    if (currentRange === '7D') timeLabel = 'Last 7 days data'
    if (currentRange === '30D') timeLabel = 'Last 30 days data'
    if (currentRange === '3M') timeLabel = 'Last 3 months data'
    if (currentRange === '6M') timeLabel = 'Last 6 months data'
    if (currentRange === '1Y') timeLabel = 'Last 1 year data'
    if (currentRange === 'ALL') timeLabel = 'All time data'
    if ((await searchParams).date) timeLabel = 'Selected date data'

    const kpis = [
        {
            label: 'Invoices',
            value: scopedInvoices.length,
            sub: timeLabel,
            icon: ShoppingBag,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            label: 'Low Stock',
            value: lowStockItems.length,
            sub: 'Items need restock',
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50'
        },
        {
            label: 'Customers',
            value: customers.length,
            sub: 'Registered profiles',
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            label: 'Catalog',
            value: products.length,
            sub: 'Unique products',
            icon: Package,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        }
    ]

    const quickActions = [
        { href: '/erp/wholesale/pos', label: 'New Sale', desc: 'Start billing', Icon: Zap, accent: 'bg-indigo-600 text-white hover:bg-indigo-700' },
        { href: '/erp/wholesale/purchase-pos', label: 'Purchase Entry', desc: 'Record kharedi', Icon: PackageOpen, accent: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50' },
        { href: '/erp/wholesale/inventory', label: 'Inventory', desc: 'View stock', Icon: Package, accent: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50' },
        { href: '/erp/wholesale/customers', label: 'Udhaari', desc: 'Customer debts', Icon: Users, accent: 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50' },
    ]

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <DashboardGreeting shopName={shop.shop_name} />
                <GlobalTimeFilter />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                            <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1.5">{sub}</p>
                    </div>
                ))}
            </div>

            {/* Quick Action Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {quickActions.map(({ href, label, desc, Icon, accent }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`${accent} rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-95 shadow-sm`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent.includes('indigo-600') ? 'bg-white/20' : 'bg-slate-100'}`}>
                            <Icon className={`w-4.5 h-4.5 ${accent.includes('indigo-600') ? 'text-white' : 'text-slate-600'}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-black truncate">{label}</p>
                            <p className={`text-xs font-medium truncate ${accent.includes('indigo-600') ? 'text-white/70' : 'text-slate-400'}`}>{desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-slate-500" />
                        <h2 className="text-sm font-black text-slate-900 tracking-tight">Recent Invoices</h2>
                    </div>
                    <Link href="/erp/wholesale/invoices" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
                        View all
                    </Link>
                </div>
                {recentInvoices.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <ScrollText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-400">No invoices in this period</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {recentInvoices.map((inv: any) => (
                            <div key={inv.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                                        <ScrollText className="w-3.5 h-3.5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{inv.customer_name || 'Walk-in Customer'}</p>
                                        <p className="text-xs text-slate-400 font-medium">{new Date(inv.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-black text-slate-900">
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(inv.grand_total || 0)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}
