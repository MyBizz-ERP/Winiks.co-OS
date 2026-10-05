'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Zap, PackageOpen, Package, BarChart3 } from 'lucide-react'

const NAV = [
    { href: '/erp/wholesale/dashboard', label: 'Home', Icon: LayoutDashboard },
    { href: '/erp/wholesale/pos', label: 'Billing', Icon: Zap },
    { href: '/erp/wholesale/purchase-pos', label: 'Purchase', Icon: PackageOpen },
    { href: '/erp/wholesale/inventory', label: 'Stock', Icon: Package },
    { href: '/erp/wholesale/reports', label: 'Reports', Icon: BarChart3 },
]

export default function ClientMobileNav() {
    const pathname = usePathname()

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
            <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-1px_30px_rgba(0,0,0,0.08)]">
                <div className="flex items-stretch">
                    {NAV.map(({ href, label, Icon }) => {
                        const isActive = pathname === href || pathname.startsWith(href + '/')
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all relative
                                    ${isActive ? 'text-indigo-600' : 'text-slate-400 active:text-slate-600'}`}
                            >
                                {isActive && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-b-full" />
                                )}
                                <Icon className={`w-5 h-5 transition-all ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                                <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-indigo-700' : 'text-slate-500'}`}>
                                    {label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
