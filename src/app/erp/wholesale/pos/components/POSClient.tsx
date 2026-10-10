'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Minus, Trash2, ShoppingCart, User, IndianRupee, Printer, CheckCircle2, X, Eye } from 'lucide-react'
import SharedThermalReceipt from '../../components/SharedThermalReceipt'

interface Product { id: string; name: string; name_mr: string | null; stock: number; sell_rate: string; wholesale_rate: string; buy_rate: string | null }
interface Customer { id: string; name: string; phone: string | null; old_balance: string }
interface CartItem extends Product { qty: number; rate: number }

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
    const [showHUD, setShowHUD] = useState(true)
    const [previewBillNo, setPreviewBillNo] = useState('')
    const [modalAction, setModalAction] = useState<'print' | 'new'>('print')

    const [stagingProduct, setStagingProduct] = useState<Product | null>(null)
    const [stagingQty, setStagingQty] = useState('1')
    const [stagingRate, setStagingRate] = useState('')
    const stagingQtyRef = useRef<HTMLInputElement>(null)
    const stagingRateRef = useRef<HTMLInputElement>(null)

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
    const [isWholesaleMode, setIsWholesaleMode] = useState(false) // Default Retail
    const searchRef = useRef<HTMLInputElement>(null)
    const customerSearchRef = useRef<HTMLInputElement>(null)
    const discountRef = useRef<HTMLInputElement>(null)
    const amountRef = useRef<HTMLInputElement>(null)
    const previewBtnRef = useRef<HTMLButtonElement>(null)

    const searchTerms = search.toLowerCase().split(' ').filter(Boolean)
    const filteredProducts = products.filter(p => searchTerms.every(term => p.name.toLowerCase().includes(term)))
    const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch)))

    const subtotal = cart.reduce((s, i) => s + i.qty * i.rate, 0)
    const netTotal = subtotal - discount
    const prevUdhaari = selectedCustomer ? parseFloat(selectedCustomer.old_balance) : 0
    const paid = parseFloat(amountReceived) || 0
    const change = paid - netTotal
    const newUdhaari = prevUdhaari + (netTotal - paid > 0 ? netTotal - paid : 0)

    function prepareItem(product: Product) {
        setCart(prev => {
            const exists = prev.find(i => i.id === product.id)
            if (exists) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
            return [...prev, { ...product, qty: 1, rate: parseFloat(isWholesaleMode ? (product.wholesale_rate || product.sell_rate) : product.sell_rate) }]
        })
        setSearch('')
        setSelectedProdIdx(0)
        setTimeout(() => document.getElementById(`qty-input-${product.id}`)?.focus(), 50)
    }

    // Auto-recalculate cart prices when mode is violently switched
    useEffect(() => {
        setCart(prev => prev.map(item => ({
            ...item,
            rate: parseFloat(isWholesaleMode ? (item.wholesale_rate || item.sell_rate) : item.sell_rate)
        })))
    }, [isWholesaleMode])

    function setQty(id: string, qty: number) {
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, qty) } : i))
    }
    function updateQty(id: string, delta: number) {
        setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i).filter(i => i.qty > 0))
    }
    function removeItem(id: string) { setCart(p => p.filter(i => i.id !== id)) }
    function updateRate(id: string, rate: number) { setCart(prev => prev.map(i => i.id === id ? { ...i, rate } : i)) }

    async function handleCheckout() {
        if (isSubmitting) return
        if (cart.length === 0) return alert('Cart is empty.')
        const payload = {
            cart,
            customerId: selectedCustomer?.id || null,
            customerName: selectedCustomer?.id === 'NEW' ? selectedCustomer.name : undefined,
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
            setCompletedBill({ ...payload, id: `OFFL-${Date.now()}`, customer: selectedCustomer, netTotal, paid, newUdhaari: prevUdhaari + (netTotal - paid > 0 ? netTotal - paid : 0) })
            setCart([]); setSelectedCustomer(null); setDiscount(0); setAmountReceived('')
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/erp/pos/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Unknown error')
            const resData = data // store if needed
            setCompletedBill({ ...data, customer: selectedCustomer, cart, netTotal, paid, newUdhaari, paymentMethod })
            setCart([]); setSelectedCustomer(null); setDiscount(0); setAmountReceived('')
            setModalAction('print') // Default to print
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSubmitting(false)
        }
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
        <div className="flex flex-col lg:flex-row gap-6 h-full print:block print:h-auto">
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
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-xs tracking-widest text-slate-500 uppercase">Pricing Mode</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-200/50 rounded-lg p-1 border border-slate-200 shadow-inner">
                            <button onClick={() => setIsWholesaleMode(false)} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all ${!isWholesaleMode ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}>Retail</button>
                            <button onClick={() => setIsWholesaleMode(true)} className={`px-4 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-all ${isWholesaleMode ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>B2B Wholesale</button>
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
                                        <p className="text-[11px] text-slate-400">WH: ₹{parseFloat(p.wholesale_rate).toFixed(2)}</p>
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
                                            <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{item.name}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 justify-center">
                                                    <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"><Minus className="w-4 h-4" /></button>
                                                    <input id={`qty-input-${item.id}`} type="number" value={item.qty} onFocus={e => e.target.select()} onChange={e => setQty(item.id, parseFloat(e.target.value) || 1)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById(`rate-input-${item.id}`)?.focus() } }} className="text-[16px] font-black w-24 text-center border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500 py-1 bg-white shadow-inner" />
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
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-bold text-[14px] text-slate-800">Buyer Selection</h3>
                    </div>
                    <div className="p-3">
                        {selectedCustomer ? (
                            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                                <div>
                                    <p className="font-bold text-[14px] text-indigo-900">{selectedCustomer.name}</p>
                                    <p className="text-[12px] text-indigo-600 font-medium">Udhaari: ₹{parseFloat(selectedCustomer.old_balance).toFixed(2)}</p>
                                </div>
                                <button onClick={() => setSelectedCustomer(null)} className="text-indigo-400 hover:text-indigo-700"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div className="relative z-50">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    tabIndex={2}
                                    ref={customerSearchRef}
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            if (e.ctrlKey) {
                                                discountRef.current?.focus()
                                            } else if (customerSearch && filteredCustomers.length > 0) {
                                                setSelectedCustomer(filteredCustomers[0])
                                                setCustomerSearch('')
                                                discountRef.current?.focus()
                                            } else if (customerSearch && filteredCustomers.length === 0) {
                                                setSelectedCustomer({ id: 'NEW', name: customerSearch, phone: '', old_balance: '0' })
                                                setCustomerSearch('')
                                                discountRef.current?.focus()
                                            } else if (!customerSearch) {
                                                discountRef.current?.focus()
                                            }
                                        }
                                    }}
                                    placeholder="Search buyer or add new..."
                                    className="w-full pl-8 pr-4 h-10 border border-slate-200 rounded-xl text-[13px] outline-none focus:border-indigo-500 transition-all"
                                />
                                {customerSearch && (
                                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                        {filteredCustomers.length === 0 ? (
                                            <button onClick={() => { setSelectedCustomer({ id: 'NEW', name: customerSearch, phone: '', old_balance: '0' }); setCustomerSearch('') }} className="w-full text-left p-3 text-[12px] text-indigo-600 font-bold hover:bg-slate-50 transition-colors">
                                                + Add '{customerSearch}' as Walk-in
                                            </button>
                                        ) : (
                                            <>
                                                {filteredCustomers.slice(0, 5).map((c, idx) => (
                                                    <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setSelectedCustIdx(0) }} className={`w-full text-left px-3 py-2 transition-colors border-b border-slate-50 ${selectedCustIdx === idx ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}>
                                                        <p className="text-[13px] font-semibold text-slate-800">{c.name}</p>
                                                        <p className="text-[11px] text-rose-500 font-medium">Due: ₹{parseFloat(c.old_balance).toFixed(2)}</p>
                                                    </button>
                                                ))}
                                                <button onClick={() => { setSelectedCustomer({ id: 'NEW', name: customerSearch, phone: '', old_balance: '0' }); setCustomerSearch('') }} className="w-full text-left p-2 text-[11px] text-indigo-500 font-bold hover:bg-slate-50 border-t border-slate-100">
                                                    + Or Add '{customerSearch}' as Walk-in
                                                </button>
                                            </>
                                        )}
                                    </div>
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
                            <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center font-medium text-slate-600">
                            <span>Discount</span>
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
                        <div className="flex justify-between font-black text-slate-900 text-[16px] border-t border-dashed border-slate-200 pt-2.5">
                            <span>Net Total</span><span className="text-indigo-700">₹{netTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    {selectedCustomer && prevUdhaari > 0 && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-[12px] font-medium text-rose-700">
                            Prev Udhaari: ₹{prevUdhaari.toFixed(2)} → New balance: ₹{newUdhaari.toFixed(2)}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Amount Received</label>
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
                            <p className={`text-[13px] font-bold ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {change >= 0 ? `Change: ₹${change.toFixed(2)}` : `Udhaari: ₹${Math.abs(change).toFixed(2)}`}
                            </p>
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
                {completedBill && (
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
                    oldDue={completedBill ? (parseFloat(completedBill.customer?.old_balance) || 0) : prevUdhaari}
                    netPayable={completedBill?.netTotal || (netTotal + prevUdhaari)}
                    amountPaid={completedBill?.paid || paid}
                    newDueAdded={completedBill?.newUdhaari || newUdhaari}
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
                                    netPayable={netTotal + prevUdhaari}
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
            {/* Keyboard Shortcuts HUD */}
            <AnimatePresence>
                {showHUD && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed bottom-6 right-6 hidden xl:block z-[9999] pointer-events-auto print:hidden">
                        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-4 shadow-2xl relative">
                            <button onClick={() => setShowHUD(false)} className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-rose-500 rounded-full p-1 transition-colors"><X className="w-3 h-3" /></button>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center border-b border-slate-800 pb-2">Keyboard Navigation</p>
                            <div className="space-y-2 text-[11px] font-mono text-slate-300">
                                <div className="flex justify-between items-center gap-6"><span>Product Add</span><span className="bg-slate-800 text-indigo-400 px-2 py-0.5 rounded font-bold">ENTER</span></div>
                                <div className="flex justify-between items-center gap-6"><span>Grid Nav / Mod</span><span className="bg-slate-800 text-emerald-400 px-2 py-0.5 rounded font-bold">TAB</span></div>
                                <div className="flex justify-between items-center gap-6"><span>Direct Print</span><span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-bold">CTRL + P</span></div>
                                <div className="flex justify-between items-center gap-6"><span>Customer Skip</span><span className="bg-slate-800 text-rose-400 px-2 py-0.5 rounded font-bold">CTRL + ENTER</span></div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
