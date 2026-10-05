'use client'

import { useState, useEffect } from 'react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { ShoppingCart, LogIn, LineChart, Package, Users, HandCoins, Settings, LogOut, ArrowLeftRight, LayoutDashboard, Receipt, FileSpreadsheet, Truck } from "lucide-react"
const wholesaleRoutes = [
    {
        title: "Dashboard",
        url: "/erp/wholesale",
        icon: LayoutDashboard,
    },
    {
        title: "Sales POS",
        url: "/erp/wholesale/pos",
        icon: ShoppingCart,
    },
    {
        title: "Kharedi Setup",
        url: "/erp/wholesale/purchase",
        icon: ArrowLeftRight,
    },
    {
        title: "Accounts Receivable",
        url: "/erp/wholesale/udhaari",
        icon: HandCoins,
    },
    {
        title: "Inventory Matrix",
        url: "/erp/wholesale/inventory",
        icon: Package,
    },
    {
        title: "Day-End Vault",
        url: "/erp/wholesale/vault",
        icon: LineChart,
    },
    {
        title: "Sales History",
        url: "/erp/wholesale/sales",
        icon: Receipt,
    },
    {
        title: "Accounts Payable",
        url: "/erp/wholesale/ap",
        icon: FileSpreadsheet,
    },
    {
        title: "Platform Settings",
        url: "/erp/wholesale/settings",
        icon: Settings,
    },
]

export function AppSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [isOnline, setIsOnline] = useState(true)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine)
            const handleOnline = () => setIsOnline(true)
            const handleOffline = () => setIsOnline(false)
            window.addEventListener('online', handleOnline)
            window.addEventListener('offline', handleOffline)
            return () => {
                window.removeEventListener('online', handleOnline)
                window.removeEventListener('offline', handleOffline)
            }
        }
    }, [])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <Sidebar variant="sidebar" collapsible="icon" className="hidden md:flex m-4 lg:m-5 mt-4 lg:mt-5 h-[calc(100svh-2rem)] lg:h-[calc(100svh-2.5rem)] rounded-2xl lg:rounded-[2rem] border border-white/40 bg-white/60 backdrop-blur-3xl overflow-hidden shadow-2xl z-50">
            <SidebarHeader className="p-5 border-b border-slate-100/50 flex flex-row items-center gap-3 bg-transparent">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                    <span className="text-white font-bold text-sm tracking-tighter">W</span>
                </div>
                <span className="font-bold text-base tracking-tight text-slate-900 truncate group-data-[collapsible=icon]:hidden">
                    Winiks Enterprise
                </span>
            </SidebarHeader>
            <SidebarContent className="px-2 py-4">
                <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] text-slate-400 tracking-widest uppercase font-bold px-2 py-3">Core Modules</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {wholesaleRoutes.map((item) => (
                                <SidebarMenuItem key={item.title} className="mb-0.5 group">
                                    <SidebarMenuButton
                                        render={<a href={item.url} />}
                                        tooltip={item.title}
                                        className={`hover:bg-slate-100/80 transition-all duration-300 rounded-xl py-6 ${pathname === item.url ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-600'}`}
                                    >
                                        <item.icon className={`w-4 h-4 mr-3 shrink-0 group-hover:scale-125 transition-all duration-300 ${pathname === item.url ? 'text-white' : 'group-hover:text-indigo-600'}`} />
                                        <span className="group-hover:translate-x-1 transition-transform duration-300">{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-slate-100 flex flex-col gap-2">
                <div className={`mx-2 p-3 rounded-xl flex items-center justify-between transition-colors ${isOnline ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-rose-50/50 border border-rose-100'}`}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex h-2.5 w-2.5">
                            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        </div>
                        <span className={`text-[11px] font-bold tracking-widest uppercase ${isOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
                        </span>
                    </div>
                </div>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton onClick={handleLogout} className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all rounded-lg py-5 cursor-pointer">
                            <LogOut className="w-4 h-4 mr-3 shrink-0" />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
