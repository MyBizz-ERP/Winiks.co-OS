'use client'

import { useState } from 'react'
import { User, Plus, Search, IndianRupee, X, Edit3, Download } from 'lucide-react'
import { exportToCSV } from '../utils/csvExport'
import { addCustomer, recordLedgerPayment, editCustomer } from './actions'

export default function ClientCustomerLedger({ initialCustomers }: { initialCustomers: any[] }) {
    const [searchTerm, setSearchTerm] = useState('')

    // Modals
    const [showAddCustomer, setShowAddCustomer] = useState(false)
    const [selectedPaymentTarget, setSelectedPaymentTarget] = useState<any | null>(null)
    const [selectedEditTarget, setSelectedEditTarget] = useState<any | null>(null)

    // Form States
    const [loading, setLoading] = useState(false)

    const filteredCustomers = initialCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm))
    )

    async function handleAddCustomer(formData: FormData) {
        setLoading(true)
        const res = await addCustomer(formData)
        setLoading(false)
        if (res.success) {
            setShowAddCustomer(false)
        } else {
            alert(res.error)
        }
    }

    async function handleRecordPayment(formData: FormData) {
        setLoading(true)
        const res = await recordLedgerPayment(formData)
        setLoading(false)
        if (res.success) {
            setSelectedPaymentTarget(null)
        } else {
            alert(res.error)
        }
    }

    async function handleEditCustomer(formData: FormData) {
        setLoading(true)
        const res = await editCustomer(formData)
        setLoading(false)
        if (res.success) {
            setSelectedEditTarget(null)
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full px-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                    />
                </div>
                <div className="flex space-x-3 shrink-0">
                    <button
                        onClick={() => exportToCSV('customer_ledger.csv', filteredCustomers)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-lg shadow flex items-center gap-2 text-sm transition-transform active:scale-95"
                    >
                        <Download className="h-4 w-4" /> EXPORT CSV
                    </button>
                    <button
                        onClick={() => setShowAddCustomer(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-lg shadow flex items-center gap-2 text-sm transition-transform active:scale-95"
                    >
                        <Plus className="h-4 w-4" /> Add Customer
                    </button>
                </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left whitespace-nowrap min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Customer Details</th>
                                <th className="px-6 py-4">Phone Number</th>
                                <th className="px-6 py-4 text-right">Outstanding Udhaari</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{customer.name}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                                        {customer.phone || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {customer.total_credit > 0 ? (
                                            <span className="inline-block bg-red-50 text-red-700 px-3 py-1 rounded-md text-sm font-black border border-red-100 shadow-sm">
                                                ₹ {customer.total_credit.toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-bold text-sm">₹ 0</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => setSelectedEditTarget(customer)}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm inline-flex items-center"
                                        >
                                            <Edit3 className="w-3 h-3 mr-1" /> Edit
                                        </button>
                                        <button
                                            disabled={customer.total_credit <= 0}
                                            onClick={() => setSelectedPaymentTarget(customer)}
                                            className="bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm"
                                        >
                                            Record Payment
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                                        No customers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RECORD PAYMENT MODAL */}
            {selectedPaymentTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">Clear Udhaari Tracker</h2>
                            <button onClick={() => setSelectedPaymentTarget(null)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form action={handleRecordPayment} className="p-6">
                            <input type="hidden" name="customer_id" value={selectedPaymentTarget.id} />

                            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center">
                                <div className="text-sm font-bold text-red-900 uppercase">Current Debt</div>
                                <div className="text-xl font-black text-red-700">₹ {selectedPaymentTarget.total_credit.toLocaleString()}</div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount Paid Handed Over (₹)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IndianRupee className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input type="number" name="amount_paid" required min="1" max={selectedPaymentTarget.total_credit} step="any" placeholder="0" className="pl-9 w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg text-slate-800 transition" />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Entering an amount will directly subtract it from their Udhaari balance.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                                    <select name="payment_mode" required className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white transition">
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI / GPay / PhonePe</option>
                                        <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Optional Notes</label>
                                    <input type="text" name="notes" placeholder="e.g. Cleared pending dues for Jan" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 mt-8 rounded-xl transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 tracking-wider">
                                {loading ? 'UPDATING LEDGER...' : 'LOG VERIFIED PAYMENT'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD CUSTOMER MODAL */}
            {showAddCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 flex items-center"><User className="w-5 h-5 mr-2 text-slate-500" /> New Customer</h2>
                            <button onClick={() => setShowAddCustomer(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form action={handleAddCustomer} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer Full Name (Required)</label>
                                <input type="text" name="name" required placeholder="e.g. Ramesh Traders" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number (Optional)</label>
                                <input type="tel" name="phone_number" placeholder="9876543210" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Starting Udhaari Balance (If Any)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <IndianRupee className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input type="number" name="total_credit" defaultValue="0" min="0" step="any" className="pl-9 w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold transition" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 mt-4 rounded-xl transition shadow-lg disabled:opacity-50 tracking-wider">
                                {loading ? 'CREATING...' : 'CREATE CUSTOMER PROFILE'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* EDIT CUSTOMER MODAL */}
            {selectedEditTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 flex items-center"><Edit3 className="w-5 h-5 mr-2 text-slate-500" /> Edit Customer</h2>
                            <button onClick={() => setSelectedEditTarget(null)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form action={handleEditCustomer} className="p-6 space-y-4">
                            <input type="hidden" name="id" value={selectedEditTarget.id} />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer Full Name</label>
                                <input type="text" name="name" required defaultValue={selectedEditTarget.name} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                <input type="tel" name="phone_number" defaultValue={selectedEditTarget.phone || ''} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Credit / Udhaari (₹)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <IndianRupee className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input type="number" name="total_credit" defaultValue={selectedEditTarget.total_credit} min="0" step="any" className="pl-9 w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold transition text-amber-700 bg-amber-50" />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">Warning: Changing this manually skips the payment log audit trail.</p>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 mt-6 rounded-xl transition shadow-lg disabled:opacity-50 tracking-wider">
                                {loading ? 'SAVING...' : 'SAVE CHANGES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
