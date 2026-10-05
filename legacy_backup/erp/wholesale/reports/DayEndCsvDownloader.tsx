'use client'

import { Download } from 'lucide-react'

interface CsvDataProps {
    startIso: string
    endIso: string
    sales: number
    cogs: number
    profit: number
    inflow: number
    outflow: number
    netCash: number
}

export default function DayEndCsvDownloader({ startIso, endIso, sales, cogs, profit, inflow, outflow, netCash }: CsvDataProps) {
    const handleDownload = () => {
        let csv = `WINIKS ERP - FINANCIAL REPORT\n`
        csv += `Date Range: ${new Date(startIso).toLocaleDateString()} to ${new Date(endIso).toLocaleDateString()}\n\n`

        csv += `METRIC,VALUE (INR)\n`
        csv += `Gross Sales (Revenue),${sales}\n`
        csv += `Cost of Goods Sold (COGS),${cogs}\n`
        csv += `Net Realized Profit,${profit}\n`
        csv += `------------------,\n`
        csv += `Total Cash INFLOW,${inflow}\n`
        csv += `Total Cash OUTFLOW,${outflow}\n`
        csv += `Net Register Float,${netCash}\n`

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Financial_Report_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 text-xs tracking-widest uppercase border border-indigo-700"
        >
            <Download className="w-4 h-4" /> Download Report CSV
        </button>
    )
}
