'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, X, Search, Phone, IndianRupee, Trash2, User, Download, Edit } from 'lucide-react'
import { createCustomer, deleteCustomer, updateCustomer } from '../actions'

export default function CustomerClient({ initialCustomers }: { initialCustomers: any[] }) {
    const router = useRouter()
    const [customerList, setCustomerList] = useState<any[]>(initialCustomers || [])
    const [search, setSearch] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
    const [editingCustomer, setEditingCustomer] = useState<any>(null)
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL')

    useEffect(() => {
        setCustomerList(initialCustomers || [])
    }, [initialCustomers])

    const filtered = customerList.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))

    const filterStart = new Date(); filterStart.setHours(0, 0, 0, 0)
    if (dateFilter === '7D') filterStart.setDate(filterStart.getDate() - 7)
    if (dateFilter === '30D') filterStart.setDate(filterStart.getDate() - 30)

    const dateSegmented = dateFilter === 'ALL' ? filtered : filtered.filter(c => c.created_at && new Date(c.created_at) >= filterStart)

    const totalUdhaari = dateSegmented.reduce((sum, curr) => sum + parseFloat(curr.old_balance || '0'), 0)

    const exportCSV = () => {
        const rows = [["Client Identity", "Contact", "Udhaari Debt (₹)"]]
        dateSegmented.forEach(c => {
            rows.push([c.name, c.phone || 'N/A', c.old_balance || '0'])
        })
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `customers_export_${dateFilter}.csv`)
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    async function handleAdd(formData: FormData) {
        setIsSubmitting(true)
        try {
            await createCustomer(formData)
            setIsAddModalOpen(false)
            router.refresh()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleEdit(formData: FormData) {
        if (!editingCustomer) return
        setIsSubmitting(true)
        try {
            await updateCustomer(editingCustomer.id, formData)
            setEditingCustomer(null)
            router.refresh()
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
            await deleteCustomer(id)
            setCustomerList(prev => prev.filter(c => c.id !== id))
            router.refresh()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsDeletingId(null)
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

                {/* Mobile View: Adaptive Polaris Cards */}
                <div className="block md:hidden divide-y divide-slate-100 p-3">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">No buyers found in this sector.</div>
                    ) : (
                        dateSegmented.map(customer => {
                            const bal = parseFloat(customer.old_balance) || 0
                            const isWholesale = customer.customer_type === 'WHOLESALE'
                            return (
                                <div key={customer.id} className="py-3.5 space-y-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase shrink-0">
                                                {(customer.name || 'C').substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-sm text-slate-900">{customer.name}</p>
                                                    {isWholesale ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200">
                                                            Wholesale B2B
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200">
                                                            Retail
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    {customer.phone || 'No contact'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${bal > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                                <IndianRupee className="w-3 h-3 opacity-70" />
                                                {bal.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-50 text-xs">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            UID: {customer.id.split('-')[0]}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {customer.phone && bal > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const clean = customer.phone.replace(/[^0-9]/g, '')
                                                        const p = clean.length === 10 ? `91${clean}` : clean
                                                        window.open(`https://wa.me/${p}?text=${encodeURIComponent(`Namaskar ${customer.name}, Reminder: Your pending Udhaari balance is Rs. ${bal.toFixed(2)}. Dhanyawad!`)}`, '_blank')
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-bold flex items-center gap-1"
                                                >
                                                    WhatsApp
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setEditingCustomer(customer)}
                                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1"
                                            >
                                                <Edit className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                disabled={isDeletingId === customer.id}
                                                className="p-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold disabled:opacity-50"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Desktop View: High-Density Table */}
                <div className="hidden md:block overflow-x-auto">
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
                                dateSegmented.map(customer => {
                                    const bal = parseFloat(customer.old_balance)
                                    return (
                                        <motion.tr
                                            key={customer.id}
                                            whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)" }}
                                            className="group"
                                        >
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0 font-bold text-xs uppercase">
                                                        {customer.name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[14px] font-bold text-slate-800">{customer.name}</p>
                                                            {customer.customer_type === 'WHOLESALE' ? (
                                                                <span className="inline-flex items-center text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                                    Wholesale B2B
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                    Retail
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">UID: {customer.id.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                    {customer.phone || '--'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-bold tracking-tight ${bal > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                    <IndianRupee className="w-3.5 h-3.5 opacity-70" />
                                                    {bal.toLocaleString('en-IN')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {customer.phone && bal > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                const clean = customer.phone.replace(/[^0-9]/g, '')
                                                                const p = clean.length === 10 ? `91${clean}` : clean
                                                                window.open(`https://wa.me/${p}?text=${encodeURIComponent(`Namaskar ${customer.name}, Reminder: Your pending Udhaari balance is Rs. ${bal.toFixed(2)}. Dhanyawad!`)}`, '_blank')
                                                            }}
                                                            title="WhatsApp Reminder"
                                                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-green-600 hover:bg-green-50 hover:border-green-200 transition-all"
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setEditingCustomer(customer)} className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-all"><Edit className="w-4 h-4" /></button>
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        disabled={isDeletingId === customer.id}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all disabled:opacity-50"
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
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Buyer Category</label>
                                    <select name="customer_type" defaultValue="RETAIL" className="w-full px-3 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-semibold text-[13px] outline-none focus:border-indigo-500">
                                        <option value="RETAIL">Standard Retail Buyer</option>
                                        <option value="WHOLESALE">Wholesale / B2B Partner (Auto-Tier Pricing)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Contact Number</label>
                                    <input name="phone" type="text" className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Init Udhaari (Past Due)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400">₹</span>
                                        <input required name="old_balance" type="number" defaultValue={0} min={0} step="0.01" className="w-full pl-8 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-bold text-[14px] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all" />
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

            {/* Edit Customer Profile Modal */}
            <AnimatePresence>
                {editingCustomer && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setEditingCustomer(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                    <Edit className="w-4 h-4 text-indigo-600" /> Edit Profile Mutator
                                </h2>
                                <button disabled={isSubmitting} onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form action={handleEdit} className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Business Name</label>
                                    <input required name="name" type="text" defaultValue={editingCustomer.name} autoFocus className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Buyer Category</label>
                                    <select name="customer_type" defaultValue={editingCustomer.customer_type || "RETAIL"} className="w-full px-3 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-semibold text-[13px] outline-none focus:border-indigo-500">
                                        <option value="RETAIL">Standard Retail Buyer</option>
                                        <option value="WHOLESALE">Wholesale / B2B Partner (Auto-Tier Pricing)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Contact Number</label>
                                    <input name="phone" type="text" defaultValue={editingCustomer.phone || ''} className="w-full px-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Raw Udhaari (Debt)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400">₹</span>
                                        <input required name="old_balance" type="number" defaultValue={editingCustomer.old_balance} min={0} step="0.01" className="w-full pl-8 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-bold text-[14px] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all" />
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
