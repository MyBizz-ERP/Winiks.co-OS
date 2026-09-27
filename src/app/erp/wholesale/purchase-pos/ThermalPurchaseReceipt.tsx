export default function ThermalPurchaseReceipt({
    transaction,
    shopInfo
}: {
    transaction: any,
    shopInfo: any
}) {
    const d = new Date(transaction.created_at)

    return (
        <div className="w-[300px] bg-white p-4 text-black font-sans text-sm leading-tight pb-8">
            {/* Header */}
            <div className="text-center mb-4 border-b-2 border-black pb-3">
                <h1 className="text-xl font-black uppercase tracking-tight">{shopInfo?.shop_name || 'My Shop'}</h1>
                <p className="text-xs uppercase font-bold mt-1">** KHAREDI (PURCHASE ENTRY) **</p>
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
                Supplier: {transaction.supplier_name || 'Local Vendor'}
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left mb-3">
                <thead>
                    <tr className="border-b border-black uppercase font-bold">
                        <th className="py-1 w-7/12">Item</th>
                        <th className="py-1 w-2/12 text-center">Qty</th>
                        <th className="py-1 w-3/12 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="align-top">
                    {transaction.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-dashed border-slate-200">
                            <td className="py-1 font-bold">{item.product_name_mr || item.product_name}</td>
                            <td className="py-1 text-center font-bold px-1">{item.quantity}</td>
                            <td className="py-1 text-right font-black">₹{item.total_price}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals Box */}
            <div className="border-t-2 border-black pt-2 mb-4">
                <div className="flex justify-between items-center text-lg font-black mt-1">
                    <span>TOTAL PURCHASE</span>
                    <span>₹{transaction.grand_total.toLocaleString()}</span>
                </div>
            </div>

            <div className="text-center mt-6 border-t border-dashed border-slate-300 pt-3">
                <p className="text-[10px] font-bold">Stock computationally synced.</p>
                <p className="text-[10px] font-bold">Generated via WINIKS ERP.</p>
            </div>
        </div>
    )
}
