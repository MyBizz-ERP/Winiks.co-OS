export default function ThermalPurchaseReceipt({
    transaction,
    shopInfo,
    lang = 'mr'
}: {
    transaction: any,
    shopInfo: any,
    lang?: 'en' | 'mr'
}) {
    const d = new Date(transaction.created_at)

    const t = {
        en: {
            title: "PURCHASE ENTRY",
            sn: "Sr.No", item: "ITEM", qty: "QTY", rate: "RATE", total: "TOTAL",
            supplier: "Supplier", totalLabel: "TOTAL PURCHASE",
            footer1: "Stock computationally synced.", footer2: "Generated via WINIKS ERP."
        },
        mr: {
            title: "खरेदी पावती (PURCHASE ENTRY)",
            sn: "क्र", item: "तपशील", qty: "संख्या", rate: "दर", total: "रक्कम",
            supplier: "पुरवठादार (Supplier)", totalLabel: "TOTAL PURCHASE",
            footer1: "Stock computationally synced.", footer2: "Generated via WINIKS ERP."
        }
    }
    const dLang = t[lang]

    return (
        <div className="bg-white p-2 text-black font-sans text-sm leading-tight pb-8 print-section mx-auto w-full max-w-[80mm] sm:max-w-none">
            <style>{`
                @media print {
                    @page { margin: 0; size: 80mm 297mm; }
                    body { margin: 0; padding: 0; background: white; }
                    .print-section {
                        width: 80mm !important;
                        max-width: 80mm !important;
                        margin: 0 !important;
                        padding: 2mm !important;
                        font-size: 12px !important;
                        box-sizing: border-box !important;
                    }
                    /* Ensure no other structural elements render */
                    body * { visibility: hidden; }
                    .print-section, .print-section * { visibility: visible; }
                    .print-section { position: absolute; left: 0; top: 0; }
                }
            `}</style>
            {/* Header */}
            <div className="text-center mb-4 border-b-2 border-black pb-3">
                <h1 className="text-xl font-black uppercase tracking-tight">{shopInfo?.shop_name || 'My Shop'}</h1>
                <p className="text-xs font-bold mt-1">** {dLang.title} **</p>
            </div>

            {/* Meta */}
            <div className="flex justify-between text-xs mb-3 font-bold border-b border-dashed border-slate-300 pb-2">
                <div>
                    <p>Bill: {transaction.id}</p>
                    <p>Date: {d.toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right">
                    <p>Time: {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p>Mode: {transaction.payment_mode}</p>
                </div>
            </div>

            <div className="text-xs font-bold mb-3 border-b border-dashed border-slate-300 pb-2 uppercase text-left">
                {dLang.supplier}: {transaction.supplier_name || 'Local Vendor'}
            </div>

            {/* Items Table */}
            <table className="w-full text-[11px] text-left mb-3">
                <thead>
                    <tr className="border-b border-black uppercase font-bold">
                        <th className="py-1 text-left w-6">{dLang.sn}</th>
                        <th className="py-1 w-6/12">{dLang.item}</th>
                        <th className="py-1 w-2/12 text-center">{dLang.qty}</th>
                        <th className="py-1 w-2/12 text-right">{dLang.rate}</th>
                        <th className="py-1 w-3/12 text-right">{dLang.total}</th>
                    </tr>
                </thead>
                <tbody className="align-top">
                    {transaction.items.map((item: any, idx: number) => {
                        const quantity = item.qty || item.quantity || 1
                        const unitPrice = item.unit_price || item.sell_rate || (item.total_price / quantity) || (item.total / quantity)

                        return (
                            <tr key={idx} className="border-b border-dashed border-slate-200">
                                <td className="py-1 font-bold text-slate-500">{idx + 1}</td>
                                <td className="py-1 font-bold truncate max-w-[80px]">{item.product_name_mr || item.product_name}</td>
                                <td className="py-1 text-center font-bold px-1">{quantity}</td>
                                <td className="py-1 text-right">{unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                <td className="py-1 text-right font-black">₹{item.total_price || item.total}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* Totals Box */}
            <div className="border-t-2 border-black pt-2 mb-4">
                <div className="flex justify-between items-center text-lg font-black mt-1">
                    <span>{dLang.totalLabel}</span>
                    <span>₹{transaction.grand_total.toLocaleString()}</span>
                </div>
            </div>

            <div className="text-center mt-6 border-t border-dashed border-slate-300 pt-3">
                <p className="text-[10px] font-bold">{dLang.footer1}</p>
                <p className="text-[10px] font-bold">{dLang.footer2}</p>
            </div>
        </div>
    )
}
