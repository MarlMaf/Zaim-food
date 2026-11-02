/* Plain `python -m http.server` cannot serve 404.html. After the menu loads once,
   this worker swaps that server's error page for the designed one. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(missingPage(event.request));
});

async function missingPage(request) {
  const response = await fetch(request);
  if (response.status !== 404) return response;
  const pageUrl = new URL("./404.html", self.registration.scope);
  const page = await fetch(pageUrl, { cache: "no-store" });
  if (!page.ok) return response;
  return new Response(page.body, {
    status: 404,
    statusText: "Not Found",
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
