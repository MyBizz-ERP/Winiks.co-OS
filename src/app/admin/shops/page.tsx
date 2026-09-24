import { supabaseAdmin } from '@/utils/supabase/admin'
import Link from 'next/link'
import ClientShopProvisioner from './ClientShopProvisioner'

export default async function ShopsProvisioningPage() {
    const { data: categories } = await supabaseAdmin.from('categories').select('id, display_name').order('created_at', { ascending: false })
    const { data: shops } = await supabaseAdmin.from('shops').select('*, categories(display_name)').order('created_at', { ascending: false })

    return (
        <div className="p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            <div className="mb-6">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tenant Shops</h1>
                <p className="text-slate-500 mt-2 text-lg">Provision new clients, configure their feature modules, and monitor their status.</p>
            </div>

            <div className="mb-10 bg-slate-900 rounded-2xl p-6 shadow-lg text-white border border-slate-700">
                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-4">✓ Global Capabilities Available for Assignment</h3>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-lg shadow-inner">
                        <span className="text-lg leading-none">📱</span> <span className="font-semibold text-sm">Automated Google Reviews</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-lg shadow-inner">
                        <span className="text-lg leading-none">🌐</span> <span className="font-semibold text-sm">Dynamic Digital Profile</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-lg shadow-inner">
                        <span className="text-lg leading-none">⚡</span> <span className="font-semibold text-sm">Multi-PC Sync & Offline Mode</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* INTERACTIVE SHOP PROVISIONING COMPONENT */}
                <div className="xl:col-span-1">
                    <ClientShopProvisioner categories={categories || []} />
                </div>

                {/* ACTIVE SHOPS TABLE */}
                <div className="xl:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Tenant Login Details</th>
                                    <th className="px-6 py-4">Framework</th>
                                    <th className="px-6 py-4">Live Add-ons</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {shops?.map((shop) => (
                                    <tr key={shop.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5 align-top">
                                            <div className="font-bold text-slate-800 text-base mb-2">
                                                {shop.shop_name}
                                                {!shop.is_active && <span className="ml-2 bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Suspended</span>}
                                            </div>
                                            <div className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                                                {shop.owner_email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top pt-6">
                                            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md text-xs font-bold border border-blue-100">
                                                {shop.categories?.display_name || 'Generic'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 align-top pt-6">
                                            <div className="flex flex-wrap gap-1.5">
                                                {shop.features?.has_website && <span className="bg-slate-100 text-[10px] px-2 py-0.5 rounded font-bold uppercase shadow-sm">Web</span>}
                                                {shop.features?.has_gmb && <span className="bg-emerald-50 text-[10px] px-2 py-0.5 rounded font-bold uppercase shadow-sm">GMB</span>}
                                                {shop.features?.has_barcode && <span className="bg-amber-50 text-[10px] px-2 py-0.5 rounded font-bold uppercase shadow-sm">Barcode</span>}
                                                {shop.features?.has_tax && <span className="bg-purple-50 text-[10px] px-2 py-0.5 rounded font-bold uppercase shadow-sm">Tax</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top text-right pt-6">
                                            <Link href={`/admin/shops/${shop.id}`} className="inline-block bg-slate-900 border border-slate-700 text-white hover:bg-slate-700 font-bold text-xs px-4 py-2 mt-2 mr-2 rounded-lg transition shadow-sm hover:-translate-y-0.5">
                                                Edit ➔
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {(!shops || shops.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No tenants deployed yet. Build your first shop!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
