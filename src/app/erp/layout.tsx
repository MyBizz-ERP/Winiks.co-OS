import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { createClient } from '@/utils/supabase/server'
import { db } from '@/db'
import { shops } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import SaaSPaywall from "./components/SaaSPaywall"
import MobileFloatingDock from '@/components/mobile-dock'

export const dynamic = 'force-dynamic'

export default async function ERPRootLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()

    // Hard check for active authentication
    if (!authData?.user) redirect('/login')

    // Find the master tenant associated with the logged-in User
    const [shop] = await db.select().from(shops).where(eq(shops.owner_id, authData.user.id))

    if (!shop) {
        // Handle Edge Case: User has an account, but Super Admin hasn't provisioned a Sandbox yet.
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-center text-slate-500 font-medium">
                Tenant provisioning pending. Please contact your system administrator.
            </div>
        )
    }

    // Monetization Vector: Verify if current server time exceeds the subscription end date limit
    const isExpired = new Date() > new Date(shop.subscription_end_date)

    return (
        <TooltipProvider>
            <SidebarProvider defaultOpen={true}>
                {!isExpired && <AppSidebar />}

                <main className="flex-1 w-full flex flex-col relative bg-[#f9fafb] text-slate-900 min-h-screen">

                    {/* Only render header and background meshes if the system is unlocked */}
                    {!isExpired && (
                        <>
                            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-indigo-50/60 to-transparent pointer-events-none z-0"></div>

                            <header className="h-[76px] lg:m-4 lg:mt-6 lg:rounded-[2rem] border-b lg:border border-black/[0.04] lg:border-white/40 flex items-center justify-between px-6 lg:px-8 sticky top-0 lg:top-4 bg-white/70 backdrop-blur-3xl z-40 transition-all shadow-[0_4px_24px_-12px_rgba(0,0,0,0.05)] lg:shadow-2xl">
                                <div className="flex items-center gap-4 lg:gap-6">
                                    <SidebarTrigger className="text-slate-500 hover:text-indigo-600 transition-all duration-300 bg-white shadow-sm hover:shadow-md hover:bg-indigo-50 p-2.5 rounded-xl border border-slate-200/60" />
                                    <div className="w-[1px] h-8 bg-slate-200/80 hidden sm:block"></div>
                                    <div className="flex flex-col hidden sm:flex">
                                        <span className="font-extrabold text-[17px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 leading-none">{shop.name}</span>
                                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.15em] mt-1.5 opacity-90">Enterprise Wholesale</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="relative group cursor-pointer flex items-center gap-4 bg-white/40 backdrop-blur-lg border border-slate-200/50 shadow-sm rounded-full pl-5 pr-1.5 py-1.5 hover:shadow-xl hover:border-indigo-200/60 hover:bg-white/80 transition-all duration-500 ease-out">
                                        <div className="flex flex-col items-end mr-1">
                                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                                                Server Node
                                            </span>
                                            <span className="text-[14px] font-bold tracking-tight text-slate-800 leading-none mt-1">{shop.phone || 'Winiks Node'}</span>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-[13px] shadow-inner shadow-indigo-400/30 uppercase ring-4 ring-white/50 group-hover:ring-indigo-50 transition-all duration-500 transform group-hover:rotate-12 group-hover:scale-105">
                                            {shop.name.substring(0, 2)}
                                        </div>
                                    </div>
                                </div>
                            </header>
                        </>
                    )}

                    <div className={`flex-1 overflow-y-auto w-full ${!isExpired ? 'p-8 md:p-12 max-w-7xl mx-auto z-10 relative' : ''}`}>
                        {/* THE DEFINITIVE PAYWALL INTERCEPTOR */}
                        {isExpired ? <SaaSPaywall shop={shop} /> : children}
                    </div>

                    {/* Meta-Tier Floating Mobile Dock */}
                    {!isExpired && <MobileFloatingDock />}
                </main>
            </SidebarProvider>
        </TooltipProvider>
    )
}
