import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CsvUploader from './CsvUploader'
import ClientInventoryTable from './ClientInventoryTable'

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

    const templateCsv = `Product Name,Barcode,Buy Price,Sell Price,Current Stock,Unit,Min Stock Alert\nParle G Gold,PG100,10,12,50,PCS,5\nTata Salt 1KG,TS200,20,24,100,PCS,10\n`

    return (
        <div className="p-8 h-full overflow-y-auto w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Master Inventory</h1>
                    <p className="text-slate-500 mt-1 font-medium">{items.length} products in your catalog</p>
                </div>
                <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`}
                    download="winiks_products_template.csv"
                    className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-slate-50 flex items-center space-x-2 transition text-sm"
                >
                    <span>⬇️</span><span>Download Template</span>
                </a>
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
                    <p className="text-slate-400 text-sm mb-6">Go to Settings → Import your products CSV to get started.</p>
                    <a href="/erp/wholesale/settings" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition">
                        Go to Settings →
                    </a>
                </div>
            ) : (
                <>
                    <ClientInventoryTable items={items} />
                </>
            )}
        </div>
    )
}
