'use client'

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
    addProduct,
    getProductPurchaseHistory,
    updateInventoryItem,
    bulkAddProducts,
    quickUpdateProductField,
    bulkDeleteProducts
} from "../actions"
import {
    PackagePlus,
    Search,
    Loader2,
    ArrowRight,
    Edit3,
    X,
    Check,
    UploadCloud,
    Download,
    CheckCircle2,
    ChevronDown,
    SlidersHorizontal,
    AlertTriangle,
    Layers,
    FileSpreadsheet,
    Building2,
    Sparkles,
    Trash2
} from "lucide-react"
import Papa from "papaparse"

type TabType = 'ALL' | 'LOW_STOCK' | 'WHOLESALE_SLAB' | 'OUT_OF_STOCK'

export function InventoryClient({ initialData, ownerPin }: { initialData: any[], ownerPin: string }) {
    const [products, setProducts] = useState<any[]>(initialData)
    const [searchTerm, setSearchTerm] = useState("")
    const [activeTab, setActiveTab] = useState<TabType>('ALL')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [savedNotice, setSavedNotice] = useState<string | null>(null)
    const [savingCellId, setSavingCellId] = useState<string | null>(null)

    // Add Product Modal State
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [nameEn, setNameEn] = useState("")
    const [nameMr, setNameMr] = useState("")

    // Drawer / History State
    const [activeProduct, setActiveProduct] = useState<any | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>(null)

    const searchInputRef = useRef<HTMLInputElement>(null)

    // Sync products when initialData updates
    useEffect(() => {
        setProducts(initialData)
    }, [initialData])

    // Keyboard shortcut: Press "/" to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "/" && document.activeElement !== searchInputRef.current) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Inline cell edit handler with instant optimistic update & background persistence
    const handleInlineCellChange = async (
        productId: string,
        field: 'sell_rate' | 'wholesale_rate' | 'min_wholesale_qty' | 'stock',
        newValue: string
    ) => {
        const product = products.find(p => p.id === productId)
        if (!product) return

        const currentVal = product[field]
        if (String(currentVal) === String(newValue)) return

        setSavingCellId(`${productId}-${field}`)

        // Optimistic UI update
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                return { ...p, [field]: newValue }
            }
            return p
        }))

        try {
            const res = await quickUpdateProductField(productId, field, newValue)
            if (res.success) {
                setSavedNotice(`${product.name}: ${field.replace('_', ' ')} updated`)
                setTimeout(() => setSavedNotice(null), 2500)
            } else {
                alert(`Update failed: ${res.error}`)
                // Revert
                setProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: currentVal } : p))
            }
        } catch (e: any) {
            alert("Error saving: " + e.message)
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: currentVal } : p))
        } finally {
            setSavingCellId(null)
        }
    }

    // Filter Logic
    const filteredData = products.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.name_mr && item.name_mr.toLowerCase().includes(searchTerm.toLowerCase()))

        if (!matchesSearch) return false

        if (activeTab === 'LOW_STOCK') {
            return (item.stock || 0) <= (item.min_stock || 5) && (item.stock || 0) > 0
        }
        if (activeTab === 'OUT_OF_STOCK') {
            return (item.stock || 0) <= 0
        }
        if (activeTab === 'WHOLESALE_SLAB') {
            return parseFloat(item.wholesale_rate || '0') < parseFloat(item.sell_rate || '0')
        }
        return true
    })

    // Counters for top filter tabs
    const counts = {
        all: products.length,
        lowStock: products.filter(p => (p.stock || 0) <= (p.min_stock || 5) && (p.stock || 0) > 0).length,
        outOfStock: products.filter(p => (p.stock || 0) <= 0).length,
        wholesaleSlabs: products.filter(p => parseFloat(p.wholesale_rate || '0') < parseFloat(p.sell_rate || '0')).length
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredData.map(p => p.id))
        }
    }

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected product(s)?`)) return

        setIsBulkDeleting(true)
        try {
            const res = await bulkDeleteProducts(selectedIds)
            if (res.success) {
                // Optimistically remove deleted products
                setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)))
                setSelectedIds([])
                setSavedNotice(res.message || `Deleted ${res.deletedCount} products.`)
                setTimeout(() => setSavedNotice(null), 3000)
            } else {
                alert("Bulk Delete Error: " + res.error)
            }
        } catch (err: any) {
            alert("Delete failed: " + err.message)
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const handleExportSelected = () => {
        if (selectedIds.length === 0) return
        const selectedProducts = products.filter(p => selectedIds.includes(p.id))
        const exportData = selectedProducts.map(p => ({
            "Product": p.name,
            "Marathi Alias": p.name_mr || "",
            "Buy Rate (₹)": p.buy_rate,
            "Retail Sell (₹)": p.sell_rate,
            "B2B Wholesale (₹)": p.wholesale_rate,
            "Min Wholesale Qty": p.min_wholesale_qty || 12,
            "On Hand Stock": p.stock,
            "Min Alert Stock": p.min_stock
        }))
        const csvString = Papa.unparse(exportData)
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Selected_Inventory_Export_${selectedProducts.length}_Items.csv`
        a.click()
    }

    const handleProductClick = async (product: any) => {
        setIsEditing(false)
        setActiveProduct(product)
        setEditForm({
            id: product.id,
            name: product.name,
            name_mr: product.name_mr,
            buy_rate: product.buy_rate,
            sell_rate: product.sell_rate,
            wholesale_rate: product.wholesale_rate,
            min_wholesale_qty: product.min_wholesale_qty || 12,
            stock: product.stock
        })
        setHistoryLoading(true)
        const res = await getProductPurchaseHistory(product.id)
        if (res.success && res.data) {
            setHistory(res.data)
        }
        setHistoryLoading(false)
    }

    const handleUpdateSubmit = async () => {
        if (!editForm) return
        setIsLoading(true)
        const formData = new FormData()
        Object.entries(editForm).forEach(([k, v]) => formData.append(k, String(v)))
        const res = await updateInventoryItem(formData)
        setIsLoading(false)
        if (res.success) {
            setSavedNotice('Product Profile Updated!')
            setTimeout(() => setSavedNotice(null), 2500)
            setActiveProduct(null)
            window.location.reload()
        } else {
            alert('Failed: ' + res.error)
        }
    }

    const handleTransliterate = async (text: string) => {
        if (!text) return
        try {
            const words = text.split(' ')
            const translated: string[] = []
            for (const w of words) {
                if (!w) { translated.push(''); continue }
                const res = await fetch(`https://inputtools.google.com/request?text=${w}&itc=mr-t-i0-und&num=1`)
                const data = await res.json()
                if (data[0] === 'SUCCESS') {
                    translated.push(data[1][0][1][0])
                } else {
                    translated.push(w)
                }
            }
            setNameMr(translated.join(' '))
        } catch {
            // Silently fallback if offline
        }
    }

    async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const newName = (formData.get('name') as string).trim()

        if (products.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
            alert(`Duplicate Blocked: Product '${newName}' already exists in your Inventory Matrix.`)
            return
        }

        setIsLoading(true)
        const res = await addProduct(formData)
        setIsLoading(false)
        if (res.success) {
            setIsOpen(false)
            window.location.reload()
        } else {
            alert("Error: " + res.error)
        }
    }

    const [uploadStatus, setUploadStatus] = useState("")

    const handleBulkUpload = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.csv'
        input.onchange = (e: any) => {
            const file = e.target.files[0]
            if (!file) return
            setUploadStatus("Parsing CSV...")

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    const rows = results.data as any[]
                    setUploadStatus(`Translating & Injecting ${rows.length} Matrix Items...`)
                    let processedData = []

                    try {
                        for (const row of rows) {
                            let mr = row.name_mr
                            if (!mr && row.name) {
                                try {
                                    const words = row.name.split(' ')
                                    const translated: string[] = []
                                    for (const w of words) {
                                        if (!w) { translated.push(''); continue }
                                        const res = await fetch(`https://inputtools.google.com/request?text=${w}&itc=mr-t-i0-und&num=1`)
                                        const data = await res.json()
                                        if (data[0] === 'SUCCESS') translated.push(data[1][0][1][0])
                                        else translated.push(w)
                                    }
                                    mr = translated.join(' ')
                                } catch {
                                    mr = row.name
                                }
                            }
                            processedData.push({
                                name: row.name,
                                name_mr: mr || row.name,
                                buy_rate: row.buy_rate || 0,
                                sell_rate: row.sell_rate || 0,
                                wholesale_rate: row.wholesale_rate || row.sell_rate || 0,
                                min_wholesale_qty: row.min_wholesale_qty || 12,
                                stock: row.stock || 0,
                                min_stock: row.min_stock || 5
                            })
                        }

                        const res = await bulkAddProducts(processedData)
                        if (res.success) {
                            alert(`Success: Deployed ${processedData.length} records into the Core Matrix.`)
                            window.location.reload()
                        } else {
                            alert("Engine Fault: " + res.error)
                        }
                    } catch (e) {
                        alert("Upload stream interrupted.")
                    } finally {
                        setUploadStatus("")
                    }
                }
            })
        }
        input.click()
    }

    const templateCSV = "name,name_mr,buy_rate,sell_rate,wholesale_rate,min_wholesale_qty,stock,min_stock\nMarie Gold,मेरी गोल्ड,8.50,10.00,9.00,12,100,20\nTata Salt,टाटा मीठ,21.00,25.00,23.00,20,50,10\nSpecial Namkeen,स्पेशल नमकीन,140.00,200.00,170.00,10,45,5"

    const downloadBulkTemplate = () => {
        const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = "Winiks_Shopify_Inventory_Template.csv"
        a.click()
    }

    const exportPresentProducts = () => {
        const exportData = filteredData.map(p => ({
            "Product": p.name,
            "Marathi Alias": p.name_mr || "",
            "Buy Rate (₹)": p.buy_rate,
            "Retail Sell (₹)": p.sell_rate,
            "B2B Wholesale (₹)": p.wholesale_rate,
            "Min Wholesale Qty": p.min_wholesale_qty || 12,
            "On Hand Stock": p.stock,
            "Min Alert Stock": p.min_stock
        }))
        const csvString = Papa.unparse(exportData)
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    return (
        <div className="w-full flex flex-col font-sans text-slate-900 pb-12">
            {/* Instant Micro-Save Toast Notification */}
            <AnimatePresence>
                {savedNotice && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-6 z-50 bg-slate-950 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold tracking-wide border border-white/10"
                    >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{savedNotice}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Shopify Polaris-Grade Container Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
                {/* 1. Header Toolbar: Title & Primary Actions */}
                <div className="p-6 pb-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                Inventory: Main Wholesale Godown
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Sparkles className="w-3 h-3 text-indigo-500" /> Live Matrix
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Real-time stock valuation, inline pricing slabs, and tiered volume rules.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {uploadStatus && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-bold text-indigo-600 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadStatus}
                            </div>
                        )}
                        <Button
                            onClick={exportPresentProducts}
                            variant="outline"
                            className="h-9 px-3.5 rounded-lg border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-slate-50"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" /> Export
                        </Button>
                        <Button
                            onClick={handleBulkUpload}
                            variant="outline"
                            className="h-9 px-3.5 rounded-lg border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-slate-50"
                        >
                            <UploadCloud className="w-3.5 h-3.5 text-slate-500" /> Import
                        </Button>
                        <Button
                            onClick={downloadBulkTemplate}
                            variant="ghost"
                            className="h-9 px-3 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5"
                            title="Download CSV format template"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" /> Template
                        </Button>

                        {/* Add SKU Dialog */}
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger className="h-9 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all">
                                <PackagePlus className="w-4 h-4 text-slate-300" /> Add Product
                            </DialogTrigger>

                            <DialogContent className="sm:max-w-[480px] rounded-2xl bg-white border-slate-100 p-0 overflow-hidden shadow-2xl">
                                <form onSubmit={handleAddSubmit}>
                                    <DialogHeader className="p-6 pb-4 bg-slate-50/50 border-b border-slate-100">
                                        <DialogTitle className="text-lg font-bold text-slate-900">Provision New SKU</DialogTitle>
                                        <DialogDescription className="text-xs text-slate-500">
                                            Inject a new product with retail and wholesale pricing slabs.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="p-6 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Product Name (EN)</Label>
                                                <Input
                                                    name="name"
                                                    required
                                                    value={nameEn}
                                                    onChange={e => setNameEn(e.target.value)}
                                                    onBlur={() => handleTransliterate(nameEn)}
                                                    placeholder="e.g. Parle-G 250g"
                                                    className="h-10 text-sm font-semibold rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Marathi Name (MR)</Label>
                                                <Input
                                                    name="name_mr"
                                                    value={nameMr}
                                                    onChange={e => setNameMr(e.target.value)}
                                                    placeholder="पार्ले-जी"
                                                    className="h-10 text-sm font-semibold rounded-lg bg-indigo-50/40 text-indigo-900 border-indigo-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Buy Rate (₹)</Label>
                                                <Input
                                                    name="buy_rate"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="22.00"
                                                    className="h-10 text-sm font-medium rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Retail Rate (₹)</Label>
                                                <Input
                                                    name="sell_rate"
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    placeholder="25.00"
                                                    className="h-10 text-sm font-bold text-indigo-700 border-indigo-200 rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Wholesale (₹)</Label>
                                                <Input
                                                    name="wholesale_rate"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="23.00"
                                                    className="h-10 text-sm font-bold text-emerald-700 border-emerald-200 rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Min B2B Qty</Label>
                                                <Input
                                                    name="min_wholesale_qty"
                                                    type="number"
                                                    defaultValue="12"
                                                    placeholder="12"
                                                    className="h-10 text-sm font-semibold rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Initial Stock</Label>
                                                <Input
                                                    name="stock"
                                                    type="number"
                                                    defaultValue="0"
                                                    className="h-10 text-sm font-semibold rounded-lg"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Alert Stock</Label>
                                                <Input
                                                    name="min_stock"
                                                    type="number"
                                                    defaultValue="5"
                                                    className="h-10 text-sm font-semibold rounded-lg border-rose-200 bg-rose-50/30 text-rose-800"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                            className="h-10 px-5 rounded-lg bg-slate-900 text-white font-semibold text-xs"
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save to Inventory"}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* 2. Shopify Filter Tabs + Fast Search Bar */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Google-Style Animated Filter Pill Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'ALL'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                        >
                            <span>All</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">{counts.all}</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('LOW_STOCK')}
                            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'LOW_STOCK'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-sm'
                                : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/50'
                                }`}
                        >
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>Low Stock</span>
                            {counts.lowStock > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-950 font-bold">{counts.lowStock}</span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('WHOLESALE_SLAB')}
                            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'WHOLESALE_SLAB'
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm'
                                : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/50'
                                }`}
                        >
                            <Layers className="w-3 h-3 text-emerald-500" />
                            <span>B2B Wholesale Slabs</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">{counts.wholesaleSlabs}</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('OUT_OF_STOCK')}
                            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${activeTab === 'OUT_OF_STOCK'
                                ? 'bg-rose-50 text-rose-900 border border-rose-200 shadow-sm'
                                : 'text-slate-600 hover:text-rose-800 hover:bg-rose-50/50'
                                }`}
                        >
                            <span>Out of Stock</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 font-bold">{counts.outOfStock}</span>
                        </button>
                    </div>

                    {/* Quick Search with keyboard shortcut "/" */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                            ref={searchInputRef}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Filter products... (Press /)"
                            className="h-8 pl-8 pr-8 text-xs bg-white border-slate-200 rounded-lg shadow-sm focus-visible:ring-indigo-500/20"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. Shopify Polaris Table Grid with Inline Editable Inputs */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-3 pl-6 w-10">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                </th>
                                <th className="p-3 font-semibold text-slate-600 min-w-[220px]">Product SKU</th>
                                <th className="p-3 font-semibold text-slate-600 text-right w-24">Buy Rate</th>
                                <th className="p-3 font-semibold text-indigo-700 text-right w-28">Retail Rate</th>
                                <th className="p-3 font-semibold text-emerald-700 text-right w-28">Wholesale Rate</th>
                                <th className="p-3 font-semibold text-slate-600 text-center w-28">Min B2B Qty</th>
                                <th className="p-3 font-semibold text-slate-600 text-right w-36">On-Hand Stock</th>
                                <th className="p-3 pr-6 text-right w-24">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <PackagePlus className="w-8 h-8 text-slate-300" />
                                            <p className="text-sm font-semibold text-slate-600">No matching products found</p>
                                            <p className="text-xs text-slate-400">Try adjusting your search or filter tab</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map(item => {
                                    const isLow = (item.stock || 0) <= (item.min_stock || 5) && (item.stock || 0) > 0
                                    const isOut = (item.stock || 0) <= 0
                                    const hasWholesaleDiscount = parseFloat(item.wholesale_rate || '0') < parseFloat(item.sell_rate || '0')

                                    return (
                                        <tr
                                            key={item.id}
                                            className="group hover:bg-slate-50/70 transition-colors"
                                        >
                                            {/* Checkbox */}
                                            <td className="p-3 pl-6">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(item.id)}
                                                    onChange={() => toggleSelectOne(item.id)}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                                />
                                            </td>

                                            {/* Product Title + Marathi Subtext */}
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-[13px]">
                                                        {item.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {item.name_mr && (
                                                            <span className="text-[11px] font-medium text-slate-500">
                                                                {item.name_mr}
                                                            </span>
                                                        )}
                                                        {hasWholesaleDiscount && (
                                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                Tiered
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Buy Rate (Read-Only Pill) */}
                                            <td className="p-3 text-right">
                                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                    ₹{parseFloat(item.buy_rate || '0').toFixed(2)}
                                                </span>
                                            </td>

                                            {/* Retail Rate (Shopify Inline Editable Pill) */}
                                            <td className="p-3 text-right">
                                                <div className="relative inline-block">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        defaultValue={parseFloat(item.sell_rate || '0').toFixed(2)}
                                                        onBlur={(e) => handleInlineCellChange(item.id, 'sell_rate', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur()
                                                            }
                                                        }}
                                                        className="w-20 text-right font-bold text-indigo-700 bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1 text-xs transition-all shadow-sm"
                                                        title="Click to edit Retail Rate directly"
                                                    />
                                                    {savingCellId === `${item.id}-sell_rate` && (
                                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-500 absolute -top-1 -right-1" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Wholesale Rate (Shopify Inline Editable Pill) */}
                                            <td className="p-3 text-right">
                                                <div className="relative inline-block">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        defaultValue={parseFloat(item.wholesale_rate || item.sell_rate || '0').toFixed(2)}
                                                        onBlur={(e) => handleInlineCellChange(item.id, 'wholesale_rate', e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur()
                                                            }
                                                        }}
                                                        className="w-20 text-right font-bold text-emerald-700 bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-md px-2 py-1 text-xs transition-all shadow-sm"
                                                        title="Click to edit Wholesale Rate directly"
                                                    />
                                                    {savingCellId === `${item.id}-wholesale_rate` && (
                                                        <Loader2 className="w-3 h-3 animate-spin text-emerald-500 absolute -top-1 -right-1" />
                                                    )}
                                                </div>
                                            </td>

                                            {/* Min B2B Qty (Shopify Inline Editable Pill + Slab Breakdown) */}
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="relative inline-block">
                                                        <input
                                                            type="number"
                                                            defaultValue={item.min_wholesale_qty || 12}
                                                            onBlur={(e) => handleInlineCellChange(item.id, 'min_wholesale_qty', e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.currentTarget.blur()
                                                                }
                                                            }}
                                                            className="w-16 text-center font-bold text-slate-700 bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 rounded-md px-2 py-1 text-xs transition-all shadow-sm"
                                                            title="Minimum purchase quantity to trigger wholesale rate"
                                                        />
                                                        {savingCellId === `${item.id}-min_wholesale_qty` && (
                                                            <Loader2 className="w-3 h-3 animate-spin text-slate-500 absolute -top-1 -right-1" />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-500 font-semibold tracking-tight">
                                                        ≥{item.min_wholesale_qty || 12} @ ₹{parseFloat(item.wholesale_rate || item.sell_rate || '0').toFixed(0)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* On-Hand Stock (Shopify Inline Editable Pill + Status Dot) */}
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`w-2 h-2 rounded-full ${isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                                                                }`}
                                                            title={isOut ? 'Out of Stock' : isLow ? 'Low Stock Warning' : 'In Stock'}
                                                        />
                                                    </div>
                                                    <div className="relative inline-block">
                                                        <input
                                                            type="number"
                                                            defaultValue={item.stock || 0}
                                                            onBlur={(e) => handleInlineCellChange(item.id, 'stock', e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.currentTarget.blur()
                                                                }
                                                            }}
                                                            className={`w-16 text-right font-black rounded-md px-2 py-1 text-xs transition-all shadow-sm border ${isOut
                                                                ? 'text-rose-700 bg-rose-50/50 border-rose-200'
                                                                : isLow
                                                                    ? 'text-amber-800 bg-amber-50/50 border-amber-200'
                                                                    : 'text-slate-800 bg-white border-slate-200 focus:border-indigo-500'
                                                                }`}
                                                            title="Click to adjust on-hand inventory directly"
                                                        />
                                                        {savingCellId === `${item.id}-stock` && (
                                                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500 absolute -top-1 -right-1" />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions: View History & Details */}
                                            <td className="p-3 pr-6 text-right">
                                                <button
                                                    onClick={() => handleProductClick(item)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                                    title="View Supplier Purchase History & Full Details"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count Bar */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Showing {filteredData.length} of {products.length} inventory items</span>
                    {selectedIds.length > 0 && (
                        <span className="font-semibold text-indigo-600">{selectedIds.length} items selected</span>
                    )}
                </div>
            </div>

            {/* Supplier Price History & Full Profile Drawer Modal */}
            <Dialog open={!!activeProduct} onOpenChange={(val) => !val && setActiveProduct(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl bg-white border-slate-100 p-0 overflow-hidden shadow-2xl">
                    {activeProduct && (
                        <>
                            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-start justify-between">
                                <div>
                                    <DialogTitle className="text-lg font-bold tracking-tight text-slate-900">{activeProduct.name}</DialogTitle>
                                    <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">{activeProduct.name_mr || 'No Marathi alias'}</DialogDescription>
                                </div>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-[11px] font-bold uppercase bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                    {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                    {isEditing ? 'Cancel' : 'Edit SKU'}
                                </button>
                            </DialogHeader>

                            <div className="p-6">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Product Name</Label>
                                                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-9 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Marathi Name</Label>
                                                <Input value={editForm.name_mr} onChange={e => setEditForm({ ...editForm, name_mr: e.target.value })} className="h-9 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Buy Rate (₹)</Label>
                                                <Input type="number" step="0.01" value={editForm.buy_rate} onChange={e => setEditForm({ ...editForm, buy_rate: e.target.value })} className="h-9 text-xs font-semibold" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-indigo-700 uppercase">Retail Sell (₹)</Label>
                                                <Input type="number" step="0.01" value={editForm.sell_rate} onChange={e => setEditForm({ ...editForm, sell_rate: e.target.value })} className="h-9 text-xs font-bold text-indigo-700" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-emerald-700 uppercase">B2B Wholesale (₹)</Label>
                                                <Input type="number" step="0.01" value={editForm.wholesale_rate} onChange={e => setEditForm({ ...editForm, wholesale_rate: e.target.value })} className="h-9 text-xs font-bold text-emerald-700" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Min B2B Qty</Label>
                                                <Input type="number" value={editForm.min_wholesale_qty} onChange={e => setEditForm({ ...editForm, min_wholesale_qty: e.target.value })} className="h-9 text-xs font-bold" />
                                            </div>
                                            <div className="space-y-1 col-span-2">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase">Stock Units</Label>
                                                <Input type="number" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} className="h-9 text-xs font-black" />
                                            </div>
                                        </div>
                                        <Button onClick={handleUpdateSubmit} disabled={isLoading} className="w-full bg-slate-900 text-white font-bold h-10 rounded-xl text-xs">
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} SAVE SKU DETAILS
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-3 mb-5">
                                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">On Hand Stock</p>
                                                <p className="text-lg font-black text-slate-900">{activeProduct.stock} Units</p>
                                            </div>
                                            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-center">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Wholesale Slab</p>
                                                <p className="text-lg font-black text-indigo-700">₹{parseFloat(activeProduct.wholesale_rate || activeProduct.sell_rate).toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                            <ArrowRight className="w-3.5 h-3.5 text-indigo-500" /> Supplier Purchase History
                                        </h3>

                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[220px] overflow-y-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-2">Supplier</th>
                                                        <th className="px-3 py-2">Date</th>
                                                        <th className="px-3 py-2 text-right">Bought At</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {historyLoading ? (
                                                        <tr><td colSpan={3} className="p-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-indigo-500" /></td></tr>
                                                    ) : history.length === 0 ? (
                                                        <tr><td colSpan={3} className="p-6 text-center text-xs text-slate-400">No purchase records found.</td></tr>
                                                    ) : (
                                                        history.map((h, i) => (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="px-3 py-2 font-semibold text-slate-800">{h.supplierName}</td>
                                                                <td className="px-3 py-2 text-[11px] text-slate-500">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                                                <td className="px-3 py-2 font-bold text-rose-600 text-right">₹{parseFloat(h.buyRate).toFixed(2)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Shopify Polaris Floating Bulk Actions Toolbar */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3.5 border border-slate-800 backdrop-blur-xl"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-200">
                                <span className="text-indigo-400 font-black">{selectedIds.length}</span> Products Selected
                            </span>
                        </div>
                        <div className="h-4 w-px bg-slate-800" />
                        <Button
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg px-3 flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                            {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Bulk Delete
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExportSelected}
                            variant="outline"
                            className="h-8 bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 text-xs font-bold rounded-lg px-3 flex items-center gap-1.5 transition-all"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            Export CSV
                        </Button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-xs text-slate-400 hover:text-white font-medium underline underline-offset-2 ml-1 transition-colors"
                        >
                            Clear
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
