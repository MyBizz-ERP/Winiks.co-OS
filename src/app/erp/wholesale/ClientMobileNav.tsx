'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Archive, Package } from 'lucide-react'

export default function ClientMobileNav() {
    const pathname = usePathname()

    const navItems = [
        { href: '/erp/wholesale/dashboard', label: 'Home', icon: LayoutDashboard },
        { href: '/erp/wholesale/pos', label: 'Sale', icon: ShoppingCart },
        { href: '/erp/wholesale/purchase-pos', label: 'Kharedi', icon: Archive },
        { href: '/erp/wholesale/inventory', label: 'Stock', icon: Package },
        { href: '/erp/wholesale/reports', label: 'Profit', icon: LayoutDashboard }, // using LayoutDashboard as icon temporarily
    ]

    // Removed hidden rule so mobile users can always navigate away

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-50 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            {navItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center p-2 rounded-xl transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                        <span className={`text-[9px] font-bold tracking-wider ${isActive ? 'text-blue-700' : ''}`}>
                            {item.label}
                        </span>
                        {isActive && (
                            <span className="absolute -top-1 w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                        )}
                    </Link>
                )
            })}
        </div>
    )
}
