/* ============================================================
 * sw.js â€” Service Worker WB3 (9.4). MINIMAL : coque statique seulement.
 *
 * âš ï¸ VERSIONNAGE : incrÃ©menter le numÃ©ro de CACHE_NAME Ã  CHAQUE dÃ©ploiement
 *    qui modifie un asset de la coque (ex. v1 â†’ v2). Le SW supprime alors les
 *    anciens caches Ã  l'activation, et la page reÃ§oit un toast Â« Recharger Â».
 *
 * PÃ©rimÃ¨tre : HTML d'entrÃ©e, theme.css, JS critiques du boot, supabase local,
 * icÃ´nes/manifest. PAS de cache des donnÃ©es mÃ©tier (Supabase) â€” rÃ©servÃ© Ã  9.5
 * (hors-ligne). Les requÃªtes Supabase passent au rÃ©seau, sans cache.
 * ============================================================ */
const CACHE_NAME = 'wb3-shell-v6-demo-p6-seal';

const SHELL = [
  'index.html', 'app.html', 'shell.html', 'theme.css',
  'lib/supabase.min.js',
  'config.js', 'db.js', 'auth.js', 'nav.js', 'wb3-init.js', 'toast.js',
  'manifest.json',
  'img/icon-wineblender-192.png', 'img/icon-wineblender-512.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();   // update instantanÃ© (couplÃ© Ã  clients.claim ci-dessous)
  e.waitUntil(caches.open(CACHE_NAME).then((c) =>
    // RÃ©silient : `addAll` est atomique (un 404 casse tout) â†’ on ajoute un par
    // un avec allSettled pour qu'un asset manquant n'empÃªche pas l'install.
    Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' }))))
  ));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();   // prend le contrÃ´le des onglets ouverts immÃ©diatement
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // jamais POST/PATCH/DELETE
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // DonnÃ©es mÃ©tier (Supabase) : network-first, JAMAIS de cache (pÃ©rimÃ¨tre 9.5).
  if (url.hostname.includes('supabase') ||
      url.pathname.includes('/rest/v1') || url.pathname.includes('/auth/v1') ||
      url.pathname.includes('/realtime') || url.pathname.includes('/storage/v1')) {
    return;   // laisse passer au rÃ©seau natif
  }
  if (url.origin !== self.location.origin) return;        // autres origines : passthrough

  // Coque statique : stale-while-revalidate.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => cached);   // hors-ligne â†’ on retombe sur le cache si prÃ©sent
    return cached || network;
  })());
});
