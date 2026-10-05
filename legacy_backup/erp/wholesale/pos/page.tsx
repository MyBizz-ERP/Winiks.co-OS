'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { openDB } from 'idb'
import { User, X, Printer, MessageCircle, FileText, Eye, Loader2 } from 'lucide-react'
import ReceiptPreview from './ReceiptPreview'
import { useRouter } from 'next/navigation'

// Next.js 15 requires async params
export default function WholesalePOS() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [offline, setOffline] = useState(false)
    const [products, setProducts] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])

    // Search state for Products
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Selection state for Customers
    const [customerSearch, setCustomerSearch] = useState('')
    const [custSearchResults, setCustSearchResults] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)

    // Checkout Routing & UI State
    const [shopInfo, setShopInfo] = useState<any | null>(null)
    const [outputRoute, setOutputRoute] = useState<'thermal' | 'a4' | 'whatsapp'>('thermal')
    const [language, setLanguage] = useState<'en' | 'mr'>('mr')
    const [attachGMB, setAttachGMB] = useState(true)
    const [amountReceived, setAmountReceived] = useState<string>('')
    const [discount, setDiscount] = useState<number>(0)
    const [showPreview, setShowPreview] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [currentInvoiceStr, setCurrentInvoiceStr] = useState('')

    // Cart state with persistence
    const [cart, setCart] = useState<any[]>([])

    // Refs for keyboard focus
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // 1. Initialize DB and sync on mount
        async function initDB() {
            const db = await openDB('winiks_pos', 1, {
                upgrade(db) {
                    db.createObjectStore('products', { keyPath: 'id' })
                    db.createObjectStore('customers', { keyPath: 'id' })
                    db.createObjectStore('pending_invoices', { keyPath: 'local_id', autoIncrement: true })
                },
            })

            // Try fetching fresh data from Supabase
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: shop } = await supabase.from('shops').select('id, shop_name, address, phone_number').eq('owner_id', user.id).single()
                    if (shop) {
                        setShopInfo(shop)

                        // Sync Offline Queue First
                        const pTx = db.transaction('pending_invoices', 'readwrite')
                        const pending = await pTx.objectStore('pending_invoices').getAll()
                        for (const inv of pending) {
                            const { error } = await supabase.rpc('wh_complete_pos_transaction', inv.payload)
                            if (!error) {
                                const delTx = db.transaction('pending_invoices', 'readwrite')
                                await delTx.objectStore('pending_invoices').delete(inv.local_id)
                            }
                        }

                        // Get fresh products and customers via RPC
                        const { data: pData } = await supabase.rpc('wh_get_products', { p_shop_id: shop.id })
                        const { data: cData } = await supabase.rpc('wh_get_customers', { p_shop_id: shop.id })

                        // Save to IndexedDB
                        const tx = db.transaction(['products', 'customers'], 'readwrite')
                        if (pData) pData.forEach((p: any) => tx.objectStore('products').put(p))
                        if (cData) cData.forEach((c: any) => tx.objectStore('customers').put(c))
                        await tx.done
                        setOffline(false)
                    }
                }
            } catch (err) {
                console.warn('Network error, falling back to local POS cache', err)
                setOffline(true)
            }

            // 2. Load from IndexedDB into memory for INSTANT search
            const tx2 = db.transaction(['products', 'customers'], 'readonly')
            const localProducts = await tx2.objectStore('products').getAll()
            const localCustomers = await tx2.objectStore('customers').getAll()

            setProducts(localProducts)
            setCustomers(localCustomers)

            // 3. Load Active Session from LocalStorage
            try {
                const savedCart = localStorage.getItem('mybizz_pos_cart')
                const savedCust = localStorage.getItem('mybizz_pos_cust')
                if (savedCart) setCart(JSON.parse(savedCart))
                if (savedCust) setSelectedCustomer(JSON.parse(savedCust))
            } catch (e) { console.warn('Failed to load session cache') }

            setLoading(false)

            // Auto-focus search
            setTimeout(() => searchInputRef.current?.focus(), 100)
        }

        initDB()
    }, [])

    // Handle high-speed keyboard Search
    useEffect(() => {
        if (!searchQuery) {
            setSearchResults([])
            return
        }

        const query = searchQuery.toLowerCase()
        const results = products.filter(p =>
            p.name.toLowerCase().includes(query) || (p.barcode && p.barcode.toLowerCase().includes(query))
        ).slice(0, 10) // show max 10 results at a time

        setSearchResults(results)
        setSelectedIndex(0)
    }, [searchQuery, products])

    // Save to LocalStorage to prevent F5 data loss
    useEffect(() => {
        if (loading) return
        localStorage.setItem('mybizz_pos_cart', JSON.stringify(cart))
        localStorage.setItem('mybizz_pos_cust', JSON.stringify(selectedCustomer))
    }, [cart, selectedCustomer, loading])

    // Global Keyboard Shortcuts
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // F2: Focus Search
            if (e.key === 'F2') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }

            // F4: Print Receipt Trigger
            if (e.key === 'F4') {
                e.preventDefault()
                e.stopPropagation()
                handleCheckout('thermal')
            }

            // F8: WhatsApp Bill Trigger
            if (e.key === 'F8') {
                e.preventDefault()
                e.stopPropagation()
                handleCheckout('whatsapp')
            }

            // F10: Complete Sale
            if (e.key === 'F10') {
                e.preventDefault()
                e.stopPropagation()
                handleCheckout()
            }

            // Arrow navigation in search results
            if (e.key === 'ArrowDown' && searchResults.length > 0) {
                e.preventDefault()
                setSelectedIndex(prev => (prev + 1) % searchResults.length)
            }
            if (e.key === 'ArrowUp' && searchResults.length > 0) {
                e.preventDefault()
                setSelectedIndex(prev => (prev - 1 + searchResults.length) % searchResults.length)
            }

            // Note: Enter adding to cart is no longer on keydown to prevent double-jumping!
            // It has been entirely moved to the Search Input's native onKeyUp handler.
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [searchResults, selectedIndex, cart, selectedCustomer, outputRoute, amountReceived, isProcessing])

    async function handleCheckout(overrideMode?: 'thermal' | 'a4' | 'whatsapp') {
        if (cart.length === 0) return alert("Cart is empty!")
        if (isProcessing) return

        setIsProcessing(true)

        const modeToRun = overrideMode || outputRoute
        const oldDue = selectedCustomer?.total_credit || 0
        const grandTotal = cart.reduce((sum, item) => sum + item.total, 0)
        const netPayable = grandTotal + oldDue
        const paid = amountReceived ? parseFloat(amountReceived) : netPayable
        const newUdhaariAdded = Math.max(0, netPayable - paid)

        const totalCogs = cart.reduce((sum, item) => sum + ((item.buy_rate || 0) * item.qty), 0)

        const payload = {
            p_shop_id: shopInfo.id,
            p_customer_id: selectedCustomer?.id || null,
            p_customer_name: selectedCustomer?.name || 'Walk-in Cash Sale',
            p_subtotal: grandTotal,
            p_past_due: oldDue,
            p_grand_total: netPayable,
            p_amount_paid: paid,
            p_new_due_added: newUdhaariAdded,
            p_payment_mode: paid >= netPayable ? 'cash' : (paid > 0 ? 'partial' : 'udhaari'),
            p_cart: cart,
            p_total_cogs: totalCogs,
            p_discount: discount
        }

        const supabase = createClient()
        const db = await openDB('winiks_pos', 1)

        let shouldProcessLocalMath = true

        if (navigator.onLine) {
            const { error } = await supabase.rpc('wh_complete_pos_transaction', payload)
            if (error) {
                console.error("Database Sync Failed. Saving to offline queue.", error)
                await db.put('pending_invoices', { payload, created_at: new Date().toISOString() })
                setOffline(true)
            }
        } else {
            console.warn("Device is offline. Transaction saved safely to local queue.")
            await db.put('pending_invoices', { payload, created_at: new Date().toISOString() })
            setOffline(true)
        }

        // Complete the Local Math so UI updates instantly even if offline!
        const tx = db.transaction(['products', 'customers'], 'readwrite')
        const pStore = tx.objectStore('products')
        for (const item of cart) {
            const p = await pStore.get(item.product_id)
            if (p) {
                p.current_stock -= item.qty
                pStore.put(p)
            }
        }

        if (selectedCustomer && !selectedCustomer.id.startsWith('NEW_')) {
            const cStore = tx.objectStore('customers')
            const c = await cStore.get(selectedCustomer.id)
            if (c) {
                c.total_credit += newUdhaariAdded
                cStore.put(c)
            }
        }
        await tx.done

        // Generate Offline-safe sequential Bill Number
        const nextSeq = parseInt(localStorage.getItem('mybizz_bill_seq') || '0') + 1
        localStorage.setItem('mybizz_bill_seq', nextSeq.toString())
        const paddedSeq = nextSeq.toString().padStart(2, '0')
        const generatedInvoiceNo = `#INV-${paddedSeq}`
        setCurrentInvoiceStr(generatedInvoiceNo)

        if (modeToRun === 'thermal' || modeToRun === 'a4') {
            setShowPreview(true)
            setTimeout(() => {
                window.print()
                setShowPreview(false)
                resetCheckout()
            }, 300)
        } else if (modeToRun === 'whatsapp') {
            const dueText = newUdhaariAdded > 0 ? `\nNew Udhaari Added: Rs.${newUdhaariAdded}\nTotal Outstanding: Rs.${oldDue + newUdhaariAdded}` : ''
            const reviewText = shopInfo?.google_review_link ? `\n\n⭐ Kindly leave us a 5-Star Google Review here:\n${shopInfo.google_review_link}` : ''
            const text = `*New Invoice from ${shopInfo?.shop_name || 'MyBizz'}*\n\nTotal Amount: Rs.${netPayable}\nAmount Paid: Rs.${paid}${dueText}\n\nThank you for your business!${reviewText}`

            // Format phone to 91XXXXXXXXXX
            let phoneParam = ''
            if (selectedCustomer?.phone) {
                let cleaned = selectedCustomer.phone.replace(/\D/g, '')
                if (cleaned.length === 10) cleaned = '91' + cleaned
                phoneParam = cleaned
            }

            const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`
            window.open(url, '_blank')
            resetCheckout()
        }
    }

    function resetCheckout() {
        setCart([])
        setSelectedCustomer(null)
        setAmountReceived('')
        setDiscount(0)
        localStorage.removeItem('mybizz_pos_cart')
        localStorage.removeItem('mybizz_pos_cust')

        router.refresh() // Invalidate Next.js Server Cache so Dashboards auto-update
        setIsProcessing(false)

        setTimeout(async () => {
            const supabase = createClient()
            const { data: cData } = await supabase.rpc('wh_get_customers', { p_shop_id: shopInfo?.id })
            const db = await openDB('winiks_pos', 1)

            if (cData) {
                const tx = db.transaction('customers', 'readwrite')
                cData.forEach((c: any) => tx.objectStore('customers').put(c))
                await tx.done
            }

            const tx2 = db.transaction(['products', 'customers'], 'readonly')
            setProducts(await tx2.objectStore('products').getAll())
            setCustomers(await tx2.objectStore('customers').getAll())
        }, 100)
    }

    function addToCart(product: any) {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.id
                        ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
                        : item
                )
            }
            return [...prev, {
                product_id: product.id,
                name: product.name,
                name_mr: product.name_mr,
                name_hi: product.name_hi,
                price: Number(product.selling_price),
                buy_rate: Number(product.buying_price),
                qty: 1,
                total: Number(product.selling_price),
                unit: product.unit
            }]
        })
    }

    function updateCartItem(id: string, field: 'price' | 'qty', value: string) {
        const numValue = parseFloat(value) || 0
        setCart(prev => prev.map(item => {
            if (item.product_id === id) {
                const newObj = { ...item, [field]: numValue }
                newObj.total = newObj.price * newObj.qty
                return newObj
            }
            return item
        }))
    }

    function removeFromCart(id: string) {
        setCart(prev => prev.filter(item => item.product_id !== id))
    }

    if (loading) {
        return <div className="p-8 flex items-center justify-center h-full"><p className="font-bold text-slate-400">LOADING POS CACHE...</p></div>
    }

    const subTotal = cart.reduce((sum, item) => sum + item.total, 0)
    const grandTotal = Math.max(0, subTotal - discount)

    return (
        <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-100 overflow-y-auto lg:overflow-hidden font-sans">

            {/* Live Receipt Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-[450px] max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                        <ReceiptPreview
                            cart={cart}
                            customer={selectedCustomer}
                            lang={language}
                            shopInfo={shopInfo}
                            discount={discount}
                            grandTotal={grandTotal}
                            amountReceived={amountReceived}
                            invoiceNo={currentInvoiceStr}
                            onClose={() => setShowPreview(false)}
                        />
                    </div>
                </div>
            )}


            {/* LEFT: CART & SEARCH LIST */}
            <div className="flex-1 flex flex-col lg:m-4 bg-white border border-slate-200 lg:rounded-3xl shadow-sm overflow-hidden min-h-[500px]">

                {/* Search Bar Area */}
                <div className="p-4 border-b border-slate-100 bg-white">
                    <div className="relative">
                        <span className="absolute left-4 top-4 text-slate-400">🔍</span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search by Name or Barcode (F2 to focus)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.preventDefault()
                            }}
                            onKeyUp={e => {
                                if (e.key === 'Enter') {
                                    if (searchResults.length > 0) {
                                        const selected = searchResults[selectedIndex]
                                        addToCart(selected)
                                        setSearchQuery('')
                                        setTimeout(() => document.getElementById(`qty-${selected.id}`)?.focus(), 50)
                                    } else {
                                        // If search empty, jump to customer search
                                        document.getElementById('customer-search-input')?.focus()
                                    }
                                }
                            }}
                            className="w-full pl-12 pr-4 py-4 text-lg font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition"
                        />
                        {/* Instant Search Dropdown */}
                        {searchQuery && (
                            <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden left-0">
                                {searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 font-bold">No products found.</div>
                                ) : (
                                    <ul className="max-h-64 overflow-y-auto">
                                        {searchResults.map((p, idx) => (
                                            <li
                                                key={p.id}
                                                onClick={() => { addToCart(p); setSearchQuery(''); searchInputRef.current?.focus() }}
                                                className={`px-5 py-3 border-b border-slate-50 cursor-pointer flex justify-between items-center ${idx === selectedIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50 border-l-4 border-l-transparent'}`}
                                            >
                                                <div>
                                                    <p className={`font-bold ${idx === selectedIndex ? 'text-blue-900' : 'text-slate-800'}`}>{p.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-widest">{p.barcode || 'NO BARCODE'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-800">₹{p.selling_price}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">Stock: {p.current_stock}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-8">#</th>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3 w-32">Qty</th>
                                    <th className="px-4 py-3 w-32">Rate (₹)</th>
                                    <th className="px-4 py-3 w-32 text-right">Total (₹)</th>
                                    <th className="px-4 py-3 w-12 text-center">X</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cart.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-slate-400 font-bold">
                                            <div className="text-4xl mb-4">🛒</div>
                                            Cart is empty.<br />Search a product to start billing.
                                        </td>
                                    </tr>
                                ) : (
                                    cart.map((item, idx) => (
                                        <tr key={item.product_id} className="hover:bg-slate-50 group">
                                            <td className="px-4 py-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3 font-bold text-slate-800 text-sm">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    id={`qty-${item.product_id}`}
                                                    type="number" min="0.1" step="any"
                                                    value={item.qty || ''}
                                                    onChange={e => updateCartItem(item.product_id, 'qty', e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                                                    onKeyUp={e => { if (e.key === 'Enter') document.getElementById(`rate-${item.product_id}`)?.focus() }}
                                                    className="w-full min-w-[70px] px-2 py-1.5 border border-slate-200 rounded font-bold text-slate-800 focus:border-blue-500 outline-none text-center"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    id={`rate-${item.product_id}`}
                                                    type="number" min="0" step="any"
                                                    value={item.price || ''}
                                                    onChange={e => updateCartItem(item.product_id, 'price', e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
                                                    onKeyUp={e => { if (e.key === 'Enter') searchInputRef.current?.focus() }}
                                                    className="w-full min-w-[70px] px-2 py-1.5 border border-slate-200 rounded font-bold text-slate-800 focus:border-blue-500 outline-none text-right"
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-black text-slate-900 text-right text-lg">
                                                {item.total.toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => removeFromCart(item.product_id)}
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                                    tabIndex={-1}
                                                >
                                                    ✖
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT: CHECKOUT PANEL */}
            <div className="w-full lg:w-96 bg-white flex flex-col shadow-inner border-t lg:border-t-0 lg:border-l border-slate-200">

                {/* Status Tracker */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Status</span>
                    <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${offline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                        <span className={`text-xs font-bold ${offline ? 'text-amber-600' : 'text-emerald-600'}`}>{offline ? 'Local Offline Mode' : 'Cloud Synced'}</span>
                    </div>
                </div>

                {/* Customer Selection & Search */}
                <div className="p-6 border-b border-slate-200">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billing To</span>

                    <div className="relative">
                        <div className="flex items-center border-2 border-slate-200 rounded-xl bg-slate-50 overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition">
                            <span className="pl-3 text-slate-400">
                                <User className="w-4 h-4" />
                            </span>
                            <input
                                id="customer-search-input"
                                type="text"
                                placeholder="Search Customer Name..."
                                value={customerSearch}
                                onChange={e => {
                                    setCustomerSearch(e.target.value)
                                    if (e.target.value.trim() === '') setCustSearchResults([])
                                    else {
                                        const query = e.target.value.toLowerCase()
                                        setCustSearchResults(customers.filter(c => c.name.toLowerCase().includes(query)).slice(0, 5))
                                    }
                                    if (selectedCustomer) setSelectedCustomer(null)
                                }}
                                className="w-full px-3 py-3 font-bold text-slate-800 outline-none bg-transparent"
                            />
                            {selectedCustomer && (
                                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch('') }} className="pr-3 text-slate-400 hover:text-red-500">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Customer Search Dropdown */}
                        {customerSearch && !selectedCustomer && (
                            <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden left-0">
                                <ul className="max-h-48 overflow-y-auto">
                                    {custSearchResults.length === 0 ? (
                                        <li
                                            className="px-4 py-3 bg-blue-50 hover:bg-blue-100 cursor-pointer text-blue-700 font-bold flex items-center"
                                            onClick={() => {
                                                const newCust = { id: 'NEW_' + Date.now(), name: customerSearch, total_credit: 0 }
                                                setSelectedCustomer(newCust)
                                                setCustomerSearch(newCust.name)
                                                setCustSearchResults([])
                                            }}
                                        >
                                            <span className="bg-blue-200 text-blue-800 rounded px-2 py-0.5 text-xs mr-2 border border-blue-300">+</span>
                                            Create "{customerSearch}"
                                        </li>
                                    ) : (
                                        custSearchResults.map((c) => (
                                            <li
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomer(c)
                                                    setCustomerSearch(c.name)
                                                    setCustSearchResults([])
                                                }}
                                                className="px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 flex justify-between items-center"
                                            >
                                                <span className="font-bold text-slate-800">{c.name}</span>
                                                {c.total_credit > 0 && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">DUE: ₹{c.total_credit}</span>}
                                            </li>
                                        ))
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    {!selectedCustomer ? (
                        <p className="text-xs text-slate-400 mt-3 font-medium">Currently billing as a <strong className="text-slate-600">Walk-in Cash Sale</strong></p>
                    ) : (
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Customer</p>
                                <p className="font-black text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">{selectedCustomer.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Old Due</p>
                                <p className={`font-black ${selectedCustomer.total_credit > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    ₹{selectedCustomer.total_credit}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Advanced Checkout Hub (Fintech Theme) */}
            <div className="w-full lg:w-[450px] bg-white border border-slate-200 flex flex-col shadow-2xl z-10 m-0 lg:m-4 lg:ml-0 rounded-none lg:rounded-3xl overflow-hidden shrink-0">

                {/* Total Display & Actions */}
                <div className="p-6 bg-slate-50 text-slate-800 flex-1 flex flex-col justify-start overflow-y-auto">

                    {/* Bill Totals Container */}
                    <div className="bg-white rounded-2xl p-5 mb-5 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-end mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Old Due</p>
                            <p className="text-lg font-bold text-slate-600">₹{selectedCustomer?.total_credit || 0}</p>
                        </div>
                        <div className="flex justify-between items-center mb-3 text-slate-800">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subtotal</p>
                            <p className="text-sm font-bold">₹{subTotal.toLocaleString('en-IN')}</p>
                        </div>

                        <div className="flex justify-between items-center mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">Discount (-)</p>
                            <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                <input
                                    type="number"
                                    value={discount === 0 ? '' : discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    className="w-full text-right py-1.5 pl-6 pr-3 bg-white border border-slate-300 rounded outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 font-bold text-rose-600 transition"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-end mb-4 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Bill</p>
                            <p className="text-4xl font-black tracking-tighter text-slate-900">₹{grandTotal.toLocaleString('en-IN')}</p>
                        </div>

                        <div className="h-px bg-slate-200 w-full my-4"></div>

                        <div className="flex justify-between items-end">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Net Payable</p>
                            <p className="text-3xl font-black text-blue-600">₹{((selectedCustomer?.total_credit || 0) + grandTotal).toLocaleString('en-IN')}</p>
                        </div>
                    </div>

                    {/* Payment Received Input */}
                    <div className="mb-6 mb-auto">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Amount Received (₹)</label>
                        <input
                            type="number"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            placeholder={`Pay ₹${(selectedCustomer?.total_credit || 0) + grandTotal}`}
                            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-xl text-3xl font-black text-center text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition placeholder:text-slate-300 shadow-inner"
                        />
                        <div className="flex justify-between items-center mt-2 px-1">
                            <span className="text-[10px] font-bold text-slate-400">Balance added to Udhaari:</span>
                            <span className="text-xs font-black text-rose-500">
                                ₹{Math.max(0, ((selectedCustomer?.total_credit || 0) + grandTotal) - (parseFloat(amountReceived) || 0)).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Advanced Routing Controls */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Receipt Language</span>
                                <button onClick={() => setShowPreview(!showPreview)} className="text-[10px] bg-white hover:bg-slate-100 text-blue-600 px-2 py-1 rounded border border-slate-200 flex items-center gap-1 font-bold transition shadow-sm">
                                    <Eye className="w-3 h-3" /> Live Preview
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
                                <button
                                    onClick={() => setLanguage('en')}
                                    className={`py-2 rounded-lg border transition-all ${language === 'en' ? 'bg-slate-800 border-slate-900 text-white shadow-md scale-[1.05]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                >ENG</button>
                                <button
                                    onClick={() => setLanguage('mr')}
                                    className={`py-2 rounded-lg border transition-all ${language === 'mr' ? 'bg-orange-500 border-orange-600 text-white shadow-md scale-[1.05]' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                >MAR</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            disabled={isProcessing}
                            onClick={() => handleCheckout()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition tracking-widest text-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>PROCESSING...</span>
                                </>
                            ) : (
                                <span>COMPLETE SALE (F10)</span>
                            )}
                        </button>
                    </div>
                </div>

            </div>

        </div>
    )
}
