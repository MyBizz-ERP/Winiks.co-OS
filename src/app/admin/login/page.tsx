'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { ShieldCheck, KeyRound, ArrowRight, Loader2, Fingerprint, CheckCircle2, Info } from 'lucide-react'
import { resetRootPassword } from '../actions'

export default function AdminLogin() {
    const [mode, setMode] = useState<'login' | 'reset'>('login')

    // Login State
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Reset State
    const [birthdate, setBirthdate] = useState('')
    const [newPassword, setNewPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }
        router.push('/admin')
    }

    async function handleReset(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(null)

        const res = await resetRootPassword(email, birthdate, newPassword)
        if (!res.success) {
            setError(res.error!)
            setLoading(false)
            return
        }

        setError(null)
        setSuccess("Biometric verification successful. Password updated.")
        setLoading(false)
        setMode('login')
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 selection:bg-blue-100 font-sans">
            <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-10 relative overflow-hidden transition-all duration-500">

                {/* Clean Geometric Accents */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                <div className="flex flex-col items-center mb-8 relative z-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 shadow-sm flex items-center justify-center text-white mb-4">
                        {mode === 'login' ? <KeyRound className="w-7 h-7" /> : <Fingerprint className="w-7 h-7" />}
                    </div>
                    <div>
                        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Admin Console</h1>
                        <p className="text-[13px] font-medium text-slate-500 mt-1">
                            {mode === 'login' ? 'Sign in to access Winiks OS infrastructure.' : 'Biometric secondary verification required.'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[13px] font-medium p-3.5 rounded-xl mb-6 relative z-10 flex items-start gap-3 shadow-sm">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                        <div>{error}</div>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium p-3.5 rounded-xl mb-6 relative z-10 flex items-start gap-3 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                        <div>{success}</div>
                    </div>
                )}

                {mode === 'login' ? (
                    <form onSubmit={handleLogin} className="space-y-4 relative z-10 fade-in animate-in duration-500">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700 block">Workspace Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                placeholder="name@winiks.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700 block">Passkey</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                placeholder="••••••••••••"
                            />
                        </div>

                        <div className="flex justify-start pt-1">
                            <button type="button" onClick={() => { setMode('reset'); setError(null); setSuccess(null); }} className="text-[13px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all">
                                Forgot passkey?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:shadow-md disabled:opacity-70 disabled:hover:shadow-sm"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-1" /></>}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4 relative z-10 fade-in animate-in duration-500">
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700 block">Verified Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                placeholder="name@winiks.com"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                                <span>Security Question (Birthdate)</span>
                                <span className="text-slate-400 font-normal">DD/MM/YYYY</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={birthdate}
                                onChange={e => setBirthdate(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                placeholder="e.g. 18/12/2004"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-semibold text-slate-700 block">Deploy New Passkey</label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                                placeholder="New credentials"
                            />
                        </div>

                        <div className="flex justify-start pt-1">
                            <button type="button" onClick={() => { setMode('login'); setError(null); }} className="text-[13px] font-medium text-slate-500 hover:text-slate-700 hover:underline transition-all">
                                Cancel and return to sign in
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[14px] rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:shadow-md disabled:opacity-70 disabled:hover:shadow-sm"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-4 h-4 mr-1" /> Authorize Reset</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
