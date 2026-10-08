'use client'

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Search, Plus, Minus, Save, Activity, Trash2, ArrowRight, ArrowLeftRight, Package, RefreshCw, Eye, X } from 'lucide-react'
import SharedThermalReceipt from '../../components/SharedThermalReceipt'

// Basic Types
type Product = {
    id: string;
    name: string;
    name_mr: string | null;
    buy_rate: string | null;
    sell_rate: string;
    wholesale_rate: string;
    stock: number;
}

type Supplier = {
    id: string;
    name: string;
    current_balance: string;
}

type CartItem = {
    tempId: string;                   // unique ID for cart list
    productId: string | null;         // null if it's a completely new product
    name: string;
    name_mr: string;
    buy_rate: number;
    sell_rate: number;
    qty: number;
    total: number;
    isNew: boolean;
}

export default function KharediClient({ initialProducts, initialSuppliers, shopInfo }: { initialProducts: Product[], initialSuppliers: Supplier[], shopInfo: any }) {

    const [cart, setCart] = useState<CartItem[]>([])
    const [supplierSearch, setSupplierSearch] = useState<string>('')
    const [supplierId, setSupplierId] = useState<string>('')
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
    const [billRef, setBillRef] = useState('')
    const [selectedSuppIdx, setSelectedSuppIdx] = useState(0)
    const filteredSuppliers = initialSuppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
    const [amountPaid, setAmountPaid] = useState('')
    const [receiptLang, setReceiptLang] = useState<'ENG' | 'MAR'>('MAR')
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH')
    const [showPreview, setShowPreview] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const supplierSearchRef = useRef<HTMLInputElement>(null)
    const amountPaidRef = useRef<HTMLInputElement>(null)
    const finalizeBtnRef = useRef<HTMLButtonElement>(null)

    // Offline Daemon Flush
    useEffect(() => {
        const flushQueue = async () => {
            if (navigator.onLine) {
                const pending = JSON.parse(localStorage.getItem('mybizz_offline_kharedi') || '[]')
                if (pending.length > 0) {
                    const remaining = []
                    for (const payload of pending) {
                        try {
                            await fetch('/api/erp/purchase/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            })
                        } catch (e) {
                            remaining.push(payload)
                        }
                    }
                    localStorage.setItem('mybizz_offline_kharedi', JSON.stringify(remaining))
                }
            }
        }
        window.addEventListener('online', flushQueue)
        if (navigator.onLine) flushQueue()
        return () => window.removeEventListener('online', flushQueue)
    }, [])

    // Checkout Resilience Rehydration Hook
    useEffect(() => {
        const draftStr = localStorage.getItem('mybizz_kharedi_checkout_draft')
        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr)
                if (draft.cart?.length > 0) setCart(draft.cart)
                if (draft.selectedSupplier) {
                    setSelectedSupplier(draft.selectedSupplier)
                    setSupplierSearch(draft.selectedSupplier.name)
                }
                if (draft.billRef) setBillRef(draft.billRef)
                if (draft.amountPaid) setAmountPaid(String(draft.amountPaid))
            } catch (e) {
                console.error("Failed to parse kharedi draft", e)
            }
        }
    }, [])

    // Checkout Resilience Snapshot
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('mybizz_kharedi_checkout_draft', JSON.stringify({ cart, selectedSupplier, amountPaid, billRef }))
        } else {
            localStorage.removeItem('mybizz_kharedi_checkout_draft')
        }
    }, [cart, selectedSupplier, amountPaid, billRef])

    useEffect(() => {
        const nextId = (parseInt(localStorage.getItem('mybizz_purchase_seq') || '0', 10) + 1).toString().padStart(3, '0')
        // Automatically populate an internally tracked reference if empty
        if (!billRef) {
            setBillRef(`KHAREDI-P0${nextId}`)
        }
    }, [])

    // Infinity Loop Focus Refs
    const searchRef = useRef<HTMLInputElement>(null)
    const marathiRef = useRef<HTMLInputElement>(null)
    const qtyRef = useRef<HTMLInputElement>(null)
    const buyRateRef = useRef<HTMLInputElement>(null)
    const sellRateRef = useRef<HTMLInputElement>(null)

    // Current Row State
    const [searchQuery, setSearchQuery] = useState('')
    const [activeProduct, setActiveProduct] = useState<Product | null>(null)
    const [selectedProdIdx, setSelectedProdIdx] = useState(0)

    const [isNewProduct, setIsNewProduct] = useState(false)
    const [formMrName, setFormMrName] = useState('')
    const [formQty, setFormQty] = useState('')
    const [formBuy, setFormBuy] = useState('')
    const [formSell, setFormSell] = useState('')

    const [isTranslating, setIsTranslating] = useState(false)

    const pSearchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean)
    const filteredQueryProducts = initialProducts.filter(p => pSearchTerms.every(term => p.name.toLowerCase().includes(term)))

    // Translates English phonetics to Marathi natively via Google Input API
    const translateToMarathi = async (text: string) => {
        if (!text) return ''
        setIsTranslating(true)
        try {
            const url = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=mr-t-i0-und&num=1`
            const res = await fetch(url)
            const data = await res.json()
            if (data[0] === 'SUCCESS') {
                return data[1][0][1][0] || text
            }
        } catch (e) {
            console.error('Translation failed', e)
        } finally {
            setIsTranslating(false)
        }
        return text
    }

    const handleSearchKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedProdIdx(prev => Math.min(prev + 1, Math.min(filteredQueryProducts.length, 10) - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedProdIdx(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const query = searchQuery.trim().toLowerCase()
            if (!query) return

            let match = initialProducts.find(p => p.name.toLowerCase() === query)
            if (!match && filteredQueryProducts.length > 0) {
                match = filteredQueryProducts[selectedProdIdx]
            }

            if (match) {
                setSearchQuery(match.name)
                setActiveProduct(match)
                setIsNewProduct(false)
                setFormMrName(match.name_mr || '')
                setFormBuy(match.buy_rate?.toString() || '0')
                setFormSell(match.sell_rate?.toString() || '0')
                setFormQty('1')
                setTimeout(() => qtyRef.current?.focus(), 50)
            } else {
                setActiveProduct(null)
                setIsNewProduct(true)
                const mrTranslation = await translateToMarathi(query)
                setFormMrName(mrTranslation)
                setFormQty('1')
                setTimeout(() => marathiRef.current?.focus(), 50)
            }
        }
    }

    // Handles the core loop execution mapped to physical keyboard keystrokes
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement | null> | null, isLastStep: boolean = false) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (isLastStep) {
                commitToCart()
            } else if (nextRef) {
                nextRef.current?.focus()
            }
        }
    }

    const commitToCart = () => {
        const qty = parseFloat(formQty) || 0
        const buy = parseFloat(formBuy) || 0
        const sell = parseFloat(formSell) || 0

        if (qty <= 0) return alert("Quantity must be greater than 0")
        if (isNewProduct && (!searchQuery || !formMrName)) return alert("Name and Marathi Name are required for new products.")

        const item: CartItem = {
            tempId: crypto.randomUUID(),
            productId: activeProduct ? activeProduct.id : null,
            name: activeProduct ? activeProduct.name : searchQuery.trim(),
            name_mr: formMrName.trim(),
            buy_rate: buy,
            sell_rate: sell,
            qty: qty,
            total: qty * buy,
            isNew: isNewProduct
        }

        setCart([item, ...cart])

        // Wipe loop state and snap focus purely back to origin
        setSearchQuery('')
        setActiveProduct(null)
        setSelectedProdIdx(0)
        setIsNewProduct(false)
        setFormMrName('')
        setFormBuy('')
        setFormSell('')
        setFormQty('')
        setTimeout(() => searchRef.current?.focus(), 50)
    }

    const updateCartItem = (tempId: string, field: 'qty' | 'buy_rate' | 'sell_rate', value: number) => {
        setCart(cart.map(c => {
            if (c.tempId === tempId) {
                const updated = { ...c, [field]: value }
                updated.total = updated.qty * updated.buy_rate
                return updated
            }
            return c
        }))
    }

    // Cart Maths
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0)

    const activeSupplierRef = initialSuppliers.find(s => s.id === supplierId)
    const supplierDue = activeSupplierRef ? parseFloat(activeSupplierRef.current_balance || '0') : 0

    const parsedAmountPaid = parseFloat(amountPaid) || 0
    const addedSupplierDebt = totalAmount - parsedAmountPaid

    const finalizeKharedi = async () => {
        if (isSubmitting) return
        if (cart.length === 0 || (!supplierId && supplierId !== 'NEW')) {
            alert('Cannot finalize: Cart is empty or Supplier is missing.')
            return
        }

        const payload = {
            cart,
            supplierId: supplierId === 'NEW' ? null : supplierId,
            supplierName: supplierSearch,
            billRef,
            totalAmount,
            amountPaid: parsedAmountPaid,
            paymentMethod
        }

        if (!navigator.onLine) {
            const pending = JSON.parse(localStorage.getItem('mybizz_offline_kharedi') || '[]')
            pending.push(payload)
            localStorage.setItem('mybizz_offline_kharedi', JSON.stringify(pending))
            window.print()
            setCart([]); setSupplierId(''); setSupplierSearch(''); setBillRef(''); setAmountPaid('')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/erp/purchase/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Purchase sync failed.')
            }

            // Execute local thermal print buffer before wiping state map
            window.print()

            // Simulated DB cache clear
            setCart([])
            setSupplierId('')
            setSupplierSearch('')
            setBillRef('')
            setAmountPaid('')

        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Global F10 Hook
    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            if (e.key === 'F10') {
                e.preventDefault()
                finalizeKharedi()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [cart, supplierId])

    // Receipt Translation Dictionary
    const dLang = {
        ENG: {
            title: "PURCHASE ENTRY",
            vendor: "Supplier", billRef: "Bill Ref", item: "Item", qty: "Qty", rate: "Rate", total: "Total",
            todayItems: "Today Items", totalPayable: "TOTAL PURCHASE", paidToday: "Paid Today",
            footer1: "Purchase Receipt", footer2: "Powered by MyBizz ERP"
        },
        MAR: {
            title: "खरेदी पावती (PURCHASE ENTRY)",
            vendor: "पुरवठादार (Supplier)", billRef: "पावती क्र", item: "तपशील", qty: "संख्या", rate: "दर", total: "रक्कम",
            todayItems: "आजची संख्या", totalPayable: "TOTAL PURCHASE", paidToday: "आज जमा",
            footer1: "खरेदी पावती", footer2: "Powered by MyBizz ERP"
        }
    }[receiptLang]

    return (
        <div className="flex flex-col h-auto min-h-[calc(100vh-140px)] lg:h-[calc(100vh-140px)] print:h-auto print:block">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 0; size: 80mm 297mm; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    body * { visibility: hidden; }
                    .print-section, .print-section * { visibility: visible; }
                    .print-section { position: absolute; left: 0; top: 0; width: 80mm !important; max-width: 80mm !important; box-sizing: border-box !important; }
                }
            `}} />
            <div className="flex items-center justify-between mb-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <ArrowLeftRight className="text-indigo-600" />
                        Purchase Operations (Kharedi)
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Log inbound stock, adjust base pricing, and execute supplier ledgers.</p>
                </div>
            </div>

            {/* Infinity Loop Data Entry Node */}
            <Card className="p-4 mb-4 border-slate-200/60 shadow-sm bg-white overflow-visible ring-1 ring-slate-900/5">
                <div className="flex flex-wrap gap-4 items-end">

                    {/* Primary Search Anchor */}
                    <div className="flex-grow min-w-[250px] relative">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 block">Product Name (EN)</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                tabIndex={1}
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-400 placeholder:font-semibold uppercase"
                                placeholder="TYPE & HIT ENTER..."
                                autoFocus
                            />
                        </div>
                        {searchQuery && !activeProduct && !isNewProduct && (
                            <div className="absolute top-full left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 z-[9999] rounded-xl shadow-lg mt-1">
                                {filteredQueryProducts.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-[13px] font-bold">New product will be generated. Press Enter.</div>
                                ) : filteredQueryProducts.slice(0, 10).map((p, idx) => (
                                    <button
                                        key={p.id}
                                        onClick={() => {
                                            setSearchQuery(p.name)
                                            setActiveProduct(p)
                                            setIsNewProduct(false)
                                            setFormMrName(p.name_mr || '')
                                            setFormBuy(p.buy_rate?.toString() || '0')
                                            setFormSell(p.sell_rate?.toString() || '0')
                                            setFormQty('1')
                                            setTimeout(() => qtyRef.current?.focus(), 50)
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 border-b border-slate-50 text-left transition-colors cursor-pointer ${idx === selectedProdIdx ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex flex-col">
                                            <p className="text-[14px] font-bold text-slate-800">{p.name}</p>
                                            <p className="text-[12px] font-semibold text-emerald-600">{p.name_mr}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-bold text-slate-400">Stock: {p.stock}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Conditional Infinity Loop Stages */}
                    {(activeProduct || isNewProduct) && (
                        <>
                            {isNewProduct && (
                                <div className="w-[200px]">
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 mb-1.5 flex justify-between">
                                        <span>Marathi Name (MR)</span>
                                        {isTranslating && <span className="animate-pulse">Translating...</span>}
                                    </label>
                                    <input
                                        tabIndex={2}
                                        ref={marathiRef}
                                        type="text"
                                        value={formMrName}
                                        onChange={(e) => setFormMrName(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, qtyRef)}
                                        className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                                        placeholder="मराठी नाव"
                                    />
                                </div>
                            )}

                            <div className="w-[100px]">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 block">Quantity</label>
                                <input
                                    tabIndex={3}
                                    ref={qtyRef}
                                    type="number"
                                    value={formQty}
                                    onChange={(e) => setFormQty(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDown(e, buyRateRef)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-center"
                                />
                            </div>

                            <div className="w-[120px]">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 block">Buy Rate</label>
                                <input
                                    tabIndex={4}
                                    ref={buyRateRef}
                                    type="number"
                                    value={formBuy}
                                    onChange={(e) => setFormBuy(e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => handleKeyDown(e, sellRateRef)}
                                    className="w-full px-4 py-3 bg-amber-50/50 border border-amber-200 rounded-xl text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono"
                                />
                            </div>

                            <div className="w-[120px]">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1.5 block">Sell Rate</label>
                                <div className="relative flex items-center">
                                    <input
                                        tabIndex={5}
                                        ref={sellRateRef}
                                        type="number"
                                        value={formSell}
                                        onChange={(e) => setFormSell(e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        onKeyDown={(e) => handleKeyDown(e, null, true)}
                                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono"
                                    />
                                    <span className="absolute right-3 text-[10px] font-bold text-slate-400">ENTER ⏎</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            <div className="flex-1 min-h-0 flex gap-4 lg:flex-row flex-col print:hidden">
                <Card className="flex-1 border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-500" /> Staged Ledger Data
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style dangerouslySetInnerHTML={{ __html: `\n::-webkit-scrollbar { display: none; }\n` }} />
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-slate-500 bg-white sticky top-0 uppercase tracking-widest shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Item Identifier </th>
                                    <th className="px-6 py-4 font-bold text-center">Qty</th>
                                    <th className="px-6 py-4 font-bold text-right">Cost Rate</th>
                                    <th className="px-6 py-4 font-bold text-right">Sale Rate</th>
                                    <th className="px-6 py-4 font-bold text-right">Value (Buy)</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item) => (
                                    <tr key={item.tempId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 uppercase">{item.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="font-semibold text-xs text-emerald-600">{item.name_mr}</span>
                                                    {item.isNew && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold tracking-widest uppercase">New Origin</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 justify-center">
                                                <button onClick={() => updateCartItem(item.tempId, 'qty', Math.max(1, item.qty - 1))} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><Minus className="w-3 h-3" /></button>
                                                <input type="number" value={item.qty} onFocus={(e) => e.target.select()} onChange={(e) => updateCartItem(item.tempId, 'qty', parseInt(e.target.value) || 0)} className="w-12 border border-slate-200 rounded text-[13px] font-bold text-center py-1 outline-none focus:border-indigo-500" />
                                                <button onClick={() => updateCartItem(item.tempId, 'qty', item.qty + 1)} className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><Plus className="w-3 h-3" /></button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" value={item.buy_rate} onFocus={(e) => e.target.select()} onChange={e => updateCartItem(item.tempId, 'buy_rate', parseFloat(e.target.value) || 0)} className="w-20 border border-slate-200 rounded-lg text-[13px] font-mono font-bold text-right px-2 py-1 block focus:border-amber-500 outline-none ml-auto text-amber-700" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" value={item.sell_rate} onFocus={(e) => e.target.select()} onChange={e => updateCartItem(item.tempId, 'sell_rate', parseFloat(e.target.value) || 0)} className="w-20 border border-slate-200 rounded-lg text-[13px] font-mono font-bold text-right px-2 py-1 block focus:border-indigo-500 outline-none ml-auto text-indigo-700" />
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-right text-slate-900">₹{item.total.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => setCart(cart.filter(c => c.tempId !== item.tempId))} className="text-rose-500 hover:text-rose-600 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all p-2 rounded-lg hover:bg-rose-50 border lg:border-transparent border-rose-200">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card className="w-full lg:w-[380px] bg-white border border-slate-200 text-slate-800 flex flex-col shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden h-fit">
                    <div className="p-6 border-b border-slate-100 flex flex-col gap-6">

                        {/* SUPPLIER (VENDOR) */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Supplier (Vendor)</label>
                            </div>

                            {selectedSupplier ? (
                                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                                    <div className="flex-1">
                                        <p className="font-bold text-[14px] text-blue-900">{selectedSupplier.name}</p>
                                        {selectedSupplier.id !== 'NEW' && parseFloat(selectedSupplier.current_balance || '0') > 0 && (
                                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-700 rounded-lg border border-rose-200">
                                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                                <span className="text-[11px] font-black uppercase tracking-widest">Previous Due: ₹{parseFloat(selectedSupplier.current_balance || '0').toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                        {selectedSupplier.id !== 'NEW' && parseFloat(selectedSupplier.current_balance || '0') <= 0 && (
                                            <p className="text-[12px] text-blue-600 font-medium">Debt: ₹0.00</p>
                                        )}
                                        {selectedSupplier.id === 'NEW' && <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Walk-in Vendor Setup</p>}
                                    </div>
                                    <button onClick={() => { setSelectedSupplier(null); setSupplierId('') }} className="text-blue-400 hover:text-blue-700"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="relative z-50">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        ref={supplierSearchRef}
                                        value={supplierSearch}
                                        onChange={(e) => setSupplierSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault()
                                                setSelectedSuppIdx(prev => Math.min(prev + 1, Math.min(filteredSuppliers.length, 5))) // Max 5 + 1 for Add New
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault()
                                                setSelectedSuppIdx(prev => Math.max(prev - 1, 0))
                                            } else if (e.key === 'Enter') {
                                                e.preventDefault()
                                                if (e.ctrlKey) {
                                                    amountPaidRef.current?.focus()
                                                } else if (supplierSearch && filteredSuppliers.length > 0) {
                                                    if (selectedSuppIdx < filteredSuppliers.length) {
                                                        setSelectedSupplier(filteredSuppliers[selectedSuppIdx])
                                                        setSupplierId(filteredSuppliers[selectedSuppIdx].id)
                                                    } else {
                                                        setSelectedSupplier({ id: 'NEW', name: supplierSearch, current_balance: '0' })
                                                        setSupplierId('NEW')
                                                    }
                                                    setSupplierSearch('')
                                                    amountPaidRef.current?.focus()
                                                } else if (supplierSearch && filteredSuppliers.length === 0) {
                                                    setSelectedSupplier({ id: 'NEW', name: supplierSearch, current_balance: '0' })
                                                    setSupplierId('NEW')
                                                    setSupplierSearch('')
                                                    amountPaidRef.current?.focus()
                                                }
                                            }
                                        }}
                                        placeholder="Search supplier or add new..."
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:font-semibold placeholder:text-slate-400"
                                    />
                                    {supplierSearch && (
                                        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                            {filteredSuppliers.length === 0 ? (
                                                <button onClick={() => { setSelectedSupplier({ id: 'NEW', name: supplierSearch, current_balance: '0' }); setSupplierId('NEW'); setSupplierSearch('') }} className={`w-full text-left p-3 text-[12px] font-bold transition-colors ${selectedSuppIdx === 0 ? 'bg-blue-50 text-blue-700' : 'text-blue-600 hover:bg-slate-50'}`}>
                                                    + Add '{supplierSearch}' as Vendor
                                                </button>
                                            ) : (
                                                <>
                                                    {filteredSuppliers.slice(0, 5).map((s, idx) => (
                                                        <button key={s.id} onClick={() => { setSelectedSupplier(s); setSupplierId(s.id); setSupplierSearch('') }} className={`w-full text-left px-3 py-2 transition-colors border-b border-slate-50 ${idx === selectedSuppIdx ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-blue-50'}`}>
                                                            <p className="text-[13px] font-semibold text-slate-800">{s.name}</p>
                                                            <p className="text-[11px] text-amber-600 font-medium">Debt: ₹{parseFloat(s.current_balance || '0').toFixed(2)}</p>
                                                        </button>
                                                    ))}
                                                    <button onClick={() => { setSelectedSupplier({ id: 'NEW', name: supplierSearch, current_balance: '0' }); setSupplierId('NEW'); setSupplierSearch('') }} className={`w-full text-left p-2 text-[11px] font-bold border-t border-slate-100 ${selectedSuppIdx === Math.min(filteredSuppliers.length, 5) ? 'bg-blue-50 text-blue-700' : 'text-blue-500 hover:bg-slate-50'}`}>
                                                        + Or Add '{supplierSearch}' as Vendor
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* PHYSICAL BILL / RECEIPT NO. */}
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">Physical Bill / Receipt No.</label>
                            <input
                                value={billRef}
                                onChange={(e) => setBillRef(e.target.value)}
                                placeholder="E.G. INV-2023-XXXX"
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 uppercase"
                            />
                        </div>

                        {/* Summary Block */}
                        <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 mx-1">
                            <div className="flex justify-between items-end border-b border-slate-200 pb-3 mb-3">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Purchase Bill</span>
                                <span className="text-2xl font-black text-[#111827]">₹{totalAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Old Due</span>
                                <span className="text-lg font-bold text-slate-700">₹{supplierDue.toFixed(0)}</span>
                            </div>
                        </div>

                        {/* Amount Paid Today */}
                        <div>
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">Amount Paid Today (₹)</label>
                            <input
                                ref={amountPaidRef}
                                type="number"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        finalizeBtnRef.current?.focus()
                                    }
                                }}
                                className="w-full bg-white text-center text-[28px] font-black text-emerald-500/90 border border-slate-200 rounded-2xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-emerald-500/40"
                                placeholder="Pay ₹0"
                            />
                            <div className="flex justify-between items-center mt-3 mx-1">
                                <span className="text-[10px] font-bold text-slate-500 tracking-wide">Added to Supplier Debt:</span>
                                <span className="text-[12px] font-black text-orange-500">₹{addedSupplierDebt.toFixed(0)}</span>
                            </div>
                        </div>

                    </div>

                    <div className="p-6 flex flex-col gap-5 border-t border-slate-100 bg-white">
                        {/* Receipt Language Toggle & Preview */}
                        <div className="flex justify-between items-end">
                            <div className="flex-[3]">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">Receipt Language</label>
                                <div className="flex gap-1.5">
                                    <button onClick={() => setReceiptLang('ENG')} className={`flex-1 py-2 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${receiptLang === 'ENG' ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>ENG</button>
                                    <button onClick={() => setReceiptLang('MAR')} className={`flex-1 py-2 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${receiptLang === 'MAR' ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>MAR</button>
                                </div>
                            </div>
                            <div className="flex-[2] ml-4">
                                <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 block">Payment Type</label>
                                <div className="flex gap-1.5">
                                    <button onClick={() => setPaymentMethod('CASH')} className={`flex-1 flex justify-center items-center py-2 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>CASH</button>
                                    <button onClick={() => setPaymentMethod('ONLINE')} className={`flex-1 flex justify-center items-center py-2 text-[10px] uppercase font-black tracking-widest rounded-lg border transition-all ${paymentMethod === 'ONLINE' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>ONLINE</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowPreview(true)} className="w-1/3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 border border-blue-200 bg-white px-3 h-12 rounded-xl hover:bg-blue-50 transition-colors uppercase tracking-widest">
                                <Eye className="w-4 h-4" /> Preview
                            </button>
                            <button ref={finalizeBtnRef} onClick={finalizeKharedi} className="w-2/3 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black tracking-widest uppercase py-4 rounded-xl transition-all disabled:opacity-50 shadow-xl shadow-blue-600/20 text-sm" disabled={isSubmitting || cart.length === 0 || (!supplierId && supplierId !== 'NEW')}>
                                {isSubmitting ? 'Syncing...' : 'Complete Run (F10)'}
                            </button>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="hidden print:block print-section">
                <SharedThermalReceipt
                    variant="purchase"
                    language={receiptLang}
                    shopInfo={shopInfo || { name: 'YOUR SHOP NAME' }}
                    billRef={billRef}
                    customerOrSupplierName={supplierSearch || 'Local Vendor'}
                    cart={cart}
                    subtotal={totalAmount}
                    oldDue={supplierDue}
                    netPayable={totalAmount}
                    amountPaid={parsedAmountPaid}
                    newDueAdded={addedSupplierDebt}
                    paymentMethod={paymentMethod}
                />
            </div>

            {/* Live Preview Modal Overlay */}
            {showPreview && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
                    <div className="bg-white rounded-xl shadow-2xl relative max-w-sm w-full overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-sm tracking-widest uppercase text-slate-800">Thermal Preview</h3>
                            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-900 font-black text-xl leading-none">&times;</button>
                        </div>
                        <div className="p-8 bg-slate-100 flex justify-center items-center overflow-y-auto max-h-[60vh]">
                            <div className="shadow-md border border-slate-200/60 break-inside-avoid">
                                <SharedThermalReceipt
                                    variant="purchase"
                                    language={receiptLang}
                                    shopInfo={shopInfo || { name: 'YOUR SHOP NAME' }}
                                    billRef={billRef}
                                    customerOrSupplierName={supplierSearch || 'Local Vendor'}
                                    cart={cart}
                                    subtotal={totalAmount}
                                    oldDue={supplierDue}
                                    netPayable={totalAmount}
                                    amountPaid={parsedAmountPaid}
                                    newDueAdded={addedSupplierDebt}
                                    paymentMethod={paymentMethod}
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
                            <button onClick={() => setShowPreview(false)} className="bg-slate-900 text-white font-bold py-2.5 px-6 rounded-lg text-sm uppercase tracking-widest hover:bg-slate-800">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
