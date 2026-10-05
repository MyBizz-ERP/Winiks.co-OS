export default function Loading() {
    return (
        <div className="p-8 animate-pulse max-w-4xl mx-auto">
            <div className="mb-10">
                <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2"></div>
                <div className="h-4 w-96 bg-slate-100 rounded"></div>
            </div>
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                                <div>
                                    <div className="h-4 w-32 bg-slate-200 rounded mb-1"></div>
                                    <div className="h-3 w-48 bg-slate-100 rounded"></div>
                                </div>
                            </div>
                            <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
                        </div>
                        <div className="h-12 bg-slate-50 rounded-xl border border-slate-200"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}
