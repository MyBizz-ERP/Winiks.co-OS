'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, Calendar, FileText, X, Printer, Eye, Trash2, Loader2, Download } from 'lucide-react'
import ReceiptPreview from '../pos/ReceiptPreview'
import { exportToCSV } from '../utils/csvExport'
import { deleteSingleInvoiceAction, reverseAndDestroyInvoiceAction } from './actions'
import { useRouter } from 'next/navigation'
import { Edit3 } from 'lucide-react'

export default function ClientSalesHistory({ initialInvoices, shopId, shopInfo }: { initialInvoices: any[], shopId: string, shopInfo: any }) {
    const [searchTerm, setSearchTerm] = useState('')

    // Modal & Fetch States
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
    const [invoiceItems, setInvoiceItems] = useState<any[]>([])
    const [loadingItems, setLoadingItems] = useState(false)

    const router = useRouter()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // Filter Logic
    const filteredInvoices = initialInvoices.filter(inv => {
        return (inv.customer_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    })

    const supabase = createClient()

    async function viewInvoiceDetails(invoice: any) {
        setSelectedInvoice(invoice)
        setLoadingItems(true)
        setInvoiceItems([]) // Clear previous items instantly

        // Fetch exactly what was purchased in this historical transaction
        const { data, error } = await supabase.rpc('wh_get_invoice_items', {
            p_shop_id: shopId,
            p_invoice_id: invoice.id
        })

        if (!error && data) {
            setInvoiceItems(data)
        } else {
            console.error("Failed to load invoice items:", error)
        }
        setLoadingItems(false)
    }

    function printHistoricalReceipt() {
        if (typeof window !== 'undefined') {
            window.print()
        }
    }

    async function handleEditBill(invoice: any) {
        if (!confirm("WARNING: Editing this bill will permanently reverse all Stock deductions and Udhaari balances associated with it. You will be redirected to the POS to re-bill. Proceed?")) return;

        setDeletingId(invoice.id)

        const { data: items, error: itemsErr } = await supabase.rpc('wh_get_invoice_items', {
            p_shop_id: shopId,
            p_invoice_id: invoice.id
        })

        if (itemsErr || !items) {
            alert("Failed to load invoice items for editing.")
            setDeletingId(null)
            return
        }

        const res = await reverseAndDestroyInvoiceAction(invoice.id)

        if (res.error) {
            alert(res.error)
            setDeletingId(null)
            return
        }

        const posCart = items.map((i: any) => ({
            product_id: i.product_id, // crucial for re-detecting
            id: i.product_id,
            name: i.product_name,
            qty: i.quantity,
            price: i.unit_price,
            total: i.total_price,
            unit: 'PCS'
        }))

        const posCust = invoice.customer_id ? {
            id: invoice.customer_id,
            name: invoice.customer_name,
            total_credit: invoice.udhaari_added > 0 ? invoice.total_credit : 0,
            phone: invoice.customer_phone || ''
        } : null

        localStorage.setItem('mybizz_pos_cart', JSON.stringify(posCart))
        localStorage.setItem('mybizz_pos_cust', JSON.stringify(posCust))

        router.push('/erp/wholesale/pos')
    }

    async function handleDeleteBill(invoice: any) {
        if (!confirm("Are you sure you want to permanently delete this bill? This will NOT affect Udhaari or Stock math. For complete reversal, use 'Edit Bill' instead.")) return;

        const forceBackup = confirm("MANDATORY SECURE BACKUP:\nYou must download this bill's CSV metadata backup before permanently deleting it. Click OK to download backup and permanently destroy the bill.")
        if (!forceBackup) return alert("Deletion canceled. Data backup is strictly required.")

        // Download Backup
        exportToCSV('DELETED_BILL_BACKUP_' + invoice.id + '.csv', [{ id: invoice.id, customer: invoice.customer_name, grand_total: invoice.grand_total, date: invoice.created_at, payment_mode: invoice.payment_mode }])

        setDeletingId(invoice.id)
        const res = await deleteSingleInvoiceAction(invoice.id)
        if (res.error) {
            alert(res.error)
        } else {
            router.refresh()
        }
        setDeletingId(null)
    }

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by customer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-800"
                    />
                </div>



                <button
                    onClick={() => exportToCSV('sales_history_export.csv', filteredInvoices)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm flex items-center justify-center text-sm transition active:scale-95 whitespace-nowrap lg:ml-auto"
                >
                    <Download className="w-4 h-4 mr-2" /> EXPORT CSV
                </button>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left whitespace-nowrap min-w-[850px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Customer Name</th>
                                <th className="px-6 py-4">Payment Mode</th>
                                <th className="px-6 py-4 text-right">Added to Udhaari</th>
                                <th className="px-6 py-4 text-right">Grand Total</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.length > 0 ? filteredInvoices.map(invoice => {
                                const dateObj = new Date(invoice.created_at)
                                return (
                                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 text-sm">
                                                {dateObj.toLocaleDateString('en-GB')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {invoice.customer_name || 'Walk-in Customer'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-block px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                {invoice.payment_mode === 'cash' ? 'CASH' : invoice.payment_mode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-amber-600">
                                            {invoice.past_due > 0 ? `+ ₹${invoice.past_due}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-lg text-emerald-700 bg-emerald-50/30">
                                            ₹ {invoice.grand_total.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => viewInvoiceDetails(invoice)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition shadow-sm"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditBill(invoice)}
                                                    disabled={deletingId === invoice.id}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition shadow-sm disabled:opacity-50"
                                                    title="Edit & Reverse Bill"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBill(invoice)}
                                                    disabled={deletingId === invoice.id}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition shadow-sm disabled:opacity-50"
                                                >
                                                    {deletingId === invoice.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-medium">
                                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        No sales history found for these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col md:flex-row border border-slate-200 animate-in zoom-in-95">

                        {/* LEFT: DIGITAL EXPLORER */}
                        <div className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200">
                            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Invoice Details</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {selectedInvoice.id}</p>
                                </div>
                                <button
                                    onClick={printHistoricalReceipt}
                                    className="bg-slate-900 hover:bg-slate-700 text-white font-bold py-2 px-5 rounded-lg flex items-center gap-2 shadow-md transition"
                                >
                                    <Printer className="w-4 h-4" /> Print Duplicate
                                </button>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Billed</p>
                                        <p className="text-2xl font-black text-slate-800">₹{selectedInvoice.subtotal}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Previous Udhaari Appended</p>
                                        <p className="text-2xl font-black text-amber-600">₹{selectedInvoice.past_due}</p>
                                    </div>
                                </div>

                                <h3 className="text-sm font-black text-slate-800 mb-3 ml-2 uppercase tracking-wide">Purchased Items</h3>
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    {loadingItems ? (
                                        <div className="p-8 text-center text-slate-500 font-bold animate-pulse">
                                            Retrieving cart data from vault...
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                                                <tr>
                                                    <th className="px-4 py-3">Item</th>
                                                    <th className="px-4 py-3 text-center">Qty</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {invoiceItems.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3 font-bold text-slate-800">{item.product_name}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-500 text-center">{item.qty}</td>
                                                        <td className="px-4 py-3 font-black text-slate-900 text-right">₹{item.total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: ACTUAL RECEIPT VIEWER */}
                        <div className="md:w-96 bg-slate-300 flex flex-col relative overflow-hidden">
                            <button onClick={() => setSelectedInvoice(null)} className="absolute top-4 right-4 z-10 bg-slate-900/50 hover:bg-red-500 text-white rounded-full p-2 backdrop-blur-md transition">
                                <X className="h-5 w-5" />
                            </button>
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {/* Using the exact existing Receipt Template logic! */}
                                <div className="bg-white shadow-2xl p-6 mx-auto" style={{ width: '80mm', minHeight: '100mm' }}>
                                    <ReceiptPreview
                                        lang="en"
                                        shopInfo={shopInfo}
                                        customer={{ name: selectedInvoice.customer_name || 'Cash Customer' }}
                                        cart={invoiceItems.map(i => ({
                                            name: i.product_name,
                                            quantity: i.qty,
                                            price: i.price,
                                            total: i.total
                                        }))}
                                        grandTotal={selectedInvoice.subtotal}
                                        amountReceived={selectedInvoice.grand_total.toString()}
                                        onClose={() => { }}
                                        isEmbedded={true}
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-slate-800 text-center text-xs font-bold text-slate-400">
                                This preview accurately depicts the physical thermal print.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
