import { X } from 'lucide-react'
import { Fragment } from 'react'

const t = {
    en: {
        title: "TAX INVOICE",
        item: "ITEM", qty: "QTY", rate: "RATE", total: "TOTAL",
        subtotal: "Current Bill", oldDue: "Old Due", netPayable: "Total Payable",
        amountPaid: "Amount Paid", newDueAdded: "New Udhaari Added",
        date: "Date", billNo: "Bill No",
        thanks: "Thank you for your business!"
    },
    hi: {
        title: "कर बीजक (INVOICE)",
        item: "विवरण", qty: "मात्रा", rate: "दर", total: "कुल",
        subtotal: "आज का बिल", oldDue: "पुराना बकाया", netPayable: "कुल देय",
        amountPaid: "जमा राशि", newDueAdded: "नया बकाया जोड़ा गया",
        date: "दिनांक", billNo: "बिल क्र.",
        thanks: "पधारने के लिए धन्यवाद!"
    },
    mr: {
        title: "कर पावती (INVOICE)",
        item: "तपशील", qty: "नग", rate: "दर", total: "एकूण",
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
    isEmbedded = false
}: {
    cart: any[],
    customer: any | null,
    shopInfo: any | null,
    lang: 'en' | 'hi' | 'mr',
    grandTotal: number,
    amountReceived: string,
    onClose: () => void,
    isEmbedded?: boolean
}) {
    const d = t[lang]
    const oldDue = customer?.total_credit || 0
    const netPayable = grandTotal + oldDue
    const paid = amountReceived ? parseFloat(amountReceived) : netPayable
    const newUdhaari = Math.max(0, netPayable - paid)

    const shopName = shopInfo?.shop_name || "YOUR SHOP NAME"
    const shopAddress = shopInfo?.address || "Please update your address in Settings"
    const shopPhone = shopInfo?.phone_number || "Update phone in Settings"

    const InnerContent = (
        <Fragment>
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
            <div className="p-6 overflow-y-auto text-black font-mono text-sm bg-white print-section h-full">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black tracking-tighter">{shopName.toUpperCase()}</h2>
                    <p className="text-xs text-slate-600 font-sans mt-1">{shopAddress}</p>
                    <p className="text-xs text-slate-600 font-sans">Contact: {shopPhone}</p>
                    <hr className="my-3 border-dashed border-slate-400" />
                    <h3 className="font-bold text-lg">{d.title}</h3>
                </div>

                <div className="flex justify-between text-xs mb-4">
                    <div>
                        <p><strong>{d.billNo}:</strong> #INV-{Math.floor(Math.random() * 10000)}</p>
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

                <table className="w-full text-xs mb-4">
                    <thead>
                        <tr className="border-y border-dashed border-slate-400 font-bold">
                            <th className="py-2 text-left">{d.item}</th>
                            <th className="py-2 text-center">{d.qty}</th>
                            <th className="py-2 text-right">{d.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item, idx) => {
                            let displayName = item.name
                            if (lang === 'hi' && item.name_hi) displayName = item.name_hi
                            if (lang === 'mr' && item.name_mr) displayName = item.name_mr

                            return (
                                <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                                    <td className="py-2 truncate max-w-[120px]">{displayName}</td>
                                    <td className="py-2 text-center">{item.qty || item.quantity}</td>
                                    <td className="py-2 text-right">{item.total.toLocaleString('en-IN')}</td>
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

                    {newUdhaari > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold">
                            <span>{d.newDueAdded}:</span>
                            <span>₹{newUdhaari.toLocaleString('en-IN')}</span>
                        </div>
                    )}
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
