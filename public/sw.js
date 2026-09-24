const CACHE_NAME = 'mybizz-erp-cache-v1';

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
    console.log('[Service Worker] Installed');
    self.skipWaiting();
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activated');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing Old Cache');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// The fetch handler serves responses from a cache.
// If no response is found, it populates the cache with the response
// from the network and returns the network response.
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;
    // Do not cache API routes or Supabase routes, only static frontend assets
    if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // Return cached response instantly (Offline speed!)
                // However, we want to fetch the new version silently in the background (Stale-While-Revalidate)
                event.waitUntil(
                    fetch(event.request).then(networkResponse => {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }).catch(() => {
                        // Background fetch failed (We are actually offline), do nothing since we already have cached response
                    })
                );
                return cachedResponse;
            }

            // If not in cache, fetch from network and cache it
            return fetch(event.request).then(networkResponse => {
                // Cache valid responses
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(error => {
                console.log('[Service Worker] Fetch failed, likely completely offline:', error);
                // You could return a custom offline page here for navigations!
            });
        })
    );
});
