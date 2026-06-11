/* ============================================================
 * wb3-vitals.js — P5 : mesure Web Vitals WB3 (sans lib externe).
 *
 * PerformanceObserver natif pour :
 *   - LCP  (largest-contentful-paint)
 *   - CLS  (layout-shift, somme hors interaction)
 *   - INP  (event timing : pire latence d'interaction observée)
 *
 * Logge un console.table en fin de chargement ET au départ de la page
 * (visibilitychange='hidden'). Avec `?perf=1` dans l'URL, affiche un
 * petit badge discret en bas à droite, mis à jour en direct.
 *
 * Auto-démarre : il suffit d'inclure ce <script>. Aucune dépendance,
 * aucun envoi serveur (à brancher plus tard si une route existe).
 *
 * Cibles : LCP < 2500 ms · CLS < 0.1 · INP < 200 ms.
 * ============================================================ */
(function () {
  'use strict';
  if (window.__wb3VitalsStarted) return;
  window.__wb3VitalsStarted = true;

  var TARGET = { LCP: 2500, CLS: 0.1, INP: 200 };
  var data = { LCP: null, CLS: 0, INP: null };
  var _inpMax = 0;
  var _badge = null, _logged = false;

  function perfMode() {
    try { return new URLSearchParams(location.search).get('perf') === '1'; } catch (_) { return false; }
  }
  function ok(k) {
    if (data[k] == null) return null;
    return data[k] <= TARGET[k];
  }

  function _obs(type, cb, extra) {
    try {
      var o = new PerformanceObserver(cb);
      o.observe(Object.assign({ type: type, buffered: true }, extra || {}));
      return o;
    } catch (_) { return null; }
  }

  // LCP — on garde la dernière entrée (la plus grande).
  _obs('largest-contentful-paint', function (list) {
    var e = list.getEntries(); var last = e[e.length - 1];
    if (last) { data.LCP = Math.round(last.renderTime || last.loadTime || last.startTime); render(); }
  });
  // CLS — somme des décalages non consécutifs à une interaction.
  _obs('layout-shift', function (list) {
    list.getEntries().forEach(function (s) { if (!s.hadRecentInput) data.CLS += s.value; });
    data.CLS = Math.round(data.CLS * 1000) / 1000; render();
  });
  // INP (proxy) — pire durée d'interaction (Event Timing).
  _obs('event', function (list) {
    list.getEntries().forEach(function (ev) {
      if (ev.duration > _inpMax) { _inpMax = ev.duration; data.INP = Math.round(_inpMax); render(); }
    });
  }, { durationThreshold: 40 });

  function rows() {
    return ['LCP', 'CLS', 'INP'].map(function (k) {
      var v = data[k]; var pass = ok(k);
      return {
        Métrique: k,
        Valeur: v == null ? '—' : (k === 'CLS' ? v : v + ' ms'),
        Cible: (k === 'CLS' ? '< ' + TARGET[k] : '< ' + TARGET[k] + ' ms'),
        OK: pass == null ? '…' : (pass ? '✅' : '⚠️'),
      };
    });
  }
  function logTable() {
    if (_logged && document.visibilityState !== 'hidden') return;
    _logged = true;
    try { console.table(rows()); } catch (_) { try { console.log('[WB3Vitals]', data); } catch (__) {} }
  }

  // ── Badge live (uniquement ?perf=1) ──
  function ensureBadge() {
    if (_badge) return _badge;
    _badge = document.createElement('div');
    _badge.id = 'wb3-vitals-badge';
    _badge.style.cssText = [
      'position:fixed', 'right:10px', 'bottom:10px', 'z-index:99999',
      'font:11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace',
      'background:rgba(20,20,22,.92)', 'color:#fff', 'padding:6px 9px',
      'border-radius:8px', 'box-shadow:0 4px 16px rgba(0,0,0,.35)',
      'pointer-events:none', 'white-space:pre',
    ].join(';');
    (document.body || document.documentElement).appendChild(_badge);
    return _badge;
  }
  function colour(k) {
    var p = ok(k); return p == null ? '#bbb' : (p ? '#5cbb6a' : '#ff6b7a');
  }
  function render() {
    if (!perfMode()) return;
    var b = ensureBadge();
    b.innerHTML = ['LCP', 'CLS', 'INP'].map(function (k) {
      var v = data[k]; var txt = v == null ? '…' : (k === 'CLS' ? v : v + 'ms');
      return '<span style="color:' + colour(k) + '">' + k + ' ' + txt + '</span>';
    }).join('   ');
  }

  function flush() { logTable(); }
  if (document.readyState === 'complete') setTimeout(flush, 0);
  else window.addEventListener('load', function () { setTimeout(flush, 0); }, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { _logged = false; logTable(); }
  });
  if (perfMode()) { if (document.body) render(); else window.addEventListener('DOMContentLoaded', render); }

  window.WB3Vitals = {
    get: function () { return Object.assign({}, data); },
    log: logTable,
    TARGET: TARGET,
  };
})();
