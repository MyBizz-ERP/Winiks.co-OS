import { ReactNode } from 'react'
import { logout } from '@/app/admin/login/actions'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // If the user is not authenticated, they are likely on the /admin/login page.
    // We don't want to show the sidebar there.
    if (!user) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
            {/* Persistent Super Admin Sidebar */}
            <aside className="w-full md:w-64 bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-800 shadow-xl z-10">
                <div className="p-6 border-b border-slate-900 bg-slate-900/50">
                    <h1 className="font-extrabold text-2xl tracking-tight">MyBizz<span className="text-blue-500">-ERP</span></h1>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Master Console</p>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    <Link href="/admin/dashboard" className="block px-4 py-3 rounded-lg bg-slate-900/80 text-white font-medium border border-slate-800 hover:bg-slate-800 transition-colors">
                        ⛑️ Dashboard Health
                    </Link>
                    <Link href="/admin/categories" className="block px-4 py-3 rounded-lg text-slate-400 font-medium hover:bg-slate-900 hover:text-white transition-colors">
                        📂 ERP Categories
                    </Link>
                    <Link href="/admin/shops" className="block px-4 py-3 rounded-lg text-slate-400 font-medium hover:bg-slate-900 hover:text-white transition-colors">
                        🏢 Tenant Shops
                    </Link>
                </nav>

                <div className="p-6 border-t border-slate-900 bg-slate-900/30">
                    <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logged In As</p>
                        <p className="text-sm text-slate-300 truncate mt-1">{user.email}</p>
                    </div>
                    <form action={logout}>
                        <button type="submit" className="w-full flex justify-center items-center px-4 py-2.5 text-sm text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg transition-colors font-medium border border-red-500/20">
                            Emergency Logout
                        </button>
                    </form>
                </div>
            </aside>

            {/* Dynamic Content Area */}
            <main className="flex-1 h-screen overflow-y-auto">
                {children}
            </main>
        </div>
    )
}
