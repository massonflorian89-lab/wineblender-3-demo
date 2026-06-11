/* ============================================================
 * row-popover.js — L11 : mini-fiche au survol d'une ligne de liste
 *   (Lots · Apports · Opérations · Analyses).
 *
 * Couche LÉGÈRE d'aperçu : ne remplace pas les drawers détail/édition.
 * Aucune requête réseau — n'utilise QUE les données déjà chargées dans
 * la liste (résolues par `resolve(id)` sur le tableau en mémoire).
 *
 * Déclenchement :
 *   - souris : survol prolongé (~500 ms) d'une ligne `tr[data-id]`,
 *     uniquement sur appareils à survol réel (matchMedia hover:hover)
 *     → pas de popover parasite au tap tactile ;
 *   - clavier : focus dans une ligne → popover (même délai), Esc ferme.
 * Disparition rapide (~100 ms) à la sortie. Position fenêtrée
 * (jamais hors écran). Respecte prefers-reduced-motion (via CSS).
 *
 * API :
 *   WB3RowPopover.attach(container, {
 *     resolve: (id) => item | null,         // depuis les données chargées
 *     fields:  (item) => { title, rows: [[label, value], ...] }
 *   })
 *   (delégation posée sur `container` qui persiste entre les rendus —
 *    appeler une seule fois à l'init suffit.)
 * ============================================================ */
(function () {
  'use strict';

  const SHOW_DELAY = 500;   // ms — évite le flash quand on balaie la souris
  const HIDE_DELAY = 100;   // ms — disparition rapide à la sortie
  const GAP = 10;

  const _hoverable = (function () {
    try { return window.matchMedia('(hover: hover)').matches; } catch (_) { return true; }
  })();

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  let _pop = null;
  function _ensure() {
    if (_pop) return _pop;
    _pop = document.createElement('div');
    _pop.className = 'wb3-pop';
    _pop.setAttribute('role', 'tooltip');
    document.body.appendChild(_pop);
    return _pop;
  }
  function _renderHtml(data) {
    const rows = (data.rows || [])
      .filter(r => r && r[1] != null && r[1] !== '' && r[1] !== '—')
      .map(r => '<dt>' + _esc(r[0]) + '</dt><dd>' + _esc(r[1]) + '</dd>').join('');
    return '<div class="pop-title">' + _esc(data.title || '') + '</div>' +
           (rows ? '<dl>' + rows + '</dl>' : '<div class="pop-empty">Aucune donnée à afficher</div>');
  }
  function _place(pop, rect) {
    pop.style.visibility = 'hidden';
    pop.classList.add('is-open');           // mesure avec dimensions finales
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = rect.right + GAP;
    if (left + pw > vw - 6) left = rect.left - GAP - pw;   // bascule à gauche
    if (left < 6) left = Math.max(6, vw - pw - 6);
    let top = rect.top;
    if (top + ph > vh - 6) top = vh - ph - 6;
    if (top < 6) top = 6;
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
    pop.style.visibility = '';
  }

  function attach(container, opts) {
    const el = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!el || el._wb3PopBound) return;
    el._wb3PopBound = true;

    let showTimer = null, hideTimer = null, curRow = null;

    function _rowOf(target) {
      const row = target && target.closest ? target.closest('tr[data-id]') : null;
      if (!row || row.classList.contains('row-group-header')) return null;
      return row;
    }
    function _showFor(row) {
      let item = null;
      try { item = opts.resolve(row.dataset.id); } catch (_) { item = null; }
      if (!item) return;
      let data = null;
      try { data = opts.fields(item); } catch (_) { data = null; }
      if (!data) return;
      const pop = _ensure();
      pop.innerHTML = _renderHtml(data);
      _place(pop, row.getBoundingClientRect());
    }
    function _hide() {
      if (_pop) _pop.classList.remove('is-open');
      curRow = null;
    }
    function _arm(row) {
      curRow = row;
      clearTimeout(showTimer); clearTimeout(hideTimer);
      showTimer = setTimeout(() => _showFor(row), SHOW_DELAY);
    }
    function _disarm() {
      clearTimeout(showTimer);
      hideTimer = setTimeout(_hide, HIDE_DELAY);
      curRow = null;
    }

    if (_hoverable) {
      el.addEventListener('mouseover', e => {
        const row = _rowOf(e.target);
        if (!row || row === curRow) return;
        _arm(row);
      });
      el.addEventListener('mouseout', e => {
        const row = _rowOf(e.target);
        if (!row) return;
        if (e.relatedTarget && row.contains(e.relatedTarget)) return; // toujours dans la ligne
        _disarm();
      });
    }
    // Clavier : focus dans une ligne → popover ; Esc ferme.
    el.addEventListener('focusin', e => {
      const row = _rowOf(e.target);
      if (!row || row === curRow) return;
      _arm(row);
    });
    el.addEventListener('focusout', () => _disarm());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') _hide(); });
    window.addEventListener('scroll', _hide, true);
  }

  window.WB3RowPopover = { attach };
})();
