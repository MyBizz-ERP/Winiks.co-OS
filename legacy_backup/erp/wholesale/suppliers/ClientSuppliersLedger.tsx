'use client'

import { useState } from 'react'
import { Plus, Search, Truck, ArrowRight, User, Briefcase, IndianRupee, Edit3, Check, X, Download } from 'lucide-react'
import { exportToCSV } from '../utils/csvExport'
import { addSupplier, editSupplier, commitPurchaseBill, recordSupplierPayment } from './actions'

export default function ClientSuppliersLedger({ initialSuppliers, initialPurchaseBills, products, shopId }: { initialSuppliers: any[], initialPurchaseBills: any[], products: any[], shopId: string }) {
    const [activeTab, setActiveTab] = useState<'suppliers' | 'bills'>('suppliers')
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)

    // Modals
    const [showAddSupplier, setShowAddSupplier] = useState(false)
    const [selectedEditTarget, setSelectedEditTarget] = useState<any | null>(null)
    const [selectedPaymentTarget, setSelectedPaymentTarget] = useState<any | null>(null)

    // Supplier Filtering
    const filteredSuppliers = initialSuppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    // Handlers
    async function handleAddSupplier(formData: FormData) {
        setLoading(true)
        const res = await addSupplier(formData)
        setLoading(false)
        if (res.success) setShowAddSupplier(false)
        else alert(res.error)
    }

    async function handleEditSupplier(formData: FormData) {
        setLoading(true)
        const res = await editSupplier(formData)
        setLoading(false)
        if (res.success) setSelectedEditTarget(null)
        else alert(res.error)
    }

    async function handleRecordPayment(formData: FormData) {
        setLoading(true)
        const res = await recordSupplierPayment(formData)
        setLoading(false)
        if (res.success) setSelectedPaymentTarget(null)
        else alert(res.error)
    }
    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Control Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`px-5 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'suppliers' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Supplier Ledger
                    </button>
                    <button
                        onClick={() => setActiveTab('bills')}
                        className={`px-5 py-2 font-bold text-sm rounded-lg transition ${activeTab === 'bills' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Purchase History
                    </button>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={() => exportToCSV(activeTab === 'suppliers' ? 'accounts_payable.csv' : 'kharedi_history.csv', activeTab === 'suppliers' ? filteredSuppliers : initialPurchaseBills)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm shadow-emerald-900/20 flex items-center text-sm transition active:scale-95 whitespace-nowrap"
                    >
                        <Download className="h-4 w-4 mr-1" /> EXPORT CSV
                    </button>
                    <button onClick={() => setShowAddSupplier(true)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-slate-900/20 flex items-center text-sm transition active:scale-95 whitespace-nowrap">
                        <Plus className="h-4 w-4 mr-1" /> Add Supplier
                    </button>
                </div>
            </div>

            {/* TAB: SUPPLIERS */}
            {activeTab === 'suppliers' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute inset-y-3 left-3 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Search suppliers or companies..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 w-full px-4 py-2 border border-slate-300 rounded-lg outline-none text-sm font-bold text-slate-800" />
                        </div>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-black tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Supplier Profile</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4 text-right">Accounts Payable (Debt)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSuppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{s.name}</div>
                                            {s.company && <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{s.company}</div>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{s.phone || 'N/A'}</td>
                                        <td className="px-6 py-4 text-right">
                                            {s.total_payable > 0 ? (
                                                <span className="bg-red-50 text-red-700 px-3 py-1 bg-white font-black border border-red-200 shadow-sm rounded-md">₹ {s.total_payable.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-slate-400 font-bold text-sm">₹ 0</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {s.total_payable > 0 && (
                                                    <button onClick={() => setSelectedPaymentTarget(s)} className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition" title="Record Payment">
                                                        <IndianRupee className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => setSelectedEditTarget(s)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition" title="Edit Profile">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: PURCHASE_BILLS */}
            {activeTab === 'bills' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 animate-in fade-in">
                    <h3 className="font-black text-slate-800 mb-4 tracking-tight">Recent Purchase Invoices (Kharedi)</h3>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden whitespace-nowrap min-w-[600px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-black tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Vendor / Supplier</th>
                                    <th className="px-4 py-3">Mode</th>
                                    <th className="px-4 py-3 text-right">Total Invoice Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {initialPurchaseBills.map(pb => {
                                    const d = new Date(pb.created_at)
                                    return (
                                        <tr key={pb.id}>
                                            <td className="px-4 py-3 text-sm font-bold text-slate-600">{d.toLocaleDateString('en-GB')}</td>
                                            <td className="px-4 py-3 font-bold text-slate-900">{pb.supplier_name || 'Cash Vendor'}</td>
                                            <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">{pb.payment_mode}</td>
                                            <td className="px-4 py-3 text-right font-black text-slate-800 bg-slate-50">₹ {pb.subtotal.toLocaleString()}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ADD SUPPLIER MODAL */}
            {showAddSupplier && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">New Supplier</h2>
                            <button onClick={() => setShowAddSupplier(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <form action={handleAddSupplier} className="p-6 space-y-4">
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Contact / Agent Name</label><input type="text" name="name" required className="w-full px-4 py-3 border rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Company Name</label><input type="text" name="company" className="w-full px-4 py-3 border rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input type="tel" name="phone" className="w-full px-4 py-3 border rounded-lg font-mono" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Existing Debt (Payable)</label><input type="number" name="total_payable" defaultValue="0" className="w-full px-4 py-3 border rounded-lg font-bold" /></div>
                            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-black py-4 mt-2 rounded-xl">SAVE SUPPLIER</button>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT SUPPLIER MODAL */}
            {selectedEditTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">Edit Supplier</h2>
                            <button onClick={() => setSelectedEditTarget(null)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <form action={handleEditSupplier} className="p-6 space-y-4">
                            <input type="hidden" name="id" value={selectedEditTarget.id} />
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Contact Name</label><input type="text" name="name" defaultValue={selectedEditTarget.name} required className="w-full px-4 py-3 border rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Company</label><input type="text" name="company" defaultValue={selectedEditTarget.company || ''} className="w-full px-4 py-3 border rounded-lg" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Phone</label><input type="tel" name="phone" defaultValue={selectedEditTarget.phone || ''} className="w-full px-4 py-3 border rounded-lg font-mono" /></div>
                            <div><label className="text-xs font-bold text-slate-500 uppercase">Accounts Payable</label><input type="number" name="total_payable" defaultValue={selectedEditTarget.total_payable} className="w-full px-4 py-3 border rounded-lg font-bold text-red-600 bg-red-50" /></div>
                            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 mt-2 rounded-xl">UPDATE</button>
                        </form>
                    </div>
                </div>
            )}

            {/* RECORD SUPPLIER PAYMENT MODAL */}
            {selectedPaymentTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-emerald-50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Clear Debt</h2>
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{selectedPaymentTarget.name}</p>
                            </div>
                            <button onClick={() => setSelectedPaymentTarget(null)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <form action={handleRecordPayment} className="p-6 space-y-4">
                            <input type="hidden" name="supplier_id" value={selectedPaymentTarget.id} />

                            <div className="bg-red-50 text-red-700 font-bold p-4 rounded-xl text-center shadow-inner border border-red-100">
                                <p className="text-xs uppercase tracking-widest text-red-400 mb-1">Current Payable</p>
                                <p className="text-2xl font-black">₹{selectedPaymentTarget.total_payable.toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Amount Handed Over</label>
                                <input type="number" name="amount" min="1" max={selectedPaymentTarget.total_payable} placeholder="e.g. 5000" required className="w-full px-4 py-4 border-2 border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 rounded-xl font-black text-slate-800 text-xl outline-none" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Mode of Payment</label>
                                <select name="payment_mode" className="w-full px-4 py-3 border rounded-lg font-bold text-slate-700 outline-none">
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI (GPay / PhonePe)</option>
                                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Notes (Optional)</label>
                                <input type="text" name="notes" placeholder="e.g. Paid to delivery truck" className="w-full px-4 py-3 border rounded-lg" />
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 mt-2 rounded-xl shadow-lg shadow-emerald-600/30 transition active:scale-95">CONFIRM PAYMENT</button>
                        </form>
                    </div>
                </div>
            )}

            {/* LARGE MODAL: LOG STOCK PURCHASE (KHAREDI) -> MOVED TO DEDICATED ROUTE */}
        </div>
    )
}
