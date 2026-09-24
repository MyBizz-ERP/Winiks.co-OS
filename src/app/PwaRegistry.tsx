'use client'

import { useEffect } from 'react'

export default function PwaRegistry() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        console.log('[PWA] Service Worker registered successfully with scope:', registration.scope)
                    },
                    (err) => {
                        console.error('[PWA] Service Worker registration failed:', err)
                    }
                )
            })
        }
    }, [])

    return null
}
