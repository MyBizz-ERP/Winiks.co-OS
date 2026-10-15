'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LiveSyncProvider({ shopId }: { shopId: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const lastSyncRef = useRef<number>(0)
    const lastFocusSyncRef = useRef<number>(0)

    useEffect(() => {
        if (!shopId) return

        // Controlled throttle for server-rendered page refreshes (at most once every 2 seconds)
        const triggerSync = (force = false) => {
            // Avoid disruptive server re-renders while cashier is actively on POS checkout
            if (!force && pathname === '/erp/wholesale/pos') {
                return
            }

            const now = Date.now()
            if (now - lastSyncRef.current > 2000) {
                lastSyncRef.current = now
                router.refresh()
            }
        }

        // 1. Same-device native BroadcastChannel listener (instant multi-tab sync)
        let localBc: BroadcastChannel | null = null
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            localBc = new BroadcastChannel(`erp_sync_${shopId}`)
            localBc.onmessage = () => {
                triggerSync(false)
            }
        }

        // 2. Cross-device Supabase Realtime Broadcast & CDC Channel
        const channel = supabase.channel(`shop_broadcast_${shopId}`)

        channel
            .on('broadcast', { event: 'db_mutation' }, () => {
                triggerSync(false)
            })
            .on('postgres_changes', { event: '*', schema: 'wholesale', filter: `shop_id=eq.${shopId}` }, () => {
                triggerSync(false)
            })
            .on('postgres_changes', { event: '*', schema: 'public', filter: `shop_id=eq.${shopId}` }, () => {
                triggerSync(false)
            })
            .subscribe()

        // 3. Tab Visibility & Window Focus Auto-Revalidation (throttled to 60s to prevent spamming on print dialogs)
        const handleWindowFocus = () => {
            const now = Date.now()
            if (now - lastFocusSyncRef.current > 60000) {
                lastFocusSyncRef.current = now
                triggerSync(false)
            }
        }

        window.addEventListener('focus', handleWindowFocus)

        return () => {
            if (localBc) {
                localBc.close()
            }
            supabase.removeChannel(channel)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [shopId, router, pathname, supabase])

    return null
}
