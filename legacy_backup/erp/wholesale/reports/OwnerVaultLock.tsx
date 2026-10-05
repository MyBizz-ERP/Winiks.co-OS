'use client'

import { useState, useEffect, useRef } from 'react'

export default function OwnerVaultLock({ children, pinCode }: { children: React.ReactNode, pinCode: string }) {
    const [unlocked, setUnlocked] = useState(false)
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
    const [error, setError] = useState(false)
    const [shake, setShake] = useState(false)
    const inputsRef = useRef<(HTMLInputElement | null)[]>([])
    const pinLength = pinCode.length <= 4 ? 4 : Math.min(pinCode.length, 6)

    useEffect(() => {
        if (unlocked) return
        setTimeout(() => inputsRef.current[0]?.focus(), 100)
    }, [unlocked])

    if (unlocked) return <>{children}</>

    function handleDigit(index: number, val: string) {
        if (!/^[0-9]?$/.test(val)) return
        const next = [...digits]
        next[index] = val
        setDigits(next)
        if (val && index < pinLength - 1) {
            inputsRef.current[index + 1]?.focus()
        }
        const entered = next.slice(0, pinLength).join('')
        if (entered.length === pinLength) {
            if (entered === pinCode.slice(0, pinLength)) {
                setTimeout(() => setUnlocked(true), 150)
            } else {
                setError(true)
                setShake(true)
                setTimeout(() => {
                    setDigits(['', '', '', '', '', ''])
                    setError(false)
                    setShake(false)
                    inputsRef.current[0]?.focus()
                }, 600)
            }
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputsRef.current[index - 1]?.focus()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md">
            <div className={`text-center px-8 py-12 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>

                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight mb-2">Financial Reports</h2>
                <p className="text-sm text-slate-400 font-medium mb-10 max-w-xs mx-auto">
                    Enter your owner PIN to access Day-End analytics and cash flow data.
                </p>

                <div className="flex gap-3 justify-center mb-4">
                    {Array.from({ length: pinLength }).map((_, i) => (
                        <input
                            key={i}
                            ref={el => { inputsRef.current[i] = el }}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digits[i]}
                            onChange={e => handleDigit(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-slate-900 text-white outline-none transition-all
                                ${error
                                    ? 'border-red-500 text-red-400'
                                    : digits[i]
                                        ? 'border-indigo-500 text-white'
                                        : 'border-slate-700 focus:border-indigo-500'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-sm font-bold text-red-400 tracking-wide mt-2">Incorrect PIN. Try again.</p>
                )}

                <p className="text-xs text-slate-600 font-medium mt-8">
                    Change your PIN in Settings
                </p>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-8px); }
                    40% { transform: translateX(8px); }
                    60% { transform: translateX(-6px); }
                    80% { transform: translateX(6px); }
                }
            `}</style>
        </div>
    )
}
