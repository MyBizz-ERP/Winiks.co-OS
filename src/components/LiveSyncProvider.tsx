'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LiveSyncProvider({ shopId }: { shopId: string }) {
    const router = useRouter()
    const supabase = createClient()
    const lastSyncRef = useRef<number>(0)

    useEffect(() => {
        if (!shopId) return

        // Throttle refreshes to at most once per 600ms to avoid re-render thrashing
        const triggerSync = () => {
            const now = Date.now()
            if (now - lastSyncRef.current > 600) {
                lastSyncRef.current = now
                router.refresh()
            }
        }

        // 1. Same-device native BroadcastChannel listener (instant multi-tab sync)
        let localBc: BroadcastChannel | null = null
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            localBc = new BroadcastChannel(`erp_sync_${shopId}`)
            localBc.onmessage = () => {
                triggerSync()
            }
        }

        // 2. Cross-device Supabase Realtime Broadcast & CDC Channel
        const channel = supabase.channel(`shop_broadcast_${shopId}`)

        channel
            .on('broadcast', { event: 'db_mutation' }, () => {
                triggerSync()
            })
            .on('postgres_changes', { event: '*', schema: 'wholesale', filter: `shop_id=eq.${shopId}` }, () => {
                triggerSync()
            })
            .on('postgres_changes', { event: '*', schema: 'public', filter: `shop_id=eq.${shopId}` }, () => {
                triggerSync()
            })
            .subscribe()

        // 3. Tab Visibility & Window Focus Auto-Revalidation
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                triggerSync()
            }
        }
        const handleWindowFocus = () => {
            triggerSync()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)

        // 4. Background gentle sync interval (every 25 seconds)
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.refresh()
            }
        }, 25000)

        return () => {
            if (localBc) {
                localBc.close()
            }
            supabase.removeChannel(channel)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleWindowFocus)
            clearInterval(pollInterval)
        }
    }, [shopId, router, supabase])

    return null
}

