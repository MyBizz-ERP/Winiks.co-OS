'use client'

import { useState } from 'react'
import { uploadInventoryCsv } from './actions'

export default function CsvUploader() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)
        const res = await uploadInventoryCsv(formData)

        if (res?.error) {
            setError(res.error)
            setLoading(false) // Only stop loading if error. On success, page auto-rebuilds.
        }
    }

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-200 animate-in fade-in">
                    ❌ {error}
                </div>
            )}
            <form action={handleSubmit} className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-2xl shadow-inner w-full transition">
                <input
                    type="file"
                    name="csv_file"
                    accept=".csv"
                    required
                    disabled={loading}
                    className="file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 text-slate-500 font-medium cursor-pointer w-full sm:w-auto"
                />
                <button type="submit" disabled={loading} className={`text-white font-bold px-8 py-3 rounded-xl transition shadow-sm hover:shadow-md w-full sm:w-auto flex items-center justify-center space-x-2 tracking-wider ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>PARSING MATRIX...</span>
                        </>
                    ) : (
                        <span>INITIALIZE CATALOG</span>
                    )}
                </button>
            </form>
        </div>
    )
}
