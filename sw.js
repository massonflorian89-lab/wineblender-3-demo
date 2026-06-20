/* ============================================================
 * sw.js — Service Worker WB3 (9.4). MINIMAL : coque statique seulement.
 *
 * ⚠️ VERSIONNAGE : incrémenter le numéro de CACHE_NAME à CHAQUE déploiement
 *    qui modifie un asset de la coque (ex. v1 → v2). Le SW supprime alors les
 *    anciens caches à l'activation, et la page reçoit un toast « Recharger ».
 *
 * Périmètre : HTML d'entrée, theme.css, JS critiques du boot, supabase local,
 * icônes/manifest. PAS de cache des données métier (Supabase) — réservé à 9.5
 * (hors-ligne). Les requêtes Supabase passent au réseau, sans cache.
 * ============================================================ */
const CACHE_NAME = 'wb3-shell-v58-winescan-smart-id';

const SHELL = [
  'index.html', 'app.html', 'shell.html', 'theme.css',
  'lib/supabase.min.js', 'lib/winescan.js',
  'config.js', 'db.js', 'auth.js', 'nav.js', 'wb3-init.js', 'toast.js', 'wb3-help.js',
  'manifest.json',
  'img/icon-wineblender-192.png', 'img/icon-wineblender-512.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();   // update instantané (couplé à clients.claim ci-dessous)
  e.waitUntil(caches.open(CACHE_NAME).then((c) =>
    // Résilient : `addAll` est atomique (un 404 casse tout) → on ajoute un par
    // un avec allSettled pour qu'un asset manquant n'empêche pas l'install.
    Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' }))))
  ));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();   // prend le contrôle des onglets ouverts immédiatement
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // jamais POST/PATCH/DELETE
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Données métier (Supabase) : network-first, JAMAIS de cache (périmètre 9.5).
  if (url.hostname.includes('supabase') ||
      url.pathname.includes('/rest/v1') || url.pathname.includes('/auth/v1') ||
      url.pathname.includes('/realtime') || url.pathname.includes('/storage/v1')) {
    return;   // laisse passer au réseau natif
  }
  if (url.origin !== self.location.origin) return;        // autres origines : passthrough

  // Coque statique : stale-while-revalidate.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => cached);   // hors-ligne → on retombe sur le cache si présent
    return cached || network;
  })());
});
