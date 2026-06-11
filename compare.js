/* ============================================================
 * compare.js — L12 : comparateur côte à côte de 2 à 6 lignes.
 *
 * Générique / réutilisable par tous les modules liste. Le module
 * possède son propre Set de sélection (ids) ; ce helper fournit :
 *   - WB3Compare.decorate(container, { isSelected, onToggle })
 *        pose une case à cocher discrète en tête de chaque ligne ;
 *   - WB3Compare.open({ title, items, rows, actions })
 *        ouvre un panneau (drawer droite) : colonnes = lignes
 *        choisies, lignes = champs métier. Surligne discrètement
 *        la valeur remarquable (max ou min) par champ numérique ;
 *   - WB3Compare.close().
 *
 * items : [{ id, label }]
 * rows  : [{ label, values:[...], numeric?:bool, better?:'high'|'low',
 *            display?:(v)=>string }]
 * actions : [{ label, onClick, primary?:bool }]
 *
 * Aucune requête : le module passe des valeurs déjà chargées.
 * Respecte prefers-reduced-motion (animations via CSS).
 * ============================================================ */
(function () {
  'use strict';

  const MIN = 2, MAX = 6;

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  function decorate(container, opts) {
    const el = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!el) return;
    el.querySelectorAll('tbody tr[data-id]').forEach(tr => {
      if (tr.querySelector('.cmp-check')) return;
      const td = tr.querySelector('td'); if (!td) return;
      const id = tr.dataset.id;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'cmp-check';
      cb.checked = !!opts.isSelected(id);
      cb.title = 'Sélectionner pour comparer';
      cb.setAttribute('aria-label', 'Sélectionner cette ligne pour comparaison');
      cb.addEventListener('click', e => { e.stopPropagation(); opts.onToggle(id); });
      td.insertBefore(cb, td.firstChild);
    });
  }

  let _ov = null;
  function _ensure() {
    if (_ov) return _ov;
    _ov = document.createElement('div');
    _ov.className = 'cmp-overlay';
    _ov.innerHTML = '<div class="cmp-panel" role="dialog" aria-modal="true" aria-label="Comparateur"></div>';
    _ov.addEventListener('click', e => { if (e.target === _ov) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.body.appendChild(_ov);
    return _ov;
  }
  function close() { if (_ov) _ov.classList.remove('open'); }

  function open(o) {
    const ov = _ensure();
    const panel = ov.querySelector('.cmp-panel');
    const allItems = o.items || [];
    const allRows = o.rows || [];
    // 9.2bis — Tablette/mobile (≤ 820 px ou tactile) : > 3 colonnes = illisible.
    // On plafonne à 3 + sélecteur pour choisir LESQUELLES (défaut : 3 premières).
    const mobile = (window.innerWidth || 999) <= 820 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const picker = mobile && allItems.length > 3;
    let chosen = allItems.map((_, i) => i).slice(0, picker ? 3 : allItems.length);

    function _pickerHtml() {
      if (!picker) return '';
      const chips = allItems.map((it, i) => {
        const on = chosen.indexOf(i) >= 0;
        return '<button type="button" class="cmp-pick' + (on ? ' is-on' : '') + '" data-i="' + i + '">' +
          (on ? '☑ ' : '☐ ') + _esc(it.label) + '</button>';
      }).join('');
      return '<div class="cmp-note">Choisir 3 lignes à comparer parmi les ' + allItems.length + ' sélectionnées :</div>' +
        '<div class="cmp-picker">' + chips + '</div>';
    }
    function _paint() {
      const items = chosen.map(i => allItems[i]);
      const rows = allRows.map(r => Object.assign({}, r, { values: chosen.map(i => (r.values || [])[i]) }));
      const heads = items.map(it => '<th>' + _esc(it.label) + '</th>').join('');
      const body = rows.map(r => {
        let best = null;
        if (r.numeric) {
          const nums = r.values.map(v => (v == null || v === '') ? null : Number(v)).filter(v => v != null && !isNaN(v));
          if (nums.length > 1) best = (r.better === 'low') ? Math.min(...nums) : Math.max(...nums);
        }
        const cells = r.values.map(v => {
          const isBest = r.numeric && best != null && v != null && v !== '' && Number(v) === best;
          const disp = r.display ? r.display(v) : (v == null || v === '' ? '—' : v);
          return '<td class="' + (r.numeric ? 'num' : '') + (isBest ? ' cmp-best' : '') + '">' + _esc(disp) + '</td>';
        }).join('');
        return '<tr><th class="cmp-rowlab">' + _esc(r.label) + '</th>' + cells + '</tr>';
      }).join('');
      const actions = (o.actions || []).map((a, i) =>
        '<button class="btn btn--sm ' + (a.primary ? '' : 'btn--secondary') + ' cmp-act" data-i="' + i + '">' + _esc(a.label) + '</button>').join('');
      panel.innerHTML =
        '<div class="cmp-head"><h3>' + _esc(o.title || 'Comparateur') + '</h3>' +
          '<button class="cmp-close" aria-label="Fermer le comparateur">×</button></div>' +
        '<div class="cmp-body">' + _pickerHtml() +
          '<table class="cmp-table"><thead><tr><th class="cmp-corner"></th>' + heads + '</tr></thead>' +
          '<tbody>' + body + '</tbody></table></div>' +
        (actions ? '<div class="cmp-foot">' + actions + '</div>' : '');
      panel.querySelector('.cmp-close').onclick = close;
      panel.querySelectorAll('.cmp-act').forEach(b => b.onclick = () => {
        const a = (o.actions || [])[+b.dataset.i]; close();
        if (a && typeof a.onClick === 'function') { try { a.onClick(); } catch (e) { console.warn('[L12] action:', e); } }
      });
      panel.querySelectorAll('.cmp-pick').forEach(b => b.onclick = () => {
        const i = +b.dataset.i, at = chosen.indexOf(i);
        if (at >= 0) { if (chosen.length > 1) chosen.splice(at, 1); }   // garder ≥ 1
        else { if (chosen.length >= 3) chosen.shift(); chosen.push(i); }  // max 3 (FIFO)
        chosen.sort((x, y) => x - y);
        _paint();
      });
    }
    _paint();
    ov.classList.add('open');
  }

  window.WB3Compare = { MIN, MAX, decorate, open, close };
})();
