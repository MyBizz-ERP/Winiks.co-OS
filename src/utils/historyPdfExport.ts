import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface SalesBillForExport {
    id: string
    invoice_no?: number | string
    created_at: string
    customer_name?: string | null
    payment_method: string
    subtotal: number
    discount: number
    total_amount: number
    amount_paid: number
    items?: Array<{
        product_name?: string
        name?: string
        quantity?: number
        qty?: number
        rate?: number
        total?: number
    }>
}

export interface PurchaseBillForExport {
    id: string
    purchase_no?: number | string
    created_at: string
    supplier_name?: string | null
    payment_method: string
    total_amount: number
    amount_paid: number
    items?: Array<{
        product_name?: string
        name?: string
        quantity?: number
        qty?: number
        buy_rate?: number
        total_amount?: number | string
    }>
}

export function exportSalesHistoryPDF(
    bills: SalesBillForExport[],
    shop: { name: string; address?: string | null; phone?: string | null },
    filterLabel: string = 'ALL'
) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header styling
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text(shop.name.toUpperCase(), pageWidth / 2, 16, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139) // slate-500
    const metaLine = [shop.address, shop.phone ? `Phone: ${shop.phone}` : ''].filter(Boolean).join(' • ')
    if (metaLine) {
        doc.text(metaLine, pageWidth / 2, 22, { align: 'center' })
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(79, 70, 229) // indigo-600
    doc.text('OFFICIAL SALES REGISTER & AUDIT STATEMENT', pageWidth / 2, 29, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    const genDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    doc.text(`Period Filter: ${filterLabel} | Generated: ${genDate} | Total Invoices: ${bills.length}`, pageWidth / 2, 34, { align: 'center' })

    // Calculate Summary Metrics
    const totalGross = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0)
    const totalPaid = bills.reduce((acc, b) => acc + (b.amount_paid || 0), 0)
    const totalUdhaari = bills.reduce((acc, b) => acc + Math.max(0, (b.total_amount || 0) - (b.amount_paid || 0)), 0)

    // Metric Summary Box
    autoTable(doc, {
        startY: 38,
        head: [['TOTAL INVOICES', 'GROSS REVENUE (Rs.)', 'COLLECTED CASH/ONLINE (Rs.)', 'NET UDHAARI DEBT (Rs.)']],
        body: [[
            bills.length.toString(),
            totalGross.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
            totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
            totalUdhaari.toLocaleString('en-IN', { maximumFractionDigits: 0 })
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [71, 85, 105],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 10,
            fontStyle: 'bold',
            textColor: [15, 23, 42],
            halign: 'center'
        },
        margin: { left: 14, right: 14 }
    })

    // Construct Detailed Table Rows
    const tableRows: any[] = []

    bills.forEach((bill, idx) => {
        const billNo = bill.invoice_no ? `INV-${String(bill.invoice_no).padStart(4, '0')}` : bill.id.slice(0, 8).toUpperCase()
        const dateStr = bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
        const customer = bill.customer_name || 'Walk-in Customer'
        const due = Math.max(0, (bill.total_amount || 0) - (bill.amount_paid || 0))

        let itemsSummary = '-'
        if (bill.items && bill.items.length > 0) {
            itemsSummary = bill.items.map(i => `${i.product_name || i.name || 'Item'} (${i.quantity || i.qty}x)`).join(', ')
        }

        tableRows.push([
            (idx + 1).toString(),
            dateStr,
            billNo,
            customer,
            itemsSummary,
            bill.payment_method || 'CASH',
            `Rs. ${(bill.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            `Rs. ${(bill.amount_paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            due > 0 ? `Rs. ${due.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'PAID'
        ])
    })

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 55

    autoTable(doc, {
        startY: finalY,
        head: [['#', 'DATE', 'BILL NO', 'CUSTOMER', 'ITEMS SUMMARY', 'MODE', 'TOTAL (Rs.)', 'PAID (Rs.)', 'BALANCE (Rs.)']],
        body: tableRows,
        theme: 'striped',
        styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [79, 70, 229], // indigo-600
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            3: { halign: 'left', cellWidth: 32 },
            4: { halign: 'left', cellWidth: 42 },
            5: { halign: 'center', cellWidth: 16 },
            6: { halign: 'right', cellWidth: 16, fontStyle: 'bold' },
            7: { halign: 'right', cellWidth: 16 },
            8: { halign: 'right', cellWidth: 16, fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
            // Footer
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184)
            const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`
            doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' })
            doc.text('Winiks.co-OS • Official Sales Register Backup', 14, pageHeight - 8)
        },
        margin: { left: 14, right: 14, bottom: 15 }
    })

    const safeShopName = shop.name.replace(/[^a-zA-Z0-9]/g, '_')
    doc.save(`Sales_History_${safeShopName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportKharediHistoryPDF(
    bills: PurchaseBillForExport[],
    shop: { name: string; address?: string | null; phone?: string | null },
    filterLabel: string = 'ALL'
) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header styling
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text(shop.name.toUpperCase(), pageWidth / 2, 16, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    const metaLine = [shop.address, shop.phone ? `Phone: ${shop.phone}` : ''].filter(Boolean).join(' • ')
    if (metaLine) {
        doc.text(metaLine, pageWidth / 2, 22, { align: 'center' })
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(37, 99, 235) // blue-600
    doc.text('OFFICIAL KHAREDI (PURCHASE) REGISTER & AUDIT STATEMENT', pageWidth / 2, 29, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    const genDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    doc.text(`Period Filter: ${filterLabel} | Generated: ${genDate} | Total Inward Runs: ${bills.length}`, pageWidth / 2, 34, { align: 'center' })

    // Calculate Summary Metrics
    const totalPurchases = bills.reduce((acc, b) => acc + (b.total_amount || 0), 0)
    const totalPaid = bills.reduce((acc, b) => acc + (b.amount_paid || 0), 0)
    const totalDue = bills.reduce((acc, b) => acc + Math.max(0, (b.total_amount || 0) - (b.amount_paid || 0)), 0)

    // Metric Summary Box
    autoTable(doc, {
        startY: 38,
        head: [['TOTAL INWARD RUNS', 'TOTAL BOUGHT (Rs.)', 'PAID OUT TO SUPPLIERS (Rs.)', 'OUTSTANDING VENDOR DEBT (Rs.)']],
        body: [[
            bills.length.toString(),
            totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
            totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
            totalDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: [239, 246, 255],
            textColor: [30, 64, 175],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 10,
            fontStyle: 'bold',
            textColor: [15, 23, 42],
            halign: 'center'
        },
        margin: { left: 14, right: 14 }
    })

    // Construct Detailed Table Rows
    const tableRows: any[] = []

    bills.forEach((bill, idx) => {
        const billNo = bill.purchase_no ? `PUR-${String(bill.purchase_no).padStart(4, '0')}` : bill.id.slice(0, 8).toUpperCase()
        const dateStr = bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
        const supplier = bill.supplier_name || 'Local Vendor'
        const due = Math.max(0, (bill.total_amount || 0) - (bill.amount_paid || 0))

        let itemsSummary = '-'
        if (bill.items && bill.items.length > 0) {
            itemsSummary = bill.items.map(i => `${i.product_name || i.name || 'Item'} (${i.quantity || i.qty}x)`).join(', ')
        }

        tableRows.push([
            (idx + 1).toString(),
            dateStr,
            billNo,
            supplier,
            itemsSummary,
            bill.payment_method || 'CASH',
            `Rs. ${(bill.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            `Rs. ${(bill.amount_paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            due > 0 ? `Rs. ${due.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : 'CLEARED'
        ])
    })

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 55

    autoTable(doc, {
        startY: finalY,
        head: [['#', 'DATE', 'PURCHASE #', 'SUPPLIER (VENDOR)', 'ITEMS SUMMARY', 'MODE', 'TOTAL (Rs.)', 'PAID (Rs.)', 'PENDING DEBT (Rs.)']],
        body: tableRows,
        theme: 'striped',
        styles: {
            fontSize: 7.5,
            cellPadding: 2.5,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [37, 99, 235], // blue-600
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 8 },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            3: { halign: 'left', cellWidth: 32 },
            4: { halign: 'left', cellWidth: 42 },
            5: { halign: 'center', cellWidth: 16 },
            6: { halign: 'right', cellWidth: 16, fontStyle: 'bold' },
            7: { halign: 'right', cellWidth: 16 },
            8: { halign: 'right', cellWidth: 16, fontStyle: 'bold' }
        },
        didDrawPage: (data) => {
            // Footer
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184)
            const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`
            doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: 'right' })
            doc.text('Winiks.co-OS • Official Kharedi Register Backup', 14, pageHeight - 8)
        },
        margin: { left: 14, right: 14, bottom: 15 }
    })

    const safeShopName = shop.name.replace(/[^a-zA-Z0-9]/g, '_')
    doc.save(`Kharedi_History_${safeShopName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportSinglePurchaseBillPDF(
    bill: PurchaseBillForExport,
    shop: { name: string; address?: string | null; phone?: string | null }
) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const billNo = bill.purchase_no ? `PUR-${String(bill.purchase_no).padStart(4, '0')}` : bill.id.slice(0, 8).toUpperCase()
    const dateFormatted = bill.created_at ? new Date(bill.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }) : '-'

    // 1. Shop Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text(shop.name.toUpperCase(), pageWidth / 2, 16, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    const metaLine = [shop.address, shop.phone ? `Phone: ${shop.phone}` : ''].filter(Boolean).join('  •  ')
    if (metaLine) {
        doc.text(metaLine, pageWidth / 2, 22, { align: 'center' })
    }

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(14, 26, pageWidth - 14, 26)

    // 2. Title Banner
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(37, 99, 235) // blue-600
    doc.text('INWARD PURCHASE VOUCHER / KHAREDI BILL', pageWidth / 2, 33, { align: 'center' })

    // 3. Metadata 2-Column Info Card
    autoTable(doc, {
        startY: 37,
        body: [
            [
                { content: `Voucher / Bill No: ${billNo}\nDate & Time: ${dateFormatted}`, styles: { halign: 'left', fontStyle: 'bold' } },
                { content: `Supplier (Vendor): ${bill.supplier_name || 'Local Vendor'}\nPayment Mode: ${bill.payment_method || 'CASH'}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]
        ],
        theme: 'plain',
        styles: {
            fontSize: 9,
            textColor: [51, 65, 85],
            cellPadding: 2.5
        },
        margin: { left: 14, right: 14 }
    })

    // 4. Line Items Table
    const items = bill.items || []
    const itemRows = items.map((item, idx) => {
        const qty = item.quantity || item.qty || 1
        const rawRate = Number((item as any).buy_rate ?? (item as any).rate ?? 0)
        const rawTotal = Number((item as any).total_amount ?? (item as any).total ?? (qty * rawRate))
        return [
            (idx + 1).toString(),
            item.product_name || item.name || 'Item',
            qty.toString(),
            rawRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            rawTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]
    })

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 3 : 54

    autoTable(doc, {
        startY: finalY,
        head: [['#', 'ITEM DESCRIPTION', 'QTY', 'BUY RATE (Rs.)', 'LINE TOTAL (Rs.)']],
        body: itemRows.length > 0 ? itemRows : [['1', 'General Inward Goods', '1', Number(bill.total_amount).toFixed(2), Number(bill.total_amount).toFixed(2)]],
        theme: 'striped',
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            textColor: [30, 41, 59]
        },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontSize: 8.5,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'left', cellWidth: 84 },
            2: { halign: 'center', cellWidth: 22 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 34, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
    })

    // 5. Payment & Due Totals Box (Right aligned card)
    const tableEndY = (doc as any).lastAutoTable.finalY + 4
    const totalAmount = Number(bill.total_amount || 0)
    const amountPaid = Number(bill.amount_paid || 0)
    const due = Math.max(0, totalAmount - amountPaid)

    autoTable(doc, {
        startY: tableEndY,
        body: [
            ['Gross Inward Total:', `Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Amount Paid Out:', `Rs. ${amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Outstanding Vendor Due:', due > 0 ? `Rs. ${due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'CLEARED (Rs. 0.00)']
        ],
        theme: 'plain',
        styles: {
            fontSize: 9.5,
            cellPadding: 2,
            textColor: [15, 23, 42]
        },
        columnStyles: {
            0: { halign: 'right', fontStyle: 'bold', cellWidth: 126 },
            1: { halign: 'right', fontStyle: 'bold', cellWidth: 56 }
        },
        margin: { left: 14, right: 14 }
    })

    // 6. Signatures and Verification Footer
    const signY = Math.min((doc as any).lastAutoTable.finalY + 22, pageHeight - 24)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Authorized Receiver Signature', 20, signY)
    doc.text('Authorized Store Manager / Owner', pageWidth - 20, signY, { align: 'right' })

    doc.setDrawColor(203, 213, 225)
    doc.line(20, signY - 6, 68, signY - 6)
    doc.line(pageWidth - 68, signY - 6, pageWidth - 20, signY - 6)

    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`Official computer-generated purchase voucher • Winiks ERP • Bill ID: ${bill.id}`, pageWidth / 2, pageHeight - 8, { align: 'center' })

    doc.save(`Purchase_Bill_${billNo}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
