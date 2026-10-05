'use client'

import { useState } from 'react'
import { Plus, X, Box, Search, Eye, History, Loader2, Edit2, Trash2 } from 'lucide-react'
import { addProductManual } from './actions'
import { createClient } from '@/utils/supabase/client'

export default function ClientInventoryTable({ items, shopId }: { items: any[], shopId: string }) {
    const [editProduct, setEditProduct] = useState<any>(null)
    const [loading, setLoading] = useState(false)



    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    async function openDeepView(item: any) {
        setSelectedProduct(item)
        setLoadingHistory(true)
        setPurchaseHistory([])

        const supabase = createClient()
        const { data, error } = await supabase
            .rpc('wh_get_product_history', {
                p_shop_id: shopId,
                p_product_id: item.id
            })

        if (data && !error) {
            // Sort manually to enforce JS execution precedence on explicit dates
            const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            setPurchaseHistory(sorted)
        }
        setLoadingHistory(false)
    }

    async function submitEditProduct(e: any) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData(e.target)
        const supabase = createClient()
        const { error } = await supabase.rpc('wh_update_product', {
            p_shop_id: shopId,
            p_product_id: editProduct.id,
            p_name: String(fd.get('name')),
            p_name_mr: fd.get('name_mr') ? String(fd.get('name_mr')) : null,
            p_name_hi: fd.get('name_hi') ? String(fd.get('name_hi')) : null,
            p_barcode: fd.get('barcode') ? String(fd.get('barcode')) : null,
            p_buying_price: Number(fd.get('buying_price')),
            p_selling_price: Number(fd.get('selling_price')),
            p_current_stock: Number(fd.get('current_stock')),
            p_unit: fd.get('unit') || 'PCS',
            p_min_stock_alert: Number(fd.get('min_stock_alert'))
        })

        if (error) {
            alert('Update Failed: ' + error.message)
            setLoading(false)
        } else {
            window.location.reload()
        }
    }

    async function handleDeleteProduct(id: string, name: string) {
        if (!confirm(`Are you sure you want to delete ${name}?\n\nIts past sales history will remain intact, but it will be erased from live stock and checkout.`)) return;
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.rpc('wh_delete_product', {
            p_shop_id: shopId,
            p_product_id: id
        })
        if (error) alert("Deletion failed: " + error.message)
        window.location.reload()
    }

    const filteredItems = items.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const lowStockCount = items.filter((p: any) => Number(p.current_stock) <= Number(p.min_stock_alert)).length

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Quick search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700 bg-white"
                    />
                </div>
            </div>

            {lowStockCount > 0 && (
                <div className="mb-4 flex items-center space-x-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
                    <span className="text-lg">⚠️</span>
                    <p className="text-red-700 font-bold text-sm">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low on stock. Reorder soon.</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Buy / Sell</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map((item: any) => {
                                const isLow = Number(item.current_stock) <= Number(item.min_stock_alert)
                                return (
                                    <tr key={item.id} className={`hover: bg - slate - 50 transition - colors ${isLow ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            {item.barcode && <div className="text-[10px] text-slate-400 font-mono tracking-widest mt-0.5">{item.barcode}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 text-blue-700 font-black px-3 py-1.5 rounded-lg border border-blue-200 text-sm">
                                                {item.current_stock} <span className="text-[10px] font-bold text-blue-400">{item.unit}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">₹{item.selling_price}</div>
                                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Cost: ₹{item.buying_price}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isLow ? (
                                                <span className="inline-flex items-center text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5"></span>Low Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">OK</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => openDeepView(item)}
                                                className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition shadow-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditProduct(item)}
                                                className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition shadow-sm"
                                                title="Edit Product"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(item.id, item.name)}
                                                className="inline-flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition shadow-sm"
                                                title="Delete Product"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* EDIT PRODUCT MODAL */}
            {editProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 w-full">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Edit Product</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{editProduct.name}</p>
                            </div>
                            <button onClick={() => setEditProduct(null)} className="text-slate-400 hover:text-slate-600 transition p-1 bg-white rounded-full border border-slate-200">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitEditProduct} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Base Name (EN)</label>
                                <input type="text" name="name" defaultValue={editProduct.name} required className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition font-bold" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Marathi Name (name_mr)</label>
                                <input type="text" name="name_mr" defaultValue={editProduct.name_mr || ''} className="w-full px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm transition font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buying Rate (₹)</label>
                                    <input type="number" name="buying_price" defaultValue={editProduct.buying_price} required min="0" step="0.01" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selling Rate (₹)</label>
                                    <input type="number" name="selling_price" defaultValue={editProduct.selling_price} required min="0" step="0.01" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-black" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Live Stock</label>
                                    <input type="number" name="current_stock" defaultValue={editProduct.current_stock} required min="0" step="0.001" className="w-full px-3 py-3 border text-blue-600 border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit</label>
                                    <input type="text" name="unit" defaultValue={editProduct.unit} required className="w-full px-3 py-3 border border-slate-200 rounded-lg outline-none text-sm text-center font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alert Qty</label>
                                    <input type="number" name="min_stock_alert" defaultValue={editProduct.min_stock_alert} required min="0" className="w-full px-3 py-3 border border-slate-200 rounded-lg outline-none text-sm text-center" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Barcode (Optional)</label>
                                <input type="text" name="barcode" defaultValue={editProduct.barcode || ''} className="w-full px-4 py-3 border border-slate-200 rounded-lg font-mono text-xs tracking-widest text-slate-400 focus:text-slate-800" />
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 mt-6 rounded-xl transition shadow-lg disabled:opacity-50 tracking-wider">
                                {loading ? 'SAVING...' : 'SAVE MODIFICATIONS'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DEEP VIEW MODAL */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 flex items-center"><Search className="w-5 h-5 mr-2 text-blue-500" /> {selectedProduct.name}</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Digital Asset Ledger</p>
                            </div>
                            <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-slate-600 transition p-1 bg-white rounded-full border border-slate-200">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">

                            {/* Product Stats Grid */}
                            <div className="md:w-64 space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Current Stock</p>
                                    <p className="text-2xl font-black text-blue-600">{selectedProduct.current_stock} {selectedProduct.unit}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Live Profit Margin</p>
                                    <p className="text-2xl font-black text-emerald-600">₹{(selectedProduct.selling_price - selectedProduct.buying_price).toFixed(2)}</p>
                                    <p className="text-xs font-bold text-slate-400 mt-1">Buy: ₹{selectedProduct.buying_price} / Sell: ₹{selectedProduct.selling_price}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Total Valuation</p>
                                    <p className="text-2xl font-black text-slate-800">₹{(selectedProduct.current_stock * selectedProduct.selling_price).toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Purchase History Graph/Table */}
                            <div className="flex-1">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3 ml-2 flex items-center gap-2">
                                    <History className="w-4 h-4" /> Inbound Purchase Log
                                </h3>

                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    {loadingHistory ? (
                                        <div className="p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                                            Scanning Kharedi Databanks...
                                        </div>
                                    ) : purchaseHistory.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 font-bold">
                                            No automated purchase records found.<br />This item may have been imported via legacy CSV.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-widest">
                                                <tr>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3">Supplier</th>
                                                    <th className="px-4 py-3">Qty Added</th>
                                                    <th className="px-4 py-3 text-right">Acquisition Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {purchaseHistory.map((log, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500">
                                                            {new Date(log.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 font-bold text-slate-800">{log.supplier_name}</td>
                                                        <td className="px-4 py-3 font-bold text-emerald-600">+{log.quantity}</td>
                                                        <td className="px-4 py-3 font-black text-slate-900 text-right">₹{log.unit_cost}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
