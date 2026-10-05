'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Truck, X, Printer, Search, Loader2, RefreshCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ThermalPurchaseReceipt from './ThermalPurchaseReceipt'

export default function ClientPurchasePos({ shopInfo }: { shopInfo: any }) {
    const router = useRouter()

    // Core Data
    const [products, setProducts] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])

    // UI State
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)

    // Supplier Selection
    const [supplierSearch, setSupplierSearch] = useState('')
    const [supplierResults, setSupplierResults] = useState<any[]>([])
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null)
    const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('')

    // Current Item Input Form
    const [itemNameStr, setItemNameStr] = useState('') // The raw english input
    const [translatedName, setTranslatedName] = useState('') // The editable native language text
    const [translating, setTranslating] = useState(false)
    const [itemQty, setItemQty] = useState('')
    const [itemBuy, setItemBuy] = useState('')
    const [itemSell, setItemSell] = useState('')
    const [itemUnit, setItemUnit] = useState('PCS')

    // Cart
    const [cart, setCart] = useState<any[]>([])
    const [amountPaid, setAmountPaid] = useState('')

    const [productSearch, setProductSearch] = useState('')
    const [productResults, setProductResults] = useState<any[]>([])

    // New Modals State
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
    const [newSupplierName, setNewSupplierName] = useState('')
    const [newSupplierCompany, setNewSupplierCompany] = useState('')
    const [showReceipt, setShowReceipt] = useState(false)
    const [receiptLang, setReceiptLang] = useState<'en' | 'mr'>('mr')
    const [completedTransaction, setCompletedTransaction] = useState<any | null>(null)

    const nameInputRef = useRef<HTMLInputElement>(null)
    const qtyInputRef = useRef<HTMLInputElement>(null)
    const buyInputRef = useRef<HTMLInputElement>(null)
    const sellInputRef = useRef<HTMLInputElement>(null)
    const supplierSearchRef = useRef<HTMLInputElement>(null)
    const amountPaidRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        async function loadData() {
            const supabase = createClient()
            const { data: pData } = await supabase.rpc('wh_get_products', { p_shop_id: shopInfo.id })
            const { data: sData } = await supabase.rpc('wh_get_suppliers', { p_shop_id: shopInfo.id })

            if (pData) setProducts(pData)
            if (sData) setSuppliers(sData)
            setLoading(false)
            nameInputRef.current?.focus()
        }
        loadData()
    }, [shopInfo.id])

    async function forceRefreshSuppliers() {
        const supabase = createClient()
        const { data: sData } = await supabase.rpc('wh_get_suppliers', { p_shop_id: shopInfo.id })
        if (sData) setSuppliers(sData)
    }

    // Google API Transliteration (English -> Marathi)
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Only translate if the user hasn't manually edited the translated box heavily 
            // and we rely on english box for the source
            if (!itemNameStr.trim()) {
                setTranslatedName('')
                return
            }
            setTranslating(true)
            try {
                // Using phonetics Transliteration to preserve English Brand Names (Kiss Me -> किस मी)
                const response = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(itemNameStr)}&itc=mr-t-i0-und&num=1`)
                const data = await response.json()
                if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
                    setTranslatedName(data[1][0][1][0])
                } else {
                    setTranslatedName(itemNameStr)
                }
            } catch (e) {
                setTranslatedName(itemNameStr)
            }
            setTranslating(false)
        }, 500) // Debounce 500ms

        return () => clearTimeout(timer)
    }, [itemNameStr])

    // Product Search effect
    useEffect(() => {
        if (!itemNameStr) {
            setProductResults([])
            return
        }
        const query = itemNameStr.toLowerCase()
        const results = products.filter(p => p.name.toLowerCase().includes(query)).slice(0, 5)
        setProductResults(results)
    }, [itemNameStr, products])

    function handleSelectExistingProduct(p: any) {
        setItemNameStr(p.name)
        // Note: We deliberately do NOT overwrite translatedName with p.name here so the Marathi transliteration stays!
        setItemBuy(p.buying_price.toString())
        setItemSell(p.selling_price.toString())
        setItemUnit(p.unit)
        setProductResults([])
        setTimeout(() => qtyInputRef.current?.focus(), 50)
    }

    function addToCart() {
        if (!translatedName.trim() || !itemQty || !itemBuy || !itemSell) {
            return alert('Fill all item details!')
        }

        // 🛡️ ANTI-DUPLICATION ENGINE: Check if product exists regardless of casing against the ENGLISH input
        const exactMatch = products.find(p => p.name.trim().toLowerCase() === itemNameStr.trim().toLowerCase())
        const finalResolvedName = exactMatch ? exactMatch.name : (itemNameStr.trim() || translatedName.trim())

        const newItem = {
            id: 'T_' + Date.now(), // Temp ID
            name: finalResolvedName, // STRICTLY English/Base for DB tracking
            name_mr: translatedName, // Print-only Marathi alias
            qty: parseFloat(itemQty) || 0,
            buy_rate: parseFloat(itemBuy) || 0,
            sell_rate: parseFloat(itemSell) || 0,
            unit: itemUnit,
            total: (parseFloat(itemQty) || 0) * (parseFloat(itemBuy) || 0)
        }

        setCart([...cart, newItem])

        // Reset form
        setItemNameStr('')
        setTranslatedName('')
        setItemQty('')
        setItemBuy('')
        setItemSell('')
        nameInputRef.current?.focus()
    }

    function removeFromCart(id: string) {
        setCart(cart.filter(i => i.id !== id))
    }

    async function handleCheckout() {
        if (cart.length === 0) return alert('Cart is empty!')
        if (!selectedSupplier && supplierSearch.trim() === '') return alert('Select or type a Supplier Name!')

        setIsProcessing(true)

        let supplierId = selectedSupplier?.id || null
        let textSupplierName = selectedSupplier?.name || supplierSearch.trim()

        const grandTotal = cart.reduce((sum, item) => sum + item.total, 0)
        const paid = amountPaid ? parseFloat(amountPaid) : 0
        const newDue = Math.max(0, grandTotal - paid)

        const supabase = createClient()

        // If it's a new supplier, create them first!
        if (!supplierId) {
            const { data: newSuppId, error: suppErr } = await supabase.rpc('wh_add_supplier', {
                p_shop_id: shopInfo.id,
                p_name: textSupplierName,
                p_phone: null,
                p_company: null,
                p_total_payable: 0
            })
            if (!suppErr && newSuppId) {
                supplierId = newSuppId
            }
        }

        // Execute huge atomic transaction
        const { error } = await supabase.rpc('wh_complete_purchase_transaction', {
            p_shop_id: shopInfo.id,
            p_supplier_id: supplierId,
            p_supplier_name: textSupplierName,
            p_subtotal: grandTotal,
            p_amount_paid: paid,
            p_new_due_added: newDue,
            p_payment_mode: paid >= grandTotal ? 'cash' : (paid > 0 ? 'partial' : 'credit'),
            p_cart: cart,
            p_supplier_invoice_no: supplierInvoiceNo.trim() || null
        })

        if (error) {
            console.error(error)
            alert('Database Transaction Failed!')
            setIsProcessing(false)
            return
        }

        // Show Receipt
        setCompletedTransaction({
            id: 'KHAR-' + Date.now().toString().slice(-6),
            created_at: new Date().toISOString(),
            subtotal: grandTotal,
            grand_total: grandTotal,
            payment_mode: paid >= grandTotal ? 'cash' : (paid > 0 ? 'partial' : 'credit'),
            items: cart.map(item => ({
                product_name: item.name,
                product_name_mr: item.name_mr,
                quantity: item.qty,
                unit_price: item.buy_rate,
                total_price: item.total
            })),
            is_purchase: true,
            supplier_name: textSupplierName
        })
        setShowReceipt(true)

        // Reset memory
        setCart([])
        setSelectedSupplier(null)
        setSupplierSearch('')
        setSupplierInvoiceNo('')
        setAmountPaid('')
        setItemNameStr('')
        setTranslatedName('')

        // Reload data from server
        const { data: pData } = await supabase.rpc('wh_get_products', { p_shop_id: shopInfo.id })
        const { data: sData } = await supabase.rpc('wh_get_suppliers', { p_shop_id: shopInfo.id })
        if (pData) setProducts(pData)
        if (sData) setSuppliers(sData)

        setIsProcessing(false)
    }

    async function handleManuallyAddSupplier() {
        if (!newSupplierName.trim()) return alert('Name required')
        const supabase = createClient()
        const { data: newSuppId, error } = await supabase.rpc('wh_add_supplier', {
            p_shop_id: shopInfo.id,
            p_name: newSupplierName,
            p_phone: null,
            p_company: newSupplierCompany || null,
            p_total_payable: 0
        })

        if (error) return alert('Failed to create supplier! ' + error.message)

        const newSupplierRecord = {
            id: newSuppId,
            shop_id: shopInfo.id,
            name: newSupplierName,
            company: newSupplierCompany || '',
            total_payable: 0,
            phone: null
        }

        setSuppliers([...suppliers, newSupplierRecord])
        setSelectedSupplier(newSupplierRecord)
        setSupplierSearch(newSupplierRecord.name)
        setShowAddSupplierModal(false)
        setNewSupplierName('')
        setNewSupplierCompany('')
    }

    if (loading) return <div className="p-8 font-bold text-slate-400">LOADING KHAREDI SYSTEM...</div>

    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0)

    return (
        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen pb-[180px] lg:pb-0 w-full bg-slate-100 font-sans lg:overflow-hidden">
            {/* Left: Input Form & Cart */}
            <div className="flex-1 flex flex-col m-4 bg-white border border-slate-200 lg:rounded-3xl rounded-2xl shadow-sm overflow-hidden">
                {/* Input Matrix */}
                <div className="p-6 border-b border-slate-200 bg-emerald-50">
                    <h2 className="text-xl font-black text-emerald-900 mb-4 tracking-tight flex items-center gap-2">
                        <Truck className="w-6 h-6" /> KHAREDI (PURCHASE ENTRY)
                    </h2>

                    <div className="grid grid-cols-12 gap-3 mb-2">
                        <div className="col-span-12 lg:col-span-5 relative">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Item Name (English Source)</label>
                            <input
                                ref={nameInputRef}
                                type="text"
                                value={itemNameStr}
                                onChange={e => setItemNameStr(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                    }
                                }}
                                onKeyUp={e => {
                                    if (e.key === 'Enter') {
                                        if (productResults.length > 0) {
                                            handleSelectExistingProduct(productResults[0])
                                        } else if (itemNameStr.trim() === '') {
                                            supplierSearchRef.current?.focus()
                                        } else {
                                            qtyInputRef.current?.focus()
                                        }
                                    }
                                }}
                                placeholder="Type to search or translate..."
                                className="w-full mt-1 px-4 py-3 border-2 border-emerald-200 rounded-xl font-bold bg-white focus:border-emerald-500 outline-none"
                            />
                            {/* Product Autocomplete */}
                            {productResults.length > 0 && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl">
                                    {productResults.map(p => (
                                        <div key={p.id} onClick={() => handleSelectExistingProduct(p)} className="p-3 border-b hover:bg-emerald-50 cursor-pointer flex justify-between items-center">
                                            <span className="font-bold text-slate-800">{p.name}</span>
                                            <span className="text-xs font-bold text-slate-400">Stock: {p.current_stock}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="col-span-12 lg:col-span-7">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">Native Translation (Editable)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={translatedName}
                                    onChange={e => setTranslatedName(e.target.value)}
                                    placeholder="मराठी / Hindi Name"
                                    className="w-full mt-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-black text-xl text-slate-800 bg-slate-50 focus:border-emerald-500 outline-none"
                                />
                                {translating && <Loader2 className="absolute right-4 top-4 w-5 h-5 text-emerald-500 animate-spin" />}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6 lg:col-span-3">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Qty</label>
                            <input
                                ref={qtyInputRef} type="number" value={itemQty} onChange={e => setItemQty(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                                onKeyUp={e => { if (e.key === 'Enter') buyInputRef.current?.focus() }}
                                className="w-full mt-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="col-span-6 lg:col-span-3">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-amber-600">Buy Rate (₹)</label>
                            <input
                                ref={buyInputRef} type="number" value={itemBuy} onChange={e => setItemBuy(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                                onKeyUp={e => { if (e.key === 'Enter') sellInputRef.current?.focus() }}
                                className="w-full mt-1 px-4 py-3 border-2 border-amber-200 rounded-xl font-black bg-amber-50 text-amber-900 focus:border-amber-500 outline-none"
                            />
                        </div>
                        <div className="col-span-6 lg:col-span-3">
                            <label className="text-[10px] uppercase font-bold tracking-widest text-blue-600">Sell Rate (₹)</label>
                            <input
                                ref={sellInputRef} type="number" value={itemSell} onChange={e => setItemSell(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.preventDefault()
                                }}
                                onKeyUp={e => {
                                    if (e.key === 'Enter') addToCart()
                                }}
                                className="w-full mt-1 px-4 py-3 border-2 border-blue-200 rounded-xl font-black bg-blue-50 text-blue-900 focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="col-span-6 lg:col-span-3 flex items-end">
                            <button onClick={addToCart} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black shadow-lg mb-[2px]">
                                ADD
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cart Table */}
                <div className="flex-1 overflow-x-auto p-4 bg-slate-50">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-8">#</th>
                                    <th className="px-4 py-3">Translated Name</th>
                                    <th className="px-4 py-3 w-32">Qty</th>
                                    <th className="px-4 py-3 w-32">Buy Rate</th>
                                    <th className="px-4 py-3 w-32">Set Sell</th>
                                    <th className="px-4 py-3 w-32 text-right">Total (₹)</th>
                                    <th className="px-4 py-3 w-12 text-center">X</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cart.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-bold">Start adding inbound stock entries.</td></tr>
                                ) : (
                                    cart.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-slate-50 group">
                                            <td className="px-4 py-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3 font-black text-slate-800">{item.name}</td>
                                            <td className="px-4 py-3 font-bold text-slate-600">{item.qty} {item.unit}</td>
                                            <td className="px-4 py-3 font-bold text-amber-600">₹{item.buy_rate}</td>
                                            <td className="px-4 py-3 font-bold text-blue-600">₹{item.sell_rate}</td>
                                            <td className="px-4 py-3 font-black text-slate-900 text-right text-lg">₹{item.total.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2">✖</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Right: Supplier & Checkout */}
            <div className="w-full lg:w-96 bg-white flex flex-col shadow-inner lg:border-l border-slate-200 lg:my-4 lg:mr-4 lg:rounded-3xl rounded-2xl mx-4 lg:mx-0 mb-4 overflow-hidden lg:min-h-[500px]">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier (Vendor)</span>
                        <div className="flex gap-2">
                            <button onClick={forceRefreshSuppliers} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded flex items-center gap-1">
                                <RefreshCcw className="w-3 h-3" /> SYNC
                            </button>
                            <button onClick={() => setShowAddSupplierModal(true)} className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                + ADD NEW
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            ref={supplierSearchRef}
                            type="text"
                            placeholder="Search or Type New..."
                            value={supplierSearch}
                            onChange={e => {
                                setSupplierSearch(e.target.value)
                                if (selectedSupplier) setSelectedSupplier(null)
                                const query = e.target.value.toLowerCase()
                                setSupplierResults(query ? suppliers.filter(s => s.name.toLowerCase().includes(query) || (s.company && s.company.toLowerCase().includes(query))).slice(0, 5) : [])
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    if (supplierResults.length > 0) {
                                        setSelectedSupplier(supplierResults[0])
                                        setSupplierSearch(supplierResults[0].name)
                                        setSupplierResults([])
                                        amountPaidRef.current?.focus()
                                    } else if (supplierSearch.trim() === '') {
                                        amountPaidRef.current?.focus()
                                    } else {
                                        const newSup = { id: 'NEW_' + Date.now(), name: supplierSearch, total_debt: 0, company: supplierSearch }
                                        setSelectedSupplier(newSup)
                                        setSupplierSearch(newSup.name)
                                        setSupplierResults([])
                                        amountPaidRef.current?.focus()
                                    }
                                }
                            }}
                            className="w-full px-4 py-3 font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                        />
                        {selectedSupplier && (
                            <button onClick={() => { setSelectedSupplier(null); setSupplierSearch('') }} className="absolute right-4 top-4 text-slate-400"><X className="w-4 h-4" /></button>
                        )}
                        {supplierSearch && !selectedSupplier && supplierResults.length > 0 && (
                            <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                                {supplierResults.map(s => (
                                    <div key={s.id} onClick={() => { setSelectedSupplier(s); setSupplierSearch(s.name); setSupplierResults([]) }} className="p-3 border-b hover:bg-slate-50 cursor-pointer">
                                        <p className="font-bold text-slate-800">{s.name}</p>
                                        <p className="text-[10px] text-amber-600 font-bold uppercase">Debt: ₹{s.total_payable}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {!selectedSupplier && supplierSearch && (
                        <p className="text-[10px] font-bold text-blue-500 mt-2 uppercase tracking-widest">Will create new supplier "{supplierSearch}"</p>
                    )}
                    {selectedSupplier && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-amber-600 uppercase">Old Debt</p>
                                <p className="font-black text-amber-900">₹{selectedSupplier.total_payable}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-b border-slate-200">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Physical Bill / Receipt No.</span>
                    <input
                        type="text"
                        placeholder="e.g. INV-2023-XXXX"
                        value={supplierInvoiceNo}
                        onChange={e => setSupplierInvoiceNo(e.target.value)}
                        className="w-full px-4 py-3 font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none uppercase"
                    />
                </div>

                <div className="p-6 bg-slate-50 flex-1 flex flex-col">
                    <div className="bg-white rounded-2xl p-5 mb-5 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Purchase Bill</p>
                            <p className="text-4xl font-black text-slate-900">₹{grandTotal.toLocaleString()}</p>
                        </div>
                        <div className="h-px bg-slate-200 w-full my-4"></div>
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Old Due</p>
                            <p className="text-lg font-bold text-slate-700">₹{selectedSupplier?.total_payable || 0}</p>
                        </div>
                    </div>

                    <div className="mb-auto">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount Paid Today (₹)</label>
                        <input
                            ref={amountPaidRef}
                            type="number"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleCheckout()
                                }
                            }}
                            placeholder={`Pay ₹${grandTotal}`}
                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-3xl font-black text-center text-emerald-700 focus:border-emerald-500 outline-none shadow-inner"
                        />
                        <div className="flex justify-between mt-2 px-1">
                            <span className="text-[10px] font-bold text-slate-400">Added to Supplier Debt:</span>
                            <span className="text-xs font-black text-amber-600">
                                ₹{Math.max(0, grandTotal - (parseFloat(amountPaid) || 0)).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <button
                        disabled={isProcessing}
                        onClick={handleCheckout}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg transition tracking-widest text-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                    >
                        {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> SAVING...</> : 'FINALIZE KHAREDI'}
                    </button>
                </div>
            </div>

            {/* INLINE MODAL FOR ADDING SUPPLIER */}
            {showAddSupplierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800">New Supplier</h2>
                            <button onClick={() => setShowAddSupplierModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Contact Name</label>
                                <input type="text" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="e.g. Ramesh Traders" className="w-full px-4 py-3 mt-1 border rounded-lg focus:border-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Company (Optional)</label>
                                <input type="text" value={newSupplierCompany} onChange={e => setNewSupplierCompany(e.target.value)} placeholder="e.g. Balaji Enterprises" className="w-full px-4 py-3 mt-1 border rounded-lg focus:border-blue-500 outline-none" />
                            </div>
                            <button onClick={handleManuallyAddSupplier} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">
                                Create Supplier
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT PREVIEW MODAL */}
            {showReceipt && completedTransaction && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-8 overflow-hidden animate-in fade-in">
                    <div className="w-full h-full max-w-4xl bg-slate-200 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
                        <button onClick={() => { setShowReceipt(false); setCompletedTransaction(null); }} className="absolute top-4 right-4 z-50 bg-white/20 hover:bg-white/40 text-black p-2 rounded-full transition backdrop-blur-md">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="px-10 py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 mb-6 mx-auto">
                                <Truck className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900">Kharedi Logged!</h2>
                            <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">Stock has been computationally updated. Supplier debt increased.</p>

                            <div className="w-full bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mt-8 mb-6">
                                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Invoice Amount</p>
                                <p className="text-4xl font-black text-slate-900">₹{completedTransaction.grand_total.toLocaleString()}</p>
                            </div>

                            <div className="flex gap-2 w-full mb-3">
                                <button onClick={() => setReceiptLang('en')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition ${receiptLang === 'en' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}>ENGLISH</button>
                                <button onClick={() => setReceiptLang('mr')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition ${receiptLang === 'mr' ? 'bg-orange-100 text-orange-700 border-2 border-orange-500' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}>मराठी</button>
                            </div>

                            <button onClick={() => window.print()} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 mb-3">
                                <Printer className="w-5 h-5" /> PRINT PURCHASE SLIP
                            </button>
                        </div>

                        <div className="flex-1 bg-white border-l border-slate-300 relative pt-12 pb-12 flex justify-center items-start overflow-y-auto print-section custom-scrollbar">
                            <div className="shadow-2xl rounded" id="printable-pos-receipt">
                                <ThermalPurchaseReceipt transaction={completedTransaction} shopInfo={shopInfo} lang={receiptLang} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
