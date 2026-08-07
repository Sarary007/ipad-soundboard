const CACHE_NAME = "ipad-soundboard-shared-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./404.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSharedData = url.pathname.endsWith("/shared-data.json");
  const isNavigation = event.request.mode === "navigate";

  if(isSharedData || isNavigation){
    event.respondWith(
      fetch(event.request, {cache: "no-store"})
        .then(response => {
          if(!isSharedData){
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => isSharedData
          ? new Response('{"version":1,"pads":{}}', {
              headers: {"Content-Type": "application/json"}
            })
          : caches.match("./index.html")
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
