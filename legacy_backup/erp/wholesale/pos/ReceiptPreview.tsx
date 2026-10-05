import { X } from 'lucide-react'
import { Fragment } from 'react'

const t = {
    en: {
        title: "BIll",
        sn: "Sr.No", item: "ITEM", qty: "QTY", rate: "RATE", total: "TOTAL",
        subtotal: "Current Bill", oldDue: "Old Due", netPayable: "Total Payable",
        amountPaid: "Amount Paid", newDueAdded: "New Udhaari Added",
        date: "Date", billNo: "Bill No",
        thanks: "Thank you for your business!"
    },
    mr: {
        title: "पावती",
        sn: "क्र", item: "तपशील", qty: "संख्या", rate: "दर", total: "रक्कम",
        subtotal: "आजचे बिल", oldDue: "मागील बाकी", netPayable: "एकूण देय",
        amountPaid: "जमा रक्कम", newDueAdded: "नवीन बाकी",
        date: "दिनांक", billNo: "बिल क्र.",
        thanks: "भेट दिल्याबद्दल धन्यवाद!"
    }
}

export default function ReceiptPreview({
    cart,
    customer,
    lang,
    shopInfo,
    grandTotal,
    amountReceived,
    onClose,
    isEmbedded = false,
    invoiceNo
}: {
    cart: any[],
    customer: any | null,
    shopInfo: any | null,
    lang: 'en' | 'mr',
    grandTotal: number,
    discount?: number,
    amountReceived: string,
    onClose: () => void,
    isEmbedded?: boolean,
    invoiceNo?: string
}) {
    const d = t[lang]
    const oldDue = customer?.total_credit || 0
    const netPayable = grandTotal + oldDue
    const paid = amountReceived ? parseFloat(amountReceived) : netPayable
    const newUdhaari = Math.max(0, netPayable - paid)

    const shopName = (lang === 'mr' && shopInfo?.shop_name_mr) ? shopInfo.shop_name_mr : (shopInfo?.shop_name || "YOUR SHOP NAME")
    const shopAddress = (lang === 'mr' && shopInfo?.address_mr) ? shopInfo.address_mr : (shopInfo?.address || "Please update your address in Settings")
    const shopPhone = shopInfo?.phone_number || "Update phone in Settings"

    const InnerContent = (
        <Fragment>
            <style>{`
                @media print {
                    @page { margin: 0; size: 80mm 297mm; }
                    body { margin: 0; padding: 0; background: white; }
                    .hide-on-print { display: none !important; }
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
            {/* Header Actions (Only show in pure Modal mode) */}
            {!isEmbedded && (
                <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-slate-200 hide-on-print">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Preview ({lang.toUpperCase()})
                    </span>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Receipt Paper */}
            <div className="p-4 sm:p-6 overflow-y-auto text-black font-mono text-sm bg-white print-section h-full mx-auto w-full max-w-[80mm] sm:max-w-none">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black tracking-tighter">{shopName.toUpperCase()}</h2>
                    <p className="text-xs text-slate-600 font-sans mt-1">{shopAddress}</p>
                    <p className="text-xs text-slate-600 font-sans">Contact: {shopPhone}</p>
                    <hr className="my-3 border-dashed border-slate-400" />
                </div>

                <div className="flex justify-between text-xs mb-4">
                    <div>
                        <p><strong>{d.billNo}:</strong> {invoiceNo || `#INV-01`}</p>
                        <p><strong>{d.date}:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                {customer && (
                    <div className="mb-4 p-2 bg-slate-50 border border-slate-200 rounded">
                        <p className="font-bold text-xs">BILL TO: {customer.name}</p>
                    </div>
                )}

                <table className="w-full text-[11px] mb-4">
                    <thead>
                        <tr className="border-y border-dashed border-slate-400 font-bold">
                            <th className="py-2 text-left w-6">{d.sn}</th>
                            <th className="py-2 text-left">{d.item}</th>
                            <th className="py-2 text-center">{d.qty}</th>
                            <th className="py-2 text-right">{d.rate}</th>
                            <th className="py-2 text-right">{d.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, idx) => {
                            let displayName = item.name
                            if (lang === 'mr' && item.name_mr) displayName = item.name_mr

                            // Calculate back the unit rate if not provided directly
                            const quantity = item.qty || item.quantity || 1
                            const unitPrice = item.unit_price || item.sell_rate || (item.total / quantity)

                            return (
                                <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                                    <td className="py-2 text-left font-bold text-slate-500">{idx + 1}</td>
                                    <td className="py-2 truncate max-w-[90px] pr-1">{displayName}</td>
                                    <td className="py-2 text-center">{quantity}</td>
                                    <td className="py-2 text-right">{unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                    <td className="py-2 text-right">{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                <hr className="my-2 border-dashed border-slate-400" />

                <div className="space-y-1 text-right text-xs">
                    <div className="flex justify-between text-slate-800">
                        <span>{d.subtotal}:</span>
                        <span className="font-bold">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>

                    {oldDue > 0 && (
                        <div className="flex justify-between text-slate-600">
                            <span>{d.oldDue}:</span>
                            <span>₹{oldDue.toLocaleString('en-IN')}</span>
                        </div>
                    )}

                    <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-slate-300">
                        <span>{d.netPayable}:</span>
                        <span>₹{netPayable.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-slate-800 pt-2">
                        <span>{d.amountPaid}:</span>
                        <span>₹{paid.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between text-rose-600 font-bold mt-1">
                        <span>{d.newDueAdded}:</span>
                        <span>₹{newUdhaari.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <hr className="my-6 border-dashed border-slate-400" />

                <div className="text-center text-xs text-slate-600">
                    <p className="font-bold mb-1">{d.thanks}</p>
                    <p className="text-[10px]">Powered by MyBizz ERP</p>
                </div>

            </div>
        </Fragment>
    )

    if (isEmbedded) {
        return (
            <div className="bg-white w-full h-full flex flex-col">
                {InnerContent}
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {InnerContent}
            </div>
        </div>
    )
}
