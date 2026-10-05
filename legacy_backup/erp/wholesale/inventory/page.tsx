import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClientInventoryTable from './ClientInventoryTable'
import AddProductModal from './AddProductModal'

export default async function InventoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) redirect('/login')

    // Fetch via RPC (bypasses schema restriction)
    const { data: products } = await supabase.rpc('wh_get_products', { p_shop_id: shop.id })

    const items = products || []
    const totalValue = items.reduce((sum: number, p: any) => sum + (Number(p.current_stock) * Number(p.buying_price)), 0)
    const lowStockCount = items.filter((p: any) => Number(p.current_stock) <= Number(p.min_stock_alert)).length


    return (
        <div className="p-8 h-full overflow-y-auto w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Master Inventory</h1>
                    <p className="text-slate-500 mt-1 font-medium">{items.length} products in your catalog</p>
                </div>
                <div className="flex items-center gap-2">
                    <AddProductModal />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Products</p>
                    <p className="text-4xl font-black text-slate-800 tracking-tight mt-1">{items.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capital Invested</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tight mt-1">₹{totalValue.toLocaleString('en-IN')}</p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${lowStockCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>Low Stock Alerts</p>
                    <p className={`text-4xl font-black tracking-tight mt-1 ${lowStockCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>{lowStockCount}</p>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center">
                    <div className="text-6xl mb-6">📦</div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2">Catalog Empty</h3>
                    <p className="text-slate-400 text-sm mb-6">Click "Add Product Manually" to begin building your catalog.</p>
                </div>
            ) : (
                <>
                    <ClientInventoryTable items={items} shopId={shop.id} />
                </>
            )}
        </div>
    )
}
