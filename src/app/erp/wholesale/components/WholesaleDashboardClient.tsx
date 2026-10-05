'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Wallet, Package, Users, Receipt, AlertTriangle, ArrowRight, TrendingUp, Sun, Moon, Cloud, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format, subDays, isAfter, startOfDay } from 'date-fns'

type DashboardPayload = {
    shopName: string,
    invoices: any[],
    lowStock: any[],
    stats: {
        totalCustomers: number,
        totalProducts: number,
        invoicesToday: number
    }
}

export default function WholesaleDashboardClient({ payload }: { payload: DashboardPayload }) {
    const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d')
    const [greeting, setGreeting] = useState('Good Morning')
    const [GreetingIcon, setGreetingIcon] = useState<React.ElementType>(Sun)

    // Dynamic Timezone Greeting
    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) {
            setGreeting('Good Morning')
            setGreetingIcon(() => Sun)
        } else if (hour < 18) {
            setGreeting('Good Afternoon')
            setGreetingIcon(() => Cloud)
        } else {
            setGreeting('Good Evening')
            setGreetingIcon(() => Moon)
        }
    }, [])

    // Time Series Parsing for Recharts
    const chartData = useMemo(() => {
        if (!payload.invoices || payload.invoices.length === 0) return []

        const dataPoints: Record<string, number> = {}
        const now = new Date()

        let daysToShow = 7
        if (timeFilter === 'today') daysToShow = 1
        if (timeFilter === '30d') daysToShow = 30
        if (timeFilter === 'all') daysToShow = 30 // Hard cap at month for dashboard chart rendering

        // Initialize empty days backward
        for (let i = daysToShow - 1; i >= 0; i--) {
            const dateStr = format(subDays(now, i), 'dd MMM')
            dataPoints[dateStr] = 0
        }

        // Aggregate real data
        const cutoffDate = startOfDay(subDays(now, daysToShow - 1))

        payload.invoices.forEach(inv => {
            const invDate = new Date(inv.created_at)
            if (isAfter(invDate, cutoffDate) || (timeFilter === 'today' && isAfter(invDate, startOfDay(now)))) {
                const dateKey = timeFilter === 'today' ? format(invDate, 'ha') : format(invDate, 'dd MMM')

                if (dataPoints[dateKey] !== undefined || timeFilter === 'today') {
                    // Net Sales Calculation
                    const netSale = Number(inv.total_amount)
                    dataPoints[dateKey] = (dataPoints[dateKey] || 0) + netSale
                }
            }
        })

        return Object.entries(dataPoints).map(([name, Total]) => ({ name, Total }))
    }, [payload.invoices, timeFilter])

    // Derive Totals
    const currentTotal = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.Total, 0)
    }, [chartData])

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="flex flex-col h-full space-y-8 animate-in fade-in duration-700 pb-20">

            {/* Header section with Time-Aware Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <GreetingIcon className="w-5 h-5" />
                        <h2 className="font-bold tracking-tight text-sm uppercase">{greeting},</h2>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">{payload.shopName}</h1>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl font-medium">
                        Here is what's happening at your store today.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Link href="/erp/wholesale/purchase">
                        <button className="h-11 px-5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm tracking-wide hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                            <Package className="w-4 h-4" /> Intake Stock
                        </button>
                    </Link>
                    <Link href="/erp/wholesale/pos">
                        <button className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 scale-100 active:scale-95">
                            <Wallet className="w-4 h-4" /> Start Selling
                        </button>
                    </Link>
                </div>
            </div>

            {/* Quick KPI Cards (Hides Profit) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Invoices Today</p>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{payload.stats.invoicesToday}</p>
                </div>

                <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Products</p>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{payload.stats.totalProducts}</p>
                </div>

                <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Client Base</p>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{payload.stats.totalCustomers}</p>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 shadow-lg shadow-indigo-900/10 rounded-2xl flex flex-col justify-between group hover:bg-slate-950 transition-colors relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full mix-blend-screen pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Vault Entry</p>
                    </div>
                    <div className="relative z-10 flex items-end justify-between">
                        <div>
                            <p className="text-white text-sm font-semibold tracking-wide">Owner Only</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Secure Ledger Analysis</p>
                        </div>
                        <Link href="/erp/wholesale/vault">
                            <button className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Interactive Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" /> Revenue Flow
                            </h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">Gross sales generated over time</p>
                        </div>
                        <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                            <button onClick={() => setTimeFilter('today')} className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-all ${timeFilter === 'today' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Today</button>
                            <button onClick={() => setTimeFilter('7d')} className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-all ${timeFilter === '7d' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>7 Days</button>
                            <button onClick={() => setTimeFilter('30d')} className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md transition-all ${timeFilter === '30d' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>30 Days</button>
                        </div>
                    </div>

                    <div className="mb-6 flex items-baseline gap-3">
                        <p className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrency(currentTotal)}</p>
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">Collected</span>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickFormatter={(value: number) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`} dx={-10} />
                                <Tooltip
                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.1)', fontWeight: 600, fontSize: '13px' }}
                                    formatter={(value: any) => [formatCurrency(value as number), 'Gross Sales']}
                                />
                                <Area type="monotone" dataKey="Total" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Side Column (Low Stock & Recent Invoices) */}
                <div className="space-y-6">
                    {/* Low Stock Widget */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500" /> Stock Warnings
                            </h3>
                            <Link href="/erp/wholesale/inventory">
                                <button className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors uppercase tracking-widest">View All</button>
                            </Link>
                        </div>

                        {payload.lowStock.length === 0 ? (
                            <div className="text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center mb-2">
                                    <Package className="w-5 h-5" />
                                </div>
                                <p className="text-xs font-semibold text-slate-500">Inventory looks healthy</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {payload.lowStock.map((prod) => (
                                    <div key={prod.id} className="flex items-center justify-between p-3 bg-rose-50/30 border border-rose-100 rounded-xl">
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-800">{prod.name}</p>
                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Min required: {prod.min_stock}</p>
                                        </div>
                                        <div className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap">
                                            {prod.stock} Left
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Invoices Mini Ledger */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-emerald-500" /> Live Ledger
                            </h3>
                        </div>
                        <div className="p-2 flex-grow overflow-y-auto max-h-[300px] hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style dangerouslySetInnerHTML={{ __html: `\n.hide-scrollbar::-webkit-scrollbar { display: none; }\n` }} />
                            {payload.invoices.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">No Sales Found</p>
                                    <Link href="/erp/wholesale/pos">
                                        <button className="mt-3 text-[12px] font-bold text-indigo-600 hover:underline">Launch POS Terminal</button>
                                    </Link>
                                </div>
                            ) : (
                                payload.invoices.slice(0, 7).map((inv, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Receipt className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-bold text-slate-800">Bill ID: {inv.id.substring(0, 6).toUpperCase()}</p>
                                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                    {format(new Date(inv.created_at), 'hh:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[13px] font-black text-slate-900">
                                                +{formatCurrency(Number(inv.total_amount))}
                                            </p>
                                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5 whitespace-nowrap bg-emerald-50 px-1 py-0.5 rounded inline-block">
                                                {formatCurrency(Number(inv.amount_paid))} Cash
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-center">
                            <Link href="/erp/wholesale/sales">
                                <button className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1 hover:gap-2">
                                    View All History <ArrowRight className="w-3 h-3" />
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
