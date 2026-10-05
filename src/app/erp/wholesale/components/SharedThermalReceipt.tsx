import React, { useState, useEffect } from 'react'

interface SharedThermalReceiptProps {
    variant: 'sale' | 'purchase';
    language: 'ENG' | 'MAR';
    shopInfo: {
        name: string;
        name_mr?: string | null;
        address?: string | null;
        address_mr?: string | null;
        phone?: string | null;
    };
    billRef?: string;
    customerOrSupplierName?: string;
    cart: any[];
    subtotal: number;
    discount?: number;
    oldDue: number;
    netPayable: number;
    amountPaid: number;
    newDueAdded: number;
    paymentMethod?: 'CASH' | 'ONLINE';
    timestamp?: Date | string | null;
}

export default function SharedThermalReceipt({
    variant,
    language,
    shopInfo,
    billRef,
    customerOrSupplierName,
    cart,
    subtotal,
    discount = 0,
    oldDue,
    netPayable,
    amountPaid,
    newDueAdded,
    paymentMethod,
    timestamp
}: SharedThermalReceiptProps) {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setHydrated(true);
    }, []);

    const isMar = language === 'MAR'

    // Multi-variant bilingual dictionary
    const dict = {
        ENG: {
            saleTitle: "BILL",
            purchaseTitle: "PURCHASE ENTRY",
            sn: "Sr.No",
            item: "ITEM",
            qty: "QTY",
            rate: "RATE",
            total: "TOTAL",
            subtotal: "Current Bill",
            discount: "Discount",
            oldDue: "Old Due",
            netPayable: variant === 'sale' ? "Total Payable" : "TOTAL PURCHASE",
            amountPaid: variant === 'sale' ? "Amount Paid" : "Paid Today",
            newDueAdded: variant === 'sale' ? "New Udhaari Added" : "Added Supplier Debt",
            date: "Date",
            billNo: "Bill No",
            thanks: variant === 'sale' ? "Thank you for your business!" : "Purchase Receipt",
            power: "Powered by MyBizz ERP",
            entityLabel: variant === 'sale' ? "BILL TO" : "Supplier"
        },
        MAR: {
            saleTitle: "पावती",
            purchaseTitle: "खरेदी पावती (PURCHASE ENTRY)",
            sn: "क्र",
            item: "तपशील",
            qty: "संख्या",
            rate: "दर",
            total: "रक्कम",
            subtotal: "आजचे बिल",
            discount: "सवलत",
            oldDue: "मागील बाकी",
            netPayable: variant === 'sale' ? "एकूण देय" : "TOTAL PURCHASE",
            amountPaid: variant === 'sale' ? "जमा रक्कम" : "आज जमा",
            newDueAdded: variant === 'sale' ? "नवीन बाकी" : "Added Supplier Debt",
            date: "दिनांक",
            billNo: variant === 'sale' ? "बिल क्र." : "पावती क्र",
            thanks: variant === 'sale' ? "भेट दिल्याबद्दल धन्यवाद!" : "खरेदी पावती",
            power: "Powered by MyBizz ERP",
            entityLabel: variant === 'sale' ? "BILL TO" : "पुरवठादार (Supplier)"
        }
    }

    const t = dict[language]

    return (
        <div className="w-[72mm] m-0 p-[5px] text-black bg-white" style={{ fontFamily: "'Courier New', monospace" }}>
            <div className={`text-center mb-4 ${variant === 'purchase' ? 'border-b-2 border-black pb-3' : 'mb-6'}`}>
                <h2 className="text-2xl font-black tracking-tighter uppercase">
                    {isMar && shopInfo.name_mr ? shopInfo.name_mr : (shopInfo.name || "YOUR SHOP NAME")}
                </h2>

                <p className="text-xs font-sans mt-1 text-slate-800">
                    {isMar && shopInfo.address_mr ? shopInfo.address_mr : (shopInfo.address || "Address")}
                </p>
                <p className="text-xs font-sans text-slate-800">Contact: {shopInfo.phone || ""}</p>
                <hr className={`my-3 border-dashed ${variant === 'purchase' ? 'border-slate-300' : 'border-slate-400'}`} />
                {variant === 'purchase' && (
                    <p className="text-xs font-bold mt-1">** {t.purchaseTitle} **</p>
                )}
            </div>

            <div className={`flex justify-between text-xs mb-3 font-bold ${variant === 'purchase' ? 'border-b border-dashed border-slate-300 pb-2' : 'mb-4'}`}>
                <div>
                    <p><strong>{t.billNo}:</strong> {billRef || '#INV-PREVIEW'}</p>
                    <p><strong>{t.date}:</strong> {hydrated ? (timestamp ? new Date(timestamp).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')) : '--/--/----'}</p>
                </div>
                <div className="text-right">
                    <p><strong>Time:</strong> {hydrated ? (timestamp ? new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })) : '--:--'}</p>
                </div>
            </div>

            {customerOrSupplierName && (
                <div className={`text-xs font-bold mb-3 ${variant === 'purchase' ? 'border-b border-dashed border-slate-300 pb-2 uppercase text-left' : 'p-2 bg-slate-50 border border-slate-200 rounded'}`}>
                    <p>{t.entityLabel}: {customerOrSupplierName}</p>
                </div>
            )}

            <table className={`w-full text-[11px] mb-3 ${variant === 'purchase' ? 'text-left' : ''}`}>
                <thead>
                    <tr className={`${variant === 'purchase' ? 'border-b border-black uppercase font-bold' : 'border-y border-dashed border-slate-400 font-bold'}`}>
                        <th className={`py-1 w-8 pr-1 text-left`}>{t.sn}</th>
                        <th className={`py-1 pl-1 ${variant === 'purchase' ? 'w-5/12 text-left' : 'text-left'}`}>{t.item}</th>
                        <th className={`py-1 ${variant === 'purchase' ? 'w-2/12 text-center' : 'text-center'}`}>{t.qty}</th>
                        <th className={`py-1 ${variant === 'purchase' ? 'w-2/12 text-right' : 'text-right'}`}>{t.rate}</th>
                        <th className={`py-1 ${variant === 'purchase' ? 'w-3/12 text-right' : 'text-right'}`}>{t.total}</th>
                    </tr>
                </thead>
                <tbody className="align-top">
                    {cart.map((item: any, idx: number) => {
                        const ItemName = isMar ? (item.name_mr || item.name) : item.name;
                        const ItemQty = item.qty;
                        // Use buy_rate for purchase, rate for sales
                        const ItemRate = variant === 'purchase' ? item.buy_rate : item.rate;
                        const ItemTotal = variant === 'purchase' ? item.total : (item.qty * item.rate);

                        return (
                            <tr key={item.tempId || item.id || idx} className={`border-b ${variant === 'purchase' ? 'border-dashed border-slate-200' : 'border-slate-100 border-dashed'}`}>
                                <td className="py-1 pr-1 font-bold text-slate-500 text-left">{idx + 1}</td>
                                <td className={`py-1 pl-1 pr-1 font-bold truncate ${variant === 'purchase' ? 'max-w-[70px]' : 'max-w-[85px]'}`}>{ItemName}</td>
                                <td className="py-1 text-center font-bold px-1">{ItemQty}</td>
                                <td className="py-1 text-right">{Number(ItemRate).toFixed(0)}</td>
                                <td className={`py-1 text-right font-black ${variant === 'purchase' ? 'text-[12px]' : ''}`}>
                                    {variant === 'purchase' ? '₹' : ''}{Number(ItemTotal).toFixed(0)}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {variant === 'sale' && <hr className="my-2 border-dashed border-slate-400" />}

            <div className={`${variant === 'purchase' ? 'border-t-2 border-black pt-2 mb-4' : 'space-y-1 text-right text-xs'}`}>
                {/* Sale Math Block vs Purchase Math Block */}
                {variant === 'sale' ? (
                    <>
                        <div className="flex justify-between text-slate-800">
                            <span>{t.subtotal}:</span>
                            <span className="font-bold">₹{subtotal.toFixed(0)}</span>
                        </div>

                        {discount > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>{t.discount}:</span>
                                <span>₹{discount.toFixed(0)}</span>
                            </div>
                        )}

                        {oldDue > 0 && (
                            <div className="flex justify-between text-slate-600">
                                <span>{t.oldDue}:</span>
                                <span>₹{oldDue.toFixed(0)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-slate-300">
                            <span>{t.netPayable}:</span>
                            <span>₹{netPayable.toFixed(0)}</span>
                        </div>

                        <div className="flex justify-between text-slate-800 pt-2">
                            <span>{t.amountPaid}:</span>
                            <span>₹{amountPaid.toFixed(0)} {paymentMethod ? `(${paymentMethod})` : ''}</span>
                        </div>

                        {(newDueAdded !== 0 || oldDue > 0) && (
                            <div className={`flex justify-between font-bold mt-1 ${oldDue + newDueAdded < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <span>{oldDue + newDueAdded < 0 ? (language === 'MAR' ? 'आगाऊ जमा (Advance)' : 'Advance Paid') : (language === 'MAR' ? 'नवीन बाकी (Total Due)' : 'Total Due')}:</span>
                                <span>₹{Math.abs(oldDue + newDueAdded).toFixed(0)}</span>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center text-lg font-black mt-1">
                            <span>{t.netPayable}</span>
                            <span>₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        {amountPaid > 0 && (
                            <div className="flex justify-between text-[11px] font-bold mt-1 text-slate-600 border-t border-dashed border-slate-300 pt-2 text-right w-full">
                                <span className="w-full text-right">{t.amountPaid}: ₹{amountPaid.toFixed(2)}</span>
                            </div>
                        )}
                    </>
                )}
            </div>

            {variant === 'sale' ? (
                <hr className="my-6 border-dashed border-slate-400" />
            ) : null}

            <div className={`text-center ${variant === 'purchase' ? 'mt-6 border-t border-dashed border-slate-300 pt-3' : 'text-xs text-slate-600'}`}>
                <p className={`${variant === 'purchase' ? 'text-[10px] font-bold' : 'font-bold mb-1'}`}>{t.thanks}</p>
                <p className={`text-[10px] ${variant === 'purchase' ? 'font-bold' : ''}`}>{t.power}</p>
            </div>
        </div>
    )
}
