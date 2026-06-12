const SCRIPT_VERSION = new URL(self.location.href).searchParams.get("v") || "legacy";
const CACHE_PREFIX = "kai-tood-";
const CACHE_NAME = `${CACHE_PREFIX}${SCRIPT_VERSION}`;
const APP_SHELL = ["/manifest.webmanifest", "/brand-logo.svg", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const NO_STALE_PATHS = ["/login", "/dashboard", "/daily"];
const STATIC_CACHE_PATHS = ["/_next/static/", "/icons/", "/brand-logo.svg"];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNoStalePath(pathname) {
  return NO_STALE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isStaticAsset(pathname) {
  return STATIC_CACHE_PATHS.some((path) => pathname.startsWith(path));
}

async function clearOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
}

async function fetchWithoutHttpCache(request) {
  return fetch(new Request(request, { cache: "no-store" }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clearOldCaches().then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "CLEAR_OLD_CACHES") {
    event.waitUntil(clearOldCaches());
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (!isSameOrigin(url)) return;

  if (event.request.mode === "navigate" || isNoStalePath(url.pathname)) {
    event.respondWith(
      fetchWithoutHttpCache(event.request).catch(
        () =>
          new Response("กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้าอีกครั้ง", {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          }),
      ),
    );
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)));
          }
          return response;
        });
      }),
    );
    return;
  }

  event.respondWith(fetchWithoutHttpCache(event.request));
});
