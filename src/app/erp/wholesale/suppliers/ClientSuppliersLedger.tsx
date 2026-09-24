'use client'

import { useState } from 'react'
import { Plus, Search, Truck, ArrowRight, User, Briefcase, IndianRupee, Edit3, Check, X } from 'lucide-react'
import { addSupplier, editSupplier, commitPurchaseBill } from './actions'

export default function ClientSuppliersLedger({ initialSuppliers, initialPurchaseBills, products, shopId }: { initialSuppliers: any[], initialPurchaseBills: any[], products: any[], shopId: string }) {
    const [activeTab, setActiveTab] = useState<'suppliers' | 'bills'>('suppliers')
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)

    // Modals
    const [showAddSupplier, setShowAddSupplier] = useState(false)
    const [selectedEditTarget, setSelectedEditTarget] = useState<any | null>(null)
    const [showKharediModal, setShowKharediModal] = useState(false)

    // Kharedi (Purchase) State
    const [kharediSupplierId, setKharediSupplierId] = useState<string>('')
    const [kharediItems, setKharediItems] = useState<any[]>([]) // { product_id, product_name, quantity, unit_cost, total_cost }
    const [kSearch, setKSearch] = useState('')
    const [paymentMode, setPaymentMode] = useState('cash')

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

    // Purchase Bill Handlers
    function addProductToKharedi(p: any) {
        if (kharediItems.find(k => k.product_id === p.id)) return // prevent duplicate
        setKharediItems([...kharediItems, { product_id: p.id, product_name: p.name, quantity: 1, unit_cost: p.buying_price, total_cost: p.buying_price }])
        setKSearch('')
    }

    function updateKharediItem(id: string, field: 'quantity' | 'unit_cost', val: string) {
        const numValue = parseFloat(val) || 0
        setKharediItems(prev => prev.map(item => {
            if (item.product_id === id) {
                const newObj = { ...item, [field]: numValue }
                newObj.total_cost = newObj.quantity * newObj.unit_cost
                return newObj
            }
            return item
        }))
    }

    const kharediSubtotal = kharediItems.reduce((acc, curr) => acc + curr.total_cost, 0)

    async function submitPurchaseBill() {
        if (kharediItems.length === 0) return alert('Add items to bill')

        let targetSupplierName = 'Local Cash Vendor'
        if (kharediSupplierId) {
            const spl = initialSuppliers.find(s => s.id === kharediSupplierId)
            if (spl) targetSupplierName = spl.name
        }

        setLoading(true)
        const res = await commitPurchaseBill({
            supplier_id: kharediSupplierId,
            supplier_name: targetSupplierName,
            subtotal: kharediSubtotal,
            payment_mode: paymentMode,
            notes: 'Created via Accounts Payable module',
            items: kharediItems
        })
        setLoading(false)

        if (res.success) {
            setShowKharediModal(false)
            setKharediItems([])
            setActiveTab('bills')
        } else {
            alert(res.error)
        }
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
                    <button onClick={() => setShowAddSupplier(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl shadow-sm flex items-center text-sm transition transition-transform active:scale-95">
                        <Plus className="h-4 w-4 mr-1" /> Add Supplier
                    </button>
                    <button onClick={() => setShowKharediModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-6 rounded-xl shadow-md flex items-center text-sm transition transition-transform active:scale-95">
                        <ArrowRight className="h-4 w-4 mr-2" /> Log Stock Purchase
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
                    <table className="w-full text-left">
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
                                        <button onClick={() => setSelectedEditTarget(s)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: PURCHASE_BILLS */}
            {activeTab === 'bills' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 animate-in fade-in">
                    <h3 className="font-black text-slate-800 mb-4 tracking-tight">Recent Purchase Invoices (Kharedi)</h3>
                    <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
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

            {/* LARGE MODAL: LOG STOCK PURCHASE (KHAREDI) */}
            {showKharediModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Log Incoming Purchase (Kharedi)</h2>
                                <p className="text-slate-400 text-sm font-medium mt-1">This will increase inventory stock levels mathematically.</p>
                            </div>
                            <button onClick={() => setShowKharediModal(false)} className="text-slate-400 hover:text-white transition"><X className="w-6 h-6" /></button>
                        </div>

                        {/* Split Workspace */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-100">

                            {/* LEFT STAGE: PRODUCT SEARCH */}
                            <div className="w-full md:w-1/3 bg-white border-r border-slate-200 p-6 flex flex-col">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Search Products Bought</label>
                                <input type="text" placeholder="Search stock catalog..." value={kSearch} onChange={e => setKSearch(e.target.value)} className="w-full px-4 py-3 font-bold border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none mb-4" />

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                    {kSearch && products.filter(p => p.name.toLowerCase().includes(kSearch.toLowerCase())).map(p => (
                                        <div key={p.id} onClick={() => addProductToKharedi(p)} className="p-3 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer group transition">
                                            <div className="font-bold text-slate-800">{p.name}</div>
                                            <div className="text-[10px] font-black text-slate-400 mt-1">Cost: ₹{p.buying_price} / Stock: {p.current_stock}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* MIDDLE STAGE: INVOICE TABLE */}
                            <div className="flex-1 p-6 flex flex-col items-center max-w-4xl mx-auto w-full">
                                <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b">
                                            <tr>
                                                <th className="px-4 py-3">Product</th>
                                                <th className="px-4 py-3 w-32">Qty Bought</th>
                                                <th className="px-4 py-3 w-32">Unit Price(₹)</th>
                                                <th className="px-4 py-3 w-32 text-right">Line Total</th>
                                                <th className="px-4 py-3 w-12 text-center">X</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {kharediItems.map(item => (
                                                <tr key={item.product_id}>
                                                    <td className="px-4 py-3 font-bold text-slate-800">{item.product_name}</td>
                                                    <td className="px-4 py-2">
                                                        <input type="number" min="0" step="any" value={item.quantity} onChange={e => updateKharediItem(item.product_id, 'quantity', e.target.value)} className="w-20 px-2 py-1.5 border rounded font-bold" />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <input type="number" min="0" step="any" value={item.unit_cost} onChange={e => updateKharediItem(item.product_id, 'unit_cost', e.target.value)} className="w-20 px-2 py-1.5 border rounded font-bold" />
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-900 bg-slate-50">₹{item.total_cost}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => setKharediItems(kharediItems.filter(k => k.product_id !== item.product_id))} className="text-red-400 hover:text-red-600">✖</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {kharediItems.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-bold">No items added to purchase bill. Search left to add.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* BOTTOM BAR: FINALIZE */}
                                <div className="w-full mt-6 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-lg">
                                    <div className="flex gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Supplier</label>
                                            <select value={kharediSupplierId} onChange={e => setKharediSupplierId(e.target.value)} className="px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl font-bold min-w-[200px] outline-none focus:ring-2 focus:ring-emerald-500">
                                                <option value="">-- Local Cash / General --</option>
                                                {initialSuppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company || '-'})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Payment Mode</label>
                                            <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl font-bold min-w-[150px] outline-none">
                                                <option value="cash">Paid Cash</option>
                                                <option value="bank">Bank / UPI</option>
                                                <option value="credit">Credit / Udhaari (Debt)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bill Value</div>
                                            <div className="text-3xl font-black text-slate-900">₹{kharediSubtotal.toLocaleString()}</div>
                                        </div>
                                        <button onClick={submitPurchaseBill} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-8 rounded-xl tracking-widest shadow-lg shadow-emerald-600/30 transition disabled:opacity-50">
                                            {loading ? 'PROCESSING...' : 'COMMIT PURCHASE'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
