const CACHE_NAME = "heartpin-offline-v1";
const OFFLINE_PAGE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_PAGE)));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname !== "/" || url.search) return;

  event.respondWith(fetch(request).catch(async () => {
    return (await caches.match(OFFLINE_PAGE, { cacheName: CACHE_NAME })) || Response.error();
  }));
});
