import { loginTenant } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
    invalid_credentials: '❌ Wrong email or password. Please try again.',
    unauthorized_framework: '⚠️ Your account is not linked to any active ERP category. Contact your administrator.',
    suspended: '🚫 Your shop account has been suspended. Contact your administrator.',
}

// Next.js 16: searchParams is now async, must be awaited
export default async function TenantLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const params = await searchParams
    const errorMsg = params?.error ? ERROR_MESSAGES[params.error] || 'An unknown error occurred.' : null

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative overflow-hidden">
            {/* Background Atmosphere */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>

            <div className="w-full max-w-[420px] relative z-10">
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-1 bg-gradient-to-b from-white/10 to-transparent">
                    <div className="bg-white rounded-[2.25rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl mx-auto shadow-lg shadow-indigo-500/30 flex items-center justify-center mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                                <span className="text-white font-black text-2xl tracking-tighter">MB</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">MyBizz Workspace</h1>
                            <p className="text-slate-500 mt-2 text-sm font-medium">Access your assigned SaaS environment</p>
                        </div>

                        {/* VISUAL ERROR BANNER */}
                        {errorMsg && (
                            <div className="mb-6 p-4 bg-red-50/50 border border-red-200 text-red-600 font-bold text-sm rounded-2xl animate-in slide-in-from-top-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                {errorMsg.replace(/[❌🚫⚠️]/g, '')}
                            </div>
                        )}

                        <form action={loginTenant} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Assigned Shop ID</label>
                                <input type="text" name="shopId" required placeholder="1001" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm font-black placeholder-slate-300 text-indigo-700 hover:border-slate-300 tracking-wider" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Secure Protocol Code</label>
                                <input type="password" name="password" required placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm placeholder-slate-400 text-slate-900 hover:border-slate-300" />
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 tracking-widest text-[13px] uppercase mt-4">
                                Authorize Gateway
                            </button>
                        </form>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <p className="text-slate-500/70 text-xs font-bold uppercase tracking-widest">Powered by Winiks OS Orchestrator</p>
                </div>
            </div>
        </div>
    )
}
