import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/admin/login')
    }

    // Securely fetch Live Data using Service Role (Bypasses RLS for Dashboard stats)
    const [catRes, shopRes, errRes, dataRes] = await Promise.all([
        supabaseAdmin.from('categories').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('shops').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabaseAdmin.from('system_logs').select('*', { count: 'exact', head: true }).eq('severity', 'ERROR'),
        supabaseAdmin.from('categories').select('name, display_name')
    ])

    // Capture exactly what error Supabase is throwing under the hood
    const debugError = catRes.error?.message || shopRes.error?.message || errRes.error?.message || dataRes.error?.message || null

    const categoryCount = catRes.count ?? 0
    const shopCount = shopRes.count ?? 0
    const errorCount = errRes.count ?? 0
    const categories = dataRes.data ?? []

    const isHealthy = !debugError && errorCount === 0

    return (
        <div className="p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">

            {/* 🔴 EXTREME DEBUG OVERLAY if Supabase rejects us */}
            {debugError && (
                <div className="mb-8 p-6 bg-red-100 border-l-4 border-red-500 rounded text-red-900 shadow-sm">
                    <h2 className="text-xl font-bold mb-2 flex items-center">
                        <span className="mr-2">🚨</span> CRITICAL DATABASE REJECTION
                    </h2>
                    <p className="mb-2 font-medium">Supabase is explicitly blocking our connection with this exact error:</p>
                    <pre className="p-4 bg-red-950 text-red-400 rounded-md font-mono text-sm overflow-x-auto shadow-inner">
                        {debugError}
                    </pre>
                    <p className="mt-4 text-sm opacity-80">Check this text! If it says "relation does not exist", it means the SQL tables were created in a different Supabase project. If it says "JWT/Signature", it means the keys are still mismatched.</p>
                </div>
            )}

            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Platform Health Canvas</h1>
                <p className="text-slate-500 mt-2 text-lg">Real-time monitoring for all ERP categories and tenant shops across the network.</p>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Total Categories Overview */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Total Categories</h3>
                    <div className="text-5xl font-black text-slate-800">{categoryCount}</div>
                    <div className="mt-6 flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <span key={cat.name} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                                {cat.display_name}
                            </span>
                        ))}
                        {categories.length === 0 && (
                            <span className="px-3 py-1.5 bg-slate-50 text-slate-500 text-xs font-bold rounded-lg border border-slate-200">No categories loaded</span>
                        )}
                    </div>
                </div>

                {/* Tenant Shops Overview */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active Tenant Shops</h3>
                    <div className="text-5xl font-black text-slate-800">{shopCount}</div>
                    <p className="text-sm font-medium text-amber-600 mt-6 bg-amber-50 px-3 py-2 rounded-lg inline-block">
                        {shopCount === 0 ? 'Awaiting first tenant provision.' : 'All systems reporting normally.'}
                    </p>
                </div>

                {/* System Health Module */}
                <div className={`p-8 rounded-2xl shadow-sm border transition-shadow ${isHealthy ? 'bg-gradient-to-br from-white to-emerald-50/30 border-emerald-200/60' : 'bg-gradient-to-br from-white to-red-50/30 border-red-200/60'}`}>
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isHealthy ? 'text-slate-400' : 'text-red-400'}`}>Master System Health</h3>
                    <div className="flex items-center space-x-4 mt-2">
                        <div className={`w-5 h-5 rounded-full animate-pulse ring-4 ${isHealthy ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-red-500 ring-red-500/20'}`}></div>
                        <div className={`text-2xl font-black tracking-tight ${isHealthy ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isHealthy ? 'OPERATIONAL' : 'SYSTEM ERRORS'}
                        </div>
                    </div>
                    <p className={`text-sm font-medium mt-5 ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isHealthy ? 'No error logs detected across any active endpoints.' : `${debugError ? 'Critical Database Rejection.' : errorCount + ' critical errors logged.'}`}
                    </p>
                </div>

            </div>
        </div>
    )
}
