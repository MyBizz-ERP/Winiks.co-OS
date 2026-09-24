'use client'

import { useState } from 'react'
import { deleteInvoicesByDate } from './dangerActions'

export default function DangerZone() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ error?: string; success?: boolean; message?: string } | null>(null)

    async function handleDelete(formData: FormData) {
        if (!window.confirm("Are you sure? This will permanently delete the invoice history for this date range. Stock and Udhaari balances will NOT be affected.")) {
            return
        }

        setLoading(true)
        setResult(null)
        const res = await deleteInvoicesByDate(formData)
        setResult(res)
        setLoading(false)
    }

    return (
        <section>
            <div className="flex items-center space-x-3 mb-5 mt-12">
                <span className="text-xs font-black uppercase tracking-widest text-red-400">Data Management</span>
                <div className="flex-1 h-px bg-red-100"></div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <h3 className="font-bold text-red-800 mb-2">Delete Invoice History</h3>
                <p className="text-sm text-red-700 font-medium mb-4 leading-relaxed max-w-2xl">
                    Clean up old sales records to keep your system fast. Deleting invoices here removes them from your Sales History list, but
                    <strong> your current Stock Quantities and customer Udhaari Balances are never touched.</strong>
                </p>

                {result?.error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 text-sm font-bold rounded-lg max-w-xl">
                        ❌ {result.error}
                    </div>
                )}

                {result?.success && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-lg max-w-xl">
                        ✅ {result.message}
                    </div>
                )}

                <form action={handleDelete} className="bg-white rounded-xl border border-red-200 p-5 max-w-xl flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">From Date</label>
                        <input type="date" name="start_date" required className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-400 transition" />
                    </div>
                    <div className="w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">To Date</label>
                        <input type="date" name="end_date" required className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-400 transition" />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full md:w-auto px-6 py-2.5 rounded-lg text-sm font-black text-white shrink-0 transition ${loading ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        {loading ? 'Deleting...' : 'Delete Range'}
                    </button>
                </form>
            </div>
        </section>
    )
}
