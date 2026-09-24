import { supabaseAdmin } from '@/utils/supabase/admin'
import { updateShopFeatures, deleteShop } from '../actions'
import Link from 'next/link'

// Next.js 16: params is now async
export default async function ShopManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const { data: shop } = await supabaseAdmin
        .from('shops')
        .select('*, categories(display_name, name)')
        .eq('id', id)
        .single()

    if (!shop) return <div className="p-10 font-bold text-red-500">Shop Identity Error.</div>

    const cat = shop.categories as any
    const catDisplay = Array.isArray(cat) ? cat[0]?.display_name : cat?.display_name

    return (
        <div className="p-10 max-w-4xl mx-auto w-full animate-in fade-in duration-500">

            <div className="mb-6 flex items-center space-x-4">
                <Link href="/admin/shops" className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 transition">
                    ← Back to List
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Manage Tenant</h1>
                    <p className="text-slate-500 mt-1 font-medium">Viewing and controlling systems for {shop.shop_name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">

                {/* SHOP INFO READ-ONLY */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-xs font-extrabold text-slate-800 mb-6 uppercase tracking-widest border-b border-slate-100 pb-3">Tenant Master Record</h2>

                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business Name</p>
                            <p className="font-bold text-slate-800 text-lg">{shop.shop_name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Email</p>
                            <p className="font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded inline-block mt-1">{shop.owner_email}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ERP Framework</p>
                            <p className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded inline-block mt-1 border border-blue-200">{catDisplay || 'Not Linked'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Status</p>
                            {shop.is_active ? (
                                <span className="inline-block mt-1 text-xs font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Active / Operational</span>
                            ) : (
                                <span className="inline-block mt-1 text-xs font-black uppercase text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">Suspended</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* FEATURE TOGGLES (UPDATE) + DELETE */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-xs font-extrabold text-slate-800 mb-6 uppercase tracking-widest border-b border-slate-100 pb-3">Update Feature Access</h2>

                    <form action={updateShopFeatures} className="space-y-5">
                        <input type="hidden" name="id" value={shop.id} />

                        <label className="flex items-center space-x-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg transition">
                            <input type="checkbox" name="is_active" defaultChecked={shop.is_active} className="w-5 h-5 text-slate-900 rounded border-gray-300 focus:ring-slate-900" />
                            <span className="text-sm font-bold text-slate-800">Account Active (Allow Login)</span>
                        </label>

                        <div className="space-y-2 mt-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Modular Features</p>
                            {[
                                { name: 'feature_website', label: 'Digital Website Profile', checked: shop.features?.has_website },
                                { name: 'feature_gmb', label: 'Automated Google Reviews', checked: shop.features?.has_gmb },
                                { name: 'feature_barcode', label: 'Barcode Scanner Integration', checked: shop.features?.has_barcode },
                                { name: 'feature_tax', label: 'GST / Tax Accounting Module', checked: shop.features?.has_tax },
                            ].map(f => (
                                <label key={f.name} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded transition">
                                    <input type="checkbox" name={f.name} defaultChecked={f.checked} className="w-5 h-5 rounded border-gray-300" />
                                    <span className="text-sm font-medium text-slate-700">{f.label}</span>
                                </label>
                            ))}
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 mt-6 rounded-lg hover:bg-slate-800 transition shadow-sm tracking-wider">
                            SAVE & UPDATE TENANT
                        </button>
                    </form>

                    {/* DANGER ZONE */}
                    <div className="mt-8 pt-6 border-t border-red-100">
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-3">Danger Zone</p>
                        <form action={deleteShop}>
                            <input type="hidden" name="id" value={shop.id} />
                            <button type="submit" className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-lg border border-red-200 hover:bg-red-100 transition shadow-sm tracking-wider">
                                🧨 DEPROVISION & DELETE SHOP
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
