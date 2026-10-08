'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Save, UploadCloud, Download, Lock, Key, UserCircle } from 'lucide-react'
import Papa from 'papaparse'
import { updateReceiptSettings, processLegacyCsv, updateVaultPin, updateLoginPassword, updateLoginId } from '../actions'

export default function SettingsClient({ shop }: { shop: any }) {

    const [nameMr, setNameMr] = useState(shop.name_mr || '')
    const [address, setAddress] = useState(shop.address || '')
    const [addressMr, setAddressMr] = useState(shop.address_mr || '')

    const [isSaving, setIsSaving] = useState(false)
    const [uploadStatus, setUploadStatus] = useState('')
    const [vaultPin, setVaultPin] = useState(shop.owner_pin || '1234')
    const [isSavingPin, setIsSavingPin] = useState(false)
    const [appPassword, setAppPassword] = useState('')
    const [isSavingAppPassword, setIsSavingAppPassword] = useState(false)
    const [appId, setAppId] = useState('')
    const [isSavingAppId, setIsSavingAppId] = useState(false)

    const handleSaveMetadata = async () => {
        setIsSaving(true)
        try {
            await updateReceiptSettings({ name_mr: nameMr, address, address_mr: addressMr })
            alert('Receipt parameters officially updated.')
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
                    <button onClick={handleSaveMetadata} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-colors">
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

                            <button onClick={handleSaveVault} disabled={isSavingPin} className="mt-3 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-colors">
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

                            <button onClick={handleSaveAppId} disabled={isSavingAppId} className="mt-3 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-colors">
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

                            <button onClick={handleSaveAppPassword} disabled={isSavingAppPassword} className="mt-3 w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm tracking-wide px-6 py-3 rounded-lg transition-colors">
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
        </div>
    )
}
