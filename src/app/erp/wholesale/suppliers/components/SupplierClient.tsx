'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, X, Search, Phone, IndianRupee, Trash2, User, Download, Edit, CheckCircle2, TrendingUp } from 'lucide-react'
import { createSupplier, deleteSupplier, updateSupplier, addManualSupplierDebt, addManualSupplierPayment } from '../actions'

export default function SupplierClient({ initialSuppliers }: { initialSuppliers: any[] }) {
    const [search, setSearch] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
    const [editingSupplier, setEditingSupplier] = useState<any>(null)
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL')

    // Add manual actions state
    const [payingId, setPayingId] = useState<string | null>(null)
    const [payAmount, setPayAmount] = useState('')
    const [addingId, setAddingId] = useState<string | null>(null)
    const [addAmount, setAddAmount] = useState('')

    const filtered = initialSuppliers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))

    const filterStart = new Date(); filterStart.setHours(0, 0, 0, 0)
    if (dateFilter === '7D') filterStart.setDate(filterStart.getDate() - 7)
    if (dateFilter === '30D') filterStart.setDate(filterStart.getDate() - 30)

    const dateSegmented = dateFilter === 'ALL' ? filtered : filtered.filter(c => c.created_at && new Date(c.created_at) >= filterStart)

    const totalUdhaari = dateSegmented.reduce((sum, curr) => sum + parseFloat(curr.current_balance || '0'), 0)

    const exportCSV = () => {
        const rows = [["Client Identity", "Contact", "Udhaari Debt (₹)"]]
        dateSegmented.forEach(c => {
            rows.push([c.name, c.phone || 'N/A', c.current_balance || '0'])
        })
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `suppliers_export_${dateFilter}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    async function handleAdd(formData: FormData) {
        setIsSubmitting(true)
        try {
            await createSupplier(formData)
            setIsAddModalOpen(false)
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleEdit(formData: FormData) {
        if (!editingSupplier) return
        setIsSubmitting(true)
        try {
            await updateSupplier(editingSupplier.id, formData)
            setEditingSupplier(null)
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this client? All Udhaari records mapped here will be permanently severed.")) return
        setIsDeletingId(id)
        try {
            await deleteSupplier(id)
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsDeletingId(null)
        }
    }

    async function handleRecordPayment(supplierId: string) {
        const amount = parseFloat(payAmount)
        if (!amount || amount <= 0) return alert('Enter a valid amount')
        setIsSubmitting(true)
        try {
            await addManualSupplierPayment(supplierId, amount)
            setPayingId(null)
            setPayAmount('')
            window.location.reload()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleRecordDebt(supplierId: string) {
        const amount = parseFloat(addAmount)
        if (!amount || amount <= 0) return alert('Enter a valid debt amount')
        setIsSubmitting(true)
        try {
            await addManualSupplierDebt(supplierId, amount)
            setAddingId(null)
            setAddAmount('')
            window.location.reload()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header Matrix */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-500" /> Client Roster
                    </h1>
                    <p className="text-[13px] text-slate-500 mt-1 max-w-xl">
                        Global repository of all authorized B2B buyers. Actively syncs and computes Live Udhaari (credit balances) mapped flawlessly across the entire Kharedi network.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Onboard Buyer
                    </button>
                    <button
                        onClick={exportCSV}
                        className="w-full sm:w-auto px-5 py-2 hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Download className="w-4 h-4 text-indigo-500" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 bg-white p-1.5 border border-slate-200 rounded-lg shadow-sm w-fit mx-auto lg:mx-0">
                <button onClick={() => setDateFilter('ALL')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>All Time</button>
                <button onClick={() => setDateFilter('TODAY')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === 'TODAY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Today</button>
                <button onClick={() => setDateFilter('7D')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === '7D' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>7 Days</button>
                <button onClick={() => setDateFilter('30D')} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-md transition-colors ${dateFilter === '30D' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>30 Days</button>
            </div>

            {/* Live Financial Aggregator HUD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                        <Users className="w-20 h-20 text-slate-900" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Verified Clients</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tight">{dateSegmented.length}</p>
                </div>
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 shadow-lg shadow-rose-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.08] group-hover:scale-110 transition-transform duration-700">
                        <IndianRupee className="w-20 h-20 text-white" />
                    </div>
                    <p className="text-[11px] font-bold text-rose-100 uppercase tracking-widest mb-1">Total Market Udhaari (At Risk)</p>
                    <p className="text-3xl font-black text-white tracking-tight">₹{totalUdhaari.toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Core Roster Matrix */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center relative z-10">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search Clients / Phone..."
                            className="w-full pl-9 pr-4 h-10 bg-white border border-slate-200 shadow-sm rounded-lg text-[13px] text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Client Identity</th>
                                <th className="px-6 py-4">Contact Vector</th>
                                <th className="px-6 py-4 text-right">Live Udhaari (Debt)</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-50">
                                            <Users className="w-8 h-8 text-slate-400" />
                                            <p className="text-[14px] font-semibold text-slate-600">No buyers found in this sector.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                dateSegmented.map(supplier => {
                                    const bal = parseFloat(supplier.current_balance)
                                    return (
                                        <motion.tr
                                            key={supplier.id}
                                            whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                                            className="group"
                                        >
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0 font-bold text-xs uppercase">
                                                        {supplier.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-slate-800">{supplier.name}</p>
                                                        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">UID: {supplier.id.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    {supplier.phone || '--'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-bold tracking-tight ${bal > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    <IndianRupee className="w-3.5 h-3.5 opacity-70" />
                                                    {bal.toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {payingId === supplier.id ? (
                                                    <div className="flex items-center gap-2 justify-end mb-2">
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                            <input autoFocus type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" className="w-28 pl-6 pr-2 h-9 border-2 border-indigo-300 rounded-lg text-[13px] font-bold focus:border-indigo-500 outline-none" />
                                                        </div>
                                                        <button onClick={() => handleRecordPayment(supplier.id)} disabled={isSubmitting} className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50">
                                                            <CheckCircle2 className="w-4 h-4" /> Pay
                                                        </button>
                                                        <button onClick={() => { setPayingId(null); setPayAmount('') }} className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-lg transition-all">Cancel</button>
                                                    </div>
                                                ) : addingId === supplier.id ? (
                                                    <div className="flex items-center gap-2 justify-end mb-2">
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                            <input autoFocus type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0" className="w-28 pl-6 pr-2 h-9 border-2 border-rose-300 rounded-lg text-[13px] font-bold focus:border-rose-500 outline-none" />
                                                        </div>
                                                        <button onClick={() => handleRecordDebt(supplier.id)} disabled={isSubmitting} className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50">
                                                            <TrendingUp className="w-4 h-4" /> Add
                                                        </button>
                                                        <button onClick={() => { setAddingId(null); setAddAmount('') }} className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-lg transition-all">Cancel</button>
                                                    </div>
                                                ) : null}

                                                <div className="flex justify-end gap-2">
                                                    {!payingId && !addingId && (
                                                        <>
                                                            <button onClick={() => { setPayingId(supplier.id); setAddingId(null) }} disabled={bal <= 0} className="px-3 py-1.5 bg-white border border-slate-200 text-[12px] font-semibold text-slate-600 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 shadow-sm transition-all whitespace-nowrap">
                                                                Payment
                                                            </button>
                                                            <button onClick={() => { setAddingId(supplier.id); setPayingId(null) }} className="px-3 py-1.5 bg-white border border-slate-200 text-[12px] font-semibold text-slate-600 rounded-lg hover:bg-rose-50 hover:border-rose-200 shadow-sm transition-all whitespace-nowrap mr-2">
                                                                Add Debt
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setEditingSupplier(supplier)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-all"><Edit className="w-4 h-4" /></button>
                                                    <button
                                                        onClick={() => handleDelete(supplier.id)}
                                                        disabled={isDeletingId === supplier.id}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all ml-auto disabled:opacity-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Apple-Tier Modal Intercepter */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-600" /> Onboard Buyer
                                </h2>
                                <button disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form action={handleAdd} className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Business Name</label>
                                    <input required name="name" type="text" placeholder="e.g. Ramesh Stores" className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Contact Number</label>
                                    <input name="phone" type="text" className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Init Udhaari (Past Due)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400">₹</span>
                                        <input required name="current_balance" type="number" defaultValue={0} min={0} step="0.01" className="w-full pl-8 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-bold text-[14px] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button type="submit" disabled={isSubmitting} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:hover:scale-100">
                                        {isSubmitting ? 'Syncing...' : 'Deploy Blueprint'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Supplier Profile Modal */}
            <AnimatePresence>
                {editingSupplier && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setEditingSupplier(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                    <Edit className="w-4 h-4 text-indigo-600" /> Edit Profile Mutator
                                </h2>
                                <button disabled={isSubmitting} onClick={() => setEditingSupplier(null)} className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form action={handleEdit} className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Business Name</label>
                                    <input required name="name" type="text" defaultValue={editingSupplier.name} autoFocus className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Contact Number</label>
                                    <input name="phone" type="text" defaultValue={editingSupplier.phone || ''} className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Raw Udhaari (Debt)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400">₹</span>
                                        <input required name="current_balance" type="number" defaultValue={editingSupplier.current_balance} min={0} step="0.01" className="w-full pl-8 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-bold text-[14px] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button type="submit" disabled={isSubmitting} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:hover:scale-100">
                                        {isSubmitting ? 'Syncing...' : 'Override Payload'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
