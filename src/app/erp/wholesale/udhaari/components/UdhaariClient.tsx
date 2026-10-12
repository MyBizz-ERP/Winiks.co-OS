'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    HandCoins,
    IndianRupee,
    Phone,
    Search,
    CheckCircle2,
    TrendingUp,
    Plus,
    X,
    MessageSquare,
    Users,
    ArrowUpRight,
    BadgePercent,
    ShieldCheck
} from 'lucide-react'
import { addManualUdhaariDebt, createManualCustomer } from '../actions'

export default function UdhaariClient({ customers: initialCustomers, shopId }: { customers: any[], shopId: string }) {
    const router = useRouter()
    const [customerList, setCustomerList] = useState<any[]>(initialCustomers || [])
    const [search, setSearch] = useState('')
    const [filterTab, setFilterTab] = useState<'ALL' | 'DEBTORS' | 'SETTLED'>('ALL')
    const [payingId, setPayingId] = useState<string | null>(null)
    const [payAmount, setPayAmount] = useState('')
    const [addingId, setAddingId] = useState<string | null>(null)
    const [addAmount, setAddAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newClientType, setNewClientType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')

    useEffect(() => {
        setCustomerList(initialCustomers || [])
    }, [initialCustomers])

    const totalUdhaari = customerList.reduce((s, c) => s + (parseFloat(c.old_balance) || 0), 0)
    const activeDebtorsCount = customerList.filter(c => (parseFloat(c.old_balance) || 0) > 0).length
    const wholesaleDebtorsCount = customerList.filter(c => (c.customer_type === 'WHOLESALE' || c.customerType === 'WHOLESALE') && (parseFloat(c.old_balance) || 0) > 0).length

    const filtered = customerList.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search))
        const bal = parseFloat(c.old_balance) || 0
        if (!matchesSearch) return false
        if (filterTab === 'DEBTORS') return bal > 0
        if (filterTab === 'SETTLED') return bal <= 0
        return true
    })

    async function handleRecordPayment(customerId: string) {
        const amount = parseFloat(payAmount)
        if (!amount || amount <= 0) return alert('Enter a valid payment amount')
        setIsSubmitting(true)
        try {
            const res = await fetch('/api/erp/udhaari/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, amount })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to record payment')

            // Optimistic update
            setCustomerList(prev => prev.map(c => {
                if (c.id === customerId) {
                    const currentBal = parseFloat(c.old_balance) || 0
                    return { ...c, old_balance: Math.max(0, currentBal - amount).toString() }
                }
                return c
            }))

            setPayingId(null)
            setPayAmount('')
            router.refresh()
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
                // Optimistic update
                setCustomerList(prev => prev.map(c => {
                    if (c.id === customerId) {
                        const currentBal = parseFloat(c.old_balance) || 0
                        return { ...c, old_balance: (currentBal + amount).toString() }
                    }
                    return c
                }))

                setAddingId(null)
                setAddAmount('')
                router.refresh()
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
        formData.append('customerType', newClientType)
        setIsSubmitting(true)
        try {
            const res = await createManualCustomer(formData)
            if (res.success) {
                setIsAddModalOpen(false)
                router.refresh()
            }
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const sendWhatsAppReminder = (name: string, phone: string, amount: number) => {
        if (!phone) return alert('No phone number recorded for this client')
        const cleanPhone = phone.replace(/[^0-9]/g, '')
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
        const message = `Namaskar ${name}, This is a friendly reminder from our store: Your pending Udhaari balance is Rs. ${amount.toFixed(2)}. Kindly arrange for the payment at your convenience. Thank you!`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Wholesale</span>
                        <span>/</span>
                        <span className="text-amber-600 font-bold">Udhaari Ledger</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <HandCoins className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
                        Buyer Accounts Receivable
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Monitor credit exposure, collect payments, and manage buyer balances with zero friction.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-11 px-4 sm:px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Add Walk-In Client
                    </button>
                </div>
            </div>

            {/* Shopify Polaris Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Market Due</p>
                        <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                            <IndianRupee className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                        ₹{totalUdhaari.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-amber-700 font-medium mt-1 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Active market credit exposure
                    </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Active Debtors</p>
                        <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{activeDebtorsCount}</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Parties with outstanding balances</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Wholesale B2B Debtors</p>
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                            <BadgePercent className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{wholesaleDebtorsCount}</p>
                    <p className="text-xs text-indigo-700 font-medium mt-1">Verified commercial partners</p>
                </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-bold">
                        <button
                            onClick={() => setFilterTab('ALL')}
                            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${filterTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            All Parties ({customerList.length})
                        </button>
                        <button
                            onClick={() => setFilterTab('DEBTORS')}
                            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${filterTab === 'DEBTORS' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Due Balances ({activeDebtorsCount})
                        </button>
                        <button
                            onClick={() => setFilterTab('SETTLED')}
                            className={`px-3 py-1.5 rounded-lg transition-all shrink-0 ${filterTab === 'SETTLED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            Settled ({customerList.length - activeDebtorsCount})
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name or phone..."
                            className="w-full pl-9 pr-3 h-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 transition-all"
                        />
                    </div>
                </div>

                {/* Mobile View: High-Density Polaris Cards */}
                <div className="block md:hidden divide-y divide-slate-100 pt-2">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">No customer records matching criteria.</div>
                    ) : (
                        filtered.map(c => {
                            const bal = parseFloat(c.old_balance) || 0
                            const isWholesale = c.customer_type === 'WHOLESALE' || c.customerType === 'WHOLESALE'
                            return (
                                <div key={c.id} className="py-3.5 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase shrink-0">
                                                {(c.name || 'C').substring(0, 2)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-sm text-slate-900">{c.name}</p>
                                                    {isWholesale ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            B2B
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                                            Retail
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    {c.phone || 'No phone recorded'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black ${bal > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                ₹{bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action row */}
                                    {payingId === c.id ? (
                                        <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                            <div className="relative flex-1">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    value={payAmount}
                                                    onChange={e => setPayAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    className="w-full pl-6 pr-2 h-9 border border-indigo-300 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRecordPayment(c.id)}
                                                disabled={isSubmitting}
                                                className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 shrink-0"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => { setPayingId(null); setPayAmount('') }}
                                                className="h-9 px-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg shrink-0"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : addingId === c.id ? (
                                        <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-xl border border-rose-100">
                                            <div className="relative flex-1">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    value={addAmount}
                                                    onChange={e => setAddAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    className="w-full pl-6 pr-2 h-9 border border-rose-300 rounded-lg text-xs font-bold focus:border-rose-500 outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleRecordDebt(c.id)}
                                                disabled={isSubmitting}
                                                className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 shrink-0"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => { setAddingId(null); setAddAmount('') }}
                                                className="h-9 px-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg shrink-0"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                                            <button
                                                onClick={() => { setPayingId(c.id); setAddingId(null) }}
                                                disabled={bal <= 0}
                                                className="h-9 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:opacity-30"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Pay
                                            </button>
                                            <button
                                                onClick={() => { setAddingId(c.id); setPayingId(null) }}
                                                className="h-9 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all"
                                            >
                                                <TrendingUp className="w-3.5 h-3.5" /> + Due
                                            </button>
                                            <button
                                                onClick={() => sendWhatsAppReminder(c.name, c.phone, bal)}
                                                disabled={!c.phone || bal <= 0}
                                                className="h-9 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all disabled:opacity-30"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" /> Remind
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Desktop View: High-Density Polaris Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5">Buyer Identity</th>
                                <th className="px-5 py-3.5">Contact</th>
                                <th className="px-5 py-3.5">Party Type</th>
                                <th className="px-5 py-3.5 text-right">Outstanding Due</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-xs">
                                        No customer records matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => {
                                    const bal = parseFloat(c.old_balance) || 0
                                    const isWholesale = c.customer_type === 'WHOLESALE' || c.customerType === 'WHOLESALE'
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase shrink-0">
                                                        {(c.name || 'C').substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                            {c.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                                                {c.phone || <span className="text-slate-400">--</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {isWholesale ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        🏷️ Wholesale B2B
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                        Standard Retail
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black ${bal > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                    <IndianRupee className="w-3.5 h-3.5 opacity-70" />
                                                    {bal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {payingId === c.id ? (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                            <input
                                                                autoFocus
                                                                type="number"
                                                                value={payAmount}
                                                                onChange={e => setPayAmount(e.target.value)}
                                                                placeholder="0"
                                                                className="w-28 pl-6 pr-2 h-9 border-2 border-indigo-300 rounded-lg text-xs font-bold focus:border-indigo-500 outline-none"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleRecordPayment(c.id)}
                                                            disabled={isSubmitting}
                                                            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Save
                                                        </button>
                                                        <button
                                                            onClick={() => { setPayingId(null); setPayAmount('') }}
                                                            className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : addingId === c.id ? (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                                            <input
                                                                autoFocus
                                                                type="number"
                                                                value={addAmount}
                                                                onChange={e => setAddAmount(e.target.value)}
                                                                placeholder="0"
                                                                className="w-28 pl-6 pr-2 h-9 border-2 border-rose-300 rounded-lg text-xs font-bold focus:border-rose-500 outline-none"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleRecordDebt(c.id)}
                                                            disabled={isSubmitting}
                                                            className="h-9 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                                                        >
                                                            <TrendingUp className="w-3.5 h-3.5" /> Add
                                                        </button>
                                                        <button
                                                            onClick={() => { setAddingId(null); setAddAmount('') }}
                                                            className="h-9 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 justify-end">
                                                        <button
                                                            onClick={() => { setPayingId(c.id); setAddingId(null) }}
                                                            disabled={bal <= 0}
                                                            className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 disabled:opacity-30 transition-all active:scale-95"
                                                        >
                                                            Payment
                                                        </button>
                                                        <button
                                                            onClick={() => { setAddingId(c.id); setPayingId(null) }}
                                                            className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700 rounded-lg hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-all active:scale-95"
                                                        >
                                                            + Debt
                                                        </button>
                                                        {c.phone && bal > 0 && (
                                                            <button
                                                                onClick={() => sendWhatsAppReminder(c.name, c.phone, bal)}
                                                                title="Send 1-Click WhatsApp reminder"
                                                                className="p-1.5 bg-white border border-slate-200 shadow-sm text-green-600 rounded-lg hover:bg-green-50 hover:border-green-200 transition-all active:scale-95"
                                                            >
                                                                <MessageSquare className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Walk-In Client Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-3xl w-full max-w-md overflow-hidden relative z-10 shadow-2xl border border-slate-100"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-amber-500" /> New Walk-In Client
                                </h3>
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleAddClient} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Client Name *</label>
                                    <input
                                        autoFocus
                                        required
                                        type="text"
                                        name="name"
                                        className="w-full px-4 h-11 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-sm font-semibold text-slate-900 transition-all outline-none"
                                        placeholder="e.g Rahul Kirana Store"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Phone / WhatsApp Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="w-full px-4 h-11 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-sm font-medium text-slate-900 transition-all outline-none"
                                        placeholder="e.g. 9876543210"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Party Classification</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewClientType('RETAIL')}
                                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${newClientType === 'RETAIL' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/10' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            Standard Retail
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewClientType('WHOLESALE')}
                                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${newClientType === 'WHOLESALE' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/10' : 'bg-white border-slate-200 text-slate-600'}`}
                                        >
                                            🏷️ Wholesale B2B
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Opening Due Balance (₹)</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            min="0"
                                            step="0.01"
                                            type="number"
                                            defaultValue={0}
                                            name="oldBalance"
                                            className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-sm font-bold text-slate-900 transition-all outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'CREATING...' : 'CREATE ACCOUNT'}
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
