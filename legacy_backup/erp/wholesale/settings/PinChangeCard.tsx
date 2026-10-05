'use client'

import { useState, useRef } from 'react'
import { Lock, CheckCircle, AlertCircle } from 'lucide-react'

export default function PinChangeCard({ action }: { action: (fd: FormData) => Promise<{ error?: string, success?: boolean }> }) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const formRef = useRef<HTMLFormElement>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setStatus('loading')
        const fd = new FormData(formRef.current!)
        const result = await action(fd)
        if (result.success) {
            setStatus('success')
            setMessage('PIN updated successfully.')
            formRef.current?.reset()
        } else {
            setStatus('error')
            setMessage(result.error || 'Failed to update PIN.')
        }
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <Lock className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Day-End Reports PIN</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-5 ml-11">
                Set a 4–8 digit numeric PIN. Staff will not be able to access financial analytics without it.
            </p>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1.5">New PIN</label>
                        <input
                            type="password"
                            name="new_pin"
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="Enter new PIN"
                            required
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-slate-50"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-1.5">Confirm PIN</label>
                        <input
                            type="password"
                            name="confirm_pin"
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="Re-enter PIN"
                            required
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-slate-50"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-60"
                    >
                        {status === 'loading' ? 'Saving...' : 'Update PIN'}
                    </button>

                    {status === 'success' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <CheckCircle className="w-4 h-4" /> {message}
                        </span>
                    )}
                    {status === 'error' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                            <AlertCircle className="w-4 h-4" /> {message}
                        </span>
                    )}
                </div>
            </form>
        </div>
    )
}
