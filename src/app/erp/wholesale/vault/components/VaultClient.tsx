'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, TrendingUp, TrendingDown, IndianRupee, Receipt, BarChart2, Download, Calendar, Eye, Printer, X, Truck } from 'lucide-react'
import SharedThermalReceipt from '../../components/SharedThermalReceipt'
import { getInvoiceDetails } from '../../sales/actions'
import { getPurchaseDetails } from '../../ap/actions'

interface Invoice { id: string; subtotal: string; total_amount: string; amount_paid: string; discount: string; total_cogs: string; created_at: Date }
interface Purchase { id: string; total_amount: string; amount_paid: string; created_at: Date }
interface Payment { id: string; amount: string; created_at: Date }

export default function VaultClient({
    invoices,
    purchases,
    customerPayments,
    supplierPayments,
    importedUdhaari = [],
    importedPayables = [],
    shop
}: {
    invoices: Invoice[],
    purchases: Purchase[],
    customerPayments: Payment[],
    supplierPayments: Payment[],
    importedUdhaari?: { id: string, old_balance: string, created_at: Date }[],
    importedPayables?: { id: string, current_balance: string, created_at: Date }[],
    shop: any
}) {
    const [pin, setPin] = useState('')
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [dateFilter, setDateFilter] = useState<'TODAY' | '7D' | '30D'>('TODAY')
    const [isFetchingReceipt, setIsFetchingReceipt] = useState(false)
    const [viewInvoiceData, setViewInvoiceData] = useState<any>(null)
    const [viewPurchaseData, setViewPurchaseData] = useState<any>(null)

    const fetchInvoiceReceipt = async (id: string) => {
        setIsFetchingReceipt(true)
        try {
            const res = await getInvoiceDetails(id)
            if (res) setViewInvoiceData(res)
        } catch (e) { console.error(e) }
        finally { setIsFetchingReceipt(false) }
    }

    const fetchPurchaseReceipt = async (id: string) => {
        setIsFetchingReceipt(true)
        try {
            const res = await getPurchaseDetails(id)
            if (res) setViewPurchaseData(res)
        } catch (e) { console.error(e) }
        finally { setIsFetchingReceipt(false) }
    }

    const VAULT_PIN = shop?.owner_pin || '1234' // Bound to Shop DB settings

    const filterStart = new Date(); filterStart.setHours(0, 0, 0, 0)
    if (dateFilter === '7D') filterStart.setDate(filterStart.getDate() - 7)
    if (dateFilter === '30D') filterStart.setDate(filterStart.getDate() - 30)

    const todayInvoices = invoices.filter(i => new Date(i.created_at) >= filterStart)
    const todayPurchases = purchases.filter(p => new Date(p.created_at) >= filterStart)
    const todayCustPay = customerPayments.filter(p => new Date(p.created_at) >= filterStart)
    const todaySuppPay = supplierPayments.filter(p => new Date(p.created_at) >= filterStart)
    const todayImportedUdhaari = importedUdhaari.filter(i => new Date(i.created_at) >= filterStart)
    const todayImportedPayables = importedPayables.filter(p => new Date(p.created_at) >= filterStart)

    const exportCSV = () => {
        const rows = [
            ["Type", "ID", "Subtotal/Amount", "Discount", "COGS", "Cash Flow", "Date"]
        ]

        todayInvoices.forEach(i => {
            rows.push(["Sales Invoice", i.id, i.subtotal, i.discount, i.total_cogs, i.amount_paid, new Date(i.created_at).toLocaleString()])
        })
        todayPurchases.forEach(p => {
            rows.push(["Purchase Bill", p.id, p.total_amount, "0", "0", `-${p.amount_paid}`, new Date(p.created_at).toLocaleString()])
        })
        todayCustPay.forEach(p => {
            rows.push(["Customer Payment", p.id, p.amount, "0", "0", p.amount, new Date(p.created_at).toLocaleString()])
        })
        todaySuppPay.forEach(p => {
            rows.push(["Supplier Payment", p.id, p.amount, "0", "0", `-${p.amount}`, new Date(p.created_at).toLocaleString()])
        })

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `vault_export_${dateFilter}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    // ACCRUAL PROFITS
    // ACCRUAL PROFITS
    const grossRevenue = todayInvoices.reduce((s, i) => s + parseFloat(String(i.subtotal || '0')), 0)
    const totalDiscount = todayInvoices.reduce((s, i) => s + parseFloat(String(i.discount || '0')), 0)
    const netRevenue = grossRevenue - totalDiscount
    const totalCogs = todayInvoices.reduce((s, i) => s + parseFloat(String(i.total_cogs || '0')), 0)

    const accrualProfit = netRevenue - totalCogs
    const profitMargin = netRevenue > 0 ? ((accrualProfit / netRevenue) * 100).toFixed(1) : '0'

    // CASH LIQUIDITY
    const invoiceCashIn = todayInvoices.reduce((s, i) => s + parseFloat(String(i.amount_paid || '0')), 0)
    const udhaariCashIn = todayCustPay.reduce((s, p) => s + parseFloat(String(p.amount || '0')), 0)

    const purchaseCashOut = todayPurchases.reduce((s, p) => s + parseFloat(String(p.amount_paid || '0')), 0)
    const supplierCashOut = todaySuppPay.reduce((s, p) => s + parseFloat(String(p.amount || '0')), 0)

    const totalCashCollected = invoiceCashIn + udhaariCashIn
    const totalCashPaid = purchaseCashOut + supplierCashOut
    const netCashDrawer = totalCashCollected - totalCashPaid

    const grossNewUdhaari = todayInvoices.reduce((s, i) => {
        const net = parseFloat(String(i.total_amount || '0'))
        const paid = parseFloat(String(i.amount_paid || '0'))
        return s + (net > paid ? net - paid : 0)
    }, 0) + todayImportedUdhaari.reduce((s, u) => s + parseFloat(String(u.old_balance || '0')), 0)

    const newUdhaariGenerated = grossNewUdhaari - udhaariCashIn

    const grossNewSupplierDebt = todayPurchases.reduce((s, p) => {
        const total = parseFloat(String(p.total_amount || '0'))
        const paid = parseFloat(String(p.amount_paid || '0'))
        return s + (total > paid ? total - paid : 0)
    }, 0) + todayImportedPayables.reduce((s, p) => s + parseFloat(String(p.current_balance || '0')), 0)

    const newSupplierDebtGenerated = grossNewSupplierDebt - supplierCashOut

    if (!isUnlocked) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 rounded-3xl shadow-xl p-10 text-center max-w-sm w-full">
                    <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Day-End Vault</h2>
                    <p className="text-[13px] text-slate-500 mb-8">Enter your 4-digit security PIN to access financial reports.</p>
                    <input autoFocus type="password" maxLength={4} value={pin} onFocus={e => e.target.select()} onChange={e => {
                        setPin(e.target.value)
                        if (e.target.value === VAULT_PIN) setIsUnlocked(true)
                    }} placeholder="• • • •" className="text-center text-3xl tracking-[1em] w-full border-2 border-slate-200 py-3 rounded-2xl mb-4 focus:border-indigo-500 outline-none transition-all font-bold" />
                    <button onClick={() => { if (pin === VAULT_PIN) setIsUnlocked(true); else { setPin(''); alert('Wrong PIN') } }} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 hidden">
                        Unlock Vault
                    </button>
                </motion.div>
            </div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <BarChart2 className="w-8 h-8 text-indigo-500" /> Day-End Vault
                    </h1>
                    <p className="text-[13px] text-slate-500 mt-1">Exact gross profit derived from COGS vs Revenue this cycle.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 p-1 rounded-lg flex items-center shadow-sm">
                        <button onClick={() => setDateFilter('TODAY')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === 'TODAY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Today</button>
                        <button onClick={() => setDateFilter('7D')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === '7D' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>7 Days</button>
                        <button onClick={() => setDateFilter('30D')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === '30D' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>30 Days</button>
                    </div>
                    <button onClick={exportCSV} className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Financial HUD */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Net Revenue</p>
                    <p className="text-xl font-black text-slate-800">₹{netRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total COGS</p>
                    <p className="text-xl font-black text-rose-500">₹{totalCogs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 shadow-xl shadow-indigo-600/20">
                    <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest mb-1.5">Accrual Profit ({profitMargin}%)</p>
                    <p className="text-xl font-black text-white">₹{accrualProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-emerald-600 rounded-2xl p-5 shadow-xl shadow-emerald-600/20">
                    <p className="text-[11px] font-bold text-emerald-200 uppercase tracking-widest mb-1.5">Net Drawer Cash</p>
                    <p className="text-xl font-black text-white">₹{netCashDrawer.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1.5 flex flex-col">
                        <span>Net Receivable</span>
                        <span className="text-[9px] opacity-70 mt-0.5">(Given vs Recovered)</span>
                    </p>
                    <p className="text-xl font-black text-amber-600">₹{newUdhaariGenerated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest mb-1.5 flex flex-col">
                        <span>Net Account Payable</span>
                        <span className="text-[9px] opacity-70 mt-0.5">(Taken vs Paid)</span>
                    </p>
                    <p className="text-xl font-black text-rose-600">₹{newSupplierDebtGenerated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            {/* Invoice Log */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-500" />
                    <h2 className="font-bold text-[14px] text-slate-900">Today's Invoice Log ({todayInvoices.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Invoice ID</th>
                                <th className="px-5 py-3 text-right text-slate-400">Time</th>
                                <th className="px-5 py-3 text-right">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {todayInvoices.length === 0 ? (
                                <tr><td colSpan={8} className="px-5 py-12 text-center text-slate-400">No sales recorded today.</td></tr>
                            ) : todayInvoices.map(inv => {
                                const sale = parseFloat(inv.subtotal)
                                const cogs = parseFloat(inv.total_cogs)
                                const discount = parseFloat(inv.discount)
                                const profit = (sale - discount) - cogs
                                const paid = parseFloat(inv.amount_paid)
                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">{inv.id.split('-')[0]}...</td>
                                        <td className="px-5 py-3 text-right font-bold text-slate-800">₹{sale.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-rose-500 font-semibold">-₹{discount.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-amber-600 font-semibold">₹{cogs.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right font-black text-emerald-700">₹{profit.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right font-bold text-indigo-600 bg-indigo-50/30">₹{paid.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-slate-400">{new Date(inv.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => fetchInvoiceReceipt(inv.id)} disabled={isFetchingReceipt} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded disabled:opacity-50 inline-block"><Eye className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Purchase Log */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mt-6">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-rose-500" />
                    <h2 className="font-bold text-[14px] text-slate-900">Today's Purchase Log ({todayPurchases.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3">Purchase ID</th>
                                <th className="px-5 py-3 text-right">Total Amount</th>
                                <th className="px-5 py-3 text-right bg-rose-50/50">Cash Issued</th>
                                <th className="px-5 py-3 text-right text-amber-600">Debt Generated</th>
                                <th className="px-5 py-3 text-right text-slate-400">Time</th>
                                <th className="px-5 py-3 text-right">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {todayPurchases.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No purchases recorded today.</td></tr>
                            ) : todayPurchases.map(pur => {
                                const total = parseFloat(pur.total_amount)
                                const paid = parseFloat(pur.amount_paid)
                                const debt = total > paid ? total - paid : 0
                                return (
                                    <tr key={pur.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">{pur.id.split('-')[0]}...</td>
                                        <td className="px-5 py-3 text-right font-bold text-slate-800">₹{total.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right font-bold text-rose-600 bg-rose-50/30">₹{paid.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-amber-600 font-semibold">₹{debt.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-slate-400">{new Date(pur.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => fetchPurchaseReceipt(pur.id)} disabled={isFetchingReceipt} className="p-1 text-rose-500 hover:bg-rose-50 rounded disabled:opacity-50 inline-block"><Eye className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Receipt Viewer Modals */}
            {viewInvoiceData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-500" /> Invoice Preview</h3>
                            <button onClick={() => setViewInvoiceData(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 h-[400px] overflow-y-auto bg-slate-50 flex justify-center pb-12">
                            <div className="w-[80mm] bg-white shadow-sm p-4 relative" style={{ minHeight: '100px' }}>
                                <SharedThermalReceipt
                                    variant="sale"
                                    language="MAR" // Defaulting to ENG for reprint
                                    shopInfo={shop}
                                    billRef={`INV-S0${viewInvoiceData.invoice.id.split('-')[0].toUpperCase()}`}
                                    customerOrSupplierName={viewInvoiceData.customerName}
                                    cart={viewInvoiceData.items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) }))}
                                    subtotal={parseFloat(viewInvoiceData.invoice.subtotal)}
                                    discount={parseFloat(viewInvoiceData.invoice.discount)}
                                    netPayable={parseFloat(viewInvoiceData.invoice.total_amount)}
                                    amountPaid={parseFloat(viewInvoiceData.invoice.amount_paid)}
                                    newDueAdded={parseFloat(viewInvoiceData.invoice.total_amount) - parseFloat(viewInvoiceData.invoice.amount_paid)}
                                    oldDue={viewInvoiceData.customerOldDue}
                                    timestamp={viewInvoiceData.invoice.created_at}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <button onClick={() => window.print()} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:scale-95 transition-all">
                                <Printer className="w-4 h-4" /> Export to Thermal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewPurchaseData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-rose-500" /> AP Entry Preview</h3>
                            <button onClick={() => setViewPurchaseData(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 h-[400px] overflow-y-auto bg-slate-50 flex justify-center pb-12">
                            <div className="w-[80mm] bg-white shadow-sm p-4 relative" style={{ minHeight: '100px' }}>
                                <SharedThermalReceipt
                                    variant="purchase"
                                    language="MAR" // Defaulting to ENG for reprint
                                    shopInfo={shop}
                                    billRef={`INV-P0${viewPurchaseData.bill.id.split('-')[0].toUpperCase()}`}
                                    customerOrSupplierName={viewPurchaseData.supplierName}
                                    cart={viewPurchaseData.items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) }))}
                                    subtotal={parseFloat(viewPurchaseData.bill.total_amount)}
                                    discount={0}
                                    netPayable={parseFloat(viewPurchaseData.bill.total_amount)}
                                    amountPaid={parseFloat(viewPurchaseData.bill.amount_paid)}
                                    newDueAdded={parseFloat(viewPurchaseData.bill.total_amount) - parseFloat(viewPurchaseData.bill.amount_paid)}
                                    oldDue={viewPurchaseData.supplierOldDue}
                                    timestamp={viewPurchaseData.bill.created_at}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <button onClick={() => window.print()} className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:scale-95 transition-all">
                                <Printer className="w-4 h-4" /> Export to Thermal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Wrapper */}
            {(viewInvoiceData || viewPurchaseData) && (
                <div className="hidden print:block absolute inset-0 bg-white z-[99999]">
                    <div className="print-section" style={{ width: '80mm', margin: '0 auto', padding: '4mm' }}>
                        {viewInvoiceData && (
                            <SharedThermalReceipt
                                variant="sale"
                                language="MAR"
                                shopInfo={shop}
                                billRef={`INV-S0${viewInvoiceData.invoice.id.split('-')[0].toUpperCase()}`}
                                customerOrSupplierName={viewInvoiceData.customerName}
                                cart={viewInvoiceData.items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) }))}
                                subtotal={parseFloat(viewInvoiceData.invoice.subtotal)}
                                discount={parseFloat(viewInvoiceData.invoice.discount)}
                                netPayable={parseFloat(viewInvoiceData.invoice.total_amount)}
                                amountPaid={parseFloat(viewInvoiceData.invoice.amount_paid)}
                                newDueAdded={parseFloat(viewInvoiceData.invoice.total_amount) - parseFloat(viewInvoiceData.invoice.amount_paid)}
                                oldDue={viewInvoiceData.customerOldDue}
                                timestamp={viewInvoiceData.invoice.created_at}
                            />
                        )}
                        {viewPurchaseData && (
                            <SharedThermalReceipt
                                variant="purchase"
                                language="MAR"
                                shopInfo={shop}
                                billRef={`INV-P0${viewPurchaseData.bill.id.split('-')[0].toUpperCase()}`}
                                customerOrSupplierName={viewPurchaseData.supplierName}
                                cart={viewPurchaseData.items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) }))}
                                subtotal={parseFloat(viewPurchaseData.bill.total_amount)}
                                discount={0}
                                netPayable={parseFloat(viewPurchaseData.bill.total_amount)}
                                amountPaid={parseFloat(viewPurchaseData.bill.amount_paid)}
                                newDueAdded={parseFloat(viewPurchaseData.bill.total_amount) - parseFloat(viewPurchaseData.bill.amount_paid)}
                                oldDue={viewPurchaseData.supplierOldDue}
                                timestamp={viewPurchaseData.bill.created_at}
                            />
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    )
}
