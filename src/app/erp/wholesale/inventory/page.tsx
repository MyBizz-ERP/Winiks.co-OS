import { getInventory } from "./actions"
import { InventoryClient } from "./components/InventoryClient"

export default async function InventoryPage() {
    const response = await getInventory()

    if (!response.success) {
        return (
            <div className="flex h-full items-center justify-center fade-in animate-in duration-500">
                <div className="p-8 bg-rose-50/80 border border-rose-100 rounded-2xl text-rose-600 max-w-lg text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
                    <p className="font-semibold text-lg mb-2">Architectural Lockout</p>
                    <p className="text-sm opacity-90">{response.error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-8 fade-in animate-in duration-1000 relative">

            {/* Ambient Background Glow matching Layout */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 z-10">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight text-slate-900 leading-tight">Inventory Matrix</h1>
                    <p className="text-[15px] text-slate-500 mt-1 max-w-xl leading-relaxed">
                        Centrally manage your wholesale stock nodes, strict pricing tiers, and regional linguistic boundaries at scale.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden transition-all shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] z-10 relative">
                <InventoryClient initialData={response.data || []} />
            </div>
        </div>
    )
}
