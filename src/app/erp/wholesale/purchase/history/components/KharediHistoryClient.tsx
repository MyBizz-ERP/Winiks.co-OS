'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Search, Download, ChevronDown, ChevronUp, Printer, ArrowLeftRight, Package, Calendar, FileText, CheckCircle2, Clock, X, ExternalLink, RotateCcw } from 'lucide-react'
import SharedThermalReceipt from '../../../components/SharedThermalReceipt'
import { exportKharediHistoryPDF, exportSinglePurchaseBillPDF } from '@/utils/historyPdfExport'
import { voidAndClonePurchaseBill } from '../../actions'
import Link from 'next/link'

interface PurchaseItem {
    id: string
    product_id: string
    product_name: string
    product_name_mr: string
    quantity: number
    buy_rate: number
    sell_rate: number
    total_amount: number
}

interface PurchaseBill {
    id: string
    purchase_no: number
    supplier_id: string | null
    supplier_name: string
    supplier_phone: string | null
    supplier_balance: number
    total_amount: number
    amount_paid: number
    payment_method: string
    created_at: string
    items: PurchaseItem[]
}

export default function KharediHistoryClient({ bills, shop }: { bills: PurchaseBill[], shop: any }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL')
    const [expandedBillId, setExpandedBillId] = useState<string | null>(null)
    const [thermalBill, setThermalBill] = useState<PurchaseBill | null>(null)
    const [isExportingPDF, setIsExportingPDF] = useState(false)
    const [voidingId, setVoidingId] = useState<string | null>(null)

    const handleVoidAndClone = async (bill: PurchaseBill) => {
        const billNo = `PUR-${String(bill.purchase_no).padStart(4, '0')}`
        if (!confirm(`Are you absolutely sure you want to VOID purchase bill ${billNo} and move it back to active Kharedi?\n\nThis will instantly reverse all added stock and restore supplier payable balance.`)) {
            return
        }
        setVoidingId(bill.id)
        try {
            const res = await voidAndClonePurchaseBill(bill.id)
            if (res?.success && res.payload) {
                localStorage.setItem('mybizz_void_clone_kharedi_payload', JSON.stringify(res.payload))
                router.push('/erp/wholesale/purchase')
            } else {
                alert('Failed to void and clone purchase bill.')
            }
        } catch (e: any) {
            console.error('Void & clone purchase error:', e)
            alert(e.message || 'Failed to void and clone purchase bill.')
        } finally {
            setVoidingId(null)
        }
    }

    const handleDownloadSingleBillPDF = (bill: PurchaseBill) => {
        try {
            exportSinglePurchaseBillPDF({
                id: bill.id,
                purchase_no: bill.purchase_no,
                created_at: bill.created_at,
                supplier_name: bill.supplier_name,
                payment_method: bill.payment_method,
                total_amount: bill.total_amount,
                amount_paid: bill.amount_paid,
                items: bill.items.map(i => ({
                    product_name: i.product_name,
                    name: i.product_name,
                    quantity: i.quantity,
                    qty: i.quantity,
                    buy_rate: i.buy_rate,
                    total_amount: i.total_amount
                }))
            }, shop)
        } catch (e) {
            console.error('Single bill PDF export error:', e)
            alert('Failed to generate PDF for this purchase bill.')
        }
    }

    // Filtering logic
    const filterStart = new Date()
    filterStart.setHours(0, 0, 0, 0)
    if (dateFilter === '7D') filterStart.setDate(filterStart.getDate() - 7)
    if (dateFilter === '30D') filterStart.setDate(filterStart.getDate() - 30)

    const filtered = bills.filter(b => {
        // Date check
        if (dateFilter !== 'ALL') {
            const bDate = new Date(b.created_at)
            if (bDate < filterStart) return false
        }
        // Search query check
        if (!search.trim()) return true
        const q = search.toLowerCase()
        const purchaseStr = `pur-${String(b.purchase_no).padStart(4, '0')}`.toLowerCase()
        const matchSupplier = b.supplier_name.toLowerCase().includes(q)
        const matchId = b.id.toLowerCase().includes(q)
        const matchNo = purchaseStr.includes(q) || String(b.purchase_no).includes(q)
        const matchItem = b.items.some(i => i.product_name.toLowerCase().includes(q) || (i.product_name_mr && i.product_name_mr.toLowerCase().includes(q)))
        return matchSupplier || matchId || matchNo || matchItem
    })

    // KPI Metrics
    const totalPurchases = filtered.reduce((acc, b) => acc + (b.total_amount || 0), 0)
    const totalPaid = filtered.reduce((acc, b) => acc + (b.amount_paid || 0), 0)
    const totalDue = filtered.reduce((acc, b) => acc + Math.max(0, (b.total_amount || 0) - (b.amount_paid || 0)), 0)

    const handleDownloadPDF = () => {
        setIsExportingPDF(true)
        try {
            exportKharediHistoryPDF(filtered, shop, dateFilter)
        } catch (e) {
            console.error('PDF export failed', e)
            alert('Failed to export PDF statement.')
        } finally {
            setIsExportingPDF(false)
        }
    }

    const handleExportCSV = () => {
        const headers = ['Purchase No', 'Date', 'Supplier', 'Payment Method', 'Total Amount', 'Amount Paid', 'Debt Added', 'Items Count', 'Item Details']
        const rows = filtered.map(b => {
            const billNo = `PUR-${String(b.purchase_no).padStart(4, '0')}`
            const date = new Date(b.created_at).toLocaleString('en-IN')
            const itemsStr = b.items.map(i => `${i.product_name} (${i.quantity}x @ ${i.buy_rate})`).join('; ')
            const due = Math.max(0, b.total_amount - b.amount_paid)
            return [
                billNo,
                `"${date}"`,
                `"${b.supplier_name}"`,
                b.payment_method,
                b.total_amount,
                b.amount_paid,
                due,
                b.items.length,
                `"${itemsStr}"`
            ].join(',')
        })
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `Kharedi_History_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kharedi Purchase History</h1>
                            <p className="text-sm text-slate-500 font-medium">Audit inward vendor bills, inspect cost breakdowns, and export complete audit statements.</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isExportingPDF || filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 text-blue-600" />
                        {isExportingPDF ? 'Generating...' : 'Export PDF Backup (A4)'}
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <Download className="w-4 h-4 text-emerald-600" />
                        Export CSV
                    </button>
                    <Link
                        href="/erp/wholesale/purchase"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                    >
                        + New Kharedi Run
                    </Link>
                </div>
            </div>

            {/* KPI Metric Banners */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-slate-200 bg-white shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Total Inward Runs</p>
                    <p className="text-2xl font-black text-slate-800 mt-1">{filtered.length}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Purchases recorded</p>
                </Card>
                <Card className="p-4 border-slate-200 bg-white shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600">Total Purchases</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">₹{totalPurchases.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Gross cost inward</p>
                </Card>
                <Card className="p-4 border-slate-200 bg-white shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600">Total Paid Out</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalPaid.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Disbursed cash/online</p>
                </Card>
                <Card className="p-4 border-slate-200 bg-white shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-widest text-rose-600">Outstanding Vendor Debt</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">₹{totalDue.toLocaleString('en-IN')}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Pending supplier balance</p>
                </Card>
            </div>

            {/* Search & Date Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by supplier, PUR-0001, item name..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                    {(['TODAY', '7D', '30D', 'ALL'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setDateFilter(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${dateFilter === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bill List Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No purchase bills found matching the selected filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(bill => {
                            const isExpanded = expandedBillId === bill.id
                            const billNo = `PUR-${String(bill.purchase_no).padStart(4, '0')}`
                            const dateStr = new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            const timeStr = new Date(bill.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            const due = Math.max(0, bill.total_amount - bill.amount_paid)

                            return (
                                <div key={bill.id} className="transition-colors hover:bg-slate-50/60">
                                    {/* Main Row */}
                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                                                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                title="Expand line items"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                                        {billNo}
                                                    </span>
                                                    <span className="font-bold text-sm text-slate-900">{bill.supplier_name}</span>
                                                    {bill.supplier_phone && (
                                                        <span className="text-[11px] text-slate-400 font-medium">({bill.supplier_phone})</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {dateStr} at {timeStr} • {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 self-end md:self-auto">
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900">₹{bill.total_amount.toLocaleString('en-IN')}</p>
                                                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-medium">Paid: ₹{bill.amount_paid.toLocaleString('en-IN')}</span>
                                                    {due > 0 ? (
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                                            Due: ₹{due.toLocaleString('en-IN')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                            CLEARED
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-wider ${bill.payment_method === 'ONLINE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {bill.payment_method}
                                            </span>

                                            <button
                                                onClick={() => setThermalBill(bill)}
                                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                                title="Print Thermal Receipt"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDownloadSingleBillPDF(bill)}
                                                className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/60 transition-colors"
                                                title="Download Bill PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>

                                            <button
                                                onClick={() => handleVoidAndClone(bill)}
                                                disabled={voidingId === bill.id}
                                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                                                title="Void & Clone back to active Kharedi"
                                            >
                                                <RotateCcw className={`w-3.5 h-3.5 ${voidingId === bill.id ? 'animate-spin' : ''}`} />
                                                <span className="hidden sm:inline">{voidingId === bill.id ? 'Voiding...' : 'Void & Clone'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expandable Line Items Drawer */}
                                    {isExpanded && (
                                        <div className="bg-slate-50/70 border-t border-slate-100 p-4 pl-14">
                                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                                                Inward Item Line Breakdown
                                            </h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead>
                                                        <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 pb-1">
                                                            <th className="py-1.5">Product Name</th>
                                                            <th className="py-1.5 text-center">Qty</th>
                                                            <th className="py-1.5 text-right">Cost Rate</th>
                                                            <th className="py-1.5 text-right">Sell Rate</th>
                                                            <th className="py-1.5 text-right">Line Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {bill.items.map((item, idx) => (
                                                            <tr key={item.id || idx}>
                                                                <td className="py-2 font-semibold text-slate-800">
                                                                    {item.product_name}
                                                                    {item.product_name_mr && (
                                                                        <span className="text-emerald-700 text-[11px] ml-1.5">({item.product_name_mr})</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 text-center font-bold text-slate-700">{item.quantity}</td>
                                                                <td className="py-2 text-right font-mono text-amber-700 font-bold">₹{item.buy_rate.toFixed(2)}</td>
                                                                <td className="py-2 text-right font-mono text-slate-600">₹{item.sell_rate.toFixed(2)}</td>
                                                                <td className="py-2 text-right font-mono font-bold text-slate-900">₹{item.total_amount.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                                                <span className="text-slate-400 font-medium">Export voucher or re-open bill into active Kharedi:</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDownloadSingleBillPDF(bill)}
                                                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-blue-600" /> Download PDF Voucher
                                                    </button>
                                                    <button
                                                        onClick={() => handleVoidAndClone(bill)}
                                                        disabled={voidingId === bill.id}
                                                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                                                    >
                                                        <RotateCcw className={`w-3.5 h-3.5 ${voidingId === bill.id ? 'animate-spin' : ''}`} />
                                                        {voidingId === bill.id ? 'Reversing Stock & Voiding...' : 'Void & Re-open in Kharedi Setup'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            {/* Thermal Print Receipt Modal */}
            {thermalBill && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                        <button
                            onClick={() => setThermalBill(null)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="font-bold text-slate-800 mb-4 text-center">Inward Purchase Receipt</h3>
                        <SharedThermalReceipt
                            variant="purchase"
                            language="MAR"
                            shopInfo={{
                                name: shop.name,
                                name_mr: shop.name_mr,
                                address: shop.address,
                                address_mr: shop.address_mr,
                                phone: shop.phone
                            }}
                            billRef={`PUR-${String(thermalBill.purchase_no).padStart(4, '0')}`}
                            customerOrSupplierName={thermalBill.supplier_name}
                            cart={thermalBill.items.map(i => ({
                                name: i.product_name,
                                name_mr: i.product_name_mr,
                                qty: i.quantity,
                                rate: i.buy_rate,
                                total: i.total_amount
                            }))}
                            subtotal={thermalBill.total_amount}
                            netPayable={thermalBill.total_amount}
                            amountPaid={thermalBill.amount_paid}
                            oldDue={thermalBill.supplier_balance || 0}
                            newDueAdded={Math.max(0, thermalBill.total_amount - thermalBill.amount_paid)}
                            paymentMethod={thermalBill.payment_method === 'ONLINE' ? 'ONLINE' : 'CASH'}
                            timestamp={thermalBill.created_at}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                onClick={() => window.print()}
                                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-all"
                            >
                                <Printer className="w-4 h-4" /> Thermal Print
                            </button>
                            <button
                                onClick={() => handleDownloadSingleBillPDF(thermalBill)}
                                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                            >
                                <Download className="w-4 h-4" /> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
