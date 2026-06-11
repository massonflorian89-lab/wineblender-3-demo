/* ============================================================
 * wb3-freshness.js — P3 : badge global d'état de fraîcheur des données.
 *
 *   🟢 À jour (idle) · 🟠 Actualisation… (fetch en cours)
 *   🔴 Hors-ligne (navigator offline) · 🟡 Décalage (realtime down > 10 s)
 *
 * Écoute WB3Bus ('fetching:start/end', 'realtime:up/down') + online/offline.
 * Instrumente les lectures WB3DB.* par monkey-patch (db.js reste intact)
 * pour émettre fetching:start/end automatiquement — pas de polling.
 *
 * Clic → mini-popover des 3 dernières actualisations.
 * aria-live="polite" pour annoncer les changements (hors-ligne notamment).
 * Styles dans theme.css (.wb3-fresh*). prefers-reduced-motion : pas de pulse.
 * ============================================================ */
(function () {
  'use strict';
  if (window.WB3Freshness) return;
  var bus = window.WB3Bus;

  // ── 1. Instrumentation des lectures WB3DB (émission fetching:start/end) ──
  var LABELS = {
    listTable: 'données', queryLots: 'lots', queryCuverieData: 'cuverie',
    queryCuverieEtat: 'cuverie', queryAnalyses: 'analyses', queryOperations: 'opérations',
    queryAuditLog: 'historique', queryProduitMouvements: 'mouvements',
  };
  function patchDB() {
    if (!window.WB3DB || !bus) return;
    Object.keys(LABELS).forEach(function (fn) {
      var orig = WB3DB[fn];
      if (typeof orig !== 'function' || orig.__wb3fresh) return;
      var wrapped = function () {
        var label = LABELS[fn];
        bus.emit('fetching:start', { fn: fn, label: label });
        var r;
        try { r = orig.apply(this, arguments); }
        catch (e) { bus.emit('fetching:end', { fn: fn, label: label, ok: false }); throw e; }
        Promise.resolve(r).then(
          function () { bus.emit('fetching:end', { fn: fn, label: label, ok: true }); },
          function () { bus.emit('fetching:end', { fn: fn, label: label, ok: false }); }
        );
        return r;
      };
      wrapped.__wb3fresh = true;
      WB3DB[fn] = wrapped;
    });
  }
  patchDB();
  // db.js est chargé avant ce module ; filet si l'ordre varie.
  if (!window.WB3DB) document.addEventListener('DOMContentLoaded', patchDB);

  // ── 2. État ──
  var inflight = 0, realtimeDown = false, idleTimer = null;
  var history = [];   // { label, t, ok }
  var STATES = {
    idle:    { cls: 'is-fresh',    icon: '🟢', text: 'À jour' },
    busy:    { cls: 'is-busy',     icon: '🟠', text: 'Actualisation…' },
    offline: { cls: 'is-offline',  icon: '🔴', text: 'Hors-ligne' },
    stale:   { cls: 'is-stale',    icon: '🟡', text: 'Décalage' },
  };
  function compute() {
    if (!navigator.onLine) return 'offline';
    if (inflight > 0) return 'busy';
    if (realtimeDown) return 'stale';
    return 'idle';
  }

  // ── 3. Rendu badge ──
  var el = null, lbl = null, pop = null;
  function mount() {
    if (el) return el;
    el = document.createElement('button');
    el.type = 'button';
    el.className = 'wb3-fresh';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span class="wb3-fresh-dot" aria-hidden="true"></span><span class="wb3-fresh-lbl"></span>';
    lbl = el.querySelector('.wb3-fresh-lbl');
    el.addEventListener('click', togglePopover);
    // Placement : en mode autonome, dans la barre d'actions du header ;
    // en mode embarqué (shell, header masqué) → fixe en haut à droite.
    var embedded = document.body && document.body.classList.contains('embedded');
    var host = embedded ? null : (document.querySelector('.header-actions') || document.querySelector('.wb-header .actions'));
    if (host) { el.classList.add('wb3-fresh--inline'); host.insertBefore(el, host.firstChild); }
    else { el.classList.add('wb3-fresh--fixed'); (document.body || document.documentElement).appendChild(el); }
    return el;
  }
  function render() {
    mount();
    var s = STATES[compute()];
    el.className = 'wb3-fresh ' + s.cls + (el.classList.contains('wb3-fresh--fixed') ? ' wb3-fresh--fixed' : ' wb3-fresh--inline');
    el.querySelector('.wb3-fresh-dot').textContent = s.icon;
    lbl.textContent = s.text;
    el.setAttribute('aria-label', 'État des données : ' + s.text);
  }
  function scheduleRender() {
    // Petit délai avant de retomber sur « À jour » → évite le clignotement
    // sur les fetchs très courts (cache hit).
    clearTimeout(idleTimer);
    if (compute() === 'idle') idleTimer = setTimeout(render, 250);
    else render();
  }

  // ── 4. Mini-popover : 3 dernières actualisations ──
  function fmtAgo(t) {
    var s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return 'il y a ' + s + ' s';
    return 'il y a ' + Math.round(s / 60) + ' min';
  }
  function togglePopover() {
    if (pop) { pop.remove(); pop = null; return; }
    pop = document.createElement('div');
    pop.className = 'wb3-fresh-pop';
    var items = history.slice(-3).reverse();
    pop.innerHTML = '<div class="wb3-fresh-pop-h">Dernières actualisations</div>' +
      (items.length
        ? items.map(function (h) {
          return '<div class="wb3-fresh-pop-row"><span>' + h.label + '</span>' +
            '<span class="wb3-fresh-pop-meta">' + fmtAgo(h.t) + ' · ' + (h.ok ? 'OK' : 'échec') + '</span></div>';
        }).join('')
        : '<div class="wb3-fresh-pop-row"><span>Aucune pour le moment</span></div>');
    el.appendChild(pop);
    setTimeout(function () {
      document.addEventListener('click', function close(e) {
        if (pop && !el.contains(e.target)) { pop.remove(); pop = null; document.removeEventListener('click', close); }
      });
    }, 0);
  }

  // ── 5. Abonnements ──
  function start() {
    if (bus) {
      bus.on('fetching:start', function () { inflight++; scheduleRender(); });
      bus.on('fetching:end', function (e) {
        inflight = Math.max(0, inflight - 1);
        if (e) history.push({ label: (e.label || 'données'), t: Date.now(), ok: e.ok !== false });
        if (history.length > 10) history.shift();
        scheduleRender();
      });
      bus.on('realtime:down', function () { realtimeDown = true; scheduleRender(); });
      bus.on('realtime:up', function () { realtimeDown = false; scheduleRender(); });
    }
    window.addEventListener('online', scheduleRender);
    window.addEventListener('offline', scheduleRender);
    if (document.body) render(); else document.addEventListener('DOMContentLoaded', render);
  }
  start();

  window.WB3Freshness = {
    history: function () { return history.slice(); },
    setRealtime: function (up) { realtimeDown = !up; scheduleRender(); },
  };
})();
