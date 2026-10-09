'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Package, Search, Download, Printer, Edit, X, Receipt, Eye } from 'lucide-react'
import SharedThermalReceipt from '../../components/SharedThermalReceipt'
import { getPurchaseDetails, updatePurchaseBill, updateSupplierProfile } from '../actions'

export default function ClientAccountsPayable({ data, shop }: { data: any[], shop: any }) {
    const [search, setSearch] = useState('')
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL')

    const [selectedBills, setSelectedBills] = useState<string[]>([])
    const [hasDownloaded, setHasDownloaded] = useState(false)
    const [isExportingPDF, setIsExportingPDF] = useState(false)

    const handleDownloadPDF = async () => {
        setIsExportingPDF(true)
        try {
            const { toPng } = await import('html-to-image')
            const { jsPDF } = await import('jspdf')
            const element = document.getElementById('receipt-pdf-target-ap')
            if (!element) return

            const dataUrl = await toPng(element, { quality: 1, backgroundColor: '#ffffff', pixelRatio: 2 })
            const pdf = new jsPDF({
                unit: 'in',
                format: [3.2, 5.5],
                orientation: 'portrait'
            })
            pdf.addImage(dataUrl, 'PNG', 0, 0, 3.2, 5.5)
            pdf.save(`Purchase_Invoice_${printData.bill.purchase_no || printData.bill.id}.pdf`)
        } catch (e) {
            console.error(e)
        } finally {
            setIsExportingPDF(false)
        }
    }

    const [editingBill, setEditingBill] = useState<any>(null)
    const [editTotal, setEditTotal] = useState('')
    const [editPaid, setEditPaid] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const [editingSupplier, setEditingSupplier] = useState<any>(null)
    const [supplierName, setSupplierName] = useState('')
    const [supplierPhone, setSupplierPhone] = useState('')
    const [supplierBalance, setSupplierBalance] = useState('')

    const [printData, setPrintData] = useState<any>(null)
    const [isFetchingPrint, setIsFetchingPrint] = useState(false)

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)

    const filtered = data.filter(i =>
        i.id.toLowerCase().includes(search.toLowerCase()) ||
        (i.supplier_name && i.supplier_name.toLowerCase().includes(search.toLowerCase()))
    )

    const filterStart = new Date(); filterStart.setHours(0, 0, 0, 0)
    if (dateFilter === '7D') filterStart.setDate(filterStart.getDate() - 7)
    if (dateFilter === '30D') filterStart.setDate(filterStart.getDate() - 30)

    const dateSegmented = (dateFilter === 'ALL' ? filtered : filtered.filter(i => i.created_at && new Date(i.created_at) >= filterStart)).filter(b => !b.is_archived)

    const toggleSelect = (id: string) => {
        if (selectedBills.includes(id)) {
            setSelectedBills(selectedBills.filter(i => i !== id))
        } else {
            setSelectedBills([...selectedBills, id])
        }
        setHasDownloaded(false)
    }

    const exportSelectedCSV = () => {
        const rows = [["Bill Date", "Type", "Bill ID", "Supplier Name", "Total Purchased", "Cash Paid Out", "Debt Logged"]]
        dateSegmented.filter(b => selectedBills.includes(b.id)).forEach(bill => {
            const debt = bill.total_amount - bill.amount_paid
            rows.push([
                format(new Date(bill.created_at), 'dd MMM yyyy'),
                bill.type === 'PAYMENT' ? 'Payment' : 'Bill',
                bill.id,
                bill.supplier_name || 'N/A',
                bill.type === 'PAYMENT' ? '0' : bill.total_amount,
                bill.amount_paid,
                debt > 0 && bill.type !== 'PAYMENT' ? debt : '0'
            ])
        })
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `archived_ap_backup_${new Date().getTime()}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        setHasDownloaded(true)
    }

    const handleArchive = async () => {
        if (!hasDownloaded) {
            alert("You must download the backup CSV before deleting bills to prevent absolute loss.")
            return
        }
        if (confirm("Are you absolutely sure? The bills will be hidden from UI but preserved in Vault maths.")) {
            setIsSaving(true)
            await import('../actions').then(m => m.archivePurchaseBills(selectedBills))
            alert("Ghost Invoices Archived.")
            window.location.reload()
        }
    }

    const exportCSV = () => {
        const rows = [["Bill Date", "Type", "Bill ID", "Supplier Name", "Total Purchased", "Cash Paid Out", "Debt Logged"]]
        dateSegmented.forEach(bill => {
            const debt = bill.total_amount - bill.amount_paid
            rows.push([
                format(new Date(bill.created_at), 'dd MMM yyyy'),
                bill.type === 'PAYMENT' ? 'Payment' : 'Bill',
                bill.id,
                bill.supplier_name || 'N/A',
                bill.type === 'PAYMENT' ? '0' : bill.total_amount,
                bill.amount_paid,
                debt > 0 && bill.type !== 'PAYMENT' ? debt : '0'
            ])
        })
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `accounts_payable_${dateFilter}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    const openEditModal = (bill: any) => {
        setEditingBill(bill)
        setEditTotal(bill.total_amount)
        setEditPaid(bill.amount_paid)
    }

    const handleSaveEdit = async () => {
        if (!editingBill) return
        setIsSaving(true)
        try {
            await updatePurchaseBill(editingBill.id, parseFloat(editTotal), parseFloat(editPaid))
            setEditingBill(null)
            alert("Supplier Accounts Payable Ledger updated!")
            window.location.reload()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const openSupplierModal = (bill: any) => {
        setEditingSupplier(bill)
        setSupplierName(bill.supplier_name)
        setSupplierPhone(bill.supplier_phone || '')
        setSupplierBalance(bill.supplier_balance)
    }

    const handleSaveSupplier = async () => {
        if (!editingSupplier) return
        setIsSaving(true)
        const formData = new FormData()
        formData.append('name', supplierName)
        formData.append('phone', supplierPhone)
        formData.append('balance', supplierBalance)
        try {
            await updateSupplierProfile(editingSupplier.supplier_id, formData)
            setEditingSupplier(null)
            alert("Supplier Profile updated exclusively.")
            window.location.reload()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSaving(false)
        }
    }

    const viewReceipt = async (billId: string) => {
        setIsFetchingPrint(true)
        try {
            const res = await getPurchaseDetails(billId)
            if (res) {
                setPrintData(res)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsFetchingPrint(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Package className="w-8 h-8 text-rose-500" /> Accounts Payable
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Historical audit of all Kharedi Purchase Bills indicating core cash outflows.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={exportCSV}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Download className="w-4 h-4 text-rose-400" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 bg-white p-1.5 border border-slate-200 rounded-lg shadow-sm w-fit mx-auto lg:mx-0">
                <button onClick={() => setDateFilter('ALL')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>All Time</button>
                <button onClick={() => setDateFilter('TODAY')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === 'TODAY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Today</button>
                <button onClick={() => setDateFilter('7D')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === '7D' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>7 Days</button>
                <button onClick={() => setDateFilter('30D')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === '30D' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>30 Days</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Bill ID or Supplier Name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-4">Bill ID / Date</th>
                                <th className="px-5 py-4">Supplier Name</th>
                                <th className="px-5 py-4 text-right">Total Purchased</th>
                                <th className="px-5 py-4 text-right bg-rose-50/50 text-rose-700">Cash Paid Out</th>
                                <th className="px-5 py-4 text-right">Debt Logged</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {dateSegmented.map(bill => {
                                const debt = bill.total_amount - bill.amount_paid
                                const isPayment = bill.type === 'PAYMENT'
                                const isLegacy = bill.payment_method === 'LEGACY_B/F'
                                return (
                                    <tr key={bill.id} className={`${isPayment ? 'bg-emerald-50/20' : isLegacy ? 'bg-amber-50/20' : 'hover:bg-slate-50/50'} transition-colors`}>
                                        <td className="px-5 py-4">
                                            <div className={`font-mono font-bold text-[12px] ${isLegacy ? 'text-amber-700' : 'text-slate-900'}`}>
                                                {isPayment ? 'CASH PMT' : isLegacy ? 'OPENING BALANCE' : (bill.purchase_no ? `INV-P${bill.purchase_no.toString().padStart(4, '0')}` : bill.id.split('-')[0].toUpperCase())}
                                            </div>
                                            <div className="text-slate-500 text-[11px] mt-0.5">{format(new Date(bill.created_at), 'dd MMM yy, hh:mm a')}</div>
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-700">
                                            <div className="flex flex-col gap-0.5 group/sup">
                                                <div className="flex items-center gap-2">
                                                    {bill.supplier_name || 'Unknown Supplier'}
                                                    {bill.supplier_id && !isPayment && !isLegacy && (
                                                        <button onClick={() => openSupplierModal(bill)} className="p-1 opacity-0 group-hover/sup:opacity-100 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md transition-all">
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                {bill.supplier_id && (
                                                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        Rem: {parseFloat(bill.supplier_balance || '0') > 0 ? (
                                                            <span className="text-rose-500">₹{parseFloat(bill.supplier_balance || '0').toLocaleString('en-IN')}</span>
                                                        ) : (
                                                            <span className="text-emerald-500">₹0</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-medium text-slate-900">{isPayment ? '--' : formatCurrency(bill.total_amount)}</td>
                                        <td className={`px-5 py-4 text-right font-black ${isPayment ? 'text-emerald-600 bg-emerald-50/50' : isLegacy ? 'text-slate-400 bg-slate-50/50' : 'text-rose-600 bg-rose-50/30'}`}>{isLegacy ? '--' : formatCurrency(bill.amount_paid)}</td>
                                        <td className="px-5 py-4 text-right">
                                            {isPayment || isLegacy ? (
                                                <span className="font-bold text-slate-400">--</span>
                                            ) : debt > 0 ? (
                                                <span className="font-bold text-rose-500">+{formatCurrency(debt)}</span>
                                            ) : debt < 0 ? (
                                                <span className="font-bold text-emerald-500">{formatCurrency(debt)}</span>
                                            ) : (
                                                <span className="font-bold text-slate-300">₹0</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                {!isPayment && !isLegacy && (
                                                    <>
                                                        <button onClick={() => viewReceipt(bill.id)} disabled={isFetchingPrint} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 hover:bg-indigo-100 disabled:opacity-50"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => openEditModal(bill)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0 hover:bg-rose-100"><Edit className="w-4 h-4" /></button>
                                                    </>
                                                )}
                                                {isLegacy && (
                                                    <span className="text-[10px] uppercase font-bold text-amber-500/50 tracking-widest px-2">IMPORTED</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {dateSegmented.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400 font-medium tracking-wide">
                                        No purchase records found matching this search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Edit Bill Modal */}
            {editingBill && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-slate-800">Edit Purchase {editingBill.id.split('-')[0].toUpperCase()}</h2>
                            <button onClick={() => setEditingBill(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Bill Amount (₹)</label>
                                <input type="number" value={editTotal} onChange={e => setEditTotal(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Cash Paid Out (₹)</label>
                                <input type="number" value={editPaid} onChange={e => setEditPaid(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-rose-600" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Debt Created</label>
                                <div className="px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg font-black text-amber-600">
                                    ₹{(parseFloat(editTotal || '0') - parseFloat(editPaid || '0')).toFixed(2)}
                                </div>
                            </div>
                            <button onClick={handleSaveEdit} disabled={isSaving} className="w-full bg-slate-900 text-white font-bold py-3 text-sm rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 mt-4">
                                {isSaving ? 'Saving...' : 'Force AP Mutation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Supplier Profile Modal */}
            {editingSupplier && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-slate-800 text-sm">Edit Vendor Profile</h2>
                            <button onClick={() => setEditingSupplier(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Business Name</label>
                                <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Contact Number</label>
                                <input type="text" value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Absolute Kharedi Debt (₹)</label>
                                <input type="number" step="0.01" value={supplierBalance} onChange={e => setSupplierBalance(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-rose-600" />
                            </div>
                            <button onClick={handleSaveSupplier} disabled={isSaving} className="w-full bg-slate-900 text-white font-bold py-3 text-sm rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 mt-4">
                                {isSaving ? 'Syncing...' : 'Override Vendor Matrix'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Receipt Modal Wrapper */}
            {printData && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-rose-500" /> AP Entry Preview</h3>
                            <button onClick={() => setPrintData(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 h-[400px] overflow-y-auto bg-slate-50 flex justify-center pb-12">
                            <div id="receipt-pdf-target-ap" className="w-[80mm] bg-white shadow-sm p-4 relative" style={{ minHeight: '100px' }}>
                                <SharedThermalReceipt
                                    variant="purchase"
                                    language="MAR" // Defaulting to ENG for reprint
                                    shopInfo={shop}
                                    billRef={printData.bill.purchase_no ? `INV-P${printData.bill.purchase_no.toString().padStart(4, '0')}` : `INV-P0${printData.bill.id.split('-')[0].toUpperCase()}`}
                                    customerOrSupplierName={printData.supplierName}
                                    cart={printData.items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) }))}
                                    subtotal={parseFloat(printData.bill.total_amount)}
                                    discount={0}
                                    netPayable={parseFloat(printData.bill.total_amount)}
                                    amountPaid={parseFloat(printData.bill.amount_paid)}
                                    newDueAdded={parseFloat(printData.bill.total_amount) - parseFloat(printData.bill.amount_paid)}
                                    oldDue={printData.supplierOldDue} // Not strictly accurate to point-in-time, but sufficient for reprint
                                    timestamp={printData.bill.created_at}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-3">
                            <button onClick={() => window.print()} className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-200">
                                <Printer className="w-4 h-4" /> Thermal Print
                            </button>
                            <button onClick={handleDownloadPDF} disabled={isExportingPDF} className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50">
                                <Download className="w-4 h-4" /> {isExportingPDF ? 'Exporting...' : 'PDF Download'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Wrapper */}
            {printData && (
                <div className="hidden print:block absolute inset-0 bg-white z-[9999]">
                    <div className="print-section" style={{ width: '80mm', margin: '0 auto', padding: '4mm' }}>
                        <SharedThermalReceipt
                            variant="purchase"
                            language="MAR" // Defaulting to ENG for reprint
                            shopInfo={shop}
                            billRef={printData.bill.purchase_no ? `INV-P${printData.bill.purchase_no.toString().padStart(4, '0')}` : `INV-P0${printData.bill.id.split('-')[0].toUpperCase()}`}
                            customerOrSupplierName={printData.supplierName}
                            cart={printData.items.map((i: any) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) }))}
                            subtotal={parseFloat(printData.bill.total_amount)}
                            discount={0}
                            netPayable={parseFloat(printData.bill.total_amount)}
                            amountPaid={parseFloat(printData.bill.amount_paid)}
                            newDueAdded={parseFloat(printData.bill.total_amount) - parseFloat(printData.bill.amount_paid)}
                            oldDue={printData.supplierOldDue} // Not strictly accurate to point-in-time, but sufficient for reprint
                            timestamp={printData.bill.created_at}
                        />
                    </div>
                </div>
            )}
            {selectedBills.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-white p-4 shadow-2xl z-50 flex items-center justify-between md:pl-[256px]">
                    <div className="flex items-center gap-4">
                        <div className="bg-rose-600 font-bold px-3 py-1 rounded-md text-sm">
                            {selectedBills.length} Selected
                        </div>
                        <p className="text-sm font-medium text-slate-300 hidden sm:block">Archive these Kharedi records securely.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={exportSelectedCSV} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all">
                            <Download className="w-4 h-4" /> Backup [{selectedBills.length}]
                        </button>
                        <button onClick={handleArchive} disabled={!hasDownloaded} className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide rounded-lg flex items-center gap-2 transition-all">
                            <X className="w-4 h-4" /> Archive Ghost Bills
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
