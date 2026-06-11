/* ============================================================
 * pwa.js — 9.4 : enregistrement du Service Worker + bannière d'installation.
 *
 * - Enregistre sw.js sur l'évènement `load` (JAMAIS dans onAuthStateChange →
 *   le fix deadlock auth.js est préservé ; le SW ne bloque pas le boot).
 * - Toast « Mise à jour disponible · Recharger » quand un nouveau SW est prêt.
 * - Bannière « Installer WineBlender » à la 3ᵉ visite (7 derniers jours), si
 *   `beforeinstallprompt` capturé. Refus mémorisé 30 j.
 * - iOS Safari (pas de beforeinstallprompt) : astuce « Partager → Sur l'écran
 *   d'accueil » affichée 1 fois.
 * - JAMAIS de bannière sur poste partagé mur (?fs=1&mode=wall) ni en standalone.
 * Styles : .wb3-pwa-banner dans theme.css.
 * ============================================================ */
(function () {
  'use strict';
  var qs;
  try { qs = new URLSearchParams(location.search); } catch (_) { qs = { get: function () { return null; } }; }
  var isWall = qs.get('fs') === '1' && qs.get('mode') === 'wall';

  // ── 1. Enregistrement du Service Worker (sur `load`) ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function () {
            // Nouveau SW installé ALORS qu'un SW contrôlait déjà = mise à jour.
            if (nw.state === 'installed' && navigator.serviceWorker.controller) _toastUpdate();
          });
        });
      }).catch(function (err) { console.warn('[PWA] enregistrement SW:', err); });
    });
  }
  function _toastUpdate() {
    try {
      if (window.WB3Toast) {
        WB3Toast.show({ level: 'info', message: 'Mise à jour de WineBlender disponible.',
          action: { label: 'Recharger', timeoutMs: 15000, onClick: function () { location.reload(); } } });
      } else if (confirm('Mise à jour de WineBlender disponible. Recharger maintenant ?')) {
        location.reload();
      }
    } catch (_) {}
  }

  // ── 2. Bannière d'installation (hors mur / hors standalone) ──
  if (isWall) return;

  var KV = { visits: 'wb3.pwa.visits', dismiss: 'wb3.pwa.dismiss', ios: 'wb3.pwa.ioshint' };
  var now = Date.now(), WEEK = 7 * 864e5, MONTH = 30 * 864e5;

  // Compteur de visites glissant (7 jours).
  var visits = [];
  try { visits = JSON.parse(localStorage.getItem(KV.visits) || '[]'); } catch (_) {}
  visits = visits.filter(function (t) { return now - t < WEEK; }); visits.push(now);
  try { localStorage.setItem(KV.visits, JSON.stringify(visits)); } catch (_) {}

  // Déjà installée (lancée en standalone) → ne rien proposer.
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (standalone) return;

  // Refus récent (< 30 j) → silence.
  var dismissed = 0;
  try { dismissed = +localStorage.getItem(KV.dismiss) || 0; } catch (_) {}
  if (now - dismissed < MONTH) return;

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var deferred = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (visits.length >= 3) _banner(false);
  });

  // iOS : pas de beforeinstallprompt → astuce affichée 1 seule fois.
  window.addEventListener('load', function () {
    if (!isIOS || visits.length < 3) return;
    var hinted = false; try { hinted = localStorage.getItem(KV.ios) === '1'; } catch (_) {}
    if (hinted) return;
    try { localStorage.setItem(KV.ios, '1'); } catch (_) {}
    _banner(true);
  });

  function _close(b, remember) {
    if (b && b.parentNode) b.parentNode.removeChild(b);
    if (remember) { try { localStorage.setItem(KV.dismiss, String(Date.now())); } catch (_) {} }
  }
  function _banner(ios) {
    if (document.getElementById('wb3-pwa-banner') || !document.body) return;
    var b = document.createElement('div');
    b.id = 'wb3-pwa-banner'; b.className = 'wb3-pwa-banner';
    b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Installer WineBlender');
    if (ios) {
      b.innerHTML = '<img src="img/icon-wineblender-192.png" alt="" width="32" height="32">' +
        '<span class="wb3-pwa-msg">Installer WineBlender : touchez <b>Partager</b> puis « Sur l’écran d’accueil ».</span>' +
        '<button class="wb3-pwa-x" aria-label="Fermer">✕</button>';
    } else {
      b.innerHTML = '<img src="img/icon-wineblender-192.png" alt="" width="32" height="32">' +
        '<span class="wb3-pwa-msg">Installer WineBlender sur cet appareil ?</span>' +
        '<button class="wb3-pwa-install">Installer</button>' +
        '<button class="wb3-pwa-later">Plus tard</button>';
    }
    document.body.appendChild(b);
    var ins = b.querySelector('.wb3-pwa-install');
    if (ins) ins.onclick = function () {
      if (deferred) { deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; _close(b, false); }); }
      else _close(b, false);
    };
    var later = b.querySelector('.wb3-pwa-later'); if (later) later.onclick = function () { _close(b, true); };
    var x = b.querySelector('.wb3-pwa-x'); if (x) x.onclick = function () { _close(b, true); };
  }
})();
