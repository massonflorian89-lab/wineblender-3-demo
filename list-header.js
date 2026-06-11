/* ============================================================
 * list-header.js — Bandeau « tableau de bord » sticky des listes WB3
 *   (Lots · Apports · Opérations · Analyses). Dépend de L1–L4.
 *
 * Agrège dans un seul bandeau qui reste visible au scroll :
 *   - un compteur (affiché/total, lien L3/L4),
 *   - une étiquette (chip) dismissible par filtre actif (période L1,
 *     recherche, filtres colonne « Excel », filtres rapides du module),
 *   - un bouton « Réinitialiser » (visible si ≥ 1 filtre actif ; masqué
 *     en lecture pure).
 *
 * API : WB3ListHeader.update(hostId, { counter, chips, onReset, readOnly })
 *         chips = [{ label, onRemove }]
 *       WB3ListHeader.presetLabel(presetKey)  // libellé période L1
 *
 * Sticky sous le header global (sticky top:0, z-index:50) → top:header-height.
 * En mode embarqué (.wb-header masqué) → top:0.
 * ============================================================ */
(function () {
  'use strict';

  const PRESET_LABELS = {
    today: "Aujourd'hui", '7j': '7 jours', '30j': '30 jours', '90j': '90 jours',
    campagne: 'Campagne en cours', custom: 'Période perso', all: 'Tout',
  };
  function presetLabel(k) { return PRESET_LABELS[k] || k; }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  let _css = false;
  function _injectCss() {
    if (_css) return; _css = true;
    const st = document.createElement('style');
    st.textContent =
      '.lh-bar{position:sticky;top:var(--header-height,56px);z-index:5;display:flex;align-items:center;gap:10px;flex-wrap:wrap;' +
        'background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:10px;' +
        'padding:7px 12px;margin:0 0 10px;box-shadow:0 2px 8px rgba(0,0,0,.06)}' +
      'body.embedded .lh-bar{top:0}' +
      '.lh-count{font-size:12.5px;color:var(--color-ink-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.lh-chips{display:flex;gap:6px;flex-wrap:wrap;flex:1;min-width:0}' +
      '.lh-chip{display:inline-flex;align-items:center;gap:5px;background:var(--color-bg-subtle);border:1px solid var(--color-border);' +
        'border-radius:999px;padding:2px 5px 2px 10px;font-size:12px;color:var(--color-ink);max-width:260px}' +
      '.lh-chip-lab{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.lh-chip-x{border:none;background:none;cursor:pointer;color:var(--color-ink-tertiary);font-size:15px;line-height:1;padding:0 3px;border-radius:50%}' +
      '.lh-chip-x:hover{color:var(--color-danger,#c62828);background:var(--color-bg-mute)}' +
      '.lh-chip:focus-visible{outline:2px solid var(--color-primary);outline-offset:1px}' +
      '.lh-group,.lh-density{flex-shrink:0}' +
      '.lh-group.is-on{background:var(--color-primary-soft,rgba(120,80,60,.12));border-color:var(--color-primary);color:var(--color-primary)}' +
      '.lh-reset{flex-shrink:0}';
    document.head.appendChild(st);
  }

  function update(hostId, o) {
    _injectCss();
    const host = (typeof hostId === 'string') ? document.getElementById(hostId) : hostId;
    if (!host) return;
    const chips = (o.chips || []).filter(Boolean);

    host.classList.add('lh-bar');
    host.style.display = '';
    const chipsHtml = chips.map((c, i) =>
      '<span class="lh-chip" tabindex="0" role="button" data-i="' + i + '" ' +
            'aria-label="Filtre : ' + _esc(c.label) + ' (Suppr pour retirer)">' +
        '<span class="lh-chip-lab">' + _esc(c.label) + '</span>' +
        '<button class="lh-chip-x" tabindex="-1" aria-label="Retirer le filtre ' + _esc(c.label) + '">×</button>' +
      '</span>').join('');
    const resetBtn = (chips.length && !o.readOnly)
      ? '<button class="btn btn--ghost btn--sm lh-reset" aria-label="Réinitialiser les filtres" title="Réinitialiser les filtres">↺ <span class="lh-reset-lab">Réinitialiser</span></button>' : '';
    const density = o.density === 'compact' ? 'compact' : 'confort';
    const densBtn = o.onToggleDensity
      ? '<button class="btn btn--ghost btn--sm lh-density" title="Densité : ' + density + ' (cliquer pour basculer)" ' +
        'aria-label="Basculer la densité d\'affichage (actuel : ' + density + ')">' + (density === 'compact' ? '▤' : '▢') + '</button>'
      : '';
    // L7 — toggle « Vue groupée » (par tranche de temps) ↔ « Vue plate ».
    const grouped = !!o.grouped;
    const grpBtn = o.onToggleGroup
      ? '<button class="btn btn--ghost btn--sm lh-group' + (grouped ? ' is-on' : '') + '" ' +
        'aria-pressed="' + (grouped ? 'true' : 'false') + '" ' +
        'title="' + (grouped ? 'Vue groupée par période (cliquer pour vue plate)' : 'Vue plate (cliquer pour grouper par période)') + '" ' +
        'aria-label="Basculer la vue groupée par période">🗓 ' + (grouped ? 'Groupé' : 'Plate') + '</button>'
      : '';
    // L12 — actions contextuelles (ex. « Comparer » quand ≥ 2 lignes sélectionnées).
    const actions = (o.actions || []).filter(Boolean);
    const actionsHtml = actions.map((a, i) =>
      '<button class="btn btn--sm ' + (a.primary ? '' : 'btn--secondary') + ' lh-action" data-ai="' + i + '">' + _esc(a.label) + '</button>').join('');
    host.innerHTML =
      '<span class="lh-count" aria-live="polite">' + _esc(o.counter || '') + '</span>' +
      '<div class="lh-chips">' + chipsHtml + '</div>' +
      actionsHtml + grpBtn + densBtn + resetBtn;

    host.querySelectorAll('.lh-chip').forEach(el => {
      const idx = +el.getAttribute('data-i');
      const remove = () => { try { chips[idx].onRemove(); } catch (e) { console.warn('[L5] chip:', e); } };
      const x = el.querySelector('.lh-chip-x');
      if (x) x.addEventListener('click', e => { e.stopPropagation(); remove(); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); remove(); }
      });
    });
    const rb = host.querySelector('.lh-reset');
    if (rb && typeof o.onReset === 'function') rb.addEventListener('click', () => { try { o.onReset(); } catch (e) { console.warn('[L5] reset:', e); } });
    const db = host.querySelector('.lh-density');
    if (db && typeof o.onToggleDensity === 'function') db.addEventListener('click', () => { try { o.onToggleDensity(); } catch (e) { console.warn('[L10] density:', e); } });
    const gb = host.querySelector('.lh-group');
    if (gb && typeof o.onToggleGroup === 'function') gb.addEventListener('click', () => { try { o.onToggleGroup(); } catch (e) { console.warn('[L7] group:', e); } });
    host.querySelectorAll('.lh-action').forEach(b => {
      const a = actions[+b.getAttribute('data-ai')];
      if (a && typeof a.onClick === 'function') b.addEventListener('click', () => { try { a.onClick(); } catch (e) { console.warn('[L12] action:', e); } });
    });
  }

  window.WB3ListHeader = { update, presetLabel };
})();
