'use client'

import { useState, useRef } from 'react'

type UploaderProps = {
    label: string
    description: string
    icon: string
    action: (formData: FormData) => Promise<{ error?: string; success?: boolean; count?: number } | undefined>
    templateHref: string
    templateName: string
}

export default function CsvUploaderCard({ label, description, icon, action, templateHref, templateName }: UploaderProps) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ error?: string; success?: boolean; count?: number } | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setResult(null)
        const res = await action(formData)
        setResult(res ?? null)
        setLoading(false)
        if (res?.success) formRef.current?.reset()
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <span className="text-3xl">{icon}</span>
                    <div>
                        <h3 className="font-bold text-slate-800">{label}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                    </div>
                </div>
                <a
                    href={templateHref}
                    download={templateName}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition whitespace-nowrap"
                >
                    ⬇ Template
                </a>
            </div>

            {result?.error && (
                <div className="mb-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                    ❌ {result.error}
                </div>
            )}
            {result?.success && (
                <div className="mb-3 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg">
                    ✅ {result.count} records imported successfully
                </div>
            )}

            <form ref={formRef} action={handleSubmit} className="flex items-center gap-3 mt-2">
                <input
                    type="file"
                    name="csv_file"
                    accept=".csv"
                    required
                    disabled={loading}
                    className="flex-1 text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer transition"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className={`shrink-0 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-white transition flex items-center space-x-2 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>UPLOADING...</span>
                        </>
                    ) : (
                        <span>UPLOAD</span>
                    )}
                </button>
            </form>
        </div>
    )
}
