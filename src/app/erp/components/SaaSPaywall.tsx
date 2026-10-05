'use client'

import { motion } from 'framer-motion'
import { Lock, ShieldAlert, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SaaSPaywall({ shop }: { shop: any }) {
    const router = useRouter()
    const supabase = createClient()

    const monthlyPrice = shop.subscription_price || 999

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="fixed inset-0 z-[9999] bg-[#f8fafc] flex flex-col items-center justify-center p-4 selection:bg-blue-100 font-sans">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full max-w-lg bg-white border border-slate-200 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] overflow-hidden relative z-10"
            >
                <div className="p-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center mb-6 relative">
                        <Lock className="w-10 h-10 text-slate-800" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-rose-500 border-[3px] border-white flex items-center justify-center shadow-sm">
                            <ShieldAlert className="w-4 h-4 text-white" />
                        </div>
                    </div>

                    <h1 className="text-[28px] font-bold text-slate-900 tracking-tight leading-tight">Workspace Locked</h1>

                    <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl w-full text-left flex gap-3">
                        <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[14px] font-semibold text-rose-900">Subscription Expired</p>
                            <p className="text-[13px] text-rose-700 leading-snug mt-1">
                                Your access to <strong>{shop.name}</strong> was suspended because your billing cycle ended on <span className="font-bold">{new Date(shop.subscription_end_date).toLocaleDateString()}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="w-full mt-8 space-y-3 text-left">
                        <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 ml-1">Restore Access Immediately</p>

                        <button className="w-full group relative bg-slate-900 hover:bg-black text-white p-5 rounded-2xl flex items-center justify-between transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[15px] font-semibold">Pay ₹{monthlyPrice.toLocaleString('en-IN')}</p>
                                    <p className="text-[13px] text-slate-400 font-medium">via Razorpay (UPI, Netbanking)</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full mt-6">
                        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Data is safe
                        </div>
                        <div className="flex items-center gap-2 text-[12px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Instant Unlock
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 p-5 flex items-center justify-between">
                    <p className="text-[12px] text-slate-500 font-medium">Need Help? Contact Support</p>
                    <button onClick={handleLogout} className="text-[13px] font-semibold text-slate-700 hover:text-black hover:underline transition-all">
                        Sign Out
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
