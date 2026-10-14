'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Save, UploadCloud, Download, Lock, Key, UserCircle, Phone, AlertTriangle, RotateCcw, FileCheck, CheckCircle2, FileText, X, Clock, ShieldAlert, Check, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { updateReceiptSettings, processLegacyCsv, updateVaultPin, updateLoginPassword, updateLoginId, resetPeriod, getPeriodBackupData } from '../actions'
import { exportSalesHistoryPDF, exportKharediHistoryPDF } from '@/utils/historyPdfExport'
import OwnerSecurityGate from '@/components/OwnerSecurityGate'

function downloadCsvFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export default function SettingsClient({ shop }: { shop: any }) {

    const [nameMr, setNameMr] = useState(shop.name_mr || '')
    const [address, setAddress] = useState(shop.address || '')
    const [addressMr, setAddressMr] = useState(shop.address_mr || '')
    const [phone, setPhone] = useState(shop.phone || '')

    const [isSaving, setIsSaving] = useState(false)
    const [uploadStatus, setUploadStatus] = useState('')
    const [vaultPin, setVaultPin] = useState(shop.owner_pin || '1234')
    const [isSavingPin, setIsSavingPin] = useState(false)
    const [appPassword, setAppPassword] = useState('')
    const [isSavingAppPassword, setIsSavingAppPassword] = useState(false)
    const [appId, setAppId] = useState('')
    const [isSavingAppId, setIsSavingAppId] = useState(false)

    // Period Reset / Fresh Start State: 3-Part Pre-Reset Backups
    const [salesBackedUp, setSalesBackedUp] = useState(false)
    const [kharediBackedUp, setKharediBackedUp] = useState(false)
    const [vaultBackedUp, setVaultBackedUp] = useState(false)
    const [isBackingUpSales, setIsBackingUpSales] = useState(false)
    const [isBackingUpKharedi, setIsBackingUpKharedi] = useState(false)
    const [isBackingUpVault, setIsBackingUpVault] = useState(false)
    const [isBackingUpAll, setIsBackingUpAll] = useState(false)

    // Period Reset Security PIN & Lockout State
    const [resetPin, setResetPin] = useState('')
    const [isResetting, setIsResetting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [resetAttempts, setResetAttempts] = useState(0)
    const [resetLockoutRemaining, setResetLockoutRemaining] = useState(0)

    useEffect(() => {
        try {
            const storedLockout = localStorage.getItem('winiks_reset_lockout_until')
            const storedAttempts = parseInt(localStorage.getItem('winiks_reset_pin_attempts') || '0', 10)
            setResetAttempts(storedAttempts)
            if (storedLockout) {
                const diff = Math.ceil((parseInt(storedLockout, 10) - Date.now()) / 1000)
                if (diff > 0) {
                    setResetLockoutRemaining(diff)
                } else {
                    localStorage.removeItem('winiks_reset_lockout_until')
                    localStorage.removeItem('winiks_reset_pin_attempts')
                    setResetAttempts(0)
                }
            }
        } catch (e) {}
    }, [])

    useEffect(() => {
        if (resetLockoutRemaining <= 0) return
        const timer = setInterval(() => {
            setResetLockoutRemaining(prev => {
                if (prev <= 1) {
                    try {
                        localStorage.removeItem('winiks_reset_lockout_until')
                        localStorage.removeItem('winiks_reset_pin_attempts')
                    } catch (e) {}
                    setResetAttempts(0)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [resetLockoutRemaining])

    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s < 10 ? '0' : ''}${s}`
    }

    // 1. Download Sales Backup (A4 PDF + CSV)
    const handleDownloadSalesBackup = async () => {
        setIsBackingUpSales(true)
        try {
            const data = await getPeriodBackupData()
            if (data.salesBills.length > 0) {
                exportSalesHistoryPDF(data.salesBills, data.shop, 'PRE-RESET-BACKUP')
                // Also export structured CSV
                const rows: any[][] = [
                    ["Invoice ID", "Invoice No", "Date", "Customer Name", "Payment Method", "Subtotal", "Discount", "Total Amount", "Amount Paid"]
                ]
                data.salesBills.forEach(b => {
                    rows.push([
                        b.id,
                        String(b.invoice_no || ''),
                        new Date(b.created_at).toLocaleString(),
                        b.customer_name || 'Cash Customer',
                        b.payment_method || 'CASH',
                        b.subtotal.toFixed(2),
                        b.discount.toFixed(2),
                        b.total_amount.toFixed(2),
                        b.amount_paid.toFixed(2)
                    ])
                })
                const csvStr = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
                downloadCsvFile(`sales_history_backup_${Date.now()}.csv`, csvStr)
            }
            setSalesBackedUp(true)
            alert(`Sales Backup generated! Downloaded A4 PDF & CSV (${data.salesBills.length} invoices).`)
        } catch (e: any) {
            console.error(e)
            alert(e.message || 'Sales backup failed.')
        } finally {
            setIsBackingUpSales(false)
        }
    }

    // 2. Download Kharedi Purchase Backup (A4 PDF + CSV)
    const handleDownloadKharediBackup = async () => {
        setIsBackingUpKharedi(true)
        try {
            const data = await getPeriodBackupData()
            if (data.purchaseBills.length > 0) {
                exportKharediHistoryPDF(data.purchaseBills, data.shop, 'PRE-RESET-BACKUP')
                // Also export structured CSV
                const rows: any[][] = [
                    ["Bill ID", "Purchase No", "Date", "Supplier Name", "Payment Method", "Total Amount", "Amount Paid", "Pending Debt"]
                ]
                data.purchaseBills.forEach(b => {
                    const debt = Math.max(0, b.total_amount - b.amount_paid)
                    rows.push([
                        b.id,
                        String(b.purchase_no || ''),
                        new Date(b.created_at).toLocaleString(),
                        b.supplier_name || 'N/A',
                        b.payment_method || 'CASH',
                        b.total_amount.toFixed(2),
                        b.amount_paid.toFixed(2),
                        debt.toFixed(2)
                    ])
                })
                const csvStr = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
                downloadCsvFile(`kharedi_history_backup_${Date.now()}.csv`, csvStr)
            }
            setKharediBackedUp(true)
            alert(`Kharedi Backup generated! Downloaded A4 PDF & CSV (${data.purchaseBills.length} purchase bills).`)
        } catch (e: any) {
            console.error(e)
            alert(e.message || 'Kharedi backup failed.')
        } finally {
            setIsBackingUpKharedi(false)
        }
    }

    // 3. Download Day-End Vault & Balance Sheet Statement (CSV)
    const handleDownloadVaultStatement = async () => {
        setIsBackingUpVault(true)
        try {
            const data = await getPeriodBackupData()
            const totalReceivable = data.customers.reduce((s, c) => s + c.old_balance, 0)
            const totalPayable = data.suppliers.reduce((s, sp) => s + sp.current_balance, 0)
            const totalInventoryValuation = data.inventory.reduce((s, pr) => s + (pr.stock_qty * pr.purchase_rate), 0)

            const rows: any[][] = [
                ["WINIKS CO-OS - FINANCIAL BALANCE SHEET & AUDIT STATEMENT"],
                ["Generated Date", new Date().toLocaleString()],
                ["Shop Name", data.shop.name],
                ["Phone", data.shop.phone || 'N/A'],
                [],
                ["============================================================"],
                ["SUMMARY METRICS"],
                ["Total Market Udhaari (Net Customer Receivable)", totalReceivable.toFixed(2)],
                ["Total Supplier AP (Net Account Payable)", totalPayable.toFixed(2)],
                ["Total Inventory Stock Valuation", totalInventoryValuation.toFixed(2)],
                ["============================================================"],
                [],
                ["--- SECTION 1: CUSTOMER OUTSTANDING UDHAARI (ACCOUNTS RECEIVABLE) ---"],
                ["Customer ID", "Customer Name", "Phone", "Outstanding Udhaari (Rs)"],
                ...data.customers.map(c => [c.id, c.name, c.phone || 'N/A', c.old_balance.toFixed(2)]),
                ["TOTAL RECEIVABLE", "", "", totalReceivable.toFixed(2)],
                [],
                ["--- SECTION 2: SUPPLIER ACCOUNTS PAYABLE (VENDOR DUES) ---"],
                ["Supplier ID", "Supplier Name", "Phone", "Pending Payable (Rs)"],
                ...data.suppliers.map(sp => [sp.id, sp.name, sp.phone || 'N/A', sp.current_balance.toFixed(2)]),
                ["TOTAL PAYABLE", "", "", totalPayable.toFixed(2)],
                [],
                ["--- SECTION 3: INVENTORY STOCK ASSET VALUATION ---"],
                ["Product ID", "Product Name", "In-Stock Qty", "Buy Rate (Rs)", "Total Valuation (Rs)"],
                ...data.inventory.map(pr => [pr.id, pr.name, pr.stock_qty, pr.purchase_rate.toFixed(2), (pr.stock_qty * pr.purchase_rate).toFixed(2)]),
                ["TOTAL INVENTORY ASSET VALUATION", "", "", "", totalInventoryValuation.toFixed(2)]
            ]

            const csvStr = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(",")).join("\n")
            downloadCsvFile(`vault_financial_statement_${Date.now()}.csv`, csvStr)
            setVaultBackedUp(true)
            alert(`Financial Vault Statement CSV successfully generated! Outstanding Udhaari, AP & Inventory balances saved.`)
        } catch (e: any) {
            console.error(e)
            alert(e.message || 'Vault statement export failed.')
        } finally {
            setIsBackingUpVault(false)
        }
    }

    // Master Download: All 3 Backups in One Go
    const handleDownloadAllBackups = async () => {
        setIsBackingUpAll(true)
        try {
            await handleDownloadSalesBackup()
            await handleDownloadKharediBackup()
            await handleDownloadVaultStatement()
            setSalesBackedUp(true)
            setKharediBackedUp(true)
            setVaultBackedUp(true)
            alert('All 3 financial backups successfully generated & saved to your Downloads!')
        } catch (e: any) {
            console.error(e)
        } finally {
            setIsBackingUpAll(false)
        }
    }

    const isAllBackedUp = salesBackedUp && kharediBackedUp && vaultBackedUp

    const handleExecuteReset = async () => {
        if (resetLockoutRemaining > 0) {
            return alert(`Security lockout active. Please wait ${Math.ceil(resetLockoutRemaining / 60)} minutes.`)
        }
        if (!resetPin || resetPin.trim().length !== 4) {
            return alert('Please enter your 4-digit Owner PIN to authorize the reset.')
        }
        setIsResetting(true)
        try {
            const res = await resetPeriod(resetPin.trim())
            try {
                localStorage.removeItem('winiks_reset_lockout_until')
                localStorage.removeItem('winiks_reset_pin_attempts')
            } catch (e) {}
            setShowConfirmModal(false)
            alert(res.message)
            window.location.reload()
        } catch (e: any) {
            const nextAttempts = resetAttempts + 1
            setResetAttempts(nextAttempts)
            try {
                localStorage.setItem('winiks_reset_pin_attempts', String(nextAttempts))
                if (nextAttempts >= 5) {
                    const lockUntil = Date.now() + 15 * 60 * 1000
                    localStorage.setItem('winiks_reset_lockout_until', String(lockUntil))
                    setResetLockoutRemaining(15 * 60)
                    alert('Security alert: 5 failed PIN attempts detected. Module is now locked for 15 minutes to prevent brute-force attacks.')
                } else {
                    alert(`${e.message || 'Authorization failed.'} (${5 - nextAttempts} attempt(s) remaining before 15m lockout)`)
                }
            } catch (err) {
                alert(e.message || 'Authorization failed.')
            }
        } finally {
            setIsResetting(false)
        }
    }


    const handleSaveMetadata = async () => {
        setIsSaving(true)
        try {
            await updateReceiptSettings({ name_mr: nameMr, address, address_mr: addressMr, phone })
            alert('Store parameters & WhatsApp contact successfully saved!')
        } catch (e) {
            alert('Settings failed to sync.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveVault = async () => {
        if (vaultPin.length !== 4) return alert('PIN must be precisely 4 digits.')
        setIsSavingPin(true)
        try {
            await updateVaultPin(vaultPin)
            alert('Vault Engine Security updated.')
        } catch (e) {
            alert('Settings failed to sync.')
        } finally {
            setIsSavingPin(false)
        }
    }

    const handleSaveAppPassword = async () => {
        if (!appPassword || appPassword.length < 6) return alert("Password must be at least 6 characters.")
        setIsSavingAppPassword(true)
        try {
            await updateLoginPassword(appPassword)
            alert("Master Login Password securely overwritten.")
            setAppPassword('')
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSavingAppPassword(false)
        }
    }

    const handleSaveAppId = async () => {
        if (!appId || appId.length < 4) return alert("Login ID must be at least 4 characters.")
        setIsSavingAppId(true)
        try {
            const res = await updateLoginId(appId)
            alert(`Master Login ID successfully overwritten to: ${res.newId}`)
            setAppId('')
        } catch (e: any) {
            alert(e.message)
        } finally {
            setIsSavingAppId(false)
        }
    }

    const triggerUpload = (type: 'udhaari' | 'payable') => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.csv'
        input.onchange = (e: any) => {
            const file = e.target.files[0]
            if (!file) return
            setUploadStatus('Parsing Matrix...')

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    setUploadStatus('Injecting Ledger...')
                    try {
                        await processLegacyCsv(type, results.data)
                        setUploadStatus('')
                        alert("Legacy Template successfully deployed into live ledgers.")
                    } catch (err: any) {
                        setUploadStatus('')
                        alert(err.message || "Malformed Engine Error.")
                    }
                }
            })
        }
        input.click()
    }

    // Dynamic Templates Mapping
    const udhaariTemplate = "Name,Phone,Old_Balance\nNikhil Patel,9876543210,12000"
    const payableTemplate = "Name,Phone,Current_Balance\nDistributor Network,9876543210,40000"

    const downloadTemplate = (name: string, content: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
    }

    return (
        <OwnerSecurityGate ownerPin={shop.owner_pin} title="Master Settings Access">
            <div className="flex flex-col gap-6 w-full pb-20">
                {/* Global Settings & Metadata Grid */}
                <Card className="border-slate-200 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] text-slate-800">
                    <div className="p-6 border-b border-indigo-100 bg-indigo-50/40">
                        <h2 className="text-sm font-bold text-indigo-900 tracking-widest uppercase">General Receipt Print Logic</h2>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1">
                                    SaaS Registered Node <Lock className="w-3 h-3 text-rose-500" />
                                </label>
                                <input
                                    disabled
                                    value={shop.name}
                                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 italic cursor-not-allowed"
                                />
                                <p className="text-[10px] text-slate-400 mt-2">Cannot be modified. Central Admin lock enabled.</p>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Store WhatsApp / Contact Number
                                </label>
                                <input
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm font-bold text-slate-900 transition-all outline-none"
                                    placeholder="e.g. 919876543210"
                                />
                                <p className="text-[10px] text-slate-400 mt-2">Official shop owner contact used for Udhaari payment reminders.</p>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Custom Invoice Name (MR)</label>
                                <input
                                    value={nameMr}
                                    onChange={e => setNameMr(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-bold text-indigo-900 transition-all outline-none"
                                    placeholder="मराठी मध्ये दुकानाचे नाव"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Enterprise Location (English)</label>
                                <textarea
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-medium text-slate-900 transition-all outline-none min-h-[80px]"
                                    placeholder="Plot 45, Market Road"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block">Enterprise Location (Marathi)</label>
                                <textarea
                                    value={addressMr}
                                    onChange={e => setAddressMr(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-sm font-medium text-slate-900 transition-all outline-none min-h-[80px]"
                                    placeholder="प्लॉट 45, मार्केट रोड"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button onClick={handleSaveMetadata} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                            <Save className="w-4 h-4" />
                            {isSaving ? 'OVERWRITING...' : 'DEPLOY METADATA'}
                        </button>
                    </div>
                </Card>

                {/* Security Settings */}
                <Card className="border-slate-200 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] text-slate-800">
                    <div className="p-6 border-b border-amber-100 bg-amber-50/40">
                        <h2 className="text-sm font-bold text-amber-900 tracking-widest uppercase">Security Vault Integrity</h2>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1">
                                    Day-End Vault Access PIN <Lock className="w-3 h-3 text-amber-500" />
                                </label>
                                <input
                                    maxLength={4}
                                    type="password"
                                    value={vaultPin}
                                    onChange={e => setVaultPin(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-2xl tracking-[1em] text-center font-bold text-slate-900 transition-all outline-none"
                                    placeholder="••••"
                                />
                                <p className="text-[10px] text-slate-400 mt-2">Numeric strictly. Required to unlock exact net profits.</p>

                                <button onClick={handleSaveVault} disabled={isSavingPin} className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                                    <Save className="w-4 h-4" />
                                    {isSavingPin ? 'LOCKING...' : 'ENFORCE SECURITY PIN'}
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1">
                                    Master Login ID <UserCircle className="w-3 h-3 text-indigo-500" />
                                </label>
                                <input
                                    minLength={4}
                                    type="text"
                                    value={appId}
                                    onChange={e => setAppId(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-lg font-bold text-slate-900 transition-all outline-none"
                                    placeholder="e.g shop123"
                                />
                                <p className="text-[10px] text-slate-400 mt-2">Will forcefully disconnect active sessions on change start.</p>

                                <button onClick={handleSaveAppId} disabled={isSavingAppId} className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                                    <Save className="w-4 h-4" />
                                    {isSavingAppId ? 'UPDATING...' : 'UPDATE LOGIN ID'}
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block flex items-center gap-1">
                                    Master Login Password <Key className="w-3 h-3 text-rose-500" />
                                </label>
                                <input
                                    minLength={6}
                                    type="password"
                                    value={appPassword}
                                    onChange={e => setAppPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-lg font-bold text-slate-900 transition-all outline-none"
                                    placeholder="New Secure Password"
                                />
                                <p className="text-[10px] text-slate-400 mt-2">Sets new credential pair requirement for engine boot.</p>

                                <button onClick={handleSaveAppPassword} disabled={isSavingAppPassword} className="mt-3 w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                                    <Save className="w-4 h-4" />
                                    {isSavingAppPassword ? 'UPDATING...' : 'UPDATE LOGIN PASS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Legacy Injection Hooks */}
                <Card className="border-slate-200 overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] text-slate-800">
                    <div className="p-6 border-b border-rose-100 bg-rose-50/40">
                        <h2 className="text-sm font-bold text-rose-900 tracking-widest uppercase">Legacy Ledger Restorations (CSV Migration)</h2>
                        <p className="text-xs text-rose-600 mt-1 font-medium hover:underline cursor-pointer">Strictly adheres to exact CSV Templates to intercept systemic structural failure.</p>
                    </div>
                    <div className="p-6 md:p-8 space-y-6">
                        {uploadStatus && <div className="text-xs font-bold text-indigo-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100 animate-pulse">{uploadStatus}</div>}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
                                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-1">Accounts Receivable (Udhaari)</h3>
                                <p className="text-xs text-slate-500 mb-6 font-medium">Inject exact balances owed from existing clients instantly into the core engine.</p>

                                <div className="flex gap-4">
                                    <button onClick={() => downloadTemplate('udhaari_template.csv', udhaariTemplate)} className="flex-1 flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition-all">
                                        <Download className="w-3.5 h-3.5" /> Template
                                    </button>
                                    <button onClick={() => triggerUpload('udhaari')} className="flex-[2] flex justify-center items-center gap-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <UploadCloud className="w-4 h-4" /> Inject Matrix
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
                                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-widest mb-1">Accounts Payable (Kharedi Debt)</h3>
                                <p className="text-xs text-slate-500 mb-6 font-medium">Map ongoing supplier balances directly into the core matrix for exact cash velocity tracing.</p>

                                <div className="flex gap-4">
                                    <button onClick={() => downloadTemplate('payable_template.csv', payableTemplate)} className="flex-1 flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition-all">
                                        <Download className="w-3.5 h-3.5" /> Template
                                    </button>
                                    <button onClick={() => triggerUpload('payable')} className="flex-[2] flex justify-center items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                                        <UploadCloud className="w-4 h-4" /> Inject Matrix
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Period Reset / Fresh Start (Year-End Close) */}
                <Card className="border-rose-200 overflow-hidden shadow-[0_4px_24px_-12px_rgba(244,63,94,0.15)] text-slate-800 bg-white">
                    <div className="p-6 border-b border-rose-100 bg-rose-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                                <h2 className="text-sm font-black text-rose-950 tracking-widest uppercase">Period Reset / Fresh Start</h2>
                            </div>
                            <p className="text-xs text-rose-700 mt-1 font-semibold">
                                Complete period close: Wipe sales & purchase bills while strictly preserving inventory stock, customer Udhaari, and supplier AP.
                            </p>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-rose-200/80 text-rose-800 border border-rose-300 w-fit">
                            Owner PIN Protected
                        </span>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                        {/* Scope comparison table */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100">
                                <p className="font-black text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" /> What Gets Deleted:
                                </p>
                                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                                    <li>All retail & wholesale sales invoices and line items</li>
                                    <li>All inward purchase (Kharedi) bills and line items</li>
                                    <li>Vault transaction tallies (Revenue, COGS, Accrual Profit, Sales Cash)</li>
                                </ul>
                            </div>

                            <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100">
                                <p className="font-black text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What Is Preserved 100%:
                                </p>
                                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                                    <li>All product catalog items and current inventory stock levels</li>
                                    <li>All customer profiles & pending Udhaari balances</li>
                                    <li>All supplier profiles & pending Accounts Payable (AP)</li>
                                    <li>Customer and supplier historical payment logs</li>
                                </ul>
                            </div>
                        </div>

                        {/* Step-by-Step Execution Chain */}
                        <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Step 1: Download Required 3-Part Financial Backups</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Download all 3 audit statements before the reset authorization button unlocks.</p>
                                </div>
                                <button
                                    onClick={handleDownloadAllBackups}
                                    disabled={isBackingUpAll}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                                >
                                    {isBackingUpAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                    {isBackingUpAll ? 'Generating All 3...' : 'Download All 3 At Once'}
                                </button>
                            </div>

                            {/* 3 Dedicated Backup Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Card 1: Sales Register */}
                                <div className={`p-4 rounded-xl border transition-all ${salesBackedUp ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Backup 1</span>
                                        {salesBackedUp && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Ready</span>}
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-900 mb-1">Sales Register Backup</h4>
                                    <p className="text-[11px] text-slate-500 mb-4">A4 Multi-page PDF + Detailed CSV invoice spreadsheet.</p>
                                    <button
                                        onClick={handleDownloadSalesBackup}
                                        disabled={isBackingUpSales}
                                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${salesBackedUp ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                                    >
                                        {isBackingUpSales ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        {isBackingUpSales ? 'Exporting...' : salesBackedUp ? 'Re-Download Sales' : 'Download Sales Backup'}
                                    </button>
                                </div>

                                {/* Card 2: Kharedi Purchase Register */}
                                <div className={`p-4 rounded-xl border transition-all ${kharediBackedUp ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Backup 2</span>
                                        {kharediBackedUp && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Ready</span>}
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-900 mb-1">Kharedi Purchase Backup</h4>
                                    <p className="text-[11px] text-slate-500 mb-4">A4 Multi-page PDF + Detailed CSV supplier bill spreadsheet.</p>
                                    <button
                                        onClick={handleDownloadKharediBackup}
                                        disabled={isBackingUpKharedi}
                                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${kharediBackedUp ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                                    >
                                        {isBackingUpKharedi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        {isBackingUpKharedi ? 'Exporting...' : kharediBackedUp ? 'Re-Download Kharedi' : 'Download Kharedi Backup'}
                                    </button>
                                </div>

                                {/* Card 3: Vault & Balance Sheet Statement */}
                                <div className={`p-4 rounded-xl border transition-all ${vaultBackedUp ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Backup 3</span>
                                        {vaultBackedUp && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Ready</span>}
                                    </div>
                                    <h4 className="font-bold text-xs text-slate-900 mb-1">Vault & Balance Sheet</h4>
                                    <p className="text-[11px] text-slate-500 mb-4">CSV statement of Customer Udhaari, Supplier AP & Inventory value.</p>
                                    <button
                                        onClick={handleDownloadVaultStatement}
                                        disabled={isBackingUpVault}
                                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${vaultBackedUp ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                                    >
                                        {isBackingUpVault ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                        {isBackingUpVault ? 'Exporting...' : vaultBackedUp ? 'Re-Download Vault' : 'Download Statement'}
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: PIN Verification */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">Step 2: Enter 4-Digit Owner Security PIN</p>
                                        <p className="text-[11px] text-slate-500">Security PIN verification with 5-attempt rate limiting brute-force protection.</p>
                                    </div>
                                    <div className="w-full sm:w-48">
                                        <input
                                            type="password"
                                            maxLength={4}
                                            disabled={resetLockoutRemaining > 0}
                                            value={resetPin}
                                            onChange={(e) => setResetPin(e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="••••"
                                            className={`w-full text-center tracking-[0.5em] font-mono text-lg font-black py-2 border rounded-xl focus:border-rose-500 focus:outline-none transition-all ${resetLockoutRemaining > 0 ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-60' : 'bg-slate-50 border-slate-200'}`}
                                        />
                                    </div>
                                </div>

                                {resetLockoutRemaining > 0 && (
                                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                                        <Clock className="w-4 h-4 text-rose-600" />
                                        <span>Security Lockout Active: Too many failed PIN attempts. Try again in {formatCountdown(resetLockoutRemaining)}</span>
                                    </div>
                                )}

                                {resetAttempts > 0 && resetLockoutRemaining <= 0 && (
                                    <p className="text-[11px] text-amber-600 font-bold text-right">
                                        {5 - resetAttempts} attempt(s) remaining before 15-minute security lockout
                                    </p>
                                )}
                            </div>

                            {/* Step 3: Execute Action */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                                <div className="text-xs text-slate-500">
                                    {!isAllBackedUp ? (
                                        <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4" /> Download all 3 financial backups above to unlock reset.
                                        </span>
                                    ) : (
                                        <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" /> Backups complete. Authorized to initiate period wipe.
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (!isAllBackedUp) {
                                            return alert('Please download all 3 financial backups before executing reset.')
                                        }
                                        if (resetLockoutRemaining > 0) {
                                            return alert(`Security lockout active. Please wait ${Math.ceil(resetLockoutRemaining / 60)} minutes.`)
                                        }
                                        if (!resetPin || resetPin.trim().length !== 4) {
                                            return alert('Please enter your 4-digit Owner PIN first.')
                                        }
                                        setShowConfirmModal(true)
                                    }}
                                    disabled={!isAllBackedUp || !resetPin || resetPin.trim().length !== 4 || resetLockoutRemaining > 0 || isResetting}
                                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-40 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {isResetting ? 'Processing Wipe...' : 'Execute Period Reset'}
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Confirm Dialog Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                            <div className="flex items-center gap-3 text-rose-600">
                                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-base">Final Confirmation: Period Reset</h3>
                                    <p className="text-xs text-rose-600 font-semibold">This action cannot be undone.</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                                Are you sure you want to permanently delete all <strong>Sales Invoices</strong> and <strong>Kharedi Bills</strong>? All inventory stock quantities, customer Udhaari balances, and supplier AP will be safely kept.
                            </p>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteReset}
                                    disabled={isResetting}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    {isResetting ? 'Resetting...' : 'Yes, Wipe Period'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </OwnerSecurityGate>
    )
}
