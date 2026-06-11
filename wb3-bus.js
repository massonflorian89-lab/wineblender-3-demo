/* ============================================================
 * wb3-bus.js — Bus d'évènements minimal partagé WB3 (~20 lignes).
 *   WB3Bus.on(ev, fn) -> unsubscribe()
 *   WB3Bus.off(ev, fn)
 *   WB3Bus.once(ev, fn)
 *   WB3Bus.emit(ev, payload)
 * Évènements conventionnels : 'fetching:start' | 'fetching:end'
 *   | 'realtime:up' | 'realtime:down' (payload libre).
 * ============================================================ */
(function () {
  'use strict';
  if (window.WB3Bus) return;
  var map = {};
  function on(ev, fn) { (map[ev] = map[ev] || []).push(fn); return function () { off(ev, fn); }; }
  function off(ev, fn) { if (map[ev]) map[ev] = map[ev].filter(function (f) { return f !== fn; }); }
  function emit(ev, payload) {
    (map[ev] || []).slice().forEach(function (f) { try { f(payload); } catch (e) { console.warn('[WB3Bus]', ev, e); } });
  }
  function once(ev, fn) { var u = on(ev, function (p) { u(); fn(p); }); return u; }
  window.WB3Bus = { on: on, off: off, once: once, emit: emit };
})();
