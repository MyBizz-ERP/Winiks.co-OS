'use client'

import { useState } from 'react'
import { Plus, X, Box } from 'lucide-react'
import { addProduct } from './actions'

export default function ClientInventoryTable({ items }: { items: any[] }) {
    const [showAddProduct, setShowAddProduct] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleAddProduct(formData: FormData) {
        setLoading(true)
        const res = await addProduct(formData)
        setLoading(false)
        if (res.success) {
            setShowAddProduct(false)
        } else {
            alert(res.error)
        }
    }

    const lowStockCount = items.filter((p: any) => Number(p.current_stock) <= Number(p.min_stock_alert)).length

    return (
        <>
            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setShowAddProduct(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-lg shadow flex items-center gap-2 text-sm transition active:scale-95"
                >
                    <Plus className="h-4 w-4" /> Add Product
                </button>
            </div>

            {lowStockCount > 0 && (
                <div className="mb-4 flex items-center space-x-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
                    <span className="text-lg">⚠️</span>
                    <p className="text-red-700 font-bold text-sm">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low on stock. Reorder soon.</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Buy / Sell</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item: any) => {
                                const isLow = Number(item.current_stock) <= Number(item.min_stock_alert)
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
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
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD PRODUCT MODAL */}
            {showAddProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 flex items-center"><Box className="w-5 h-5 mr-2 text-slate-500" /> New Product</h2>
                            <button onClick={() => setShowAddProduct(false)} className="text-slate-400 hover:text-slate-600 transition p-1">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form action={handleAddProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name (Required)</label>
                                <input type="text" name="name" required placeholder="e.g. Tata Salt 1KG" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Barcode (Optional)</label>
                                <input type="text" name="barcode" placeholder="e.g. 8901030948" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition font-mono" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buy Price (₹)</label>
                                    <input type="number" name="buying_price" required min="0" step="any" defaultValue="0" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sell Price (₹)</label>
                                    <input type="number" name="selling_price" required min="0" step="any" defaultValue="0" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold transition" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stock</label>
                                    <input type="number" name="current_stock" required min="0" defaultValue="0" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit</label>
                                    <input type="text" name="unit" required defaultValue="PCS" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alert</label>
                                    <input type="number" name="min_stock_alert" required min="0" defaultValue="5" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 mt-6 rounded-xl transition shadow-lg disabled:opacity-50 tracking-wider">
                                {loading ? 'CREATING...' : 'ADD TO INVENTORY'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
