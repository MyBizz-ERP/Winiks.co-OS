'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LiveSyncProvider({ shopId }: { shopId: string }) {
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (!shopId) return

        // 1. Establish aggressive WebSocket connection over Supabase Realtime
        const channel = supabase.channel(`public:shop_${shopId}`)

        // 2. Attach global mutation listener on all critical node elements
        const reloadDOM = () => {
            router.refresh()
        }

        channel
            .on('postgres_changes', { event: '*', schema: 'wholesale', table: 'products', filter: `shop_id=eq.${shopId}` }, reloadDOM)
            .on('postgres_changes', { event: '*', schema: 'wholesale', table: 'invoices', filter: `shop_id=eq.${shopId}` }, reloadDOM)
            .on('postgres_changes', { event: '*', schema: 'wholesale', table: 'customers', filter: `shop_id=eq.${shopId}` }, reloadDOM)
            .on('postgres_changes', { event: '*', schema: 'wholesale', table: 'purchase_bills', filter: `shop_id=eq.${shopId}` }, reloadDOM)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [shopId, router, supabase])

    return null
}
