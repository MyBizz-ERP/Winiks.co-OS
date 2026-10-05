'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, ArrowLeftRight, Package, Users } from 'lucide-react'

const mobileRoutes = [
    { title: "Home", url: "/erp/wholesale", icon: LayoutDashboard },
    { title: "POS", url: "/erp/wholesale/pos", icon: ShoppingCart },
    { title: "Kharedi", url: "/erp/wholesale/purchase", icon: ArrowLeftRight },
    { title: "Inventory", url: "/erp/wholesale/inventory", icon: Package },
    { title: "Clients", url: "/erp/wholesale/customers", icon: Users },
]

export default function MobileFloatingDock() {
    const pathname = usePathname()

    return (
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[400px]">
            <div className="bg-white/70 backdrop-blur-3xl border border-white/40 shadow-2xl rounded-full px-4 py-3 flex items-center justify-between">
                {mobileRoutes.map((item, idx) => {
                    const isActive = pathname === item.url
                    return (
                        <Link key={idx} href={item.url} className="relative flex flex-col items-center justify-center gap-1 group">
                            {isActive && (
                                <div className="absolute inset-0 bg-indigo-100 rounded-full w-12 h-12 -top-1 left-1/2 -translate-x-1/2 -z-10 animate-in zoom-in duration-300"></div>
                            )}
                            <div className={`p-1.5 rounded-full transition-transform duration-300 ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-500 group-hover:text-slate-800 group-hover:-translate-y-1'}`}>
                                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] font-bold tracking-tight lowercase ${isActive ? 'text-indigo-700 opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100'}`}>
                                {item.title}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
