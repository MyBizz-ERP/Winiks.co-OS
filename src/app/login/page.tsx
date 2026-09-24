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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-10 animate-in fade-in zoom-in-95 duration-500">

                <div className="text-center mb-10">
                    <div className="text-4xl mb-4">🏪</div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tenant Gateway</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Enter the credentials provided by your system administrator.</p>
                </div>

                {/* VISUAL ERROR BANNER */}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 font-bold text-sm rounded-xl animate-in fade-in">
                        {errorMsg}
                    </div>
                )}

                <form action={loginTenant} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Assigned Email</label>
                        <input type="email" name="email" required placeholder="owner@shop.com" className="w-full px-5 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition shadow-sm font-medium" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Secure Password</label>
                        <input type="password" name="password" required placeholder="••••••••" className="w-full px-5 py-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none transition shadow-sm" />
                    </div>

                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition shadow hover:shadow-md tracking-wider">
                        AUTHORIZE ACCESS
                    </button>
                </form>

            </div>
        </div>
    )
}
