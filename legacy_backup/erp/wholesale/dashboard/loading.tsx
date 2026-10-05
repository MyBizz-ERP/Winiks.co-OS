export default function Loading() {
    return (
        <div className="p-8 animate-pulse">
            {/* Header skeleton */}
            <div className="mb-8">
                <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2"></div>
                <div className="h-4 w-96 bg-slate-100 rounded"></div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="h-3 w-24 bg-slate-200 rounded mb-3"></div>
                        <div className="h-8 w-32 bg-slate-200 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Quick actions skeleton */}
            <div className="h-4 w-28 bg-slate-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
                        <div className="h-8 w-8 bg-slate-200 rounded mb-3"></div>
                        <div className="h-4 w-24 bg-slate-200 rounded mb-1"></div>
                        <div className="h-3 w-16 bg-slate-100 rounded"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
