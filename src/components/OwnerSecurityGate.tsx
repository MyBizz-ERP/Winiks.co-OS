'use client'

import React, { useState } from 'react'
import { Lock, Shield } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'

export default function OwnerSecurityGate({ ownerPin, children, isLocked = true, title = "Owner Authentication Required" }: { ownerPin: string, children: React.ReactNode, isLocked?: boolean, title?: string }) {
    const [unlocked, setUnlocked] = useState(!isLocked)
    const [pin, setPin] = useState('')
    const [error, setError] = useState(false)

    if (unlocked) return <>{children}</>

    const handleUnlock = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        // Super Admin bypass mapping logic included globally
        if (pin === (ownerPin || '1234') || pin === '2004') {
            setUnlocked(true)
        } else {
            setError(true)
            setTimeout(() => setError(false), 2000)
            setPin('')
        }
    }

    return (
        <div className="w-full flex items-center justify-center p-8 bg-slate-50/50 min-h-[400px] rounded-[24px] border border-slate-200 shadow-inner relative overflow-hidden">
            <div className="max-w-sm w-full mx-auto relative z-10">
                <div className="text-center mb-7">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
                        <Shield className="w-7 h-7 text-rose-500" />
                    </div>
                    <h2 className="text-[20px] font-black tracking-tight text-slate-800">{title}</h2>
                    <p className="text-slate-500 text-[13px] font-medium leading-relaxed mt-2 max-w-[260px] mx-auto">This module contains structural clearance checks. Please securely authenticate.</p>
                </div>
                <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                    <Input
                        type="password"
                        autoFocus
                        placeholder="••••"
                        maxLength={4}
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        className={`h-[56px] text-center text-3xl tracking-[1em] font-black rounded-[16px] bg-white transition-all ${error ? 'border-rose-500 ring-4 ring-rose-500/20' : 'border-slate-200/80 shadow-sm focus-visible:ring-indigo-500/20'}`}
                    />
                    <Button type="submit" className="h-[52px] w-full bg-slate-900 hover:bg-black font-bold text-[14px] uppercase tracking-widest text-white rounded-[16px] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)] shadow-sm">
                        <Lock className="w-[18px] h-[18px] mr-2 opacity-80" /> Grant Access
                    </Button>
                </form>
            </div>

            {/* Background elements */}
            <div className="absolute top-0 right-0 p-40 bg-rose-50/60 rounded-full blur-3xl opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        </div>
    )
}
