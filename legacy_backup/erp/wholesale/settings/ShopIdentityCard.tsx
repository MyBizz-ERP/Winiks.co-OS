'use client'

import { useState } from 'react'
import { Loader2, Save, Store, MapPin, Phone } from 'lucide-react'
import { updateShopIdentity } from './actions'

export default function ShopIdentityCard() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setSuccess('')

        const fd = new FormData(e.currentTarget)
        const res = await updateShopIdentity(fd)

        setLoading(false)
        if (res.error) {
            alert(res.error)
        } else {
            setSuccess('Shop Details Saved Successfully!')
            setTimeout(() => setSuccess(''), 3000)
        }
    }

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-black text-slate-900">Receipt Localization</h3>
                    <p className="text-xs text-slate-500 font-medium tracking-tight">Configure printed details mapped to the Marathi POS.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1 block">Shop Name (Marathi)</label>
                        <input name="shop_name_mr" type="text" placeholder="उदा. मायबिझ एंटरप्राइजेस" className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all font-sans" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">Phone Number</label>
                        <input name="phone_number" type="tel" placeholder="Contact number..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all font-mono" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 block">English Address</label>
                        <input name="address" type="text" placeholder="123 Market Street, City..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1 block">Marathi Address</label>
                        <input name="address_mr" type="text" placeholder="१२३ मार्केट रस्ता, शहर..." className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-xl font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all font-sans" />
                    </div>
                </div>

                {success && (
                    <div className="p-3 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200 text-center animate-in fade-in">
                        {success}
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-4 mt-2 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow text-xs flex justify-center items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {loading ? 'SAVING CONFIGURATION...' : 'SYNCHRONIZE RECEIPT CONFIG'}
                </button>
            </form>
        </div>
    )
}
