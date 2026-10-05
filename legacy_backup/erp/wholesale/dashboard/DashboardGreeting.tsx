'use client'

import { useState, useEffect } from 'react'

export default function DashboardGreeting({ shopName }: { shopName: string }) {
    const [greeting, setGreeting] = useState('Welcome')

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Good Morning')
        else if (hour < 17) setGreeting('Good Afternoon')
        else setGreeting('Good Evening')
    }, [])

    return (
        <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{greeting}, {shopName}</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Live operational overview</p>
        </div>
    )
}
