// cuverie-caveplan.js — Plan de cave interactif (vue 'caveplan')
// Extrait de cuverie.html (Étape 9 de la refactorisation progressive).
//
// Éditeur de plan 2-D drag-and-drop des cuves : placement libre (cavePlanPos),
// zoom (fit/molette), mode édition, sélection multi, assistants de rangement
// (caveArrange) et éventail/rosace (caveFan), groupement par travée.
//
// Contenu :
//   • Constantes canevas : CAVE_MIN_W, CAVE_MIN_H, CAVE_MAX
//   • État vue : _caveScale, _caveZoom, _caveZoomSet, _caveNeedW/H,
//     _caveWheelBound, _caveSel, _caveItems, _caveGroupByTravee
//   • _caveAllowed, _caveTileSize, _caveDefaultCols, _cavePlanDefaultPos,
//     _caveTileHTML, renderCavePlan, _caveFitZoom, _caveApplyZoom,
//     caveZoomBy, caveZoomFit, _caveSelHintHTML, _caveRefreshToolbar,
//     caveSelAll, toggleCaveEdit, toggleCaveGroupBy, caveSelectTravee,
//     cavePlanReset, caveArrange, _caveGroupKey, caveFan, _caveDragStart
//
// Globals lus (cuverie.html principal / modules) :
//   contenants, lotsMap, travees, viewMode, WB3DB, toast, escapeHtml, fmt,
//   getPrincipalLot, getTraveeNom, TYPE_LABELS, LOT_STATUT_COLORS,
//   LOT_STATUT_SHORT, LOT_COULEUR_DOT, render, loadCavePlan,
//   cavePlanPos / _caveEditOn / _caveResizeBound (déclarés dans le principal)
//
// ⚠️ Ordre : chargé AVANT le <script> principal. Les constantes CAVE_* sont
// incluses ici (utilisées par les let top-level du bloc à l'init du module).
// render() (principal) n'assigne _caveZoomSet qu'au runtime → OK.

'use strict';

const CAVE_MIN_W = 1600, CAVE_MIN_H = 900;   // taille mini du canevas (unités)
const CAVE_MAX = 12000;                       // borne dure des coordonnées
let _caveScale = 1;        // = zoom courant (px écran / unité) — pour le drag
let _caveZoom = 1;         // zoom utilisateur
let _caveZoomSet = false;  // zoom (fit) déjà initialisé pour cette entrée en vue
let _caveNeedW = CAVE_MIN_W, _caveNeedH = CAVE_MIN_H;   // taille calculée du canevas
let _caveWheelBound = false;
let _caveSel   = new Set();             // cid sélectionnés (assistants rangée/éventail)
let _caveItems = [];                    // cuves actuellement affichées sur le plan
let _caveGroupByTravee = true;          // éventail : grouper par travée (sinon par nom)

function _caveAllowed() {
  try { return window.innerWidth >= 1180 && window.matchMedia('(any-pointer: fine)').matches; }
  catch (_) { return window.innerWidth >= 1180; }
}

// Taille d'une tuile (unités virtuelles) ∝ capacité du contenant.
function _caveTileSize(c) {
  const cap = Number(c.capacite_hl) || 0;
  const w = Math.max(96, Math.min(210, Math.round(78 + Math.sqrt(cap) * 9)));
  return { w, h: Math.round(w * 0.62) };
}

function _caveDefaultCols(n) { return Math.max(1, Math.round(Math.sqrt(Math.max(1, n) * 1.18))); }
function _cavePlanDefaultPos(i, cols) {
  return { x: 16 + (i % cols) * 226, y: 16 + Math.floor(i / cols) * 150 };
}

function _caveTileHTML(c, editable) {
  const lots = lotsMap.get(c.id) || [];
  const lp   = getPrincipalLot(c);
  const vol  = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const pctBar = c.capacite_hl && vol ? Math.min(100, Math.round(vol / c.capacite_hl * 100)) : 0;
  const fillBg = (lots.length && lp) ? (COULEUR_FILL[lp.couleur] || 'rgba(120,120,120,.12)') : 'transparent';
  const er = cuverieEtatMap.get(c.id) || null;
  const al = er && er.niveau_alerte;
  const alDot = (al === 'critique' || al === 'warn')
    ? `<span class="cave-tile-alert" style="background:${al === 'critique' ? '#ef4444' : '#f59e0b'}"></span>` : '';
  const lotTxt = lp ? escapeHtml(lp.nom) + (lp.millesime ? ' ' + lp.millesime : '') : '<span class="cave-tile-vide">vide</span>';
  const sel = editable ? `<input type="checkbox" class="cave-sel" ${_caveSel.has(c.id) ? 'checked' : ''} title="Sélectionner (pour aligner)">` : '';
  const moreBtn = !_wallMode
    ? `<button type="button" title="Actions rapides (étiquette, fiche…)"
         style="position:absolute;top:3px;right:3px;width:20px;height:20px;border:none;border-radius:4px;background:rgba(0,0,0,.14);color:inherit;font-size:12px;cursor:pointer;line-height:1;padding:0;opacity:.65;z-index:2"
         onpointerdown="event.stopPropagation()"
         onclick="event.stopPropagation();openCuveActions('${c.id}')">⋯</button>`
    : '';
  return `<div class="cave-fill" style="height:${pctBar}%;background:${fillBg}"></div>${alDot}${sel}${moreBtn}` +
    `<div class="cave-tile-nom">${escapeHtml(c.nom)}</div>` +
    `<div class="cave-tile-lot">${lotTxt}</div>` +
    `<div class="cave-tile-vol">${vol > 0 ? fmt(vol) + ' hL' : ''}</div>`;
}

function renderCavePlan(items) {
  _caveItems = items;
  const container = document.getElementById('content');
  const readOnly = !!_wallMode;

  // Garde module : « Plan de cave & mur » désactivé pour la cave.
  if (!readOnly && !_planCaveOn) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🧩</div>
      <div class="title">Module « Plan de cave » désactivé</div>
      <div class="desc">Module complémentaire non activé pour cette cave (ou migration 092 non appliquée). Active-le dans Paramètres ▸ Modules.</div></div>`;
    return;
  }
  // Garde : vue réservée aux ordinateurs (≥ 13", pointeur fin).
  if (!readOnly && !_caveAllowed()) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🖥️</div>
      <div class="title">Plan de cave réservé à l'ordinateur</div>
      <div class="desc">Cette vue demande un écran d'au moins 13 pouces et une souris/trackpad.
      Ouvre-la sur un ordinateur — sur mobile/tablette, utilise les vues ▦ grille ou ☰ tableau.</div></div>`;
    return;
  }

  const editable = _caveEditOn && !readOnly;
  const n = _caveSel.size;
  const zoomCtl = readOnly ? '' : `
      <span class="cave-sep"></span>
      <div class="cave-zoom">
        <button class="btn btn--secondary btn--sm" onclick="caveZoomBy(1/1.2)" title="Dézoomer (Ctrl + molette)">−</button>
        <span class="cave-zoom-lbl">100%</span>
        <button class="btn btn--secondary btn--sm" onclick="caveZoomBy(1.2)" title="Zoomer (Ctrl + molette)">+</button>
        <button class="btn btn--secondary btn--sm" onclick="caveZoomFit()" title="Tout voir">⤢ Tout voir</button>
      </div>`;
  const toolbar = readOnly ? '' : `
    <div class="cave-toolbar">
      <button class="btn btn--secondary btn--sm${editable ? ' active' : ''}" onclick="toggleCaveEdit()">${editable ? '🔓 Édition' : '🔒 Verrouillé'}</button>
      ${editable ? `
      <span class="cave-sep"></span>
      <select class="cave-travee" onchange="caveSelectTravee(this.value)" title="Sélectionner toutes les cuves d'une travée">
        <option value="">↳ Travée…</option>
        ${travees.map(t => `<option value="${t.id}">${escapeHtml(t.nom)}</option>`).join('')}
      </select>
      <button class="btn btn--secondary btn--sm cave-arr" onclick="caveArrange('row')" ${n < 2 ? 'disabled' : ''} title="Aligner les cuves cochées en rangée">↦ Rangée</button>
      <button class="btn btn--secondary btn--sm" onclick="caveFan()" title="Disposer en éventail (rosace) : chaque groupe devient un rayon partant d'un foyer. Sur les cuves cochées, ou toutes si aucune n'est cochée.">✣ Éventail</button>
      <button class="btn btn--secondary btn--sm" onclick="toggleCaveGroupBy()" title="Base de regroupement de l'éventail : par travée ou par nom de cuve">Groupes : ${_caveGroupByTravee ? '📍 Travée' : '🔤 Nom'}</button>
      <span class="cave-hint">${_caveSelHintHTML()}</span>` : '<span class="cave-hint">Édition verrouillée (clique 🔒).</span>'}
      ${zoomCtl}
      <div style="flex:1"></div>
      <button class="btn btn--secondary btn--sm" onclick="cavePlanReset()" title="Efface toutes les positions enregistrées">↺ Réinitialiser</button>
    </div>`;
  container.innerHTML = toolbar +
    `<div class="cave-scroll${readOnly ? ' cave-wall' : ''}" id="cave-scroll"><div class="cave-sizer" id="cave-sizer"><div class="cave-canvas" id="cave-canvas"></div></div></div>`;
  const canvas = document.getElementById('cave-canvas');

  const cols = _caveDefaultCols(items.length);
  let needW = CAVE_MIN_W, needH = CAVE_MIN_H;
  items.forEach((c, i) => {
    const pos = cavePlanPos[c.id] || _cavePlanDefaultPos(i, cols);
    const sz  = _caveTileSize(c);
    const tile = document.createElement('div');
    tile.className = 'cave-tile' + (editable ? ' editable' : '') + (_caveSel.has(c.id) ? ' selected' : '');
    tile.dataset.cid = c.id;
    tile.style.left = pos.x + 'px'; tile.style.top = pos.y + 'px';
    tile.style.width = sz.w + 'px'; tile.style.height = sz.h + 'px';
    tile.innerHTML = _caveTileHTML(c, editable);
    if (editable) {
      tile.addEventListener('pointerdown', (e) => _caveDragStart(e, c.id));
      const cb = tile.querySelector('.cave-sel');
      if (cb) {
        cb.addEventListener('pointerdown', (e) => e.stopPropagation());
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', () => {
          if (cb.checked) _caveSel.add(c.id); else _caveSel.delete(c.id);
          tile.classList.toggle('selected', cb.checked);
          _caveRefreshToolbar();
        });
      }
    } else if (!readOnly) {
      tile.addEventListener('click', () => onCuveClick(c));
    }
    canvas.appendChild(tile);
    needW = Math.max(needW, pos.x + sz.w + 16);
    needH = Math.max(needH, pos.y + sz.h + 16);
  });
  _caveNeedW = needW; _caveNeedH = needH;
  canvas.style.width = needW + 'px'; canvas.style.height = needH + 'px';

  if (readOnly || !_caveZoomSet) { _caveZoom = _caveFitZoom(); _caveZoomSet = true; }
  _caveApplyZoom();

  if (!readOnly) {
    // #cave-scroll est recréé à chaque rendu → on (re)lie la molette à chaque fois.
    const scroll = document.getElementById('cave-scroll');
    scroll.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;             // Ctrl + molette (ou pincement) = zoom ; sinon scroll
      e.preventDefault();
      const r = scroll.getBoundingClientRect();
      const px = e.clientX - r.left + scroll.scrollLeft, py = e.clientY - r.top + scroll.scrollTop;
      const prev = _caveZoom;
      _caveZoom = Math.max(0.08, Math.min(4, _caveZoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      _caveZoomSet = true; _caveApplyZoom();
      const k = _caveZoom / prev;
      scroll.scrollLeft = px * k - (e.clientX - r.left);
      scroll.scrollTop  = py * k - (e.clientY - r.top);
    }, { passive: false });
  }
  if (!_caveResizeBound) {
    window.addEventListener('resize', () => { if (viewMode === 'caveplan' && _wallMode) { _caveZoom = _caveFitZoom(); _caveApplyZoom(); } });
    _caveResizeBound = true;
  }
}

function _caveFitZoom() {
  const scroll = document.getElementById('cave-scroll');
  if (!scroll) return 1;
  const s = Math.min(scroll.clientWidth / _caveNeedW, scroll.clientHeight / _caveNeedH);
  return Math.max(0.08, Math.min(1, s));
}
function _caveApplyZoom() {
  const sizer = document.getElementById('cave-sizer'), canvas = document.getElementById('cave-canvas');
  if (!sizer || !canvas) return;
  _caveScale = _caveZoom;
  canvas.style.transformOrigin = 'top left';
  canvas.style.transform = `scale(${_caveZoom})`;
  sizer.style.width = (_caveNeedW * _caveZoom) + 'px';
  sizer.style.height = (_caveNeedH * _caveZoom) + 'px';
  const lbl = document.querySelector('.cave-zoom-lbl'); if (lbl) lbl.textContent = Math.round(_caveZoom * 100) + '%';
}
function caveZoomBy(f) { _caveZoom = Math.max(0.08, Math.min(4, _caveZoom * f)); _caveZoomSet = true; _caveApplyZoom(); }
function caveZoomFit() { _caveZoom = _caveFitZoom(); _caveZoomSet = true; _caveApplyZoom(); }

function _caveSelHintHTML() {
  const n = _caveSel.size;
  return (n ? n + ' sélectionnée' + (n > 1 ? 's' : '') : 'Coche des cuves (Rangée) — ou Éventail pour disposer tous les groupes')
    + ' · <a href="#" onclick="caveSelAll(true);return false">tout</a> · <a href="#" onclick="caveSelAll(false);return false">rien</a>';
}
function _caveRefreshToolbar() {
  const tb = document.querySelector('.cave-toolbar'); if (!tb) return;
  const n = _caveSel.size;
  tb.querySelectorAll('.cave-arr').forEach(b => { b.disabled = n < 2; });
  const hint = tb.querySelector('.cave-hint'); if (hint) hint.innerHTML = _caveSelHintHTML();
}
function caveSelAll(v) {
  document.querySelectorAll('#cave-canvas .cave-tile').forEach(t => {
    const cid = t.dataset.cid;
    if (v) _caveSel.add(cid); else _caveSel.delete(cid);
    t.classList.toggle('selected', v);
    const cb = t.querySelector('.cave-sel'); if (cb) cb.checked = v;
  });
  _caveRefreshToolbar();
}

function toggleCaveEdit() { _caveEditOn = !_caveEditOn; if (!_caveEditOn) _caveSel.clear(); render(); }
function toggleCaveGroupBy() { _caveGroupByTravee = !_caveGroupByTravee; render(); }

// Sélectionne toutes les cuves d'une travée (pour ensuite Rangée / Éventail).
function caveSelectTravee(traveeId) {
  if (!traveeId) return;
  const ids = (_caveItems || []).filter(c => c.travee_id === traveeId).map(c => c.id);
  if (!ids.length) { toast('Aucune cuve dans cette travée.', 'info'); return; }
  ids.forEach(id => _caveSel.add(id));
  render();
  toast(getTraveeNom(traveeId) + ' : ' + ids.length + ' cuve' + (ids.length > 1 ? 's' : '') + ' sélectionnée' + (ids.length > 1 ? 's' : ''), 'success');
}

async function cavePlanReset() {
  const ok = await WB3UI.confirm('Effacer toutes les positions du plan de cave ?', { title: 'Réinitialiser le plan', okText: 'Effacer', danger: true });
  if (!ok) return;
  try { await WB3DB.clearCuveriePlan(); cavePlanPos = {}; _caveSel.clear(); toast('Plan réinitialisé', 'success'); render(); }
  catch (e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e && e.message || e)), 'error'); }
}

// Assistant : aligne les cuves cochées en rangée horizontale.
async function caveArrange(mode) {
  const sel = contenants.filter(c => _caveSel.has(c.id))
    .sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { numeric: true }));
  if (sel.length < 2) return;
  const sizes = sel.map(_caveTileSize);
  const gap = 18;
  const totalW = sizes.reduce((s, z) => s + z.w, 0) + gap * (sel.length - 1);
  let x = Math.max(16, (Math.max(CAVE_MIN_W, totalW + 80) - totalW) / 2);
  const y = 90;
  const place = [];
  sel.forEach((c, i) => { place.push({ id: c.id, x: Math.round(x), y }); x += sizes[i].w + gap; });
  place.forEach(p => { cavePlanPos[p.id] = { x: p.x, y: p.y }; });
  _caveZoomSet = false;   // refit
  render();
  try {
    for (const p of place) await WB3DB.setCuveriePlanPos(p.id, p.x, p.y);
    toast('Aligné en rangée', 'success');
  } catch (e) { toast('Positions non sauvegardées : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e && e.message || e)), 'error'); }
}

// Détecte le groupe d'une cuve d'après son nom : « A1-10 » → {grp:'A1', idx:10}.
function _caveGroupKey(name) {
  const s = String(name || '').trim();
  const m = s.match(/^(.*?)[\s._-]*(\d+)\s*$/);
  if (m && m[1].trim()) return { grp: m[1].trim(), idx: parseInt(m[2], 10) };
  return { grp: s, idx: 0 };
}

// Assistant ÉVENTAIL (rosace) : chaque groupe (préfixe du nom) devient un RAYON
// partant d'un foyer commun ; les rayons s'ouvrent de gauche à droite. La figure
// est ensuite mise à l'échelle pour tenir dans le canevas.
async function caveFan() {
  let list = contenants.filter(c => _caveSel.has(c.id));
  if (list.length < 2) list = (_caveItems && _caveItems.length) ? _caveItems.slice() : contenants.slice();
  if (list.length < 2) { toast('Pas assez de cuves.', 'error'); return; }

  // Regroupement : par TRAVÉE (défaut) ou par préfixe du nom. L'ordre interne
  // d'un groupe suit le numéro de fin de nom (A1-0, A1-1…).
  const groups = new Map();
  list.forEach(c => {
    const idx = _caveGroupKey(c.nom).idx;
    let grp;
    if (_caveGroupByTravee) { grp = getTraveeNom(c.travee_id) || '— sans travée —'; }
    else { grp = _caveGroupKey(c.nom).grp; }
    if (!groups.has(grp)) groups.set(grp, []);
    groups.get(grp).push({ c, idx });
  });
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  keys.forEach(k => groups.get(k).sort((a, b) => a.idx - b.idx));

  const G = keys.length;
  const aStart = 150 * Math.PI / 180, aEnd = 30 * Math.PI / 180;   // éventail vers le bas
  const innerR = Math.max(440, 150 * (G - 1));   // grand foyer → pas d'entassement au centre
  const stepR  = 156;

  // Positions brutes (centre tuile) autour d'un foyer en (0,0) — taille naturelle.
  const raw = [];
  keys.forEach((k, gi) => {
    const ang = G === 1 ? (aStart + aEnd) / 2 : aStart + (aEnd - aStart) * (gi / (G - 1));
    const ca = Math.cos(ang), sa = Math.sin(ang);
    groups.get(k).forEach((it, j) => {
      const r = innerR + j * stepR, sz = _caveTileSize(it.c);
      raw.push({ id: it.c.id, X: ca * r, Y: sa * r, w: sz.w, h: sz.h });
    });
  });

  // Translation seule (PAS de compression) : le canevas grandit, le zoom « tout
  // voir » s'occupe de tout afficher → rosace à taille réelle, lisible au zoom.
  let minX = Infinity, minY = Infinity;
  raw.forEach(p => { minX = Math.min(minX, p.X - p.w / 2); minY = Math.min(minY, p.Y - p.h / 2); });
  const M = 30, offX = M - minX, offY = M - minY;

  const ids = [];
  raw.forEach(p => {
    cavePlanPos[p.id] = {
      x: Math.round(Math.max(0, Math.min(p.X - p.w / 2 + offX, CAVE_MAX))),
      y: Math.round(Math.max(0, Math.min(p.Y - p.h / 2 + offY, CAVE_MAX))),
    };
    ids.push(p.id);
  });
  _caveZoomSet = false;   // refit pour montrer toute la rosace
  render();
  try {
    for (const id of ids) { const p = cavePlanPos[id]; await WB3DB.setCuveriePlanPos(id, p.x, p.y); }
    toast('Éventail composé — ' + G + ' groupe' + (G > 1 ? 's' : '') + ' (ajuste à la main si besoin)', 'success');
  } catch (e) { toast('Positions non sauvegardées : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e && e.message || e)), 'error'); }
}

function _caveDragStart(e, cid) {
  if (e.target.closest('.cave-sel')) return;   // clic sur la checkbox → pas de drag
  e.preventDefault();
  const tile = e.currentTarget;
  const startX = e.clientX, startY = e.clientY;
  const origX = parseFloat(tile.style.left) || 0, origY = parseFloat(tile.style.top) || 0;
  const tw = tile.offsetWidth, th = tile.offsetHeight;
  try { tile.setPointerCapture(e.pointerId); } catch (_) {}
  tile.classList.add('dragging');
  const move = (ev) => {
    const s = _caveScale || 1;
    let nx = origX + (ev.clientX - startX) / s, ny = origY + (ev.clientY - startY) / s;
    nx = Math.max(0, Math.min(nx, CAVE_MAX)); ny = Math.max(0, Math.min(ny, CAVE_MAX));
    tile.style.left = nx + 'px'; tile.style.top = ny + 'px';
  };
  const up = () => {
    tile.removeEventListener('pointermove', move);
    tile.removeEventListener('pointerup', up);
    tile.classList.remove('dragging');
    const x = Math.round(parseFloat(tile.style.left) || 0), y = Math.round(parseFloat(tile.style.top) || 0);
    cavePlanPos[cid] = { x, y };
    // Agrandit le canevas si la cuve a été posée au-delà (scroll cohérent).
    const grewW = Math.max(_caveNeedW, x + tw + 16), grewH = Math.max(_caveNeedH, y + th + 16);
    if (grewW !== _caveNeedW || grewH !== _caveNeedH) {
      _caveNeedW = grewW; _caveNeedH = grewH;
      const cv = document.getElementById('cave-canvas');
      if (cv) { cv.style.width = _caveNeedW + 'px'; cv.style.height = _caveNeedH + 'px'; }
      _caveApplyZoom();
    }
    if (WB3DB.setCuveriePlanPos) WB3DB.setCuveriePlanPos(cid, x, y)
      .catch(err => toast('Position non sauvegardée : ' + (WB3DB.errMsg ? WB3DB.errMsg(err) : (err && err.message || err)), 'error'));
  };
  tile.addEventListener('pointermove', move);
  tile.addEventListener('pointerup', up);
}
