// Intercept Framer CDN fetch attempts that include JSON-quoted UUIDs
// (%22UUID%22). Framer mis-encodes asset identifiers when running outside
// its own hosting. Return empty JS so the runtime's load check succeeds
// without hitting the network; the actual bundle is already executed from
// the inline manifest blob URL before this fetch fires.
self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.indexOf('%22') !== -1) {
    event.respondWith(
      new Response(';', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' }
      })
    );
  }
});
