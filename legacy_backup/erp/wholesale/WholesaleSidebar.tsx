'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Zap,
    PackageOpen,
    Package,
    Users,
    ScrollText,
    Truck,
    BarChart3,
    Settings,
    Wifi,
    WifiOff
} from 'lucide-react'
import { useEffect, useState } from 'react'

const NAV_GROUPS = [
    {
        label: 'Operations',
        items: [
            { href: '/erp/wholesale/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/erp/wholesale/pos', label: 'Point of Sale', icon: Zap },
            { href: '/erp/wholesale/purchase-pos', label: 'Purchase Entry', icon: PackageOpen },
        ]
    },
    {
        label: 'Catalog',
        items: [
            { href: '/erp/wholesale/inventory', label: 'Inventory', icon: Package },
            { href: '/erp/wholesale/customers', label: 'Customers & Udhaari', icon: Users },
            { href: '/erp/wholesale/invoices', label: 'Sales History', icon: ScrollText },
            { href: '/erp/wholesale/suppliers', label: 'Accounts Payable', icon: Truck },
        ]
    },
    {
        label: 'Analytics',
        items: [
            { href: '/erp/wholesale/reports', label: 'Day-End Reports', icon: BarChart3 },
        ]
    },
    {
        label: 'System',
        items: [
            { href: '/erp/wholesale/settings', label: 'Settings', icon: Settings },
        ]
    }
]

export default function WholesaleSidebar({ shopName }: { shopName: string }) {
    const pathname = usePathname()
    const [online, setOnline] = useState(true)

    useEffect(() => {
        setOnline(navigator.onLine)
        const handleOnline = () => setOnline(true)
        const handleOffline = () => setOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const initials = shopName?.slice(0, 2).toUpperCase() || 'MB'

    return (
        <aside className="w-[240px] bg-[#0f172a] text-white hidden md:flex flex-col shrink-0 h-screen overflow-y-auto border-r border-white/5">

            {/* Brand Header */}
            <div className="px-5 pt-6 pb-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg shadow-indigo-600/30">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">MyBizz ERP</p>
                        <h1 className="text-sm font-black text-white truncate leading-tight">{shopName}</h1>
                    </div>
                </div>

                <div className={`flex items-center gap-2 mt-4 px-3 py-1.5 rounded-lg text-[11px] font-bold w-fit ${online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {online
                        ? <><Wifi className="w-3 h-3" /> Live & Synced</>
                        : <><WifiOff className="w-3 h-3" /> Offline Mode</>
                    }
                </div>
            </div>

            {/* Navigation Groups */}
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
                {NAV_GROUPS.map(group => (
                    <div key={group.label}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 px-3 mb-1.5">{group.label}</p>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch={true}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all group
                                            ${isActive
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                        <span className="truncate">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/5">
                <p className="text-[10px] text-slate-600 font-bold">Powered by WINIKS</p>
                <p className="text-[10px] text-slate-700 mt-0.5">v9.0 — Production</p>
            </div>
        </aside>
    )
}
