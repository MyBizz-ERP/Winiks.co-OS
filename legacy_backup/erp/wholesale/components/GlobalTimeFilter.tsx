'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const RANGES = [
    { label: 'Today', value: 'TODAY' },
    { label: '7 Days', value: '7D' },
    { label: '30 Days', value: '30D' },
    { label: '3 Months', value: '3M' },
    { label: '6 Months', value: '6M' },
    { label: '1 Year', value: '1Y' },
    { label: 'All Time', value: 'ALL' },
]

export default function GlobalTimeFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const current = searchParams.get('range') || 'TODAY'
    const specificDate = searchParams.get('date')
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const activeLabel = specificDate
        ? new Date(specificDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })
        : RANGES.find(r => r.value === current)?.label || 'Today'

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    function selectRange(value: string) {
        router.push(`${pathname}?range=${value}`)
        setOpen(false)
    }

    function selectDate(date: string) {
        if (date) {
            router.push(`${pathname}?date=${date}`)
            setOpen(false)
        }
    }

    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
            >
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                {activeLabel}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="p-1.5">
                        {RANGES.map(r => (
                            <button
                                key={r.value}
                                onClick={() => selectRange(r.value)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-colors
                                    ${current === r.value && !specificDate
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-slate-100 p-3">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Exact Date</p>
                        <input
                            type="date"
                            value={specificDate || ''}
                            onChange={e => selectDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
