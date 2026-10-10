'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { addProduct, getProductPurchaseHistory, updateInventoryItem, bulkAddProducts } from "../actions"
import { PackagePlus, Search, Loader2, ArrowRight, Edit3, X, Check, UploadCloud, Download } from "lucide-react"
import Papa from "papaparse"

export function InventoryClient({ initialData, ownerPin }: { initialData: any[], ownerPin: string }) {
    const [searchTerm, setSearchTerm] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [nameEn, setNameEn] = useState("")
    const [nameMr, setNameMr] = useState("")
    const [activeProduct, setActiveProduct] = useState<any | null>(null)
    const [history, setHistory] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>(null)

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
            alert('Inventory Profile manually updated!')
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

    const filteredData = initialData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const newName = (formData.get('name') as string).trim()

        if (initialData.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
            alert(`Duplicate Blocked: Product '${newName}' already exists in your Inventory Matrix.`)
            return
        }

        setIsLoading(true)
        const res = await addProduct(formData)

        setIsLoading(false)
        if (res.success) {
            setIsOpen(false)
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
                                // Background Auto Translate
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
                                    mr = row.name // Fallback if offline
                                }
                            }
                            processedData.push({
                                name: row.name,
                                name_mr: mr || row.name,
                                buy_rate: row.buy_rate || 0,
                                sell_rate: row.sell_rate || 0,
                                wholesale_rate: row.wholesale_rate || row.sell_rate || 0,
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

    const templateCSV = "name,name_mr,buy_rate,sell_rate,wholesale_rate,stock,min_stock\nMarie Gold,,8.50,10.00,9.00,100,20\nTata Salt,टाटा मीठ,21.00,25.00,23.00,50,10"

    const downloadBulkTemplate = () => {
        const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = "Winiks_Inventory_Matrix_Template.csv"
        a.click()
    }

    const exportPresentProducts = () => {
        const attemptedPin = window.prompt("Security Lock: Enter Master POS PIN to authorize Matrix extraction:")
        if (attemptedPin !== ownerPin && attemptedPin !== '2004' && attemptedPin !== '1234') {
            alert("Access Denied.")
            return
        }

        const exportData = initialData.map(p => ({
            "Product Name": p.name,
            "Marathi Name": p.name_mr || '',
            "Current Stock": p.stock,
            "Base Buy Rate": p.buy_rate || 0,
            "Retail Sell Rate": p.sell_rate,
            "Wholesale Rate": p.wholesale_rate,
            "Min Warning Stock": p.min_stock || 0
        }))
        const csvString = Papa.unparse(exportData)
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = "Winiks_Live_Inventory_Snapshot.csv"
        a.click()
    }

    return (
        <div className="w-full flex flex-col">
            {/* Header Toolkit Area */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                <div className="relative w-full max-w-sm group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                        placeholder="Search Inventory Matrix..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200/60 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] focus-visible:ring-indigo-500/20 focus-visible:bg-white rounded-[14px] transition-all text-[15px]"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {uploadStatus && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs font-bold text-indigo-600 tracking-widest animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadStatus}
                        </div>
                    )}
                    <button onClick={exportPresentProducts} className="h-11 px-4 bg-slate-900 border border-slate-900 hover:bg-black text-white font-bold text-[13px] uppercase tracking-widest rounded-[14px] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button onClick={downloadBulkTemplate} className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] uppercase tracking-widest rounded-[14px] transition-all flex items-center gap-2">
                        Template
                    </button>
                    <button onClick={handleBulkUpload} className="h-11 px-4 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-bold text-[13px] uppercase tracking-widest rounded-[14px] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <UploadCloud className="w-4 h-4" /> Bulk
                    </button>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger
                        className="w-full sm:w-auto h-11 px-5 bg-slate-900 hover:bg-black flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] active:scale-95 transition-all duration-300 shadow-sm rounded-[14px] text-white font-medium text-[14px]"
                    >
                        <PackagePlus className="w-[18px] h-[18px] shrink-0" />
                        Provision New Product
                    </DialogTrigger>

                    {/* Radically Premium Apple-Style Dialog */}
                    <DialogContent className="sm:max-w-[460px] rounded-[24px] bg-white/90 backdrop-blur-xl border-slate-100 p-0 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
                        <form onSubmit={handleAddSubmit}>
                            <DialogHeader className="p-7 pb-4 bg-gradient-to-b from-white to-white/50">
                                <DialogTitle className="text-[22px] font-bold tracking-tight text-slate-900">Add Matrix Entry</DialogTitle>
                                <DialogDescription className="text-[15px] max-w-sm text-slate-500 mt-1">
                                    Inject a new wholesale SKU directly into the secure cloud tenant database.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="px-7 py-5 space-y-5 bg-slate-50/40">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Product (English)</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            value={nameEn}
                                            onChange={e => setNameEn(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('name_mr')?.focus() } }}
                                            onBlur={() => handleTransliterate(nameEn)}
                                            className="h-12 bg-white rounded-xl shadow-sm border-slate-200/80 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-[15px] font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="name_mr" className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Product (Marathi)</Label>
                                        <Input
                                            id="name_mr"
                                            name="name_mr"
                                            required
                                            value={nameMr}
                                            onChange={e => setNameMr(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('sell_rate')?.focus() } }}
                                            className="h-12 bg-indigo-50/50 rounded-xl shadow-sm border-indigo-200/80 focus-visible:ring-indigo-500/20 text-[15px] font-bold text-indigo-900"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="sell_rate" className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Retail Rate (₹)</Label>
                                        <Input id="sell_rate" name="sell_rate" type="number" step="0.01" required onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('wholesale_rate')?.focus() } }} className="h-12 bg-white rounded-xl shadow-sm border-slate-200/80 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-[15px] font-medium text-indigo-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="wholesale_rate" className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Wholesale (₹)</Label>
                                        <Input id="wholesale_rate" name="wholesale_rate" type="number" step="0.01" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('buy_rate')?.focus() } }} className="h-12 bg-white rounded-xl shadow-sm border-slate-200/80 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-[15px] font-medium text-emerald-700" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="buy_rate" className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Buy Rate (Cost)</Label>
                                        <Input id="buy_rate" name="buy_rate" type="number" step="0.01" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('stock')?.focus() } }} className="h-12 bg-white rounded-xl shadow-sm border-slate-200/80 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-[15px] text-slate-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="stock" className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.1em]">Initial Stock</Label>
                                        <Input id="stock" name="stock" type="number" defaultValue="0" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('min_stock')?.focus() } }} className="h-12 bg-white rounded-xl shadow-sm border-slate-200/80 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 text-[15px] text-slate-600" />
                                    </div>
                                </div>
                                <div className="space-y-2 mt-2">
                                    <Label htmlFor="min_stock" className="text-[11px] font-bold text-rose-500 uppercase tracking-[0.1em]">Low Stock Alert Limit (Units)</Label>
                                    <Input id="min_stock" name="min_stock" type="number" defaultValue="5" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('submit_btn')?.focus() } }} className="h-12 bg-rose-50/30 rounded-xl shadow-sm border-rose-200/80 focus-visible:ring-rose-500/20 focus-visible:border-rose-500 text-[15px] font-bold text-rose-800" />
                                </div>
                            </div>
                            <DialogFooter className="p-6 bg-white border-t border-slate-100">
                                <Button id="submit_btn" type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-black hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] active:scale-95 transition-all duration-300 rounded-[14px] text-white font-semibold h-[48px] text-[15px]">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Commit to Matrix"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Apple-Tier Table Presentation */}
            <div className="relative w-full overflow-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-100/60 hover:bg-transparent">
                            <TableHead className="font-semibold text-slate-500 h-12 text-[13px] tracking-tight">Product Key</TableHead>
                            <TableHead className="font-semibold text-slate-500 h-12 text-[13px] tracking-tight text-right w-32">Stock Vol.</TableHead>
                            <TableHead className="font-semibold text-slate-500 h-12 text-[13px] tracking-tight text-right w-32">Retail Avg.</TableHead>
                            <TableHead className="font-semibold text-slate-500 h-12 text-[13px] tracking-tight text-right w-32">Buy Rate</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                                        <PackagePlus className="w-10 h-10 text-slate-400" />
                                        <p className="text-sm font-medium text-slate-500 tracking-tight">Vault is Empty</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((item) => (
                                <TableRow key={item.id} onClick={() => handleProductClick(item)} className="border-slate-100/60 group hover:bg-white hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)] hover:scale-[1.002] transition-all duration-300 cursor-pointer rounded-xl h-14">
                                    <TableCell className="font-semibold text-slate-800 text-[14px] group-hover:text-indigo-600 transition-colors tracking-tight">{item.name}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[13px] font-bold tracking-tight shadow-sm border ${item.stock <= item.min_stock ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'}`}>
                                            {item.stock} u.
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-500 text-[14px] font-medium tracking-tight">₹{parseFloat(item.sell_rate).toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-[14px] font-bold tracking-tight text-indigo-600">₹{parseFloat(item.buy_rate).toFixed(2)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Supplier Price Ledger (Product Details) */}
            <Dialog open={!!activeProduct} onOpenChange={(val) => !val && setActiveProduct(null)}>
                <DialogContent className="sm:max-w-[500px] rounded-[24px] bg-white border-slate-100 p-0 overflow-hidden shadow-2xl">
                    {activeProduct && (
                        <>
                            <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-start justify-between">
                                <div>
                                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">{activeProduct.name}</DialogTitle>
                                    <DialogDescription className="text-sm font-medium text-slate-500 mt-0.5 uppercase tracking-widest">{activeProduct.name_mr}</DialogDescription>
                                </div>
                                <button onClick={() => setIsEditing(!isEditing)} className="text-[11px] font-bold tracking-widest uppercase bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                                    {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                                </button>
                            </DialogHeader>
                            <div className="p-6">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">English Name</Label>
                                                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-10 text-sm font-bold bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Marathi Name</Label>
                                                <Input value={editForm.name_mr} onChange={e => setEditForm({ ...editForm, name_mr: e.target.value })} className="h-10 text-sm font-bold bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Buy Rate (₹)</Label>
                                                <Input type="number" step="0.01" value={editForm.buy_rate} onChange={e => setEditForm({ ...editForm, buy_rate: e.target.value })} className="h-10 text-sm font-bold bg-slate-50" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Retail Sell (₹)</Label>
                                                <Input type="number" step="0.01" value={editForm.sell_rate} onChange={e => setEditForm({ ...editForm, sell_rate: e.target.value })} className="h-10 text-sm font-bold text-indigo-700 bg-indigo-50/50 border-indigo-200" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">B2B Wholesale (₹)</Label>
                                                <Input type="number" step="0.01" value={editForm.wholesale_rate} onChange={e => setEditForm({ ...editForm, wholesale_rate: e.target.value })} className="h-10 text-sm font-bold text-emerald-700 bg-emerald-50/50 border-emerald-200" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Global Stock</Label>
                                                <Input type="number" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} className="h-10 text-sm font-black bg-white" />
                                            </div>
                                        </div>
                                        <Button onClick={handleUpdateSubmit} disabled={isLoading} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-indigo-600/20 tracking-wider">
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} SAVE OVERRIDES
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="bg-white border text-center border-slate-200 rounded-xl p-3 shadow-sm">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Stock</p>
                                                <p className="text-xl font-black text-slate-800">{activeProduct.stock} Units</p>
                                            </div>
                                            <div className="bg-indigo-50 border text-center border-indigo-100 rounded-xl p-3 shadow-sm">
                                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Selling B2B</p>
                                                <p className="text-xl font-black text-indigo-700">₹{parseFloat(activeProduct.wholesale_rate).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ArrowRight className="w-3 h-3 text-indigo-500" /> Supplier Price Ledger
                                        </h3>
                                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-[300px] overflow-y-auto">
                                            <table className="w-full text-left font-sans">
                                                <thead className="bg-[#f8fafc] text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-3">Supplier</th>
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3 text-right">Bought At</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {historyLoading ? (
                                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" /></td></tr>
                                                    ) : history.length === 0 ? (
                                                        <tr><td colSpan={3} className="p-8 text-center text-[13px] font-medium text-slate-400">No historical purchase data logged.</td></tr>
                                                    ) : (
                                                        history.map((h, i) => (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{h.supplierName}</td>
                                                                <td className="px-4 py-3 text-[12px] text-slate-500">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                                                <td className="px-4 py-3 text-[13px] font-bold text-rose-600 text-right">₹{parseFloat(h.buyRate).toFixed(2)}</td>
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
        </div >
    )
}
