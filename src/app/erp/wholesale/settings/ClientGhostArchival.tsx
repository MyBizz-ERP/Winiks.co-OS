'use client'

import { useState } from 'react'
import { exportInvoicesAsJson, importGhostArchive } from './actions'
import Papa from 'papaparse'

export default function ClientGhostArchival() {
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [isExporting, setIsExporting] = useState(false)
    const [message, setMessage] = useState('')

    const [importMessage, setImportMessage] = useState('')
    const [isImporting, setIsImporting] = useState(false)

    async function handleExport(exportType: 'json' | 'csv') {
        if (!fromDate || !toDate) {
            setMessage('Please select both a Start Date and an End Date.')
            return
        }

        setIsExporting(true)
        setMessage('Extracting data from vault...')

        try {
            const data = await exportInvoicesAsJson(fromDate, toDate)

            if (data.error) {
                setMessage(data.error)
                return
            }

            if (!data.invoices || data.invoices.length === 0) {
                setMessage('No invoices found in this date range.')
                return
            }

            if (exportType === 'json') {
                // EXPORT AS JSON
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `MyBizz_Backup_${fromDate}_to_${toDate}.json`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            } else {
                // EXPORT AS CSV
                const csvRows: any[] = []
                data.invoices.forEach((inv: any) => {
                    if (!inv.items || inv.items.length === 0) {
                        csvRows.push({
                            'Invoice ID': inv.id,
                            'Date': new Date(inv.created_at).toLocaleDateString(),
                            'Customer': inv.customer_name,
                            'Subtotal': inv.subtotal,
                            'Grand Total': inv.grand_total,
                            'Payment Mode': inv.payment_mode,
                            'Product': '',
                            'Qty': '',
                            'Price': '',
                            'Line Total': ''
                        })
                    } else {
                        inv.items.forEach((item: any, index: number) => {
                            csvRows.push({
                                'Invoice ID': index === 0 ? inv.id : '',
                                'Date': index === 0 ? new Date(inv.created_at).toLocaleDateString() : '',
                                'Customer': index === 0 ? inv.customer_name : '',
                                'Subtotal': index === 0 ? inv.subtotal : '',
                                'Grand Total': index === 0 ? inv.grand_total : '',
                                'Payment Mode': index === 0 ? inv.payment_mode : '',
                                'Product': item.product_name,
                                'Qty': item.qty,
                                'Price': item.price,
                                'Line Total': item.total
                            })
                        })
                    }
                })

                const csvText = Papa.unparse(csvRows)
                const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `MyBizz_Audit_${fromDate}_to_${toDate}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
            }

            setMessage(`Success! Exported ${data.invoices.length} invoices.`)
        } catch (err: any) {
            setMessage('Export failed: ' + err.message)
        } finally {
            setIsExporting(false)
        }
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        setImportMessage('Parsing archive file...')

        try {
            const text = await file.text()
            const jsonData = JSON.parse(text)

            setImportMessage('Re-injecting historical records...')
            const result = await importGhostArchive(jsonData)

            if (result.error) {
                setImportMessage(result.error)
            } else {
                setImportMessage('Successfully restored history!')
            }
        } catch (err: any) {
            setImportMessage('Invalid JSON file format.')
        } finally {
            setIsImporting(false)
            e.target.value = '' // reset input
        }
    }

    return (
        <section className="mb-12">
            <div className="flex items-center space-x-3 mb-5">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Step 2 — Ghost Archival (Sales History)</span>
                <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <details className="bg-amber-50 border border-amber-200 rounded-2xl p-6 group">
                <summary className="font-bold text-amber-900 flex items-center space-x-2 cursor-pointer list-none outline-none">
                    <span>🗄️</span>
                    <span>Export Bills (JSON Archive)</span>
                    <span className="ml-auto text-amber-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>

                <div className="mt-4 pt-4 border-t border-amber-200">
                    <p className="text-sm text-amber-800 font-medium mb-4 leading-relaxed">
                        Export invoices for any date range as a <code className="bg-amber-100 px-1 rounded text-xs">.json</code> archive.
                        After export you can safely delete the old bills from the system to keep it fast.
                        <strong> Stock quantities and Udhaari balances are NEVER affected by this operation.</strong>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl border border-amber-200 p-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Export Bills</p>

                            {message && (
                                <div className="mb-3 p-2 bg-slate-50 text-xs font-bold text-slate-700 rounded border border-slate-200">
                                    {message}
                                </div>
                            )}

                            <div className="space-y-2 mb-3">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                                />
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400"
                                />
                            </div>
                            <div className="flex flex-col xl:flex-row gap-2">
                                <button
                                    onClick={() => handleExport('csv')}
                                    disabled={isExporting}
                                    className="w-full bg-emerald-600 text-white text-[11px] font-black py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    {isExporting ? 'PACKAGING...' : 'EXPORT EXCEL (CSV)'}
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    disabled={isExporting}
                                    className="w-full bg-slate-800 text-white text-[11px] font-black py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
                                >
                                    {isExporting ? 'PACKAGING...' : 'APP BACKUP (JSON)'}
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-amber-200 p-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Re-import Archive</p>

                            {importMessage && (
                                <div className="mb-3 p-2 bg-slate-50 text-xs font-bold text-slate-700 rounded border border-slate-200">
                                    {importMessage}
                                </div>
                            )}

                            <p className="text-[11px] text-slate-500 mb-3 font-medium">Upload a previously exported .json file to restore it back into Sales History view. Will not affect Math.</p>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                disabled={isImporting}
                                className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer mb-3"
                            />
                            <button disabled className="w-full bg-slate-200 text-slate-500 text-xs font-black py-2.5 rounded-lg opacity-50">
                                {isImporting ? 'RESTORING DATA...' : 'SELECT FILE ABOVE'}
                            </button>
                        </div>
                    </div>
                </div>
            </details>
        </section>
    )
}
