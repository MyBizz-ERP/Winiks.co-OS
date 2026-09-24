export default function Loading() {
    return (
        <div className="p-8 animate-pulse text-center flex flex-col items-center justify-center h-full min-h-[500px]">
            <div className="text-4xl mb-4 animate-bounce">⚡</div>
            <div className="font-bold text-slate-400">Initializing Billing Engine & Offline Cache...</div>
        </div>
    )
}
