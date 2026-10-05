import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import GlobalTimeFilter from '../components/GlobalTimeFilter'
import { getDateBounds } from '../utils/timeFilter'
import OwnerVaultLock from './OwnerVaultLock'
import DayEndCsvDownloader from './DayEndCsvDownloader'

export const metadata = {
    title: 'Day End Reports - WINIKS ERP',
}

export default async function ReportsPage(props: { searchParams: Promise<{ date?: string, range?: string }> }) {
    const searchParams = await props.searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('id, shop_name, owner_pin').eq('owner_id', user.id).single()
    if (!shop) redirect('/login')
    const ownerPin = shop.owner_pin || '1234'

    const [invoicesRes, purchaseBillsRes, udhaariPaymentsRes, supplierPaymentsRes, expensesRes] = await Promise.all([
        supabase.rpc('wh_get_invoices', { p_shop_id: shop.id }),
        supabase.from('purchase_bills').select('*').eq('shop_id', shop.id),
        supabase.from('payment_ledger').select('*').eq('shop_id', shop.id),
        supabase.from('supplier_payment_ledger').select('*').eq('shop_id', shop.id),
        supabase.from('overhead_expenses').select('*').eq('shop_id', shop.id)
    ])

    const invoices = invoicesRes.data || []
    const purchaseBills = purchaseBillsRes.data || []
    const udhaariPayments = udhaariPaymentsRes.data || []
    const supplierPayments = supplierPaymentsRes.data || []
    const expenses = expensesRes.data || []

    const { startIso, endIso } = getDateBounds(searchParams)

    // Day End Processing
    const invoicesForDate = invoices.filter((inv: any) => inv.created_at >= startIso && inv.created_at <= endIso)
    const purchasesForDate = purchaseBills.filter((pb: any) => pb.created_at >= startIso && pb.created_at <= endIso)
    const udhaariForDate = udhaariPayments.filter((p: any) => p.created_at >= startIso && p.created_at <= endIso)
    const supplierUdhaariForDate = supplierPayments.filter((p: any) => p.created_at >= startIso && p.created_at <= endIso)
    const expensesForDate = expenses.filter((e: any) => e.created_at >= startIso && e.created_at <= endIso)

    // Profit = (Grand Total after discounts) - (Total Cost of those Sold Items)
    // STRICT ALGEBRA: We must use (subtotal - discount) because `grand_total` includes previous Udhaari (past_due)!
    const selectedDateSales = invoicesForDate.reduce((sum: number, inv: any) => sum + (Number(inv.subtotal) - Number(inv.discount || 0)), 0)
    const selectedDateCogs = invoicesForDate.reduce((sum: number, inv: any) => sum + Number(inv.total_cogs || 0), 0)

    // We explicitly calculate total discounts given away just for the UI
    const selectedDateDiscounts = invoicesForDate.reduce((sum: number, inv: any) => sum + Number(inv.discount || 0), 0)

    const selectedDateProfit = selectedDateSales - selectedDateCogs
    const selectedDatePurchases = purchasesForDate.reduce((sum: number, pb: any) => sum + Number(pb.subtotal), 0)

    // Cash Velocity (Money Tracker)
    const cashFromSales = invoicesForDate.reduce((sum: number, inv: any) => sum + Number(inv.amount_paid || 0), 0)
    const cashFromUdhaari = udhaariForDate.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)
    const cashInflow = cashFromSales + cashFromUdhaari

    // Outflow calculations
    const cashKharediPaid = purchasesForDate.reduce((sum: number, pb: any) => sum + Number(pb.amount_paid || 0), 0)
    const cashSupplierPaid = supplierUdhaariForDate.reduce((sum: number, p: any) => sum + Number(p.amount_paid || 0), 0)
    const cashExpensesPaid = expensesForDate.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

    const cashOutflow = cashKharediPaid + cashSupplierPaid + cashExpensesPaid
    const netCashVelocity = cashInflow - cashOutflow

    // Needed for the Server Action inside the UI
    const { addDailyExpense } = await import('./actions')

    return (
        <OwnerVaultLock pinCode={ownerPin}>
            <div className="p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Day End Financial Report</h1>
                    <p className="text-slate-500 mt-1 font-medium">Profit & Acquisition Matrix for selected date.</p>
                </div>

                <div className="mb-0 flex justify-between items-center bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
                    <GlobalTimeFilter />
                    <DayEndCsvDownloader
                        startIso={startIso}
                        endIso={endIso}
                        sales={selectedDateSales}
                        cogs={selectedDateCogs}
                        profit={selectedDateProfit}
                        inflow={cashInflow}
                        outflow={cashOutflow}
                        netCash={netCashVelocity}
                    />
                </div>

                {/* Cash Velocity (Money Tracker) Array */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-8 overflow-hidden">
                    <div className="flex flex-col mb-4">
                        <h2 className="text-sm font-black uppercase text-slate-800 tracking-widest">Day Cash Velocity (In/Out)</h2>
                        <p className="text-[10px] uppercase font-bold text-slate-400">पैसे कुठे गेले आणि कुठून आले</p>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                        <div className="flex-1 w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
                            <div className="z-10">
                                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest leading-none mb-1">Total INFLOW</p>
                                <p className="text-3xl font-black text-emerald-800">₹{cashInflow.toLocaleString('en-IN')}</p>
                                <p className="text-xs font-bold text-emerald-700/60 mt-1">Sales: ₹{(cashFromSales).toLocaleString('en-IN')} + Udhaari: ₹{(cashFromUdhaari).toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <div className="flex-1 w-full bg-rose-50 border border-rose-100 rounded-2xl p-6 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest leading-none mb-1">Total OUTFLOW</p>
                                <p className="text-3xl font-black text-rose-800">₹{cashOutflow.toLocaleString('en-IN')}</p>
                                <p className="text-xs font-bold text-rose-700/60 mt-1">Purchases: ₹{cashKharediPaid.toLocaleString('en-IN')} + Old Debt: ₹{cashSupplierPaid.toLocaleString('en-IN')} + Expenses: ₹{cashExpensesPaid.toLocaleString('en-IN')}</p>
                            </div>
                        </div>

                        <div className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Net Cash Position</p>
                                <p className={`text-3xl font-black ${netCashVelocity >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {netCashVelocity >= 0 ? '+' : '-'}₹{Math.abs(netCashVelocity).toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs font-bold text-slate-500 mt-1">Final register float delta</p>
                            </div>
                        </div>
                    </div>

                    {/* Embedded Extra UI: Overhead Expenses Quick Form */}
                    <div className="mt-8 border-t border-slate-100 pt-6">
                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4">Record Daily Overhead Expense</h3>
                        <form action={async (formData) => { "use server"; await addDailyExpense(formData) }} className="flex flex-col sm:flex-row gap-4 items-center">
                            <select name="category" className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none" required>
                                <option value="">-- Category --</option>
                                <option value="Labor">Labor / Mathadi</option>
                                <option value="Transport">Transport / Tempo</option>
                                <option value="Chai / Food">Chai / Food</option>
                                <option value="Electricity">Electricity / Maintenance</option>
                                <option value="Other">Other</option>
                            </select>
                            <input type="number" name="amount" min="1" placeholder="Amount (₹)" className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-rose-600 outline-none" required />
                            <input type="text" name="notes" placeholder="Notes (Optional)" className="w-full sm:flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none" />
                            <button type="submit" className="w-full sm:w-auto px-8 py-3 bg-rose-600 text-white text-sm font-black tracking-widest rounded-xl hover:bg-rose-700 transition active:scale-95 shadow-sm shadow-rose-900/10 whitespace-nowrap">
                                RECORD EXPENSE
                            </button>
                        </form>
                    </div>
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
                                Profit = Net Sales (After Discount) — Orig. Cost of Goods Sold.
                            </p>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold pt-4 border-t border-emerald-400/50 mt-4">
                            <span className="text-emerald-100">Discounts Given</span>
                            <span className="text-white bg-rose-500/80 px-2 py-0.5 rounded text-xs">- ₹{selectedDateDiscounts.toLocaleString('en-IN')}</span>
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
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Bills Generated on {searchParams.range || searchParams.date || 'Today'}</h2>
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
                                                        {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
        </OwnerVaultLock>
    )
}
