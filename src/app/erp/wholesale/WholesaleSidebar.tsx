'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ScrollText, Truck } from 'lucide-react'

const NAV_ITEMS = [
    { href: '/erp/wholesale/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/erp/wholesale/pos', label: 'Point of Sale', icon: '⚡' },
    { href: '/erp/wholesale/inventory', label: 'Inventory', icon: '📦' },
    { href: '/erp/wholesale/customers', label: 'Customers & Udhaari', icon: '👥' },
    { href: '/erp/wholesale/invoices', label: 'Sales History', icon: '🧾' },
    { href: '/erp/wholesale/suppliers', label: 'Accounts Payable', icon: '🚚' },
    { href: '/erp/wholesale/settings', label: 'Settings', icon: '⚙️' },
]

export default function WholesaleSidebar({ shopName }: { shopName: string }) {
    const pathname = usePathname()

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 h-screen overflow-y-auto">
            {/* Brand */}
            <div className="px-6 py-6 border-b border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wholesale ERP</p>
                <h1 className="text-lg font-black text-white tracking-tight truncate">{shopName}</h1>
                <span className="inline-flex items-center mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                    Live System Online
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={true}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all group ${isActive
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <span className="text-lg leading-none group-hover:scale-110 transition-transform">{item.icon}</span>
                            <span>{item.label}</span>
                            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900"></span>}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">MyBizz ERP Platform</p>
                <p className="text-[10px] text-slate-700 mt-0.5">Powered by WINIKS</p>
            </div>
        </aside>
    )
}
