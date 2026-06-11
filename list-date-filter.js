/* ============================================================
 * list-date-filter.js — Sélecteur de PÉRIODE pour les listes WB3
 *   (Lots · Apports · Opérations · Analyses).
 *
 * But : à l'ouverture, ne pas charger tout l'historique mais une plage
 *   utile. Le filtrage est CÔTÉ SERVEUR — le module passe date_from/date_to
 *   aux query helpers (pas de "fetch all puis filter" en JS).
 *
 * L2 (onglets rapides) : le widget rend aussi un tablist « Récents (30 j) ·
 *   Cette saison (campagne) · Tout » au-dessus du dropdown. L'onglet actif est
 *   DÉRIVÉ du preset (donc persisté par module via la même pref L1). « Épinglés »
 *   reste commenté tant que L8 (épinglage) n'est pas livré. Clavier ← → Home End.
 *
 * Préférence persistée PAR MODULE en user_preferences (clé
 *   'list_date_<module>'), cloisonnée user+tenant via WB3DB. Restaurée au
 *   chargement suivant. Indépendante des filtres colonne (Excel) du module.
 *
 * « Campagne en cours » = année viticole démarrant le 1er août :
 *   août–déc → 1er août de l'année en cours ; janv–juil → 1er août de l'an
 *   précédent. (Aucune notion de campagne préexistante dans WB3 au moment de
 *   l'écriture — définie ici.)
 *
 * API :
 *   const r = await WB3ListDateFilter.init({ module, defaultPreset, mount, onChange });
 *     → rend le sélecteur dans `mount`, renvoie l'état INITIAL
 *       { preset, date_from, date_to } (le module fait son 1er fetch avec ça).
 *     → onChange({ preset, date_from, date_to }) est appelé aux changements
 *       UTILISATEUR uniquement (le module recharge ses données serveur).
 *   WB3ListDateFilter.range(preset, custom) · .campagneStart()
 * ============================================================ */
(function () {
  'use strict';

  const PRESETS = [
    { key: 'today',    label: "Aujourd'hui" },
    { key: '7j',       label: '7 jours' },
    { key: '30j',      label: '30 jours' },
    { key: '90j',      label: '90 jours' },
    { key: 'campagne', label: 'Campagne en cours' },
    { key: 'all',      label: 'Tout' },
    { key: 'custom',   label: 'Personnalisé…' },
  ];

  // Date locale → 'YYYY-MM-DD' (sans décalage de fuseau).
  const _iso = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
  };

  function campagneStart() {
    const n = new Date();
    const y = n.getMonth() >= 7 ? n.getFullYear() : n.getFullYear() - 1;  // 7 = août
    return _iso(new Date(y, 7, 1));
  }

  function range(preset, custom) {
    const tIso = _iso(new Date());
    const back = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return _iso(d); };
    switch (preset) {
      case 'today':    return { date_from: tIso,            date_to: tIso };
      case '7j':       return { date_from: back(7),         date_to: tIso };
      case '30j':      return { date_from: back(30),        date_to: tIso };
      case '90j':      return { date_from: back(90),        date_to: tIso };
      case 'campagne': return { date_from: campagneStart(), date_to: tIso };
      case 'custom':   return { date_from: (custom && custom.from) || null, date_to: (custom && custom.to) || null };
      default:         return { date_from: null, date_to: null };   // 'all'
    }
  }

  async function _loadPref(mod) {
    try { return (window.WB3DB && WB3DB.getUserPref) ? ((await WB3DB.getUserPref('list_date_' + mod)) || {}) : {}; }
    catch (_) { return {}; }
  }
  function _savePref(mod, data) {
    // Fire-and-forget sur geste utilisateur → jamais dans onAuthStateChange.
    try { if (window.WB3DB && WB3DB.setUserPref) WB3DB.setUserPref('list_date_' + mod, data).catch(() => {}); } catch (_) {}
  }

  let _css = false;
  function _injectCss() {
    if (_css) return; _css = true;
    const st = document.createElement('style');
    st.textContent =
      '.wb3-ldf{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap}' +
      '.wb3-ldf-ico{font-size:14px;opacity:.8}' +
      '.wb3-ldf-custom{display:inline-flex;align-items:center;gap:4px}' +
      '.wb3-ldf-custom .input{padding:4px 7px;font-size:12.5px;width:auto}' +
      /* L2 — onglets rapides (segmented) */
      '.wb3-ldf-tabs{display:inline-flex;border:1px solid var(--color-border);border-radius:8px;overflow:hidden;margin-right:4px}' +
      '.wb3-ldf-tab{border:none;border-left:1px solid var(--color-border);background:var(--color-bg-elevated);color:var(--color-ink-secondary);font:inherit;font-size:12.5px;padding:5px 12px;cursor:pointer}' +
      '.wb3-ldf-tab:first-child{border-left:none}' +
      '.wb3-ldf-tab.is-active{background:var(--color-primary);color:#fff;font-weight:600}' +
      '.wb3-ldf-tab:focus-visible{outline:2px solid var(--color-primary);outline-offset:-2px}' +
      '@media (prefers-reduced-motion: no-preference){.wb3-ldf-tab{transition:background .12s,color .12s}}';
    document.head.appendChild(st);
  }

  async function init(opts) {
    _injectCss();
    const mod  = opts.module;
    const host = (typeof opts.mount === 'string') ? document.getElementById(opts.mount) : opts.mount;
    const pref = await _loadPref(mod);
    let preset = pref.preset || opts.defaultPreset || '30j';
    let custom = pref.custom || { from: null, to: null };
    let _setPreset = function () {};   // exposé (L5) : piloter le preset depuis l'extérieur (chips / réinit.)

    // L2 — onglets rapides. Mapping distinct (pas de doublon) : l'onglet actif
    // au chargement reflète le défaut du module. « Épinglés » = uniquement si L8
    // (épinglage) livré → masqué aujourd'hui. L'onglet actif est DÉRIVÉ du
    // preset déjà persisté par L1 (mémorisé par module, aucune clé en plus).
    const TABS = [
      { preset: '30j',      label: 'Récents' },
      { preset: 'campagne', label: 'Cette saison' },
      { preset: 'all',      label: 'Tout' },
      // { preset: 'pins', label: 'Épinglés' },  // ← à activer quand L8 sera livré
    ];

    if (host) {
      host.classList.add('wb3-ldf');
      host.innerHTML =
        '<div class="wb3-ldf-tabs" role="tablist" aria-label="Période rapide">' +
          TABS.map(t => '<button type="button" role="tab" class="wb3-ldf-tab" data-preset="' + t.preset + '" aria-selected="false" tabindex="-1">' + t.label + '</button>').join('') +
        '</div>' +
        '<span class="wb3-ldf-ico" aria-hidden="true">📅</span>' +
        '<select class="ctrl-select wb3-ldf-preset" title="Période affichée">' +
          PRESETS.map(p => '<option value="' + p.key + '"' + (p.key === preset ? ' selected' : '') + '>' + p.label + '</option>').join('') +
        '</select>' +
        '<span class="wb3-ldf-custom" style="display:' + (preset === 'custom' ? 'inline-flex' : 'none') + '">' +
          '<input type="date" class="input wb3-ldf-from" value="' + (custom.from || '') + '">' +
          '<span aria-hidden="true">→</span>' +
          '<input type="date" class="input wb3-ldf-to" value="' + (custom.to || '') + '">' +
        '</span>';

      const sel    = host.querySelector('.wb3-ldf-preset');
      const cw     = host.querySelector('.wb3-ldf-custom');
      const fi     = host.querySelector('.wb3-ldf-from');
      const ti     = host.querySelector('.wb3-ldf-to');
      const tabsEl = Array.prototype.slice.call(host.querySelectorAll('.wb3-ldf-tab'));

      // Surligne l'onglet correspondant au preset courant (aucun si 7j/90j/custom).
      function syncTabs() {
        let active = -1;
        tabsEl.forEach((b, i) => {
          const on = b.dataset.preset === preset;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
          if (on) active = i;
        });
        if (active === -1 && tabsEl[0]) tabsEl[0].tabIndex = 0;   // roving : au moins 1 focusable
      }
      // Applique un preset (dropdown OU onglet) : UI + persistance + (option) émission.
      function apply(p, emit) {
        preset = p;
        sel.value = p;
        cw.style.display = p === 'custom' ? 'inline-flex' : 'none';
        syncTabs();
        _savePref(mod, { preset, custom });
        if (emit) opts.onChange(Object.assign({ preset }, range(preset, custom)));
      }
      _setPreset = function (p) { apply(p, true); };   // L5

      sel.addEventListener('change', () => {
        const p = sel.value;
        if (p === 'custom') { apply('custom', custom.from || custom.to ? true : false); }
        else apply(p, true);
      });
      const onCustom = () => {
        custom = { from: fi.value || null, to: ti.value || null };
        if (preset === 'custom') { _savePref(mod, { preset, custom }); opts.onChange(Object.assign({ preset }, range(preset, custom))); }
      };
      fi.addEventListener('change', onCustom);
      ti.addEventListener('change', onCustom);

      tabsEl.forEach((b, i) => {
        b.addEventListener('click', () => apply(b.dataset.preset, true));
        b.addEventListener('keydown', (e) => {   // navigation clavier ← → Home End
          let j = -1;
          if (e.key === 'ArrowRight')     j = (i + 1) % tabsEl.length;
          else if (e.key === 'ArrowLeft') j = (i - 1 + tabsEl.length) % tabsEl.length;
          else if (e.key === 'Home')      j = 0;
          else if (e.key === 'End')       j = tabsEl.length - 1;
          if (j >= 0) { e.preventDefault(); tabsEl[j].focus(); apply(tabsEl[j].dataset.preset, true); }
        });
      });

      syncTabs();
    }

    // État INITIAL (pas d'appel onChange ici : le module fait son 1er fetch avec ça).
    // setPreset (L5) : permet aux chips / au bouton Réinitialiser de piloter la période.
    return Object.assign({ preset, setPreset: function (p) { _setPreset(p); } }, range(preset, custom));
  }

  window.WB3ListDateFilter = { init, range, campagneStart, PRESETS };
})();
