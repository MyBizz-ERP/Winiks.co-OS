'use client'

import { motion } from 'framer-motion'
import { Server, Activity, Power, PowerOff, Building2, Phone, AlertCircle, HardDrive, LayoutGrid, Package, Users, Receipt, IndianRupee, CreditCard, TrendingUp, Database, ArrowUpRight, ArrowDownRight, FolderGit2, BriefcaseMedical, Scissors } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminDashboardClient({ metricsData }: { metricsData: any[] }) {
    const router = useRouter()

    // --- Financial Command Center Mathematics (Global) ---
    const grossMrr = metricsData.filter(s => s.is_active).reduce((sum, shop) => sum + (shop.subscription_price || 0), 0)
    const razorpayFee = grossMrr * 0.02
    const serverCosts = 3750
    const finalProfit = grossMrr - razorpayFee - serverCosts

    // --- Vertical Segmentation Algorithm ---
    const categories = [
        { id: 'wholesale', title: 'Wholesale B2B', icon: FolderGit2, color: 'indigo' },
        { id: 'salon', title: 'Salon & Parlour', icon: Scissors, color: 'fuchsia' },
        { id: 'clinic', title: 'Healthcare Clinic', icon: BriefcaseMedical, color: 'emerald' },
    ]

    const categoryStats = categories.map(cat => {
        const catShops = metricsData.filter(s => s.category_id?.toLowerCase() === cat.id)
        return {
            ...cat,
            shopCount: catShops.length,
            activeCount: catShops.filter(s => s.is_active).length,
            mrr: catShops.filter(s => s.is_active).reduce((sum, s) => sum + (s.subscription_price || 0), 0)
        }
    })

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 pb-10"
        >
            {/* FINANCIAL TELEMETRY HUD (GLOBAL) */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">

                {/* Gross MRR */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all duration-700">
                        <IndianRupee className="w-24 h-24 text-white" />
                    </div>
                    <p className="text-slate-400 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5 flex items-center gap-2">
                        Gross MRR
                    </p>
                    <p className="text-3xl font-black text-white tracking-tight">₹{grossMrr.toLocaleString('en-IN')}</p>
                    <div className="mt-4 flex items-center gap-2 text-[12px] text-emerald-400 font-semibold bg-emerald-500/10 w-fit px-2 py-1 rounded">
                        <TrendingUp className="w-3.5 h-3.5" /> Core Revenue
                    </div>
                </div>

                {/* Razorpay Cut */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <p className="text-slate-500 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5">Razorpay Comm (2%)</p>
                    <p className="text-2xl font-bold text-slate-800 tracking-tight text-rose-600">-₹{razorpayFee.toLocaleString('en-IN')}</p>
                    <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-1.5 w-[2%]"></div>
                    </div>
                </div>

                {/* Infrastructure Overhead */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <p className="text-slate-500 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5">Server Overhead</p>
                    <p className="text-2xl font-bold text-slate-800 tracking-tight text-amber-600">-₹{serverCosts.toLocaleString('en-IN')}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>Vercel (Compute)</span>
                        <span>$20</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>Supabase (Postgres)</span>
                        <span>$25</span>
                    </div>
                </div>

                {/* Final Net MRR */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 border border-indigo-500 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-indigo-600/20 group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <ArrowUpRight className="w-24 h-24 text-white" />
                    </div>
                    <p className="text-indigo-200 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5">
                        Net Profit (MRR)
                    </p>
                    <p className="text-4xl font-black text-white tracking-tight">₹{finalProfit.toLocaleString('en-IN')}</p>
                    <p className="text-indigo-200 text-[12px] font-medium mt-3 flex items-center gap-1.5 relative z-10">
                        Total Liquid Cash Flow per month
                    </p>
                </div>

            </motion.div>

            {/* CATEGORY VECTOR MATRIX */}
            <motion.div variants={itemVariants}>
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-6">
                    <LayoutGrid className="w-5 h-5 text-indigo-500" /> SaaS Verticals Ecosystem
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryStats.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => router.push(`/admin/category/${cat.id}`)}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                                <div>
                                    <h3 className="text-[18px] font-bold text-slate-900 uppercase tracking-tight">{cat.title}</h3>
                                    <p className="text-[12px] font-medium text-slate-500 mt-0.5">SaaS Engine</p>
                                </div>
                                <div className={`w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:bg-${cat.color}-600 group-hover:border-${cat.color}-600 transition-colors`}>
                                    <cat.icon className={`w-6 h-6 text-slate-500 group-hover:text-white transition-colors`} />
                                </div>
                            </div>

                            <div className="p-6 space-y-4 flex-1">
                                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-4">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total Workspaces</p>
                                        <p className="text-2xl font-bold text-slate-800 mt-1">{cat.shopCount}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {cat.activeCount} Active
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sub-Network MRR</p>
                                    <p className={`text-xl font-black mt-1 text-${cat.color}-600`}>₹{cat.mrr.toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            {/* Action Strip */}
                            <div className={`border-t border-slate-100 p-4 bg-[#f8fafc] group-hover:bg-${cat.color}-50 transition-colors flex items-center justify-between`}>
                                <span className={`text-[13px] font-bold text-slate-500 group-hover:text-${cat.color}-700`}>Manage Vertical</span>
                                <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-${cat.color}-600 shadow-sm border border-slate-200 group-hover:border-${cat.color}-200 transition-colors`}>
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
