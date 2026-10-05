'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { addProductManual } from './actions'



export default function AddProductModal() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Auto-translation trick wrapper
    const [nameEn, setNameEn] = useState('')
    const [nameNative, setNameNative] = useState('')
    const [translating, setTranslating] = useState(false)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!nameEn.trim()) {
                setNameNative('')
                return
            }
            setTranslating(true)
            try {
                // Phonetic Transliteration (Kiss Me -> किस मी) instead of semantic translation
                const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(nameEn)}&itc=mr-t-i0-und&num=1`)
                const data = await response.json()
                if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
                    setNameNative(data[1][0][1][0])
                } else {
                    setNameNative(nameEn)
                }
            } catch (e) {
                setNameNative(nameEn)
            }
            setTranslating(false)
        }, 500)

        return () => clearTimeout(timer)
    }, [nameEn])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        const formRef = e.currentTarget
        const fd = new FormData(formRef)
        const res = await addProductManual(fd)

        if (res.error) {
            setError(res.error)
        } else {
            setSuccess('Product Added Successfully!')
            setNameEn('')
            setNameNative('')
            formRef.reset()
            setTimeout(() => { setOpen(false); setSuccess('') }, 1500)
        }
        setLoading(false)
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm"
            >
                <Plus className="w-4 h-4" /> Add Product manually
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden translate-y-0 animate-in slide-in-from-bottom-4 duration-300">

                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Manual Add</h3>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Strict duplicate protection active</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">

                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4">
                                <label className="text-[10px] font-black uppercase text-emerald-800 tracking-widest mb-1 block">Google Auto-Transliteration Active</label>
                                <p className="text-xs font-bold text-emerald-600">Type the English name, and the native box will intelligently transliterate it into Marathi while preserving Brand Names.</p>
                            </div>

                            {/* Essential Keys */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Name (English Source)</label>
                                    <input
                                        name="name" type="text" required
                                        value={nameEn} onChange={e => setNameEn(e.target.value)}
                                        placeholder="e.g. Parle G"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1.5 block flex items-center justify-between">
                                        <span>Native / Transliterated</span>
                                        {translating && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
                                    </label>
                                    <input
                                        name="name_mr" type="text"
                                        value={nameNative}
                                        onChange={e => setNameNative(e.target.value)}
                                        placeholder="ऑटो-शब्दलेखन"
                                        className="w-full px-4 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl font-black text-slate-800 outline-none focus:border-emerald-500 transition-all font-sans"
                                    />
                                </div>
                            </div>

                            {/* Financials */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Buy (₹)</label>
                                    <input name="buying_price" type="number" step="any" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Sell (₹)</label>
                                    <input name="selling_price" type="number" step="any" required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Stock Qty</label>
                                    <input name="current_stock" type="number" step="any" defaultValue="0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            {/* Barcode & Extra */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-3 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Unit</label>
                                    <input name="unit" type="text" defaultValue="PCS" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                                <div className="col-span-3 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 block">Scan Barcode (Optional)</label>
                                    <input name="barcode" type="text" placeholder="Click & Scan..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 font-bold text-sm rounded-xl border border-red-200 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="leading-tight">{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 shrink-0" /> {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                SECURE ADD TO VAULT
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
