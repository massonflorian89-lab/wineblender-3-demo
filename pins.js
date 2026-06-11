/* ============================================================
 * pins.js — L8 : épingler 1 à 5 lignes d'une liste WB3, affichées
 *   en tête quel que soit le tri / la pagination.
 *
 * Persistance : user_preferences, clé `pinned_<module>` = { ids: [...] }
 *   (cloisonné par user_id + tenant_id côté getUserPref/setUserPref →
 *    pas de fuite inter-tenant). Max 5 ids.
 *
 * API :
 *   WB3Pins.MAX                      // 5
 *   await WB3Pins.load(module)       // -> string[] (ids, ≤ 5)
 *   WB3Pins.save(module, ids)        // fire-and-forget
 *   WB3Pins.toast(message)           // petit message éphémère (garde-fou max)
 *   WB3Pins.decorate(container, {    // pose un bouton 📌 sur chaque ligne
 *     isPinned: (id) => bool,         //   (décoration : aucune modif de structure)
 *     onToggle: (id) => void,
 *   })
 * ============================================================ */
(function () {
  'use strict';

  const MAX = 5;

  async function load(mod) {
    try {
      const p = (window.WB3DB && WB3DB.getUserPref) ? (await WB3DB.getUserPref('pinned_' + mod)) : null;
      return (p && Array.isArray(p.ids)) ? p.ids.map(String).slice(0, MAX) : [];
    } catch (_) { return []; }
  }
  function save(mod, ids) {
    try {
      if (window.WB3DB && WB3DB.setUserPref)
        WB3DB.setUserPref('pinned_' + mod, { ids: (ids || []).map(String).slice(0, MAX) }).catch(() => {});
    } catch (_) {}
  }

  let _toastEl = null;
  function toast(msg) {
    try {
      if (!_toastEl) { _toastEl = document.createElement('div'); _toastEl.className = 'wb3-pin-toast'; document.body.appendChild(_toastEl); }
      _toastEl.textContent = msg;
      _toastEl.classList.add('show');
      clearTimeout(_toastEl._h);
      _toastEl._h = setTimeout(() => _toastEl.classList.remove('show'), 2600);
    } catch (_) { try { alert(msg); } catch (__) {} }
  }

  function decorate(container, opts) {
    const el = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!el) return;
    el.querySelectorAll('tbody tr[data-id]').forEach(tr => {
      if (tr.querySelector('.pin-btn')) return;              // idempotent
      const td = tr.querySelector('td'); if (!td) return;
      const id = tr.dataset.id;
      const on = !!opts.isPinned(id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin-btn' + (on ? ' is-pinned' : '');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Désépingler' : 'Épingler en tête';
      btn.setAttribute('aria-label', btn.title);
      btn.textContent = '📌';
      btn.addEventListener('click', e => { e.stopPropagation(); opts.onToggle(id); });
      td.insertBefore(btn, td.firstChild);
    });
  }

  window.WB3Pins = { MAX, load, save, toast, decorate };
})();
