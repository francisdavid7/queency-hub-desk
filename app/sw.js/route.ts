// Service worker for the till. Served from a route (not /public) so each
// deploy embeds its build id, which retires the previous offline cache.
export const dynamic = "force-static";

const TILL_ROUTES = [
  "/dashboard",
  "/receipts/new",
  "/receipts",
  "/customers",
  "/services",
  "/transactions",
  "/reports",
  "/settings",
];

function serviceWorker(version: string) {
  return `
const VERSION = ${JSON.stringify(version)};
const CACHE = "hubdesk-" + VERSION;
const TILL_ROUTES = ${JSON.stringify(TILL_ROUTES)};
const FALLBACK_ROUTE = "/dashboard";

// Never cache server-only or authenticated areas.
const isNetworkOnly = (url) =>
  url.pathname.startsWith("/api/") || url.pathname === "/admin" || url.pathname.startsWith("/admin/");

const isImmutableAsset = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

/** Collect the JS/CSS/image URLs a page needs so it can render offline. */
function assetUrls(html) {
  const urls = new Set();
  const pattern = /(?:src|href|srcSet|srcset)="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(html))) {
    for (const candidate of match[1].split(",")) {
      const path = candidate.trim().split(/\\s+/)[0].replaceAll("&amp;", "&");
      if (path.startsWith("/_next/") || path.startsWith("/icons/")) urls.add(path);
    }
  }
  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = new Set();
      for (const route of TILL_ROUTES) {
        const response = await fetch(route, { cache: "reload", credentials: "same-origin" });
        if (!response.ok) continue;
        await cache.put(route, response.clone());
        for (const url of assetUrls(await response.text())) assets.add(url);
      }
      await Promise.allSettled(
        [...assets, "/manifest.webmanifest", "/icons/icon-192.png", "/logo-blue.png"].map((url) => cache.add(url)),
      );
    })(),
  );
  // Wait in "installed" state; the app shows an update prompt and asks us to
  // activate, so a cashier is never reloaded in the middle of a receipt.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("hubdesk-") && key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

async function navigate(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok && TILL_ROUTES.includes(url.pathname)) {
      (await caches.open(CACHE)).put(url.pathname, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(url.pathname)) ||
      (await caches.match(FALLBACK_ROUTE)) ||
      new Response("HubDesk is offline and this page isn't cached yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isNetworkOnly(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(request, url));
  } else if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    // Client-side navigation payloads: when offline, fail fast so Next.js
    // falls back to a full page load, which we serve from the cache.
    event.respondWith(fetch(request).catch(() => Response.error()));
  } else if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
`;
}

export function GET() {
  return new Response(serviceWorker(process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
