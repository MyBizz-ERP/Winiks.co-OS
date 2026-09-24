export default function Loading() {
    return (
        <div className="p-8 animate-pulse">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <div className="h-8 w-56 bg-slate-200 rounded-lg mb-2"></div>
                    <div className="h-4 w-80 bg-slate-100 rounded"></div>
                </div>
                <div className="h-10 w-40 bg-slate-200 rounded-lg"></div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="h-3 w-20 bg-slate-200 rounded mb-3"></div>
                        <div className="h-8 w-16 bg-slate-200 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-3 bg-slate-200 rounded"></div>)}
                </div>
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="px-6 py-5 border-b border-slate-100 grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-slate-200 rounded"></div>
                            <div className="h-3 w-20 bg-slate-100 rounded"></div>
                        </div>
                        <div className="h-8 w-16 bg-slate-100 rounded-lg self-center"></div>
                        <div className="h-4 w-12 bg-slate-100 rounded self-center"></div>
                        <div className="h-5 w-20 bg-slate-100 rounded-full self-center"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
