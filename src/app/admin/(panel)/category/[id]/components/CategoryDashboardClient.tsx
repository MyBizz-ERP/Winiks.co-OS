'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Server, Activity, Power, PowerOff, Building2, Phone, AlertCircle, HardDrive, Package, Users, Receipt, ArrowLeft, ArrowUpRight, Copy, Plus, X, Key, Trash2, Edit2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { performAdminAction } from '../../../../actions'
import { useState } from 'react'

export default function CategoryDashboardClient({ metricsData, categoryId }: { metricsData: any[], categoryId: string }) {
    const router = useRouter()

    // --- Category Analytics ---
    const grossMrr = metricsData.filter(s => s.is_active).reduce((sum, shop) => sum + (shop.subscription_price || 0), 0)

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring" as any, stiffness: 300, damping: 24 } }
    }

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [provisionSuccess, setProvisionSuccess] = useState<{ shopId: string, password: string } | null>(null)

    // Deletion Modal State
    const [shopToDelete, setShopToDelete] = useState<{ id: string, name: string, code: string } | null>(null)
    const [deleteInput, setDeleteInput] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    // Reset Modal State
    const [shopToReset, setShopToReset] = useState<{ id: string, name: string, code: string } | null>(null)
    const [resetInput, setResetInput] = useState('')
    const [isResetting, setIsResetting] = useState(false)

    // Edit Modal State
    const [shopToEdit, setShopToEdit] = useState<any | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    // Format proper readable title
    const categoryTitle = categoryId === 'wholesale' ? 'Wholesale B2B' :
        categoryId === 'salon' ? 'Salon & Parlour' :
            categoryId === 'clinic' ? 'Healthcare Clinic' : categoryId.toUpperCase()

    // Default Subscription Parameters per Vertical
    const defaultSub = categoryId === 'wholesale' ? 3000 :
        categoryId === 'salon' ? 1800 :
            categoryId === 'clinic' ? 4500 : 999

    async function handleProvision(formData: FormData) {
        setIsSubmitting(true)
        try {
            const res = await performAdminAction(formData)
            if (res && res.success && res.credentials) {
                setProvisionSuccess(res.credentials)
            } else {
                setIsAddModalOpen(false)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleResetSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!shopToReset) return
        if (resetInput !== '2004') { // Strict Date of Birth Verification Check
            alert('SECURITY LOCK: Invalid Date of Birth provided.')
            return
        }

        setIsResetting(true)
        try {
            const formData = new FormData()
            formData.append('actionType', 'reset_tenant_credentials')
            formData.append('shopId', shopToReset.id)
            const res = await performAdminAction(formData)
            if (res && res.success && res.credentials) {
                setShopToReset(null)
                setResetInput('')
                setProvisionSuccess(res.credentials)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsResetting(false)
        }
    }

    async function handleDeleteSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!shopToDelete || deleteInput !== shopToDelete.code) return

        setIsDeleting(true)
        try {
            const formData = new FormData()
            formData.append('actionType', 'delete_tenant')
            formData.append('shopId', shopToDelete.id)
            const res = await performAdminAction(formData)
            if (res && res.success) {
                setShopToDelete(null)
                setDeleteInput('')
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsDeleting(false)
        }
    }

    async function handleEditSubmit(formData: FormData) {
        setIsEditing(true)
        try {
            const res = await performAdminAction(formData)
            if (res && res.success) {
                setShopToEdit(null)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsEditing(false)
        }
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">

            {/* Header Block & Navigation */}
            <motion.div variants={itemVariants} className="flex items-center gap-4 border-b border-slate-200 pb-6">
                <button
                    onClick={() => router.push('/admin')}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        {categoryTitle} Command Matrix
                    </h1>
                    <p className="text-[13px] font-medium text-slate-500 mt-1">
                        Isolated God-Mode infrastructure for this SaaS vertical. All provisions are strictly bound offline.
                    </p>
                </div>
            </motion.div>

            {/* Quick Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <p className="text-slate-500 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Total Hubs
                    </p>
                    <p className="text-3xl font-black text-slate-800 tracking-tight">{metricsData.length}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <p className="text-slate-500 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Hubs
                    </p>
                    <p className="text-3xl font-black text-slate-800 tracking-tight">{metricsData.filter(s => s.is_active).length}</p>
                </div>
                <div className="bg-indigo-600 border border-indigo-700 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-indigo-600/20 md:col-span-2 group">
                    <p className="text-indigo-200 text-[11px] font-bold tracking-[0.15em] uppercase mb-1.5">
                        Extracted Vertical MRR
                    </p>
                    <p className="text-4xl font-black text-white tracking-tight">₹{grossMrr.toLocaleString('en-IN')}</p>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                        <ArrowUpRight className="w-24 h-24 text-white" />
                    </div>
                </div>
            </motion.div>

            {/* The Strict Organization Table */}
            <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-500" /> Vertical Registry
                        </h2>
                    </div>

                    {/* The Provisioning Button that opens the specialized Modal */}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Provision Node
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans">
                        <thead className="bg-[#f8fafc] text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Tenant Node</th>
                                <th className="px-6 py-4 font-semibold">Internal Telemetry</th>
                                <th className="px-6 py-4 font-semibold">Status Block</th>
                                <th className="px-6 py-4 font-semibold text-right">Overrides</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {metricsData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                                            <Server className="w-8 h-8 text-slate-400" />
                                            <p className="text-[13px] font-medium text-slate-500">No organizational nodes deployed under this category.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                metricsData.map((shop) => (
                                    <motion.tr
                                        key={shop.id}
                                        whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.8)", scale: 1.002 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="group cursor-default isolate"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-[10px] bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                                    <Building2 className="w-[18px] h-[18px]" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-[14px]">{shop.name}</p>
                                                    <div className="flex items-center gap-3 mt-0.5 text-[12px] text-slate-500">
                                                        <span className="flex items-center gap-1"><Phone className="w-[11px] h-[11px]" /> {shop.phone || '--'}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
                                                            {shop.id.split('-')[0]}
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(shop.owner_id);
                                                                    alert("Copied Identity Root UUID")
                                                                }}
                                                                className="hover:text-indigo-500"
                                                                title="Copy Root UID"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                                                    {shop.product_count}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                    <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                                                    {shop.invoice_count}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                                    <Users className="w-3.5 h-3.5 text-amber-500" />
                                                    {shop.customer_count}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            {shop.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Suspended
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm("Hard Reset this tenants Vault PIN to 1234?")) return
                                                        try {
                                                            const formData = new FormData()
                                                            formData.append('shopId', shop.id)
                                                            const res = await fetch('/api/admin/reset-vault', { method: 'POST', body: formData })
                                                            if (!res.ok) throw new Error()
                                                            alert('Vault PIN Hard Reset to 1234.')
                                                        } catch (e) {
                                                            alert('Failed to reset vault pin.')
                                                        }
                                                    }}
                                                    className="px-3 py-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-all font-semibold text-[13px] shadow-sm bg-white"
                                                    title="Reset Vault PIN"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShopToEdit(shop)
                                                    }}
                                                    className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200"
                                                    title="Edit Node Profile"
                                                >
                                                    <Edit2 className="w-4 h-4" /> Edit
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setShopToReset({ id: shop.id, name: shop.name, code: shop.tenant_code || shop.id.split('-')[0] })
                                                        setResetInput('')
                                                    }}
                                                    className="px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                                                >
                                                    Rotate Keys
                                                </button>

                                                <form action={async (fd) => { await performAdminAction(fd) }}>
                                                    <input type="hidden" name="actionType" value="toggle_status" />
                                                    <input type="hidden" name="shopId" value={shop.id} />
                                                    <input type="hidden" name="targetStatus" value={(!shop.is_active).toString()} />
                                                    <button
                                                        type="submit"
                                                        className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95 ${shop.is_active
                                                            ? 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent hover:shadow-emerald-500/20 shadow-md'
                                                            }`}
                                                    >
                                                        {shop.is_active ? (
                                                            <><PowerOff className="w-3.5 h-3.5" /> Disable</>
                                                        ) : (
                                                            <><Power className="w-3.5 h-3.5" /> Unsuspend</>
                                                        )}
                                                    </button>
                                                </form>

                                                <button
                                                    onClick={() => {
                                                        setShopToDelete({ id: shop.id, name: shop.name, code: shop.tenant_code || shop.id.split('-')[0] })
                                                        setDeleteInput('')
                                                    }}
                                                    className="px-3 py-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all font-semibold text-[13px] shadow-sm bg-white ml-2"
                                                    title="Permanently Drop Node"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Specialized Modal specific to this Vertical */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10 flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                                <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                    <Server className="w-4 h-4 text-indigo-600" /> Deploy {categoryTitle} Tenant Node
                                </h2>
                                <button disabled={isSubmitting} onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form action={handleProvision} className="flex flex-col overflow-hidden">
                                <div className="p-5 overflow-y-auto w-full space-y-6">
                                    <input type="hidden" name="actionType" value="provision_tenant" />
                                    {/* STRATEGIC SECURITY LOCK: Hardcode the category so they can never mismatch */}
                                    <input type="hidden" name="categoryId" value={categoryId} />


                                    <div>
                                        <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Organization Matrix</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Business Alias</label>
                                                <input required name="shopName" type="text" placeholder="e.g. MyBizz Traders" className="w-full px-4 h-10 bg-white border shadow-sm rounded-lg text-[13px]" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Marathi Alias</label>
                                                <input name="shopNameMr" type="text" placeholder="मायबीझ ट्रेडर्स" className="w-full px-4 h-10 bg-white border shadow-sm rounded-lg text-[13px]" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Contact Node</label>
                                                <input name="phone" type="text" className="w-full px-4 h-10 bg-white border shadow-sm rounded-lg text-[13px]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sub-Section: Financial Monetization Layer */}
                                    <div>
                                        <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Monetization Frame</p>
                                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[13px] font-bold text-rose-800">Assigned Contract Value (Monthly)</p>
                                                <p className="text-[11px] text-rose-600/80 font-medium mt-0.5">Overrides standard rate logic.</p>
                                            </div>
                                            <div className="relative w-32">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-rose-700/50 flex">₹</span>
                                                <input name="subscriptionPrice" type="number" defaultValue={defaultSub} required className="w-full pl-7 pr-4 h-10 bg-white border border-rose-200 shadow-sm rounded-lg text-rose-900 font-black text-[15px] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-right" />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                                    <button type="submit" disabled={isSubmitting} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:hover:scale-100">
                                        {isSubmitting ? <Activity className="w-5 h-5 animate-spin" /> : 'Execute Provisioning Protocol'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* B2B Credential Hand-Off Modal */}
            <AnimatePresence>
                {provisionSuccess && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10 flex flex-col items-center p-8 text-center"
                        >
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                                <Server className="w-8 h-8" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">System Deployed</h2>
                            <p className="text-[13px] text-slate-500 mb-8 leading-relaxed">
                                Please screenshot these credentials and hand them to the client. They will use this exact Shop ID and Code to access the ERP.
                            </p>

                            <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 mb-8">
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Assigned Shop ID</p>
                                    <p className="text-3xl font-black text-indigo-600 tracking-tight">{provisionSuccess.shopId}</p>
                                </div>
                                <div className="h-px w-full bg-slate-200" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Access Passcode</p>
                                    <p className="text-2xl font-bold text-slate-800 tracking-[0.2em]">{provisionSuccess.password}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setProvisionSuccess(null)
                                    setIsAddModalOpen(false)
                                }}
                                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[14px] rounded-xl shadow-md transition-all"
                            >
                                Acknowledge & Close
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DANGEROUS DELETION MODAL */}
            <AnimatePresence>
                {shopToDelete && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !isDeleting && setShopToDelete(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border-2 border-red-500 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-red-600/20 relative z-10 flex flex-col p-6 text-left"
                        >
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <AlertCircle className="w-6 h-6 shrink-0" />
                                <h3 className="text-[17px] font-bold tracking-tight text-slate-900 leading-tight">Destroy Organizational Node?</h3>
                            </div>

                            <p className="text-[13px] text-slate-500 mb-5 leading-relaxed bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
                                This will permanently vaporize <strong className="text-slate-800">{shopToDelete.name}</strong>, their database records, products, physical invoices, and Auth Identity. This action is <strong>unrecoverable</strong>.
                            </p>

                            <form onSubmit={handleDeleteSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Type "{shopToDelete.code}" to confirm</label>
                                    <input
                                        type="text"
                                        required
                                        value={deleteInput}
                                        onChange={e => setDeleteInput(e.target.value)}
                                        placeholder={shopToDelete.code}
                                        className="w-full px-4 h-11 bg-white border border-slate-300 shadow-inner rounded-xl text-[14px] font-mono tracking-widest outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-center uppercase"
                                    />
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={() => setShopToDelete(null)}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-slate-500 font-semibold hover:bg-slate-100 transition-colors text-[13px]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isDeleting || deleteInput !== shopToDelete.code}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? <Activity className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Drop Node</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reset Credentials Security Modal */}
            <AnimatePresence>
                {shopToReset && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !isResetting && setShopToReset(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative z-10"
                        >
                            <div className="p-5 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
                                <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                    <Key className="w-4 h-4 text-rose-600" /> Rotate Master Keys
                                </h2>
                                <button disabled={isResetting} onClick={() => setShopToReset(null)} className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleResetSubmit} className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <p className="text-[13px] font-medium text-slate-700 leading-relaxed">
                                        You are executing a Force Credential Overwrite for <span className="font-bold text-slate-900">{shopToReset.name}</span>.
                                    </p>
                                </div>
                                <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Admin Authorization</label>
                                    <p className="text-[12px] text-slate-600 mb-2 font-medium">To unlock, enter SuperAdmin Date of Birth:</p>
                                    <input
                                        type="password"
                                        placeholder="YYYY"
                                        value={resetInput}
                                        onChange={e => setResetInput(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-rose-600 font-mono tracking-widest text-[14px] font-bold focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder:text-slate-300"
                                        autoComplete="off"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isResetting || !resetInput}
                                    className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[13px] rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Key className="w-4 h-4" />
                                    {isResetting ? 'ROTATING...' : 'AUTHORIZE KEY OVERWRITE'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Tenant Modal */}
            <AnimatePresence>
                {shopToEdit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isEditing && setShopToEdit(null)}
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10 flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                                <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-indigo-600" /> Modify Tenant Node
                                </h2>
                                <button disabled={isEditing} onClick={() => setShopToEdit(null)} className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form action={handleEditSubmit} className="flex flex-col overflow-hidden">
                                <div className="p-5 overflow-y-auto w-full space-y-6">
                                    <input type="hidden" name="actionType" value="edit_tenant" />
                                    <input type="hidden" name="shopId" value={shopToEdit.id} />

                                    <div>
                                        <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Organization Matrix</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Business Alias</label>
                                                <input required name="shopName" type="text" defaultValue={shopToEdit.name} className="w-full px-4 h-10 bg-white border shadow-sm rounded-lg text-[13px]" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Marathi Alias</label>
                                                <input name="shopNameMr" type="text" defaultValue={shopToEdit.name_mr || ''} className="w-full px-4 h-10 bg-white border shadow-sm rounded-lg text-[13px]" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Contact Node</label>
                                                <input name="phone" type="text" defaultValue={shopToEdit.phone || ''} className="w-full px-4 h-10 bg-white border shadow-sm rounded-lg text-[13px]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sub-Section: Financial Monetization Layer */}
                                    <div>
                                        <p className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3">Monetization Frame</p>
                                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[13px] font-bold text-rose-800">Assigned Contract Value (Monthly)</p>
                                                <p className="text-[11px] text-rose-600/80 font-medium mt-0.5">Overrides standard rate logic.</p>
                                            </div>
                                            <div className="relative w-32">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-rose-700/50 flex">₹</span>
                                                <input name="subscriptionPrice" type="number" defaultValue={shopToEdit.subscription_price || defaultSub} required className="w-full pl-7 pr-4 h-10 bg-white border border-rose-200 shadow-sm rounded-lg text-rose-900 font-black text-[15px] focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-right" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                                    <button type="submit" disabled={isEditing} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:hover:scale-100">
                                        {isEditing ? <Activity className="w-5 h-5 animate-spin" /> : 'Execute Modifications'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </motion.div>
    )
}
