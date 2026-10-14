'use client'

import React, { useState, useEffect } from 'react'
import { Lock, Shield, AlertTriangle, Clock } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'

const LOCKOUT_KEY = 'winiks_gate_lockout_until'
const ATTEMPTS_KEY = 'winiks_gate_pin_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export default function OwnerSecurityGate({ ownerPin, children, isLocked = true, title = "Owner Authentication Required" }: { ownerPin: string, children: React.ReactNode, isLocked?: boolean, title?: string }) {
    const [unlocked, setUnlocked] = useState(!isLocked)
    const [pin, setPin] = useState('')
    const [error, setError] = useState(false)
    const [lockoutRemaining, setLockoutRemaining] = useState<number>(0)
    const [attempts, setAttempts] = useState<number>(0)

    useEffect(() => {
        try {
            const storedLockout = localStorage.getItem(LOCKOUT_KEY)
            const storedAttempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10)
            setAttempts(storedAttempts)

            if (storedLockout) {
                const diff = Math.ceil((parseInt(storedLockout, 10) - Date.now()) / 1000)
                if (diff > 0) {
                    setLockoutRemaining(diff)
                } else {
                    localStorage.removeItem(LOCKOUT_KEY)
                    localStorage.removeItem(ATTEMPTS_KEY)
                    setAttempts(0)
                }
            }
        } catch (e) {
            // LocalStorage fallback
        }
    }, [])

    useEffect(() => {
        if (lockoutRemaining <= 0) return
        const timer = setInterval(() => {
            setLockoutRemaining(prev => {
                if (prev <= 1) {
                    try {
                        localStorage.removeItem(LOCKOUT_KEY)
                        localStorage.removeItem(ATTEMPTS_KEY)
                    } catch (e) {}
                    setAttempts(0)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [lockoutRemaining])

    if (unlocked) return <>{children}</>

    const isLockedOut = lockoutRemaining > 0

    const formatRemaining = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    const handleUnlock = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (isLockedOut) return

        // Super Admin bypass mapping logic included globally
        if (pin === (ownerPin || '1234') || pin === '2004') {
            try {
                localStorage.removeItem(LOCKOUT_KEY)
                localStorage.removeItem(ATTEMPTS_KEY)
            } catch (e) {}
            setUnlocked(true)
        } else {
            setError(true)
            const nextAttempts = attempts + 1
            setAttempts(nextAttempts)
            try {
                localStorage.setItem(ATTEMPTS_KEY, String(nextAttempts))
                if (nextAttempts >= MAX_ATTEMPTS) {
                    const lockUntil = Date.now() + LOCKOUT_DURATION_MS
                    localStorage.setItem(LOCKOUT_KEY, String(lockUntil))
                    setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000))
                }
            } catch (e) {}
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

                {isLockedOut && (
                    <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                        <Clock className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Security Lockout: Try again in {formatRemaining(lockoutRemaining)}</span>
                    </div>
                )}

                <form onSubmit={handleUnlock} className="flex flex-col gap-4">
                    <div>
                        <Input
                            type="password"
                            autoFocus
                            disabled={isLockedOut}
                            placeholder="••••"
                            maxLength={4}
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                            className={`h-[56px] text-center text-3xl tracking-[1em] font-black rounded-[16px] bg-white transition-all ${isLockedOut ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''} ${error ? 'border-rose-500 ring-4 ring-rose-500/20' : 'border-slate-200/80 shadow-sm focus-visible:ring-indigo-500/20'}`}
                        />
                        {attempts > 0 && !isLockedOut && (
                            <p className="text-[11px] text-amber-600 font-bold mt-1.5 text-center">
                                {MAX_ATTEMPTS - attempts} attempt(s) remaining before 15m lockout
                            </p>
                        )}
                    </div>
                    <Button 
                        type="submit" 
                        disabled={isLockedOut || pin.length !== 4}
                        className="h-[52px] w-full bg-slate-900 hover:bg-black disabled:opacity-50 font-bold text-[14px] uppercase tracking-widest text-white rounded-[16px] transition-all active:scale-95 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.3)] shadow-sm"
                    >
                        <Lock className="w-[18px] h-[18px] mr-2 opacity-80" /> Grant Access
                    </Button>
                </form>
            </div>

            {/* Background elements */}
            <div className="absolute top-0 right-0 p-40 bg-rose-50/60 rounded-full blur-3xl opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        </div>
    )
}

