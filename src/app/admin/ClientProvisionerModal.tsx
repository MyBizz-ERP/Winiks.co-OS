'use client'

import { useState } from 'react'
import { Plus, X, Building, Phone, Key, Fingerprint, Lock, Box } from 'lucide-react'
import { performAdminAction } from './actions'
import { motion, AnimatePresence } from 'framer-motion'

export default function ClientProvisionerModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            await performAdminAction(formData)
            setIsOpen(false)
        } catch (error) {
            console.error(error)
            alert("Provisioning failed. Check server logs.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
                <Plus className="w-4 h-4" /> Provision Workspace
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10"
                        >

                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h2 className="text-[18px] font-bold text-slate-900 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-blue-600" />
                                        Root Provisioner
                                    </h2>
                                    <p className="text-[13px] text-slate-500 mt-0.5">Deploy a structurally isolated SaaS tenant database.</p>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 bg-white rounded-full border border-slate-200 shadow-sm transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form action={handleSubmit} className="p-6 space-y-5">
                                <input type="hidden" name="actionType" value="provision_tenant" />

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Owner UID (Critical)</label>
                                        <div className="relative">
                                            <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input required name="ownerId" type="text" placeholder="UUID from Auth Table..." className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-mono text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Initial Vault PIN</label>
                                        <div className="relative">
                                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input required name="ownerPin" type="text" defaultValue="1234" maxLength={4} className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-mono text-[13px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-5 space-y-1.5">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">System Category</label>
                                            <div className="relative">
                                                <Box className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input required name="categoryId" type="text" placeholder="e.g., wholesale..." className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] font-medium placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block">Monthly Price (₹)</label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400">₹</span>
                                                <input required name="subscriptionPrice" type="number" defaultValue={2999} min={0} className="w-full pl-8 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-bold text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-500 px-1 pt-0.5">Price logic dictates automatic MRR payload configuration upon paywall interception.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input required name="shopName" type="text" placeholder="Shop Name" className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 font-semibold text-[14px] placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                    </div>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input name="phone" type="text" placeholder="Phone Number" className="w-full pl-10 pr-4 h-11 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                    </div>
                                </div>
                                <input name="address" type="text" placeholder="Address (English)" className="w-full h-11 px-4 bg-white border border-slate-200 shadow-sm rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />

                                <div className="border-t border-slate-100 pt-5 space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Regional Defaults (Marathi) [Optional]</label>
                                    <input name="shopNameMr" type="text" placeholder="Shop Name (मराठी)" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-[14px] placeholder:font-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-sans" />
                                    <input name="addressMr" type="text" placeholder="Address (मराठी)" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-[14px] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-sans" />
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-800 font-semibold text-[13px] transition-colors rounded-lg hover:bg-slate-50">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-semibold text-[13px] rounded-lg shadow-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:hover:scale-100">
                                        {loading ? 'Deploying...' : 'Initialize Tenant Node'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
