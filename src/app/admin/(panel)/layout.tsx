import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Server, LogOut, LayoutGrid } from 'lucide-react'

export const metadata = {
    title: 'Super Admin Console | Winiks OS',
    robots: 'noindex, nofollow',
}

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()

    const { data: authData, error } = await supabase.auth.getUser()

    // If no session at all → go to admin login
    if (error || !authData?.user) {
        redirect('/admin/login')
    }

    // If session exists but not whitelisted → go to admin login (NOT /erp /login)
    const allowedEmails = (process.env.SUPER_ADMIN_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase())

    const userEmail = authData.user.email?.toLowerCase() || ''

    if (!allowedEmails.includes(userEmail)) {
        redirect('/admin/login')
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">

            {/* ADMIN HEADER — Only renders for authenticated panel routes */}
            <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <Link href="/admin" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-slate-800 font-bold tracking-tight text-[15px] leading-none">Winiks OS</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-none">Super Admin Console</p>
                    </div>
                </Link>

                <nav className="flex items-center gap-2">
                    <Link
                        href="/admin"
                        className="px-4 py-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-[13px] font-semibold text-slate-600 rounded-lg border border-slate-200 transition-all flex items-center gap-2"
                    >
                        <LayoutGrid className="w-3.5 h-3.5" /> All Verticals
                    </Link>
                    <div className="w-px h-5 bg-slate-200 mx-1" />
                    <div className="text-[12px] font-medium text-slate-400 px-2 hidden sm:block">
                        {userEmail}
                    </div>
                    <Link
                        href="/erp"
                        className="px-4 py-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-[13px] font-semibold text-slate-600 rounded-lg border border-slate-200 transition-all flex items-center gap-2"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Exit to ERP
                    </Link>
                </nav>
            </header>

            {/* MAIN CONTENT */}
            <main className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
                {children}
            </main>

        </div>
    )
}
