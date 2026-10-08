'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HandCoins, IndianRupee, Phone, Search, CheckCircle2, TrendingUp, Plus, X } from 'lucide-react'
import { addManualUdhaariDebt, createManualCustomer } from '../actions'

export default function UdhaariClient({ customers, shopId }: { customers: any[], shopId: string }) {
    const [search, setSearch] = useState('')
    const [payingId, setPayingId] = useState<string | null>(null)
    const [payAmount, setPayAmount] = useState('')
    const [addingId, setAddingId] = useState<string | null>(null)
    const [addAmount, setAddAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const totalUdhaari = customers.reduce((s, c) => s + parseFloat(c.old_balance || '0'), 0)
    const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))

    async function handleRecordPayment(customerId: string) {
        const amount = parseFloat(payAmount)
        if (!amount || amount <= 0) return alert('Enter a valid amount')
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/erp/udhaari/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, amount })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setPayingId(null)
            setPayAmount('')
            window.location.reload()
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleRecordDebt(customerId: string) {
        const amount = parseFloat(addAmount)
        if (!amount || amount <= 0) return alert('Enter a valid debt amount')
        setIsSubmitting(true)
        try {
            const res = await addManualUdhaariDebt(customerId, amount)
            if (res.success) {
                setAddingId(null)
                setAddAmount('')
                window.location.reload()
            }
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleAddClient(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        setIsSubmitting(true)
        try {
            const res = await createManualCustomer(formData)
            if (res.success) {
                setIsAddModalOpen(false)
                window.location.reload()
            }
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <HandCoins className="w-8 h-8 text-amber-500" /> Udhaari Ledger
                    </h1>
                    <p className="text-[13px] text-slate-500 mt-1">Live credit balances across all B2B buyers. Record payments to reduce outstanding debts.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="h-11 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[13px] font-bold shadow-md shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" /> Add Walk-In Client
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Debtors</p>
                    <p className="text-3xl font-black text-slate-800">{customers.filter(c => parseFloat(c.old_balance) > 0).length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 shadow-lg shadow-amber-500/20">
                    <p className="text-[11px] font-bold text-amber-100 uppercase tracking-widest mb-1">Total Outstanding</p>
                    <p className="text-3xl font-black text-white">₹{totalUdhaari.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buyers..." className="w-full pl-9 pr-4 h-10 bg-white border border-slate-200 shadow-sm rounded-lg text-[13px] focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f8fafc] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4 text-right">Outstanding (₹)</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-[13px]">No outstanding debts found.</td></tr>
                            ) : filtered.map(c => {
                                const bal = parseFloat(c.old_balance)
                                return (
                                    <motion.tr key={c.id} whileHover={{ backgroundColor: 'rgba(248,250,252,0.8)' }} className="group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs uppercase shrink-0">{c.name.substring(0, 2)}</div>
                                                <p className="text-[14px] font-bold text-slate-800">{c.name}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-slate-600 font-medium">{c.phone || '--'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-bold ${bal > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                <IndianRupee className="w-3.5 h-3.5 opacity-70" />
                                                {bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {payingId === c.id ? (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                        <input autoFocus type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0" className="w-28 pl-6 pr-2 h-9 border-2 border-indigo-300 rounded-lg text-[13px] font-bold focus:border-indigo-500 outline-none" />
                                                    </div>
                                                    <button onClick={() => handleRecordPayment(c.id)} disabled={isSubmitting} className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50">
                                                        <CheckCircle2 className="w-4 h-4" /> Save
                                                    </button>
                                                    <button onClick={() => { setPayingId(null); setPayAmount('') }} className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-lg transition-all">Cancel</button>
                                                </div>
                                            ) : addingId === c.id ? (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                        <input autoFocus type="number" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0" className="w-28 pl-6 pr-2 h-9 border-2 border-rose-300 rounded-lg text-[13px] font-bold focus:border-rose-500 outline-none" />
                                                    </div>
                                                    <button onClick={() => handleRecordDebt(c.id)} disabled={isSubmitting} className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50">
                                                        <TrendingUp className="w-4 h-4" /> Add
                                                    </button>
                                                    <button onClick={() => { setAddingId(null); setAddAmount('') }} className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold rounded-lg transition-all">Cancel</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button onClick={() => { setPayingId(c.id); setAddingId(null) }} disabled={bal <= 0} className="px-4 py-2 bg-white border border-slate-200 shadow-sm text-[13px] font-semibold text-slate-600 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-30 transition-all active:scale-95 whitespace-nowrap">
                                                        Payment
                                                    </button>
                                                    <button onClick={() => { setAddingId(c.id); setPayingId(null) }} className="px-4 py-2 bg-white border border-slate-200 shadow-sm text-[13px] font-semibold text-slate-600 rounded-lg hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all active:scale-95 whitespace-nowrap">
                                                        Add Debt
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </motion.tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Walk-In Client Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsAddModalOpen(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl">
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-indigo-500" /> New Walk-In Client
                                </h3>
                                <button disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handleAddClient} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client Name</label>
                                    <input autoFocus required type="text" name="name" className="w-full px-4 h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-[14px] font-semibold text-slate-900 transition-all outline-none" placeholder="e.g Rahul Kirana" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Phone Number (Optional)</label>
                                    <input type="tel" name="phone" className="w-full px-4 h-11 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-[14px] font-medium text-slate-900 transition-all outline-none" placeholder="10-digit number" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Opening Due Balance (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input required min="0" step="0.01" type="number" defaultValue={0} name="oldBalance" className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-[14px] font-bold text-slate-900 transition-all outline-none shadow-inner" placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[14px] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSubmitting ? 'CREATING...' : 'CREATE ACCOUNT'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    )
}
