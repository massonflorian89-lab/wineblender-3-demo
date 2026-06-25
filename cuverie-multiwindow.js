// cuverie-multiwindow.js — 2ᵉ écran, mur d'affichage, BroadcastChannel, pointage
// Extrait de cuverie.html (Étape 10 de la refactorisation progressive).
//
// Coordination multi-fenêtres même origine (session Supabase partagée) :
//   • openCuverieFullscreen — pop-up cuverie.html?fs=1 (poste de pilotage)
//   • openCuverieWall — mur d'affichage lecture seule (?fs=1&mode=wall)
//   • _bc* — BroadcastChannel : sync filtres + sélection entre fenêtres
//   • _wall* — mode mur : anti-veille (Wake Lock), setup, halo de changement
//   • _point* — pointage d'une cuve sur les autres fenêtres (mur/2ᵉ écran)
//
// État top-level (déclaré ici, partagé via Global Environment Record) :
//   _fsWin, _wallWin, _bcId, _bc, _bcApplying, _bcLastFilters, _bcLastSel,
//   _wallMode (IIFE lisant ?fs/&mode), _wallLock
//
// Globals lus (cuverie.html principal / modules) :
//   contenants, selectedIds, viewMode, render, getFiltered, escapeHtml,
//   _caveTileHTML (cuverie-caveplan.js), _caveEditOn, renderCard, applyView…
//
// ⚠️ _wallMode est un const lu par la fonction async d'init du principal
// (if (_wallMode) _wallSetup()). Module chargé AVANT ce <script> → const
// défini à temps. L'IIFE _wallMode ne lit que l'URL (autonome à l'init).
// _pointBroadcast est appelé par onCuveClick (cuverie-crud.js) au runtime.

'use strict';

// ============================================================
// Fenêtre cuverie indépendante (?fs=1) — 2ᵉ écran (poste de pilotage)
//   Pop-up MÊME ORIGINE → session Supabase partagée (localStorage) → pas de
//   re-login. La fenêtre fille charge cuverie.html?fs=1 : même socle perf
//   (queryCuverieEtat + Realtime ciblé), chrome masqué. Chaque fenêtre est
//   autonome (coordination fine = M3). Nettoyage Realtime déjà géré par le
//   listener 'pagehide' de subscribeRealtime() côté fille.
// ============================================================
let _fsWin = null;
function openCuverieFullscreen() {
  try {
    // Doublon : si la fille est déjà ouverte, on la remet au premier plan.
    if (_fsWin && !_fsWin.closed) { _fsWin.focus(); return; }
    // PAS de noopener : on garde la référence pour le refocus. Le nom de
    // fenêtre 'wb3-cuverie-fs' évite aussi tout doublon côté navigateur.
    const feat = 'width=1600,height=900,menubar=no,toolbar=no,location=no,status=no';
    _fsWin = window.open('cuverie.html?fs=1', 'wb3-cuverie-fs', feat);
    if (_fsWin) _fsWin.focus();
    else toast('Fenêtre bloquée par le navigateur — autorisez les pop-ups pour ce site.', 'error');
  } catch (e) {
    console.warn('[WB3 cuverie] openCuverieFullscreen:', e);
    toast('Impossible d\'ouvrir la fenêtre plein écran.', 'error');
  }
}

// Écran mural (M4) : pop-up dédiée, lecture seule, thème clair/sombre commutable.
let _wallWin = null;
function openCuverieWall() {
  try {
    if (_wallWin && !_wallWin.closed) { _wallWin.focus(); return; }
    const feat = 'width=1600,height=900,menubar=no,toolbar=no,location=no,status=no';
    _wallWin = window.open('cuverie.html?fs=1&mode=wall', 'wb3-cuverie-wall', feat);
    if (_wallWin) _wallWin.focus();
    else toast('Fenêtre bloquée par le navigateur — autorisez les pop-ups pour ce site.', 'error');
  } catch (e) {
    console.warn('[WB3 cuverie] openCuverieWall:', e);
    toast('Impossible d\'ouvrir l\'écran mural.', 'error');
  }
}

// ============================================================
// M3 — Coordination multi-fenêtres (BroadcastChannel)
//   Canal cloisonné par tenant : wb3-cuverie-<tenant_id> (zéro fuite cross-
//   tenant). Diffuse des ÉVÈNEMENTS UI (filtres, sélection), PAS les données :
//   Realtime Supabase reste la SOURCE DE VÉRITÉ. Anti-boucle via 'source' +
//   drapeau _bcApplying + dédup. Restent LOCAUX à chaque fenêtre : scroll,
//   drawers ouverts, pagination, panneaux transitoires. (focus:cuve /
//   realtime:hint non implémentés — Realtime couvre déjà la donnée.)
//   Fallback : si BroadcastChannel indisponible, chaque fenêtre reste
//   autonome (M1 inchangé).
// ============================================================
const _bcId = Math.random().toString(36).slice(2) + Date.now();
let _bc = null, _bcApplying = false, _bcLastFilters = null, _bcLastSel = null;

function _bcFilterSnapshot() {
  // NB : viewMode/groupMode (vue & présentation) sont VOLONTAIREMENT exclus →
  // chaque fenêtre garde sa propre vue (colonnes / plan…). Seuls les FILTRES de
  // données sont partagés ; les données restent temps réel via Realtime.
  return { activeTab, filterPhase, filterMillesime, filterCouleur,
           filterType, searchQuery, faFilterOn, filterTravee, sortAsc };
}
function _bcSend(type, payload) {
  if (!_bc || _bcApplying) return;             // ne pas ré-émettre ce qu'on applique
  try { _bc.postMessage({ type, payload, source: _bcId, ts: Date.now() }); } catch (_) {}
}
function _bcMaybeBroadcastFilters() {
  if (!_bc || _bcApplying || _wallMode) return;   // mur : ne pousse jamais ses filtres figés
  const js = JSON.stringify(_bcFilterSnapshot());
  if (js === _bcLastFilters) return;           // inchangé (ex. refresh Realtime) → rien
  _bcLastFilters = js;
  _bcSend('filter:change', _bcFilterSnapshot());
}
function _bcMaybeBroadcastSelection() {
  if (!_bc || _bcApplying || _wallMode) return;   // mur : pas de sélection
  const arr = [...selectedIds].sort();
  const js = JSON.stringify(arr);
  if (js === _bcLastSel) return;
  _bcLastSel = js;
  _bcSend('selection:change', arr);
}
function _bcApplyFilters(s) {
  if (!s) return;
  if ('activeTab'       in s) activeTab       = s.activeTab;
  if ('filterPhase'     in s) filterPhase     = s.filterPhase;
  if ('filterMillesime' in s) filterMillesime = s.filterMillesime;
  if ('filterCouleur'   in s) filterCouleur   = s.filterCouleur;
  if ('filterType'      in s) filterType      = s.filterType;
  if ('searchQuery'     in s) searchQuery     = s.searchQuery;
  if ('faFilterOn'      in s) faFilterOn      = s.faFilterOn;
  if ('filterTravee'    in s) filterTravee    = s.filterTravee;
  if ('sortAsc'         in s) sortAsc         = s.sortAsc;
  currentPage = 1;
  applyPrefsToUI();
  // Contrôles non couverts par applyPrefsToUI :
  const ms = document.getElementById('filter-millesime'); if (ms) ms.value = filterMillesime;
  const sq = document.getElementById('search'); if (sq && sq.value !== (searchQuery || '')) sq.value = searchQuery || '';
  render();
  _bcLastFilters = JSON.stringify(_bcFilterSnapshot());   // évite l'écho
}
function _bcApplySelection(arr) {
  selectedIds = new Set(Array.isArray(arr) ? arr : []);
  render();
  updateSelectionFab();
  _bcLastSel = JSON.stringify([...selectedIds].sort());   // évite l'écho
}
function _bcClose() { try { _bc && _bc.close(); } catch (_) {} _bc = null; }
function _bcInit(tenantId) {
  if (_bc || !tenantId || typeof BroadcastChannel === 'undefined') return;   // fallback : autonome
  try {
    _bc = new BroadcastChannel('wb3-cuverie-' + tenantId);
    // Amorce des dédups → la 1ʳᵉ diffusion n'aura lieu qu'au 1ᵉʳ vrai changement.
    _bcLastFilters = JSON.stringify(_bcFilterSnapshot());
    _bcLastSel = JSON.stringify([...selectedIds].sort());
    _bc.onmessage = (ev) => {
      const m = ev.data;
      if (!m || m.source === _bcId) return;     // ignore ses propres messages (anti-boucle)
      _bcApplying = true;
      try {
        if (m.type === 'point:cuve')            _pointFlash(m.payload && m.payload.contenant_id, { scroll: !_wallMode });
        else if (m.type === 'filter:change')    { if (!_wallMode) _bcApplyFilters(m.payload); }    // mur : filtre figé
        else if (m.type === 'selection:change') { if (!_wallMode) _bcApplySelection(m.payload); }  // mur : pas de sélection
      } catch (e) { console.warn('[WB3 M3] apply:', e); }
      finally { _bcApplying = false; }
    };
    window.addEventListener('pagehide', _bcClose, { once: true });   // cleanup → pas de fuite
  } catch (e) { console.warn('[WB3 M3] BroadcastChannel KO:', e); _bc = null; }
}

// Hooks non-intrusifs : on enveloppe render() et updateSelectionFab() pour
// émettre APRÈS coup (guard + dédup → strictement no-op sans canal).
if (typeof render === 'function') {
  const _bcOrigRender = render;
  render = function () { const r = _bcOrigRender.apply(this, arguments); _bcMaybeBroadcastFilters(); return r; };
}
if (typeof updateSelectionFab === 'function') {
  const _bcOrigUSF = updateSelectionFab;
  updateSelectionFab = function () { const r = _bcOrigUSF.apply(this, arguments); _bcMaybeBroadcastSelection(); return r; };
}

// ============================================================
// M5 — Mode mural (?fs=1&mode=wall) : tableau de bord TV, lecture seule
//   Variante dépouillée du plein écran (M1) : chrome masqué (CSS html.wb3-wall),
//   filtre figé = TOUT, aucune interaction (pointer-events:none), thème 'dark'
//   figé (AA / anti-burn-in), anti-veille écran (Wake Lock natif), halo discret
//   sur les cuves modifiées en direct. Sortie : Échap → retour au plein écran
//   normal (?fs=1). Realtime reste la source de vérité.
// ============================================================
const _wallMode = (function () {
  const p = new URLSearchParams(location.search);
  return p.get('fs') === '1' && p.get('mode') === 'wall';
})();
let _wallLock = null;

async function _wallKeepAwake() {
  // Best-effort, API native (pas de lib). L'OS peut relâcher le verrou quand
  // l'onglet passe en arrière-plan → on le ré-acquiert au retour au 1ᵉʳ plan.
  try {
    if ('wakeLock' in navigator) {
      _wallLock = await navigator.wakeLock.request('screen');
      document.addEventListener('visibilitychange', async () => {
        if (_wallMode && document.visibilityState === 'visible') {
          try { _wallLock = await navigator.wakeLock.request('screen'); } catch (_) {}
        }
      });
    }
  } catch (e) { console.warn('[WB3 wall] wakeLock indisponible :', e); }
}

function _wallSetup() {
  // Filtre FIGÉ : on affiche TOUT (aucun contrôle interactif sur un mur).
  filterType = 'all'; activeTab = 'all'; filterPhase = 'all';
  filterCouleur = 'all'; filterMillesime = 'all'; searchQuery = '';
  // Vue du mur : réglage explicite (Paramètres → Vue du mur) sinon « auto »
  // (plan de cave si composé, sinon grille).
  const _wv = userPrefs.wall_view || 'auto';
  faFilterOn = false; groupMode = 'none';
  viewMode = (_wv && _wv !== 'auto') ? _wv
           : ((cavePlanPos && Object.keys(cavePlanPos).length) ? 'caveplan' : 'grid');
  if (viewMode === 'caveplan' && !_planCaveOn) viewMode = 'grid';   // module désactivé → repli
  _wallKeepAwake();
  // Sortie du mode mural : Échap → on retire mode=wall (retour au ?fs=1 normal).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const u = new URL(location.href);
    u.searchParams.delete('mode');
    location.replace(u.href);
  });
  // M5 — Unique geste autorisé sur le mur : « tap pour pointer » une cuve →
  // flash sur les autres fenêtres. Capture + stopPropagation : NE déclenche RIEN
  // d'autre (ni drawer, ni sélection) → le mur reste read-only.
  const _wc = document.getElementById('content');
  if (_wc) _wc.addEventListener('click', (e) => {
    const card = e.target.closest('[data-cid]');
    if (!card) return;
    e.preventDefault(); e.stopPropagation();
    const cid = card.getAttribute('data-cid');
    _pointBroadcast(cid);
    _pointFlash(cid, { scroll: false });   // feedback local sur le mur
  }, true);
  // Bascule clair / sombre du mur (journée ↔ écran allumé). Bouton flottant
  // discret, hors #content (non concerné par le verrou read-only).
  const _tt = document.createElement('button');
  _tt.id = 'wall-theme-toggle';
  _tt.type = 'button';
  _tt.title = 'Basculer thème clair / sombre';
  const _cur = () => localStorage.getItem('wb3_wall_theme') || 'dark';
  _tt.textContent = _cur() === 'light' ? '🌙' : '☀️';
  _tt.addEventListener('click', () => {
    const next = _cur() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('wb3_wall_theme', next); } catch (_) {}
    if (next === 'light') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'dark');
    _tt.textContent = next === 'light' ? '🌙' : '☀️';
  });
  document.body.appendChild(_tt);

  // ── Zoom mur (molette + boutons flottants ±) ──────────────────
  _wallZoomApply(1);
  const _wc2 = document.getElementById('content');
  if (_wc2) {
    _wc2.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      _wallZoomStep(e.deltaY < 0 ? 1 : -1);
    }, { passive: false });
  }
  const _zbar = document.createElement('div');
  _zbar.id = 'wall-zoom-bar';
  _zbar.style.cssText =
    'position:fixed;bottom:16px;right:16px;z-index:9999;display:flex;align-items:center;' +
    'gap:6px;background:rgba(0,0,0,.55);border-radius:20px;padding:4px 10px;' +
    'font-size:14px;color:#fff;backdrop-filter:blur(6px)';
  const _zbtn = (lbl, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = lbl;
    b.style.cssText = 'background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px;line-height:1';
    b.addEventListener('click', fn);
    return b;
  };
  const _zlbl = document.createElement('span');
  _zlbl.id = 'wall-zoom-lbl';
  _zlbl.textContent = '100%';
  _zbar.appendChild(_zbtn('−', () => _wallZoomStep(-1)));
  _zbar.appendChild(_zlbl);
  _zbar.appendChild(_zbtn('+', () => _wallZoomStep(1)));
  _zbar.appendChild(_zbtn('↺', () => { _wallZoomApply(1); }));
  document.body.appendChild(_zbar);
}

let _wallZoomLevel = 1;
const _WALL_ZOOM_STEPS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
function _wallZoomApply(z) {
  _wallZoomLevel = Math.max(0.4, Math.min(3, z));
  const el = document.getElementById('content');
  if (el) {
    el.style.transformOrigin = 'top left';
    el.style.transform = 'scale(' + _wallZoomLevel + ')';
    el.style.width = (100 / _wallZoomLevel) + '%';
  }
  const lbl = document.getElementById('wall-zoom-lbl');
  if (lbl) lbl.textContent = Math.round(_wallZoomLevel * 100) + '%';
}
function _wallZoomStep(dir) {
  const cur = _wallZoomLevel;
  const idx = _WALL_ZOOM_STEPS.findIndex(s => s >= cur - 0.001);
  const next = dir > 0
    ? _WALL_ZOOM_STEPS[Math.min(idx + 1, _WALL_ZOOM_STEPS.length - 1)]
    : _WALL_ZOOM_STEPS[Math.max((idx <= 0 ? 0 : idx) - 1, 0)];
  _wallZoomApply(next || cur);
}

// Halo discret sur la carte d'une cuve modifiée (appelé par _rtFlush).
function _wallFlash(cid) {
  if (!_wallMode) return;
  const el = document.querySelector('#content [data-cid="' + cid + '"]');
  if (!el) return;
  el.classList.add('wall-flash');
  setTimeout(() => el.classList.remove('wall-flash'), 1700);   // marche aussi en reduced-motion
}

// ── M5 — Pointage inter-fenêtres (clic/tap d'une cuve → flash ailleurs) ──
function _pointBroadcast(cid) {
  if (!cid) return;
  _bcSend('point:cuve', { contenant_id: cid });
}
function _pointFlash(cid, opts) {
  if (!cid) return;
  const el = document.querySelector('#content [data-cid="' + cid + '"]');
  if (!el) return;   // windowing : carte non rendue → rien (pas de scroll intempestif)
  if (opts && opts.scroll) {
    try {
      const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: rm ? 'auto' : 'smooth' });
    } catch (_) { try { el.scrollIntoView(); } catch (__) {} }
  }
  el.classList.add('cuve-point-flash');
  setTimeout(() => el.classList.remove('cuve-point-flash'), 1700);
}
