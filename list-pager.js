/* ============================================================
 * list-pager.js — Pagination standardisée des listes WB3
 *   (Lots · Apports · Opérations · Analyses).
 *
 * Rend une barre : [Lignes 25/50/100] · compteur · « Tout afficher »
 *   (conditionnel) · [← Précédent · page X/Y · Suivant →].
 *   Taille de page persistée PAR MODULE en user_preferences
 *   ('list_page_size_<module>'), défaut 25.
 *
 * IMPORTANT (architecture) : la pagination est l'AFFICHAGE du jeu déjà
 *   filtré côté client (filtres colonne / recherche / tri opèrent sur le
 *   jeu chargé). Le SCOPE serveur est posé par L1 (filtre date) → le fetch
 *   est déjà borné, pas tout l'historique. Combiner LIMIT/OFFSET par page
 *   côté serveur casserait les filtres colonne client → on ne le fait pas.
 *
 * Garde-fou « Tout afficher » : bouton visible seulement si total ≥ 200 ;
 *   au-delà de 500 lignes, le module demande confirmation (WB3UI.confirm)
 *   avant de tout rendre (DOM lourd).
 *
 * API : WB3ListPager.loadSize(module) → Promise<int>
 *       WB3ListPager.saveSize(module, n)
 *       WB3ListPager.renderBar(hostEl, { total, page, pageSize, showAll,
 *                                        onPage(p), onSize(n), onToggleAll() })
 * ============================================================ */
(function () {
  'use strict';

  const SIZES = [25, 50, 100];
  const DEFAULT = 25;
  const SHOW_ALL_MIN = 200;     // bouton « Tout afficher » à partir de N résultats
  const CONFIRM_OVER = 500;     // au-delà → confirmation (côté module)
  const STEP = 25;              // L4 : « Charger 25 de plus »
  const MAX_CONTINUOUS = 2000;  // L4 : garde-fou mémoire → suggère la vue paginée

  async function loadSize(mod) {
    try {
      const p = (window.WB3DB && WB3DB.getUserPref) ? (await WB3DB.getUserPref('list_page_size_' + mod)) : null;
      const n = p && Number(p.size);
      return SIZES.indexOf(n) >= 0 ? n : DEFAULT;
    } catch (_) { return DEFAULT; }
  }
  function saveSize(mod, n) {
    try { if (window.WB3DB && WB3DB.setUserPref) WB3DB.setUserPref('list_page_size_' + mod, { size: n }).catch(() => {}); } catch (_) {}
  }
  // L4 — mode d'affichage : 'continuous' (Charger plus, défaut) | 'paginated' (L3).
  async function loadMode(mod) {
    try {
      const p = (window.WB3DB && WB3DB.getUserPref) ? (await WB3DB.getUserPref('list_mode_' + mod)) : null;
      return p && p.mode === 'paginated' ? 'paginated' : 'continuous';
    } catch (_) { return 'continuous'; }
  }
  function saveMode(mod, mode) {
    try { if (window.WB3DB && WB3DB.setUserPref) WB3DB.setUserPref('list_mode_' + mod, { mode }).catch(() => {}); } catch (_) {}
  }
  // L10 — densité d'affichage : 'confort' (défaut) | 'compact'.
  async function loadDensity(mod) {
    try {
      const p = (window.WB3DB && WB3DB.getUserPref) ? (await WB3DB.getUserPref('list_density_' + mod)) : null;
      return p && p.density === 'compact' ? 'compact' : 'confort';
    } catch (_) { return 'confort'; }
  }
  function saveDensity(mod, density) {
    try { if (window.WB3DB && WB3DB.setUserPref) WB3DB.setUserPref('list_density_' + mod, { density }).catch(() => {}); } catch (_) {}
  }

  // L7 — vue groupée (chrono) ↔ vue plate, persistée par module.
  async function loadGrouped(mod) {
    try {
      const p = (window.WB3DB && WB3DB.getUserPref) ? (await WB3DB.getUserPref('list_group_' + mod)) : null;
      return !!(p && p.grouped);
    } catch (_) { return false; }
  }
  function saveGrouped(mod, grouped) {
    try { if (window.WB3DB && WB3DB.setUserPref) WB3DB.setUserPref('list_group_' + mod, { grouped: !!grouped }).catch(() => {}); } catch (_) {}
  }

  let _css = false;
  function _injectCss() {
    if (_css) return; _css = true;
    const st = document.createElement('style');
    st.textContent =
      '.wb3-pager{display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between}' +
      '.wb3-pager-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
      '.wb3-pager-size{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--color-ink-secondary)}' +
      '.wb3-pager-size select{padding:3px 6px;font-size:12.5px}' +
      '.wb3-pager-count{font-size:12.5px;color:var(--color-ink-tertiary);font-variant-numeric:tabular-nums}' +
      '.wb3-pager-nav{display:flex;align-items:center;gap:8px}' +
      '.wb3-pager-pos{font-size:12.5px;color:var(--color-ink-secondary);font-variant-numeric:tabular-nums}';
    document.head.appendChild(st);
  }

  function renderBar(host, o) {
    if (!host) return;
    _injectCss();
    const total = o.total || 0;
    host.style.display = '';
    host.classList.add('wb3-pager');   // préserve une éventuelle classe existante

    // ── Mode CONTINU (L4) : compteur permanent + « Charger N de plus » ──
    if (o.mode === 'continuous') {
      const loaded  = Math.min(o.loaded || STEP, total);
      const more    = loaded < total;
      const capped  = (o.loaded || 0) >= MAX_CONTINUOUS;
      host.innerHTML =
        '<div class="wb3-pager-left">' +
          '<span class="wb3-pager-count" aria-live="polite">' + loaded + ' / ' + total + ' affichés</span>' +
          (more && !capped ? '<button class="btn btn--ghost btn--sm wb3-pg-more">⤓ Charger ' + STEP + ' de plus</button>' : '') +
          (more && capped  ? '<span class="wb3-pager-count">Beaucoup de lignes — passez en vue paginée.</span>' : '') +
        '</div>' +
        '<button class="btn btn--ghost btn--sm wb3-pg-mode" title="Basculer en pages classiques">≣ Vue paginée</button>';
      const moreB = host.querySelector('.wb3-pg-more'); if (moreB) moreB.addEventListener('click', () => o.onLoadMore());
      const modeB = host.querySelector('.wb3-pg-mode'); if (modeB) modeB.addEventListener('click', () => o.onToggleMode());
      return;
    }

    // ── Mode PAGINÉ (L3) : sélecteur taille + nav pages + « Tout afficher » ──
    const showAll = !!o.showAll;
    const pages   = Math.max(1, Math.ceil(total / o.pageSize));
    const page    = Math.min(Math.max(1, o.page), pages);
    const start   = total ? (page - 1) * o.pageSize + 1 : 0;
    const end     = Math.min(page * o.pageSize, total);

    const sizeOpts = SIZES.map(s => '<option value="' + s + '"' + (!showAll && o.pageSize === s ? ' selected' : '') + '>' + s + '</option>').join('');
    const nav = (!showAll && pages > 1)
      ? '<div class="wb3-pager-nav" role="navigation" aria-label="Pagination">' +
          '<button class="btn btn--ghost btn--sm wb3-pg-prev"' + (page <= 1 ? ' disabled' : '') + '>← Précédent</button>' +
          '<span class="wb3-pager-pos" aria-live="polite">page ' + page + ' / ' + pages + '</span>' +
          '<button class="btn btn--ghost btn--sm wb3-pg-next"' + (page >= pages ? ' disabled' : '') + '>Suivant →</button>' +
        '</div>'
      : '';
    const allBtn = (total >= SHOW_ALL_MIN)
      ? '<button class="btn btn--ghost btn--sm wb3-pg-all">' + (showAll ? '↩ Paginer' : '⤢ Tout afficher') + '</button>'
      : '';
    const count = showAll
      ? (total + ' résultats · tout affiché')
      : (total + ' résultat' + (total > 1 ? 's' : '') + (total > o.pageSize ? ' · ' + start + '–' + end : ''));

    host.innerHTML =
      '<div class="wb3-pager-left">' +
        '<label class="wb3-pager-size">Lignes <select>' + sizeOpts + '</select></label>' +
        '<span class="wb3-pager-count">' + count + '</span>' +
        allBtn +
        '<button class="btn btn--ghost btn--sm wb3-pg-mode" title="Charger en continu">≣ Vue continue</button>' +
      '</div>' + nav;

    const sel  = host.querySelector('.wb3-pager-size select');
    if (sel)  sel.addEventListener('change', () => o.onSize(Number(sel.value)));
    const prev = host.querySelector('.wb3-pg-prev'); if (prev) prev.addEventListener('click', () => o.onPage(page - 1));
    const next = host.querySelector('.wb3-pg-next'); if (next) next.addEventListener('click', () => o.onPage(page + 1));
    const all  = host.querySelector('.wb3-pg-all');  if (all)  all.addEventListener('click', () => o.onToggleAll());
    const modeB = host.querySelector('.wb3-pg-mode'); if (modeB) modeB.addEventListener('click', () => o.onToggleMode());
  }

  window.WB3ListPager = { SIZES, DEFAULT, SHOW_ALL_MIN, CONFIRM_OVER, STEP, MAX_CONTINUOUS,
                          loadSize, saveSize, loadMode, saveMode, loadDensity, saveDensity,
                          loadGrouped, saveGrouped, renderBar };
})();
