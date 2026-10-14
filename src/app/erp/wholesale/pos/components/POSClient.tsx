'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Minus, Trash2, ShoppingCart, User, IndianRupee, Printer, CheckCircle2, X, Eye, Users, ChevronDown, UserPlus } from 'lucide-react'
import SharedThermalReceipt from '../../components/SharedThermalReceipt'
import { quickCreateCustomer } from '../actions'
import { triggerLiveSync } from '@/utils/realtimeSync'

interface Product { id: string; name: string; name_mr: string | null; stock: number; sell_rate: string; wholesale_rate: string; min_wholesale_qty?: number | null; buy_rate: string | null }
interface Customer { id: string; name: string; phone: string | null; customer_type?: string; old_balance: string }
interface CartItem extends Product { qty: number; rate: number; tierReason?: 'WHOLESALE_PARTY' | 'BULK_SLAB' | 'RETAIL' | 'MANUAL'; isManualPrice?: boolean }

// Option 3 Autonomous Smart Tiered Pricing Calculator
function computeSmartRate(product: Product, qty: number, customer: Customer | null, isWholesaleMode: boolean) {
    const sell = parseFloat(product.sell_rate) || 0
    const wholesale = parseFloat(product.wholesale_rate) || sell
    const minQty = product.min_wholesale_qty || 12

    // Margin guard: If wholesale_rate == sell_rate, never discount
    if (wholesale >= sell) {
        return { rate: sell, tierReason: 'RETAIL' as const }
    }

    // Force mode toggle override
    if (isWholesaleMode) {
        return { rate: wholesale, tierReason: 'WHOLESALE_PARTY' as const }
    }

    // Rule A: Customer is tagged as WHOLESALE
    if (customer && customer.customer_type === 'WHOLESALE') {
        return { rate: wholesale, tierReason: 'WHOLESALE_PARTY' as const }
    }

    // Rule B: Quantity meets or exceeds min bulk threshold
    if (qty >= minQty) {
        return { rate: wholesale, tierReason: 'BULK_SLAB' as const }
    }

    return { rate: sell, tierReason: 'RETAIL' as const }
}

export default function POSClient({ products, customers, shop }: { products: Product[], customers: Customer[], shop: any }) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [search, setSearch] = useState('')
    const [selectedProdIdx, setSelectedProdIdx] = useState(0)
    const [customerSearch, setCustomerSearch] = useState('')
    const [selectedCustIdx, setSelectedCustIdx] = useState(0)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [discount, setDiscount] = useState(0)
    const [amountReceived, setAmountReceived] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [completedBill, setCompletedBill] = useState<any>(null)
    const [previewBillNo, setPreviewBillNo] = useState('')
    const [modalAction, setModalAction] = useState<'print' | 'new'>('print')

    const [stagingProduct, setStagingProduct] = useState<Product | null>(null)
    const [stagingQty, setStagingQty] = useState('1')
    const [stagingRate, setStagingRate] = useState('')
    const stagingQtyRef = useRef<HTMLInputElement>(null)
    const stagingRateRef = useRef<HTMLInputElement>(null)

    // Quick Add Buyer & Resilient Customer State
    const [customerList, setCustomerList] = useState<Customer[]>(customers || [])
    const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false)
    const [isAddCustModalOpen, setIsAddCustModalOpen] = useState(false)
    const [newCustName, setNewCustName] = useState('')
    const [newCustPhone, setNewCustPhone] = useState('')
    const [newCustType, setNewCustType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL')
    const [newCustBalance, setNewCustBalance] = useState('')
    const [isSavingCustomer, setIsSavingCustomer] = useState(false)

    useEffect(() => {
        setCustomerList(customers || [])
    }, [customers])

    // Offline Daemon Flush
    useEffect(() => {
        const flushQueue = async () => {
            if (navigator.onLine) {
                const pending = JSON.parse(localStorage.getItem('mybizz_offline_sales') || '[]')
                if (pending.length > 0) {
                    const remaining = []
                    for (const payload of pending) {
                        try {
                            await fetch('/api/erp/pos/checkout', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            })
                        } catch (e) {
                            remaining.push(payload)
                        }
                    }
                    localStorage.setItem('mybizz_offline_sales', JSON.stringify(remaining))
                }
            }
        }
        window.addEventListener('online', flushQueue)
        if (navigator.onLine) flushQueue()
        return () => window.removeEventListener('online', flushQueue)
    }, [])

    // Checkout Resilience & Clone Rehydration Hook
    useEffect(() => {
        const cloneStr = localStorage.getItem('mybizz_void_clone_payload')
        const draftStr = localStorage.getItem('mybizz_pos_checkout_draft')

        if (cloneStr) {
            try {
                const payload = JSON.parse(cloneStr)
                if (payload.customer) {
                    setSelectedCustomer(payload.customer)
                    setCustomerSearch(payload.customer.name)
                }
                if (payload.items && Array.isArray(payload.items)) {
                    setCart(payload.items.map((i: any) => ({ ...i, tempId: crypto.randomUUID() })))
                }
                if (payload.discount) setDiscount(parseFloat(payload.discount))
            } catch (e) {
                console.error("Failed to parse clone payload", e)
            }
            localStorage.removeItem('mybizz_void_clone_payload')
        } else if (draftStr) {
            try {
                const draft = JSON.parse(draftStr)
                if (draft.cart?.length > 0) setCart(draft.cart)
                if (draft.selectedCustomer) {
                    setSelectedCustomer(draft.selectedCustomer)
                    setCustomerSearch(draft.selectedCustomer.name)
                }
                if (draft.discount) setDiscount(Number(draft.discount))
                if (draft.amountReceived) setAmountReceived(String(draft.amountReceived))
            } catch (e) {
                console.error("Failed to parse draft", e)
            }
        }
    }, [])

    // Checkout Resilience Snapshot
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('mybizz_pos_checkout_draft', JSON.stringify({ cart, selectedCustomer, discount, amountReceived }))
        } else {
            localStorage.removeItem('mybizz_pos_checkout_draft')
        }
    }, [cart, selectedCustomer, discount, amountReceived])

    useEffect(() => {
        const nextId = (parseInt(localStorage.getItem('mybizz_bill_seq') || '0', 10) + 1).toString().padStart(3, '0')
        setPreviewBillNo(`INV-S0${nextId}`)
    }, [completedBill])

    const [receiptLang, setReceiptLang] = useState<'ENG' | 'MAR'>('MAR')
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'ONLINE'>('CASH')
    const [showPreview, setShowPreview] = useState(false)
    const [isWholesaleMode, setIsWholesaleMode] = useState(false)

    // Reactive Option 3 Smart Pricing Trigger: Recomputes cart rates when Customer or Global Wholesale Mode changes
    useEffect(() => {
        if (cart.length > 0) {
            setCart(prev => prev.map(item => {
                if (item.isManualPrice) return item // Respect manual overrides
                const computed = computeSmartRate(item, item.qty, selectedCustomer, isWholesaleMode)
                return {
                    ...item,
                    rate: computed.rate,
                    tierReason: computed.tierReason
                }
            }))
        }
    }, [selectedCustomer, isWholesaleMode])

    const searchRef = useRef<HTMLInputElement>(null)
    const customerSearchRef = useRef<HTMLInputElement>(null)
    const discountRef = useRef<HTMLInputElement>(null)
    const amountRef = useRef<HTMLInputElement>(null)
    const previewBtnRef = useRef<HTMLButtonElement>(null)

    const searchTerms = search.toLowerCase().split(' ').filter(Boolean)
    const filteredProducts = products.filter(p => searchTerms.every(term => p.name.toLowerCase().includes(term)))

    const cQuery = (customerSearch || '').trim().toLowerCase()
    const filteredCustomers = customerList.filter(c => {
        if (!c) return false
        if (!cQuery) return true
        const nameMatch = (c.name || '').toLowerCase().includes(cQuery)
        const phoneMatch = Boolean(c.phone && c.phone.includes(cQuery))
        return nameMatch || phoneMatch
    })

    const subtotal = cart.reduce((s, i) => s + i.qty * i.rate, 0)
    const netTotal = subtotal - discount
    const prevUdhaari = selectedCustomer ? parseFloat(selectedCustomer.old_balance || '0') : 0
    const totalPayable = netTotal + prevUdhaari
    const paid = parseFloat(amountReceived) || 0
    const change = selectedCustomer ? Math.max(0, paid - totalPayable) : Math.max(0, paid - netTotal)
    const newUdhaari = selectedCustomer ? Math.max(0, totalPayable - paid) : 0

    function prepareItem(product: Product) {
        setCart(prev => {
            const exists = prev.find(i => i.id === product.id)
            if (exists) {
                const newQty = (exists.qty || 0) + 1
                const computed = exists.isManualPrice ? { rate: exists.rate, tierReason: exists.tierReason } : computeSmartRate(exists, newQty, selectedCustomer, isWholesaleMode)
                return prev.map(i => i.id === product.id ? { ...i, qty: newQty, rate: computed.rate, tierReason: computed.tierReason } : i)
            }
            const computed = computeSmartRate(product, 1, selectedCustomer, isWholesaleMode)
            return [...prev, { ...product, qty: 0, rate: computed.rate, tierReason: computed.tierReason, isManualPrice: false }]
        })
        setSearch('')
        setSelectedProdIdx(0)
        setTimeout(() => {
            const el = document.getElementById(`qty-input-${product.id}`) as HTMLInputElement | null
            el?.focus()
            el?.select()
        }, 50)
    }

    function setQty(id: string, qty: number) {
        const safeQty = Math.max(0, qty)
        setCart(prev => prev.map(i => {
            if (i.id !== id) return i
            const computed = i.isManualPrice ? { rate: i.rate, tierReason: i.tierReason } : computeSmartRate(i, safeQty || 1, selectedCustomer, isWholesaleMode)
            return { ...i, qty: safeQty, rate: computed.rate, tierReason: computed.tierReason }
        }))
    }

    function updateQty(id: string, delta: number) {
        setCart(prev => prev.map(i => {
            if (i.id !== id) return i
            const safeQty = Math.max(0, (i.qty || 0) + delta)
            const computed = i.isManualPrice ? { rate: i.rate, tierReason: i.tierReason } : computeSmartRate(i, safeQty || 1, selectedCustomer, isWholesaleMode)
            return { ...i, qty: safeQty, rate: computed.rate, tierReason: computed.tierReason }
        }).filter(i => i.qty > 0))
    }

    function removeItem(id: string) { setCart(p => p.filter(i => i.id !== id)) }

    function updateRate(id: string, rate: number) {
        setCart(prev => prev.map(i => i.id === id ? { ...i, rate, isManualPrice: true, tierReason: 'MANUAL' } : i))
    }

    async function handleQuickAddCustomer(e: React.FormEvent) {
        e.preventDefault()
        if (!newCustName.trim()) return alert('Customer name is required')
        setIsSavingCustomer(true)
        try {
            const created = await quickCreateCustomer({
                name: newCustName.trim(),
                phone: newCustPhone.trim() || null,
                customer_type: newCustType,
                old_balance: newCustBalance || '0'
            })
            setCustomerList(prev => [created as any, ...prev])
            setSelectedCustomer(created as any)
            setCustomerSearch('')
            setIsCustDropdownOpen(false)
            setIsAddCustModalOpen(false)
            setNewCustName('')
            setNewCustPhone('')
            setNewCustType('RETAIL')
            setNewCustBalance('')
        } catch (err: any) {
            alert(err.message || 'Failed to create customer')
        } finally {
            setIsSavingCustomer(false)
        }
    }

    async function handleCheckout() {
        if (isSubmitting) return
        if (cart.length === 0) return alert('Cart is empty.')
        if (cart.some(item => (item.qty || 0) <= 0)) {
            return alert('Quantity must be greater than 0 for all items in the cart.')
        }
        const payload = {
            cart,
            customerId: selectedCustomer?.id || null,
            customerName: selectedCustomer?.id === 'NEW' ? selectedCustomer.name : undefined,
            customerType: selectedCustomer?.customer_type || 'RETAIL',
            customerPhone: selectedCustomer?.phone || undefined,
            discount,
            amountPaid: paid,
            subtotal,
            netTotal,
            paymentMethod
        }

        if (!navigator.onLine) {
            const pending = JSON.parse(localStorage.getItem('mybizz_offline_sales') || '[]')
            pending.push(payload)
            localStorage.setItem('mybizz_offline_sales', JSON.stringify(pending))
            setCompletedBill({ ...payload, id: `OFFL-${Date.now().toString().slice(-4)}`, customer: selectedCustomer, cart, subtotal, netTotal, paid, newUdhaari: prevUdhaari + (netTotal - paid > 0 ? netTotal - paid : 0), paymentMethod })
            setCart([]); setSelectedCustomer(null); setDiscount(0); setAmountReceived('')
            setModalAction('print')
            return
        }

        // 0.0s ZERO-LATENCY INSTANT CHECKOUT (Zero waiting time for cashier)
        const currentCart = [...cart]
        const currentCust = selectedCustomer
        const currentSubtotal = subtotal
        const currentDiscount = discount
        const currentNetTotal = netTotal
        const currentPaid = paid
        const currentNewUdhaari = newUdhaari
        const currentPaymentMethod = paymentMethod
        const tempId = `INV-T${Date.now().toString().slice(-4)}`

        setCompletedBill({
            id: tempId,
            customer: currentCust,
            cart: currentCart,
            subtotal: currentSubtotal,
            discount: currentDiscount,
            netTotal: currentNetTotal,
            totalPayable: currentNetTotal + (currentCust ? parseFloat(currentCust.old_balance || '0') : 0),
            paid: currentPaid,
            newUdhaari: currentNewUdhaari,
            paymentMethod: currentPaymentMethod
        })
        setCart([])
        setSelectedCustomer(null)
        setDiscount(0)
        setAmountReceived('')
        setModalAction('print')

        // Asynchronously persist to database in background (<300ms batched query)
        fetch('/api/erp/pos/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(async (res) => {
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'Server error')
                if (data.invoiceId) {
                    setCompletedBill((prev: any) => prev ? { ...prev, ...data, id: data.invoiceId } : prev)
                }
                triggerLiveSync(shop?.id)
            })
            .catch((e: any) => {
                console.error('POS Checkout Sync Warning:', e)
                const pending = JSON.parse(localStorage.getItem('mybizz_offline_sales') || '[]')
                pending.push(payload)
                localStorage.setItem('mybizz_offline_sales', JSON.stringify(pending))
            })
    }

    // Global Keyboard Hooks
    useEffect(() => {
        const handleKeyDown = (e: globalThis.KeyboardEvent) => {
            if (completedBill) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setModalAction(prev => prev === 'print' ? 'new' : 'print')
                } else if (e.key === 'Enter') {
                    e.preventDefault()
                    if (modalAction === 'print') {
                        window.print()
                    } else {
                        setCompletedBill(null)
                    }
                }
            } else if (e.key === 'F10') {
                e.preventDefault()
                if (!isSubmitting && cart.length > 0) {
                    handleCheckout()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [cart, selectedCustomer, isSubmitting, completedBill, discount, paid, modalAction])

    // Receipt Dictionary
    const dLang = {
        ENG: {
            title: "BILL",
            sn: "Sr.No", item: "ITEM", qty: "QTY", rate: "RATE", total: "TOTAL",
            subtotal: "Current Bill", oldDue: "Old Due", netPayable: "Total Payable",
            amountPaid: "Amount Paid", newDueAdded: "New Udhaari Added",
            date: "Date", billNo: "Bill No",
            thanks: "Thank you for your business!"
        },
        MAR: {
            title: "पावती",
            sn: "क्र", item: "तपशील", qty: "संख्या", rate: "दर", total: "रक्कम",
            subtotal: "आजचे बिल", oldDue: "मागील बाकी", netPayable: "एकूण देय",
            amountPaid: "जमा रक्कम", newDueAdded: "नवीन बाकी",
            date: "दिनांक", billNo: "बिल क्र.",
            thanks: "भेट दिल्याबद्दल धन्यवाद!"
        }
    }[receiptLang]

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full print:block print:h-auto pb-12 lg:pb-0">
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

            {/* LEFT: Product Search + Cart */}
            <div className="flex-1 flex flex-col gap-4 print:hidden">
                {/* Product Search */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm relative z-50 overflow-visible">
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-bold text-xs tracking-wider text-slate-700 uppercase">
                                Autonomous Pricing Engine
                            </span>
                            {selectedCustomer?.customer_type === 'WHOLESALE' ? (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                    🏷️ Wholesale B2B Party Active
                                </span>
                            ) : isWholesaleMode ? (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                                    ⚡ Manual B2B Override
                                </span>
                            ) : (
                                <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                                    Slabs: Auto B2B on ≥ Min Qty
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {isWholesaleMode ? (
                                <button
                                    onClick={() => setIsWholesaleMode(false)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1"
                                    title="Disable manual override and return to auto tiering"
                                >
                                    <X className="w-3 h-3" /> Reset to Auto
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsWholesaleMode(true)}
                                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 transition-all"
                                    title="Force wholesale rate for walk-in retail customer"
                                >
                                    Force B2B Rate
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="p-3 border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                tabIndex={1}
                                ref={searchRef}
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault()
                                        setSelectedProdIdx(prev => Math.min(prev + 1, Math.min(filteredProducts.length, 10) - 1))
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault()
                                        setSelectedProdIdx(prev => Math.max(prev - 1, 0))
                                    } else if (e.key === 'Enter') {
                                        e.preventDefault()
                                        if (e.ctrlKey) {
                                            customerSearchRef.current?.focus()
                                        } else if (search && filteredProducts.length > 0) {
                                            prepareItem(filteredProducts[selectedProdIdx] || filteredProducts[0])
                                        } else if (!search) {
                                            customerSearchRef.current?.focus()
                                        }
                                    }
                                }}
                                placeholder="Search products by name... (Use Arrow Keys)"
                                className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-[14px] font-medium outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                            />
                        </div>
                    </div>
                    {search && !stagingProduct && (
                        <div className="absolute top-full left-0 right-0 max-h-56 overflow-y-auto bg-white border border-slate-200 z-50 rounded-xl shadow-lg mt-1">
                            {filteredProducts.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-[13px]">No products found</div>
                            ) : filteredProducts.slice(0, 10).map((p, idx) => (
                                <button key={p.id} onClick={() => prepareItem(p)} className={`w-full flex items-center justify-between px-4 py-3 border-b border-slate-50 text-left transition-colors group ${selectedProdIdx === idx ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}>
                                    <div>
                                        <p className="text-[14px] font-semibold text-slate-800">{p.name}</p>
                                        <p className="text-[12px] text-slate-400">Stock: {p.stock}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[14px] font-bold text-indigo-600">₹{parseFloat(p.sell_rate).toFixed(2)}</p>
                                        <p className="text-[11px] text-emerald-700 font-semibold">
                                            WH: ₹{parseFloat(p.wholesale_rate || p.sell_rate).toFixed(2)} (≥{p.min_wholesale_qty || 12})
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                </div>

                {/* Cart */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-indigo-500" />
                        <h2 className="font-bold text-[14px] text-slate-800">Active Cart ({cart.length} items)</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex items-center justify-center h-full p-8 text-center text-slate-400">
                                <p className="text-[13px]">Cart is empty. Search for a product above.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Product</th>
                                        <th className="px-4 py-2 text-center">Qty</th>
                                        <th className="px-4 py-2 text-right">Rate (₹)</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {cart.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">
                                                <div className="font-bold">{item.name}</div>
                                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                    {item.tierReason === 'WHOLESALE_PARTY' && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            🏷️ B2B Party
                                                        </span>
                                                    )}
                                                    {item.tierReason === 'BULK_SLAB' && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                                            📦 Bulk Slab (≥{item.min_wholesale_qty || 12})
                                                        </span>
                                                    )}
                                                    {item.isManualPrice && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                            ✏️ Custom Rate
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><Minus className="w-4 h-4" /></button>
                                                    <input id={`qty-input-${item.id}`} type="number" value={item.qty === 0 ? '' : item.qty} placeholder="0" onFocus={e => e.target.select()} onChange={e => { const v = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0; setQty(item.id, v) }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`rate-input-${item.id}`)?.focus() } }} className="text-[16px] font-black w-24 text-center border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 py-1 bg-white shadow-inner" />
                                                    <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><Plus className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input id={`rate-input-${item.id}`} type="number" value={item.rate} onFocus={e => e.target.select()} onChange={e => updateRate(item.id, parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchRef.current?.focus() } }} className="w-28 border-2 border-slate-200 rounded-lg text-[16px] font-black text-right px-3 py-1 ml-auto block focus:border-indigo-500 outline-none bg-white shadow-inner" />
                                            </td>
                                            <td className="px-4 py-3 text-[16px] font-black text-slate-800 text-right">₹{(item.qty * item.rate).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT: Customer + Billing Panel */}
            <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">

                {/* Customer Select */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-visible">
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" />
                            <h3 className="font-bold text-[13px] text-slate-800">Buyer Selection</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setNewCustName(customerSearch)
                                setIsAddCustModalOpen(true)
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> + New Buyer
                        </button>
                    </div>
                    <div className="p-3">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3.5 shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-[14px] text-indigo-950">{selectedCustomer.name}</p>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${selectedCustomer.customer_type === 'WHOLESALE'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                            : 'bg-slate-200 text-slate-700'
                                            }`}>
                                            {selectedCustomer.customer_type === 'WHOLESALE' ? '🏷️ Wholesale B2B' : 'Retail'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                                        {selectedCustomer.phone && <span>📞 {selectedCustomer.phone}</span>}
                                        <span className="text-rose-600 font-bold">Due: ₹{parseFloat(selectedCustomer.old_balance || '0').toFixed(2)}</span>
                                    </div>
                                    {selectedCustomer.customer_type === 'WHOLESALE' && (
                                        <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                            ✓ Tiered Wholesale Rates Auto-Applied
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                                    title="Deselect Customer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="relative z-50">
                                <div className="relative flex items-center">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input
                                        tabIndex={2}
                                        ref={customerSearchRef}
                                        value={customerSearch}
                                        onFocus={() => setIsCustDropdownOpen(true)}
                                        onClick={() => setIsCustDropdownOpen(true)}
                                        onChange={e => {
                                            setCustomerSearch(e.target.value)
                                            setIsCustDropdownOpen(true)
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                if (e.ctrlKey) {
                                                    discountRef.current?.focus()
                                                } else if (filteredCustomers.length > 0) {
                                                    setSelectedCustomer(filteredCustomers[0])
                                                    setCustomerSearch('')
                                                    setIsCustDropdownOpen(false)
                                                    discountRef.current?.focus()
                                                } else if (customerSearch) {
                                                    setNewCustName(customerSearch)
                                                    setIsAddCustModalOpen(true)
                                                } else {
                                                    discountRef.current?.focus()
                                                }
                                            }
                                        }}
                                        placeholder="Search buyer by name or phone..."
                                        className="w-full pl-8 pr-8 h-10 border border-slate-200 rounded-xl text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    />
                                    {customerSearch ? (
                                        <button onClick={() => setCustomerSearch('')} className="absolute right-2.5 text-slate-400 hover:text-slate-600">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    )}
                                </div>

                                {isCustDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsCustDropdownOpen(false)} />
                                        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                                            {filteredCustomers.length === 0 ? (
                                                <div className="p-3 text-center">
                                                    <p className="text-[12px] text-slate-500 mb-2 font-medium">No buyers matching &quot;{customerSearch}&quot;</p>
                                                    <button
                                                        onClick={() => {
                                                            setNewCustName(customerSearch)
                                                            setIsCustDropdownOpen(false)
                                                            setIsAddCustModalOpen(true)
                                                        }}
                                                        className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[12px] rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <UserPlus className="w-3.5 h-3.5" /> + Onboard &quot;{customerSearch}&quot; with B2B/Retail Tier
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-1">
                                                        {filteredCustomers.slice(0, 15).map((c, idx) => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setSelectedCustomer(c)
                                                                    setCustomerSearch('')
                                                                    setIsCustDropdownOpen(false)
                                                                    setSelectedCustIdx(0)
                                                                }}
                                                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${selectedCustIdx === idx ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[13px] font-bold text-slate-900">{c.name}</span>
                                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${c.customer_type === 'WHOLESALE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                                                            }`}>
                                                                            {c.customer_type === 'WHOLESALE' ? '🏷️ B2B Wholesale' : 'Retail'}
                                                                        </span>
                                                                    </div>
                                                                    {c.phone && <p className="text-[11px] text-slate-400 mt-0.5">📞 {c.phone}</p>}
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="text-[11px] text-rose-500 font-bold block font-mono">
                                                                        ₹{parseFloat(c.old_balance || '0').toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="p-2 bg-slate-50 border-t border-slate-100">
                                                        <button
                                                            onClick={() => {
                                                                setNewCustName(customerSearch)
                                                                setIsCustDropdownOpen(false)
                                                                setIsAddCustModalOpen(true)
                                                            }}
                                                            className="w-full py-1.5 text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" /> + Add New Buyer with Custom Slabs
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bill Summary */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 flex-1">
                    <h3 className="font-bold text-[14px] text-slate-800 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-indigo-500" />Bill Summary</h3>

                    <div className="space-y-2.5 text-[13px]">
                        <div className="flex justify-between font-medium text-slate-600">
                            <span>Subtotal (एकूण)</span><span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center font-medium text-slate-600">
                            <span>Discount (सूट)</span>
                            <div className="relative w-24">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                                <input
                                    tabIndex={3}
                                    ref={discountRef}
                                    type="number"
                                    value={discount || ''}
                                    onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            amountRef.current?.focus()
                                        }
                                    }}
                                    placeholder="0"
                                    className="w-full pl-5 pr-2 py-1 border border-slate-200 rounded-lg text-right text-[13px] font-bold focus:border-rose-400 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between font-bold text-slate-700 text-[13px] border-t border-dashed border-slate-200 pt-2.5">
                            <span>Current Bill (चालू बिल)</span><span className="text-slate-900 font-extrabold">₹{netTotal.toFixed(2)}</span>
                        </div>
                        {selectedCustomer && prevUdhaari > 0 && (
                            <div className="flex justify-between font-bold text-slate-700 text-[13px]">
                                <span>Old Udhaari (मागील बाकी)</span>
                                <span className="text-rose-600 font-extrabold">₹{prevUdhaari.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-black text-slate-900 text-[16px] border-t border-slate-200 pt-2.5">
                            <span>Total Payable (एकूण देय)</span><span className="text-indigo-700 font-black">₹{totalPayable.toFixed(2)}</span>
                        </div>
                    </div>

                    {selectedCustomer && (
                        <div className={`p-3 rounded-xl border text-[12px] font-semibold flex justify-between items-center ${newUdhaari > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                            <span>Prev Udhaari: ₹{prevUdhaari.toFixed(2)}</span>
                            <span>→</span>
                            <span className="font-black">New Balance: ₹{newUdhaari.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Amount Received (मिळालेली रक्कम)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                            <input
                                tabIndex={4}
                                ref={amountRef}
                                type="number"
                                value={amountReceived}
                                onChange={e => setAmountReceived(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCheckout() // Direct Fast Checkout Requirement
                                    }
                                }}
                                placeholder="0.00"
                                className="w-full pl-7 pr-4 h-12 border-2 border-slate-200 rounded-xl text-[18px] font-black focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                            />
                        </div>
                        {paid > 0 && (
                            <div className="flex justify-between items-center text-[13px] font-bold pt-1">
                                {selectedCustomer ? (
                                    <>
                                        <span className={newUdhaari > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                            {newUdhaari > 0 ? `Remaining Udhaari: ₹${newUdhaari.toFixed(2)}` : '✓ Cleared! (हिशोब पूर्ण)'}
                                        </span>
                                        {change > 0 && (
                                            <span className="text-emerald-600 font-black">Change: ₹{change.toFixed(2)}</span>
                                        )}
                                    </>
                                ) : (
                                    <p className={change >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                        {change >= 0 ? `Change: ₹${change.toFixed(2)}` : `Udhaari: ₹${Math.abs(change).toFixed(2)}`}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-4">
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
                            <button
                                ref={previewBtnRef}
                                onClick={() => setShowPreview(true)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setShowPreview(true) } }}
                                className="w-1/3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 border border-blue-200 bg-white px-3 h-12 rounded-xl hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 transition-colors uppercase tracking-widest"
                            >
                                <Eye className="w-4 h-4" /> Preview
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={isSubmitting || cart.length === 0}
                                className="w-2/3 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 tracking-wide"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                {isSubmitting ? 'Processing...' : 'Complete Phase (F10)'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill Success Modal (simplified) */}
            <AnimatePresence>
                {
                    completedBill && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCompletedBill(null)} />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative z-10 bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Sale Complete!</h2>
                                <p className="text-slate-500 text-[14px] mt-1">Bill has been saved to database.</p>
                                <div className="mt-6 bg-slate-50 rounded-2xl p-4 text-left space-y-2">
                                    <div className="flex justify-between text-[14px]"><span className="text-slate-500">Total</span><span className="font-bold">₹{completedBill.netTotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-[14px]"><span className="text-slate-500">Received</span><span className="font-bold text-emerald-600">₹{completedBill.paid.toFixed(2)}</span></div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => window.print()} className={`flex-1 h-11 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${modalAction === 'print' ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30' : 'bg-slate-100 text-slate-500'}`}>
                                        <Printer className="w-4 h-4" /> Print (Enter)
                                    </button>
                                    <button onClick={() => setCompletedBill(null)} className={`flex-1 h-11 font-semibold rounded-xl transition-all ${modalAction === 'new' ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30' : 'bg-slate-100 text-slate-500'}`}>New Bill (Enter)</button>
                                </div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mt-4 tracking-widest">Use ← / → Arrows to select</p>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence>

            {/* Quick Add Buyer Modal */}
            <AnimatePresence>
                {isAddCustModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !isSavingCustomer && setIsAddCustModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-100"
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900">Onboard Buyer</h3>
                                        <p className="text-xs text-slate-500">Configure party classification & pricing slabs</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !isSavingCustomer && setIsAddCustModalOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleQuickAddCustomer} className="mt-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                        Buyer / Party Name *
                                    </label>
                                    <input
                                        autoFocus
                                        required
                                        type="text"
                                        value={newCustName}
                                        onChange={e => setNewCustName(e.target.value)}
                                        placeholder="e.g. Ramesh Kirana / Jaydeep Patel"
                                        className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                        Mobile / WhatsApp Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={newCustPhone}
                                        onChange={e => setNewCustPhone(e.target.value)}
                                        placeholder="e.g. 9876543210"
                                        className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                        Party Type / Pricing Tier *
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setNewCustType('RETAIL')}
                                            className={`p-3 rounded-xl border text-left transition-all ${newCustType === 'RETAIL'
                                                ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                        >
                                            <p className="font-bold text-xs text-slate-900">Standard Retail</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Sells at standard retail price</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewCustType('WHOLESALE')}
                                            className={`p-3 rounded-xl border text-left transition-all ${newCustType === 'WHOLESALE'
                                                ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                        >
                                            <p className="font-bold text-xs text-emerald-900 flex items-center gap-1">
                                                🏷️ Wholesale B2B
                                            </p>
                                            <p className="text-[10px] text-emerald-700 mt-0.5">Auto-applies B2B wholesale rates</p>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                        Opening Udhaari / Due (₹)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newCustBalance}
                                        onChange={e => setNewCustBalance(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                <div className="pt-3 flex gap-3">
                                    <button
                                        type="button"
                                        disabled={isSavingCustomer}
                                        onClick={() => setIsAddCustModalOpen(false)}
                                        className="flex-1 h-11 font-bold text-xs uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingCustomer}
                                        className="flex-1 h-11 font-bold text-xs uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        {isSavingCustomer ? 'Saving...' : 'Save & Select'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="hidden print:block print-section">
                <SharedThermalReceipt
                    variant="sale"
                    language={receiptLang}
                    shopInfo={shop || { name: 'YOUR SHOP NAME' }}
                    billRef={completedBill?.invoice_no ? `INV-S${completedBill.invoice_no.toString().padStart(4, '0')}` : completedBill?.id}
                    customerOrSupplierName={completedBill?.customer?.name || selectedCustomer?.name}
                    cart={completedBill?.cart || cart}
                    subtotal={completedBill?.subtotal || subtotal}
                    discount={discount}
                    oldDue={completedBill ? (parseFloat(completedBill.customer?.old_balance || '0')) : prevUdhaari}
                    netPayable={completedBill ? (completedBill.netTotal + (parseFloat(completedBill.customer?.old_balance || '0'))) : totalPayable}
                    amountPaid={completedBill?.paid || paid}
                    newDueAdded={completedBill?.newUdhaari ?? newUdhaari}
                    paymentMethod={completedBill?.paymentMethod || paymentMethod}
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
                                    variant="sale"
                                    language={receiptLang}
                                    shopInfo={shop || { name: 'YOUR SHOP NAME' }}
                                    billRef={completedBill?.invoice_no ? `INV-S${completedBill.invoice_no.toString().padStart(4, '0')}` : (completedBill?.id || previewBillNo)}
                                    customerOrSupplierName={selectedCustomer?.name}
                                    cart={cart}
                                    subtotal={subtotal}
                                    discount={discount}
                                    oldDue={prevUdhaari}
                                    netPayable={totalPayable}
                                    amountPaid={paid}
                                    newDueAdded={newUdhaari}
                                    paymentMethod={completedBill?.paymentMethod || paymentMethod}
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
