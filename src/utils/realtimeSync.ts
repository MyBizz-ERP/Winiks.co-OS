'use client'

import { createClient } from '@/utils/supabase/client'

/**
 * Triggers a real-time data sync across all open tabs, windows, and connected devices
 * for the given shop using both native Web BroadcastChannel and Supabase Realtime Broadcast.
 */
export async function triggerLiveSync(shopId?: string, eventName = 'db_mutation') {
    if (!shopId) return
    try {
        // 1. Same-device instant multi-tab broadcast (0ms latency)
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const localBc = new BroadcastChannel(`erp_sync_${shopId}`)
            localBc.postMessage({ event: eventName, timestamp: Date.now() })
            localBc.close()
        }

        // 2. Cross-device Supabase Realtime WebSocket broadcast (<50ms latency)
        const supabase = createClient()
        const channel = supabase.channel(`shop_broadcast_${shopId}`)
        await channel.send({
            type: 'broadcast',
            event: 'db_mutation',
            payload: { eventName, timestamp: Date.now() }
        })
    } catch {
        // Fail silently if offline or network error
    }
}
