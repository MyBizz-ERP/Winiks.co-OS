import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Day End Reports - WINIKS ERP',
}

export default async function ReportsPage(props: { searchParams: Promise<{ date?: string }> }) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('id, shop_name').eq('owner_id', user.id).single()
    if (!shop) redirect('/login')

    const [invoicesRes, purchaseBillsRes] = await Promise.all([
        supabase.rpc('wh_get_invoices', { p_shop_id: shop.id }),
        supabase.from('purchase_bills').select('*').eq('shop_id', shop.id)
    ])

    const invoices = invoicesRes.data || []
    const purchaseBills = purchaseBillsRes.data || []

    const targetDate = searchParams.date || new Date().toISOString().split('T')[0]

    // Day End Processing
    const invoicesForDate = invoices.filter((inv: any) => new Date(inv.created_at).toISOString().startsWith(targetDate))
    const purchasesForDate = purchaseBills.filter((pb: any) => new Date(pb.created_at).toISOString().startsWith(targetDate))

    // Profit = (Gross Sales Subtotal) - (Total Cost of those Sold Items)
    const selectedDateSales = invoicesForDate.reduce((sum: number, inv: any) => sum + Number(inv.subtotal), 0)
    const selectedDateCogs = invoicesForDate.reduce((sum: number, inv: any) => sum + Number(inv.total_cogs || 0), 0)
    const selectedDateProfit = selectedDateSales - selectedDateCogs
    const selectedDatePurchases = purchasesForDate.reduce((sum: number, pb: any) => sum + Number(pb.subtotal), 0)

    return (
        <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Day End Financial Report</h1>
                <p className="text-slate-500 mt-1 font-medium">Profit & Acquisition Matrix for selected date.</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8">
                <form className="flex flex-col sm:flex-row items-center gap-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Target Date</label>
                    <input
                        type="date"
                        name="date"
                        defaultValue={targetDate}
                        className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition min-w-[200px]"
                    />
                    <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white text-sm font-black tracking-widest rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                        ANALYZE DATE
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Gross Sales */}
                <div className="bg-slate-900 p-8 rounded-3xl relative overflow-hidden shadow-lg shadow-slate-900/10 text-white flex flex-col justify-between">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                    <div>
                        <p className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">Total Gross Sales</p>
                        <p className="text-4xl font-black mb-6">₹{selectedDateSales.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold pt-4 border-t border-white/10 mt-auto">
                        <span className="text-slate-400">Goods Cost (COGS)</span>
                        <span className="text-slate-200">₹{selectedDateCogs.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="bg-emerald-500 p-8 rounded-3xl relative overflow-hidden shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-between">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    <div>
                        <p className="text-xs uppercase font-bold tracking-widest text-emerald-100 mb-2">Net Trading Profit</p>
                        <p className="text-4xl font-black mb-2">₹{selectedDateProfit.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-bold text-emerald-100 leading-tight bg-black/10 p-2 rounded-lg">
                            Profit = Gross Sales — Orig. Cost of Goods Sold. (New Bulk purchases stay computationally independent).
                        </p>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold pt-4 border-t border-emerald-400/50 mt-4">
                        <span className="text-emerald-100">Profit Margin</span>
                        <span className="text-white">{selectedDateSales > 0 ? ((selectedDateProfit / selectedDateSales) * 100).toFixed(1) : 0}%</span>
                    </div>
                </div>

                {/* Kharedi Purchases */}
                <div className="bg-white border border-slate-200 p-8 rounded-3xl relative overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-2">Inbound Purchases</p>
                        <p className="text-4xl font-black text-rose-600 mb-6">₹{selectedDatePurchases.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold pt-4 border-t border-slate-100 mt-auto">
                        <span className="text-slate-400">Supplier Bills Made</span>
                        <span className="text-slate-700 font-black">{purchasesForDate.length}</span>
                    </div>
                </div>
            </div>

            {/* Daily Invoices Log */}
            {invoicesForDate.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Bills Generated on {targetDate}</h2>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Mode</th>
                                        <th className="px-6 py-4 text-right">Subtotal</th>
                                        <th className="px-6 py-4 text-right">COGS</th>
                                        <th className="px-6 py-4 text-right text-emerald-600">Profit Yield</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoicesForDate.map((inv: any) => {
                                        const dateObj = new Date(inv.created_at)
                                        const yieldVal = Number(inv.subtotal) - Number(inv.total_cogs || 0)
                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                                                    {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{inv.customer_name || 'Walk-in'}</td>
                                                <td className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{inv.payment_mode}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-700">₹{Number(inv.subtotal).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-400">₹{Number(inv.total_cogs || 0).toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600 bg-emerald-50/30">₹{yieldVal.toLocaleString('en-IN')}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
