'use client'

import { useEffect } from 'react'

export default function PwaRegistry() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                        console.log('[PWA] Service Worker registered successfully with scope:', registration.scope)

                        // 1. Silent Auto-Update Mechanism for Non-Tech Users
                        registration.onupdatefound = () => {
                            const installingWorker = registration.installing;
                            if (installingWorker == null) return;

                            installingWorker.onstatechange = () => {
                                if (installingWorker.state === 'installed') {
                                    if (navigator.serviceWorker.controller) {
                                        // PWA detects a new version from Vercel. Force activation instantly.
                                        console.log('[PWA] Critical Update Found. Forcing auto-reload sequence.')
                                        installingWorker.postMessage({ type: 'SKIP_WAITING' });
                                    }
                                }
                            };
                        };
                    },
                    (err) => {
                        console.error('[PWA] Service Worker registration failed:', err)
                    }
                )
            })

            // 2. Once the new background worker activates, automatically refresh the page to mount the new HTML.
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }
    }, [])

    return null
}
