'use client'

import { useState } from 'react'
import { createShopAction } from './actions'

export default function ClientShopProvisioner({ categories }: { categories: any[] }) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success?: boolean, error?: string, password?: string, email?: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setResult(null)
        const res = await createShopAction(formData)
        setResult(res as any)
        setLoading(false)
        if (res?.success) {
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        }
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Provision New Tenant</h2>

            {result?.error && (
                <div className="mb-6 p-4 bg-red-50 text-red-800 font-bold text-sm border border-red-200 rounded-lg animate-in fade-in">
                    ⚠️ {result.error}
                </div>
            )}

            {result?.success && (
                <div className="mb-6 p-6 bg-gradient-to-br from-emerald-50 to-white text-emerald-900 border-2 border-emerald-200 rounded-xl shadow-lg animate-in zoom-in-95">
                    <h3 className="text-lg font-black tracking-tight flex items-center mb-1">
                        <span className="mr-2">✅</span> Deployment Complete
                    </h3>
                    <p className="text-xs text-emerald-700 font-bold mb-4 ml-7">System has generated physical Auth tokens.</p>

                    <div className="space-y-2 font-mono text-sm ml-7 bg-white p-4 rounded border border-emerald-100 shadow-sm relative group">
                        <div className="flex items-center"><span className="font-black text-slate-400 w-12">ID:</span> <span className="text-slate-800 font-bold">{result.email}</span></div>
                        <div className="flex items-center"><span className="font-black text-slate-400 w-12">PASS:</span> <span className="text-slate-800 font-bold">{result.password}</span></div>
                        <div className="absolute -top-3 -right-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">Copy securely</div>
                    </div>
                </div>
            )}

            <form action={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Category</label>
                    <select name="category_id" required className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                        <option value="">-- Select Framework --</option>
                        {categories?.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.display_name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Name</label>
                    <input type="text" name="shop_name" required placeholder="e.g., Supreme Kirana" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Identity Gateway (Email)</label>
                    <input type="email" name="owner_email" required placeholder="owner@shop.com" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Physical Address (For Receipt Print)</label>
                    <textarea name="address" required placeholder="123 Example Street, City Name, PIN Code" rows={2} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition resize-none" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official WhatsApp Number</label>
                    <input type="tel" name="whatsapp_number" required placeholder="+919876543210" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google Maps Review Link</label>
                    <input type="url" name="google_review_link" placeholder="https://g.page/r/.../review" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Target Modules</label>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded transition">
                            <input type="checkbox" name="feature_website" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                            <span className="text-sm font-medium text-slate-700">Digital Website Profile</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded transition">
                            <input type="checkbox" name="feature_gmb" defaultChecked className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                            <span className="text-sm font-medium text-slate-700">Automated Google Reviews</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded transition">
                            <input type="checkbox" name="feature_barcode" className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500" />
                            <span className="text-sm font-medium text-slate-700">Barcode Scanner Integration</span>
                        </label>
                        <label className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded transition">
                            <input type="checkbox" name="feature_tax" className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500" />
                            <span className="text-sm font-medium text-slate-700">GST / Tax Accounting Module</span>
                        </label>
                    </div>
                </div>

                <button type="submit" disabled={loading} className={`w-full text-white font-black py-4 mt-6 rounded-xl transition shadow-sm tracking-wider flex items-center justify-center space-x-2 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>RUNNING SCRIPT...</span>
                        </>
                    ) : (
                        <span>🚀 DEPLOY SHOP INSTANCE</span>
                    )}
                </button>
            </form>
        </div>
    )
}
