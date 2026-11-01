
const CACHE_NAME = "meuscaner-v2";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./catalogo.html",
    "./conta.html",
    "./manifest.json",
    "./css/style.css",
    "./js/app.js",
    "./js/catalogo.js",
    "./js/conta.js",
    "./js/supabase.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith("meuscaner-") && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const isAppAsset = [
                    "document",
                    "script",
                    "style",
                    "image",
                    "manifest"
                ].includes(event.request.destination);

                if (response && response.ok && isAppAsset) {
                    const responseCopy = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseCopy);
                    });
                }

                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) return cachedResponse;

                        if (event.request.mode === "navigate") {
                            return caches.match("./index.html");
                        }

                        return Response.error();
                    });
            })
    );
});
