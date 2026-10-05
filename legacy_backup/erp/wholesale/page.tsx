export default function WholesaleDashboardPage() {
    return (
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Sales POS (Terminal)</h1>
                <p className="text-sm text-zinc-400 mt-1">
                    The enterprise Point of Sale interface is currently under construction.
                    This screen will feature real-time Dexie.js offline-first calculations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Dummy stats for visual testing */}
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Today's Inflow</p>
                    <p className="text-3xl font-black text-emerald-500">₹0.00</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Udhaari Recovered</p>
                    <p className="text-3xl font-black text-blue-500">₹0.00</p>
                </div>
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Pending Due</p>
                    <p className="text-3xl font-black text-red-500">₹0.00</p>
                </div>
            </div>
        </div>
    )
}
