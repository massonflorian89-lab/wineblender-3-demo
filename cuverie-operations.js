// cuverie-operations.js — Panel d'opération + interactions de lancement
// Extrait de cuverie.html (Étape 7 de la refactorisation progressive).
//
// Regroupe tout ce qui « lance / construit / enregistre une opération » :
//   • D6 — Drag & drop cuve → cuve (raccourci openOpPanel('relogement'))
//   • Sélection multi-contenants + FAB (toggleSelect, updateSelectionFab…)
//   • D5 — Actions groupées (_groupOpGuard, _runGroupOp)
//   • D4 — Comparatif multi-cuves (openCompare, compareLaunchOp…)
//   • Speed dial (toggleSpeedDial, openQuickOp)
//   • Panel Opération inline : OP_TYPES_DEF, opState, openOpPanel,
//     renderOpPanel + tous les builders de sections, mutations de lignes,
//     calculs dose↔qté, épalement, _syncOpMeta, saveOpForm
//   • Machine à états lots post-op (transitions de statut)
//   • Multi-lots → Assemblage (modales de décision + conversion)
//
// Globals lus (définis dans cuverie.html principal ou modules précédents) :
//   contenants, lotsMap, travees, selectedIds, editingId, currentTags,
//   viewMode, groupMode, WB3DB, WB3UI, toast, escapeHtml, fmt, _opToSigFig,
//   getPrincipalLot, getFiltered, getTraveeNom, render, loadCuverieData,
//   refreshContenantLocal, refreshTraveeSelect, renderTags, updateBarrelFields,
//   openDetailDrawer, closeDetailDrawer, _detailContenantId (cuverie-drawer.js),
//   _pointBroadcast, openDrawer, CUVE_SVG,
//   LOT_STATUT_COLORS, LOT_STATUT_SHORT, LOT_COULEUR_DOT, TYPE_LABELS
//
// ⚠️ Scripts classiques (non-module) : let/const top-level partagent le
// Global Environment Record → accessibles depuis les autres <script> ET
// depuis les handlers inline (onclick="opState…"). Chargé AVANT le bloc
// <script> principal ; opState/OP_TYPES_DEF définis tôt = strictement plus sûr.

'use strict';

// ============================================================
// D6 — Drag & drop cuve → cuve : raccourci d'ouverture du flux op
// inline pré-rempli (src = cuve glissée, dst = cuve cible). Pointer
// Events unifiés (souris + tactile) — pas de HTML5 drag (mauvais
// support touch). Threshold 6 px souris / long-press 400 ms touch.
// AUCUNE écriture base : ouvre juste openOpPanel('relogement', ...).
// Le caviste valide ensuite manuellement le formulaire.
// Drag = carte seule (pas la sélection multi) — décision documentée.
// ============================================================
let _dnd = null;       // état drag en cours (ou null)
let _dndPending = null; // potentiel drag avant threshold/long-press

function _dndIsCompat(srcId, dst) {
  if (!dst || dst.id === srcId) return false;
  if (dst.actif === false) return false;
  if (!dst.capacite_hl) return false;                    // capa inconnue → on n'autorise pas
  const used = (lotsMap.get(dst.id) || []).reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  return used < dst.capacite_hl - 0.001;                 // place dispo
}

function _dndCanSource(c) {
  if (!c || c.actif === false) return false;
  const vol = (lotsMap.get(c.id) || []).reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  return vol > 0;                                        // doit contenir du vin
}

function _dndCardFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest ? el.closest('#content [data-cid]') : null;
}

function _dndStart(srcId, x, y) {
  const srcC = contenants.find(c => c.id === srcId);
  if (!_dndCanSource(srcC)) return;

  document.body.classList.add('wb-dragging');
  _dnd = { srcId, srcCuve: srcC, ghost: null, lastTarget: null };

  // Marqueurs visuels sur toutes les cartes rendues (windowing : seules
  // celles dans le DOM ; les hors-fenêtre seront évaluées au pointermove
  // via elementFromPoint dès qu'elles seront révélées au scroll).
  document.querySelectorAll('#content [data-cid]').forEach(el => {
    const tid = el.dataset.cid;
    if (tid === srcId) { el.classList.add('wb-drag-src'); return; }
    const tc = contenants.find(c => c.id === tid);
    el.classList.add(_dndIsCompat(srcId, tc) ? 'wb-drag-ok' : 'wb-drag-no');
  });

  // Ghost flottant
  const g = document.createElement('div');
  g.className = 'wb-drag-ghost';
  g.textContent = `🍷 ${srcC.nom} → glisser sur une cuve cible…`;
  g.style.left = x + 'px'; g.style.top = y + 'px';
  document.body.appendChild(g);
  _dnd.ghost = g;

  document.addEventListener('pointermove', _dndMove, { passive: false });
  document.addEventListener('pointerup',   _dndEnd);
  document.addEventListener('pointercancel', _dndCancel);
  document.addEventListener('keydown', _dndKey);
}

function _dndMove(e) {
  if (!_dnd) return;
  e.preventDefault();                                    // bloque scroll touch pendant drag
  _dnd.ghost.style.left = e.clientX + 'px';
  _dnd.ghost.style.top  = e.clientY + 'px';
  const card = _dndCardFromPoint(e.clientX, e.clientY);
  // Garde une marque visuelle sur la cible survolée si compat
  if (card !== _dnd.lastTarget) {
    if (_dnd.lastTarget) _dnd.lastTarget.classList.remove('wb-drag-over');
    if (card && card.classList.contains('wb-drag-ok')) card.classList.add('wb-drag-over');
    _dnd.lastTarget = card;
  }
}

function _dndEnd(e) {
  if (!_dnd) return;
  const card = _dndCardFromPoint(e.clientX, e.clientY);
  const srcId = _dnd.srcId;
  let dstId = null;
  if (card && card.classList.contains('wb-drag-ok')) {
    dstId = card.dataset.cid;
  }
  _dndCleanup();
  if (dstId) {
    // Empêche le click qui suivrait le pointerup (ouvrirait le drawer)
    const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault();
      document.removeEventListener('click', swallow, true); };
    document.addEventListener('click', swallow, true);
    setTimeout(() => document.removeEventListener('click', swallow, true), 50);
    openOpPanel('relogement', [srcId], [dstId]);
  }
}

function _dndCancel() { _dndCleanup(); }
function _dndKey(e)   { if (e.key === 'Escape') _dndCleanup(); }

function _dndCleanup() {
  document.body.classList.remove('wb-dragging');
  if (_dnd) {
    if (_dnd.ghost) _dnd.ghost.remove();
    _dnd = null;
  }
  document.querySelectorAll('.wb-drag-src,.wb-drag-ok,.wb-drag-no,.wb-drag-over').forEach(el => {
    el.classList.remove('wb-drag-src','wb-drag-ok','wb-drag-no','wb-drag-over');
  });
  document.removeEventListener('pointermove',   _dndMove);
  document.removeEventListener('pointerup',     _dndEnd);
  document.removeEventListener('pointercancel', _dndCancel);
  document.removeEventListener('keydown',       _dndKey);
}

// Hook principal : pointerdown sur une carte ⇒ on arme un drag potentiel.
// Démarre réellement après threshold (souris) OU long-press (touch).
// Sinon laisse le click natif ouvrir la fiche (comportement actuel).
function _dndArm(e) {
  if (_dnd) return;                                      // déjà un drag actif
  if (e.target.closest('input,button,select,textarea,a,label')) return;
  const card = e.target.closest('#content [data-cid]');
  if (!card) return;
  const srcId = card.dataset.cid;
  const srcC  = contenants.find(c => c.id === srcId);
  if (!_dndCanSource(srcC)) return;                      // cuve vide → pas draggable

  const isTouch = e.pointerType === 'touch';
  const startX = e.clientX, startY = e.clientY;
  const tStart = Date.now();
  let started  = false;
  let longTO   = null;

  const onMove = (ev) => {
    if (started) return;
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (isTouch) {
      if (Date.now() - tStart < 400) return;             // attendre long-press
    } else if (dist < 6) return;                         // souris : ignorer micro-mouvements
    started = true;
    if (longTO) clearTimeout(longTO);
    cleanupArm();
    _dndStart(srcId, ev.clientX, ev.clientY);
  };
  const onUp = () => { cleanupArm(); };                  // tap court / clic court → laisse le click natif
  const cleanupArm = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup',   onUp);
    document.removeEventListener('pointercancel', cleanupArm);
    if (longTO) clearTimeout(longTO);
    _dndPending = null;
  };

  _dndPending = { srcId, cleanupArm };
  document.addEventListener('pointermove',   onMove, { passive: true });
  document.addEventListener('pointerup',     onUp);
  document.addEventListener('pointercancel', cleanupArm);

  // Touch : long-press immobile démarre aussi le drag
  if (isTouch) {
    longTO = setTimeout(() => {
      if (!started) { started = true; cleanupArm(); _dndStart(srcId, startX, startY); }
    }, 400);
  }
}

// Installé une seule fois (idempotent grâce au flag).
function _dndInstall() {
  if (document.body._wbDndInstalled) return;
  document.body._wbDndInstalled = true;
  // Délégation sur #content : marche aussi pour les cartes fenêtrées
  // (créées/détruites au scroll par WBWin).
  const root = document.getElementById('content') || document.body;
  root.addEventListener('pointerdown', _dndArm);
}

// ============================================================
// Sélection multi-contenants
// ============================================================
function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  updateSelectionFab();
  // Met à jour la classe sur la ligne sans re-render complet
  const tr = document.querySelector(`input[onclick*="'${id}'"]`)?.closest('tr');
  if (tr) tr.classList.toggle('row-selected', checked);
}

function toggleSelectAll(checked, items) {
  items.forEach(c => checked ? selectedIds.add(c.id) : selectedIds.delete(c.id));
  render();
  updateSelectionFab();
}

function clearSelection() {
  selectedIds.clear();
  render();
  updateSelectionFab();
}

function updateSelectionFab() {
  const fab = document.getElementById('selection-fab');
  const countEl = document.getElementById('selection-count');
  if (!fab) return;
  const n = selectedIds.size;
  fab.style.display = n > 0 ? 'flex' : 'none';
  if (countEl) countEl.textContent = `${n} contenant${n > 1 ? 's' : ''} sélectionné${n > 1 ? 's' : ''}`;
  const cmpBtn = document.getElementById('sel-compare');
  if (cmpBtn) cmpBtn.style.display = n >= 2 ? '' : 'none';   // comparatif : ≥ 2 cuves
  // Actions groupées typées : visibles uniquement à ≥ 2 cuves (D5)
  document.querySelectorAll('#selection-fab .sel-multi-btn')
    .forEach(b => { b.style.display = n >= 2 ? '' : 'none'; });
}

// ============================================================
// D5 — Actions groupées multi-cuves. Routent vers le flux op
// multi-contenants EXISTANT (openOpPanel(type, ids) → saveOpForm →
// wb3_save_operation_graph). Aucun écrit base direct. Garde-fou de
// cohérence (cuves vides etc.) AVANT routage.
// ============================================================
function _groupOpGuard(type, ids) {
  const empty = ids.filter(id => {
    const lots = lotsMap.get(id) || [];
    const v = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
    return v <= 0;
  });
  if (type === 'soutirage' || type === 'analyse' || type === 'ouillage') {
    if (empty.length === ids.length) return `Toutes les cuves sélectionnées sont vides — ${type} impossible.`;
    if (empty.length)                return `${empty.length} cuve(s) vide(s) dans la sélection — décoche-les pour faire un ${type} groupé.`;
  } else if (type === 'relogement') {
    if (empty.length === ids.length) return `Toutes les cuves sélectionnées sont vides — impossible de reloger.`;
  }
  // Mouvement multi-sources : le backend (wb3_save_operation_graph) ne
  // supporte PAS la ventilation par couple (lot_id, contenant_id) en 1
  // seule opération. Pour le RELOGEMENT, on auto-splitte au save (voir
  // saveOpForm) → cas métier valide (consolidation). Pour le soutirage,
  // cette consolidation n'a pas de sens métier → on bloque avant routage.
  if (type === 'soutirage') {
    const lotToCuves = new Map();          // lotId → [cuveId,…]
    const lotName    = new Map();
    ids.forEach(cid => (lotsMap.get(cid) || []).forEach(l => {
      if (!lotToCuves.has(l.id)) lotToCuves.set(l.id, []);
      lotToCuves.get(l.id).push(cid);
      lotName.set(l.id, l.nom + (l.millesime ? ' ' + l.millesime : ''));
    }));
    const dup = [...lotToCuves.entries()].filter(([, arr]) => arr.length >= 2);
    if (dup.length) {
      const names = dup.map(([lid, arr]) => `« ${lotName.get(lid)} » dans ${arr.length} cuves`).join(', ');
      return `Impossible en ${type} groupé : le backend ne sait pas ventiler un même lot entre plusieurs cuves source (${names}). Décoche les cuves en doublon pour ne garder qu'une cuve par lot, ou enchaîne une opération par cuve.`;
    }
  }
  return null;
}

function _runGroupOp(type) {
  const ids = [...selectedIds];
  if (ids.length < 2) { toast('Sélectionne au moins 2 cuves.', 'error'); return; }
  const msg = _groupOpGuard(type, ids);
  if (msg) { toast(msg, 'error'); return; }
  openOpPanel(type, ids);   // panel op inline existant, type pré-positionné, ids pré-remplis
}

// ============================================================
// D4 — Comparatif multi-cuves. Données instantanées depuis la mémoire
// (contenants/lotsMap, 0 requête) ; dernière analyse/opération en
// parallèle, BORNÉ par le garde-fou (≤ CMP_MAX) → pas de N+1 qui scale.
// Réutilise openOpPanel([...selectedIds]) pour l'action groupée.
// ============================================================
const CMP_MAX = 8;

function closeCompare() {
  document.getElementById('cmp-drawer').classList.remove('open');
  document.getElementById('cmp-backdrop').classList.remove('open');
  if (typeof updateSelectionFab === 'function') updateSelectionFab();
}

function compareLaunchOp() {
  closeCompare();
  openOpPanel(null, [...selectedIds]);     // flux op multi-contenants existant (inchangé)
}

async function openCompare() {
  let ids = [...selectedIds];
  if (ids.length < 2) return;
  const total = ids.length;
  const capped = total > CMP_MAX;
  // Ordre stable par nom ; garde-fou : on borne l'affichage.
  let cols = ids.map(id => contenants.find(c => c.id === id)).filter(Boolean)
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr'));
  if (capped) cols = cols.slice(0, CMP_MAX);
  if (!cols.length) return;                 // ids périmés : rien à comparer

  // Largeur adaptative : on dimensionne le drawer pour afficher TOUTES les
  // colonnes sans scroll latéral si la fenêtre le permet ; sinon on
  // resserre les colonnes (les chiffres restent lisibles) puis on plafonne
  // à 98vw (fallback : overflow-x du wrapper conserve la lisibilité).
  const nCols    = cols.length;
  const labelMin = 140;
  const colMin   = nCols <= 3 ? 180 : nCols <= 5 ? 150 : nCols <= 6 ? 132 : 116;
  const targetPx = labelMin + nCols * colMin + 64;   // + padding/safety
  const drawerPx = Math.min(window.innerWidth - 16, Math.max(420, targetPx));
  const dr = document.getElementById('cmp-drawer');
  dr.style.width    = drawerPx + 'px';
  dr.style.maxWidth = '98vw';

  document.getElementById('cmp-sub').textContent =
    `${cols.length} cuve${cols.length > 1 ? 's' : ''} comparée${cols.length > 1 ? 's' : ''}`;
  const warn = document.getElementById('cmp-warn');
  if (capped) {
    warn.style.display = '';
    warn.textContent = `⚠ ${total} cuves sélectionnées — comparaison limitée aux ${CMP_MAX} premières (par nom) pour rester lisible.`;
  } else warn.style.display = 'none';

  // 1) Données mémoire (instantané, 0 requête)
  const data = cols.map(c => {
    const lots = lotsMap.get(c.id) || [];
    const lp   = getPrincipalLot(c) || lots[0] || null;  // socle 5 : principal résolu
    const vol  = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
    const pct  = c.capacite_hl ? Math.round(vol / c.capacite_hl * 100) : 0;
    return { c, lots, lp, vol, pct,
      ana: null, op: null };
  });

  const fmtN = (v) => v == null ? '—' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const ESC  = (s) => escapeHtml(s == null ? '' : String(s));

  // Surlignage des écarts utiles : min/max volume + SO₂ libre
  const vols = data.map(d => d.vol);
  const vMin = Math.min(...vols), vMax = Math.max(...vols);

  function buildTable() {
    const so2 = data.map(d => d.ana?.so2_libre).filter(v => v != null).map(Number);
    const sMin = so2.length ? Math.min(...so2) : null;
    const sMax = so2.length ? Math.max(...so2) : null;
    const hl = (cond) => cond ? 'background:#fef3c7;font-weight:700' : '';
    const th = `<th style="position:sticky;left:0;background:var(--color-bg-elevated);text-align:left;padding:6px 8px;font-size:var(--text-caption);color:var(--color-ink-tertiary);min-width:${labelMin}px"></th>`
      + data.map(d => `<th style="padding:6px 10px;text-align:left;font-size:var(--text-footnote);font-weight:700;min-width:${colMin}px">${ESC(d.c.nom)}</th>`).join('');
    const rowLabel = (l) => `<td style="position:sticky;left:0;background:var(--color-bg-elevated);padding:6px 8px;font-size:var(--text-caption);color:var(--color-ink-tertiary);font-weight:600">${l}</td>`;
    const R = [];
    R.push(`<tr>${rowLabel('Type / capacité')}` + data.map(d => `<td style="padding:6px 10px;font-size:var(--text-footnote)">${ESC(TYPE_LABELS[d.c.type]||d.c.type)} · ${fmtN(d.c.capacite_hl)} hL</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Volume (hL)')}` + data.map(d => `<td style="padding:6px 10px;font-size:var(--text-footnote);${hl(vols.length>1 && (d.vol===vMin||d.vol===vMax) && vMin!==vMax)}">${fmtN(d.vol)}</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('% remplissage')}` + data.map(d => `<td style="padding:6px 10px;font-size:var(--text-footnote)">${d.pct}%</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Statut lot')}` + data.map(d => `<td style="padding:6px 10px;font-size:var(--text-footnote)">${d.lp ? ESC(LOT_STATUT_SHORT[d.lp.statut]||d.lp.statut) : '—'}</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Couleur')}` + data.map(d => `<td style="padding:6px 10px;font-size:var(--text-footnote)">${d.lp ? (LOT_COULEUR_DOT[d.lp.couleur]||'') + ' ' + ESC(d.lp.couleur||'—') : '—'}</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Lot · millésime')}` + data.map(d => `<td style="padding:6px 10px;font-size:var(--text-footnote)">${d.lp ? ESC(d.lp.nom) + (d.lp.millesime ? ' · '+d.lp.millesime : '') : '—'}</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Cépages')}` + data.map(() => `<td style="padding:6px 10px;font-size:var(--text-caption);color:var(--color-ink-tertiary)">— (voir fiche lot)</td>`).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Dern. analyse')}` + data.map(d => {
      const a = d.ana;
      if (!a) return `<td style="padding:6px 10px;font-size:var(--text-caption);color:var(--color-ink-tertiary)">${d._anaPending ? '…' : '—'}</td>`;
      const so2hl = hl(a.so2_libre!=null && sMin!==sMax && (Number(a.so2_libre)===sMin||Number(a.so2_libre)===sMax));
      return `<td style="padding:6px 10px;font-size:var(--text-caption)">${a.date_analyse||'—'}<br>
        <span style="${so2hl}">SO₂L ${fmtN(a.so2_libre)}</span> · pH ${fmtN(a.ph)} · TAV ${fmtN(a.tav)}</td>`;
    }).join('') + '</tr>');
    R.push(`<tr>${rowLabel('Dern. opération')}` + data.map(d =>
      `<td style="padding:6px 10px;font-size:var(--text-caption)">${d.op ? ESC(d.op.type_operation)+' · '+(d.op.date_operation||'') : (d._opPending ? '…' : '—')}</td>`).join('') + '</tr>');
    document.getElementById('cmp-body').innerHTML =
      `<table style="border-collapse:collapse;width:100%"><thead><tr>${th}</tr></thead><tbody>${R.join('')}</tbody></table>`;
  }

  data.forEach(d => { d._anaPending = true; d._opPending = true; });
  buildTable();
  document.getElementById('cmp-drawer').classList.add('open');
  document.getElementById('cmp-backdrop').classList.add('open');

  // 2) Dernière analyse + dernière opération — parallèle, borné (≤ CMP_MAX)
  await Promise.all(data.map(async d => {
    try {
      const r = await WB3DB.listTable('analyses', {
        select: 'date_analyse, so2_libre, ph, tav',
        filter: { contenant_id: d.c.id }, order: 'date_analyse', ascending: false, limit: 1,
      });
      d.ana = r?.[0] || null;
    } catch(_) { d.ana = null; }
    d._anaPending = false;
    try {
      const r = await WB3DB.listTable('operation_contenants', {
        select: 'operations(type_operation, date_operation)',
        filter: { contenant_id: d.c.id }, order: 'created_at', ascending: false, limit: 1,
      });
      d.op = r?.[0]?.operations || null;
    } catch(_) { d.op = null; }
    d._opPending = false;
  }));
  buildTable();   // re-render avec analyses/op (drawer reste ouvert)
}

function createOperationFromSelection() {
  openOpPanel(null, [...selectedIds]);
}

// ── Speed dial ──────────────────────────────────────────────
function toggleSpeedDial() {
  const panel   = document.getElementById('speed-dial-actions');
  const trigger = document.getElementById('speed-dial-trigger');
  const opening = !panel.classList.contains('open');
  panel.classList.toggle('open', opening);
  trigger.classList.toggle('open', opening);
}
function closeSpeedDial() {
  document.getElementById('speed-dial-actions')?.classList.remove('open');
  document.getElementById('speed-dial-trigger')?.classList.remove('open');
}
function openQuickOp(type) {
  closeSpeedDial();
  openOpPanel(type || null, [...selectedIds]);
}

// ============================================================
// Panel Opération inline (drawer expansible)
// ============================================================

const OP_TYPES_DEF = [
  { key:'soutirage',         icon:'🔄', label:'Soutirage',      mode:'mouvement'  },
  { key:'relogement',        icon:'🔀', label:'Relogement',     mode:'mouvement'  },
  { key:'filtration',        icon:'🔬', label:'Filtration',     mode:'mouvement'  },
  // ⚠️ 'assemblage' RETIRÉ du constructeur direct : ce chemin enregistrait les
  // lots en role='traite' (_buildLotsArr), or l'effet SQL d'assemblage
  // (_wb3_apply_op_effects, mig 047) n'agit que sur des lots role='source'/
  // 'destination' → opération « fantôme » sans filiation ni mouvement.
  // L'assemblage se fait UNIQUEMENT via 🔀 « Convertir multi-lots en assemblage »
  // (_openConvertAssemblageModal → RPC wb3_convert_multilot_to_assemblage, mig 051),
  // qui étiquette correctement les rôles. Garde-fou base : mig 079.
  { key:'mise_en_bouteille', icon:'🍾', label:'Mise btle',      mode:'mouvement'  },
  { key:'pressoir',          icon:'⚙️', label:'Pressoir',       mode:'mouvement'  },
  { key:'sulfitage',         icon:'🧪', label:'Sulfitage',      mode:'traitement' },
  { key:'levurage',          icon:'🦠', label:'Levurage',       mode:'traitement' },
  { key:'chaptalisation',    icon:'🍯', label:'Chaptali.',      mode:'traitement' },
  { key:'collage',           icon:'🍂', label:'Collage',        mode:'traitement' },
  { key:'malo',              icon:'🧫', label:'Malo',           mode:'traitement' },
  { key:'traitement',        icon:'🧪', label:'Traitement',     mode:'traitement' },
  { key:'analyse',           icon:'🔬', label:'Analyse',        mode:'analyse'    },
  // Agrément À LA CUVE (mig 094) : opération à part entière. Pose/lève le
  // verrou agrément sur la cuve via RPC wb3_set_agrement (chemin dédié au
  // save, ne passe pas par wb3_save_operation_graph).
  { key:'agrement',          icon:'🔒', label:'Agrément',       mode:'agrement'   },
  { key:'autre',             icon:'⚙️', label:'Autre',          mode:'autre'      },
  // ── Ajustements de cave ──
  { key:'complement_de_plein',        icon:'💧', label:'Compl. plein',  mode:'ajustement' },
  { key:'ouillage',                   icon:'🪣', label:'Ouillage',       mode:'ajustement' },
  { key:'ajustement_volume',          icon:'⚖️', label:'Ajust. vol.',   mode:'ajustement' },
  { key:'correction_jauge',           icon:'📏', label:'Correc. jauge', mode:'ajustement' },
  { key:'perte_technique',            icon:'📉', label:'Perte tech.',   mode:'ajustement' },
  { key:'correction_administrative',  icon:'📋', label:'Correc. admin.',mode:'ajustement' },
];

let opState = null;        // null = panel fermé
let _opDataCache = null;   // { allProduits }

function _opUid() { return Math.random().toString(36).slice(2, 9); }
function _opMode(type) { return OP_TYPES_DEF.find(t => t.key === type)?.mode || 'autre'; }

async function _ensureOpData() {
  if (_opDataCache) return;
  const prods = await WB3DB.getProduitLots();
  _opDataCache = { allProduits: prods || [] };
}

// ── Entrée principale ──────────────────────────────────────────
async function openOpPanel(type, preContenantIds = null, preDstIds = null) {
  // Périmètre caviste : consultation + analyses uniquement. Les opérations
  // (transfert, sulfitage, soutirage, ajustements…) sont réservées aux
  // responsables (verrou DB mig 076 ; ici on évite un drawer inutile).
  if (type !== 'analyse' && WB3DB.isPrivileged && !WB3DB.isPrivileged()) {
    toast('Opération réservée aux responsables. Vous pouvez consulter les cuves et saisir des analyses.', 'error');
    return;
  }
  // T8 fix — masquer la selection-fab pendant le drawer op (chevauchement
  // z-index). Réaffichée à la fermeture du drawer (closeDetailDrawer).
  const _fab = document.getElementById('selection-fab');
  if (_fab) _fab.style.display = 'none';

  const ids = preContenantIds !== null ? preContenantIds
            : _detailContenantId ? [_detailContenantId] : [];
  const dstIds = Array.isArray(preDstIds) ? preDstIds.filter(Boolean) : [];

  const today = new Date().toISOString().slice(0, 10);
  const mode  = _opMode(type);

  opState = {
    type, preContenantIds: ids,
    statut: 'realise', date: today, operateur: '', reference: '', notes: '',
    srcRows: [], dstRows: [], implRows: [], prodRows: [], analyse: {}, lotVentilation: {},
    agrementDecision: '',   // mode 'agrement' : en_attente | valide | refuse
    // Annotations d'écarts de volume (frontend uniquement, préfixées dans
    // les notes au save — exploitables plus tard par recherche texte).
    ecartHeadspace: { motif: '', comment: '' },   // place restante en dest
    ecartLoss:      { motif: '', comment: '' },   // perte src > dst
  };

  // Pré-remplissage des contenants
  // Pour les mouvements, source.volume_hl = null (= montant transféré, calculé depuis destinations au save)
  // Pour les impliqués, volume_hl = volume courant (informatif)
  ids.forEach(id => {
    const c = contenants.find(x => x.id === id);
    if (!c) return;
    if (mode === 'mouvement') {
      opState.srcRows.push({ _uid: _opUid(), contenant_id: id, volume_hl: null });
    } else {
      const vol = (lotsMap.get(id) || []).reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
      opState.implRows.push({ _uid: _opUid(), contenant_id: id, volume_hl: vol || null });
    }
  });

  // D6 — préfill destination(s) (drag-drop : src=cuve glissée, dst=cuve cible)
  if (mode === 'mouvement' && dstIds.length) {
    dstIds.forEach(id => {
      if (!contenants.find(x => x.id === id)) return;
      opState.dstRows.push({ _uid: _opUid(), contenant_id: id, volume_hl: null });
    });
  }

  const drawer   = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');

  if (!drawer.classList.contains('open')) {
    // Ouverture depuis speed-dial ou FAB (pas de fiche active)
    const typeDef = OP_TYPES_DEF.find(t => t.key === type);
    document.getElementById('dd-title').textContent = typeDef ? `${typeDef.icon} ${typeDef.label}` : 'Nouvelle opération';
    document.getElementById('dd-sub').textContent   = ids.length > 1 ? `${ids.length} contenants sélectionnés` : '';
    _hideFicheSections();
    drawer.classList.add('open');
    backdrop.classList.add('open');
  } else {
    // Depuis la fiche d'un contenant — on glisse vers le panel
    _hideFicheSections();
  }

  drawer.classList.add('op-mode');
  document.getElementById('dd-op-panel').style.display = '';
  document.getElementById('dd-foot-fiche-content').style.display = 'none';
  document.getElementById('dd-foot-op-content').style.display   = '';

  // Spinner pendant le chargement des données
  document.getElementById('dd-op-panel').innerHTML =
    '<div style="padding:var(--space-6);text-align:center"><div class="spinner"></div></div>';

  await _ensureOpData();
  renderOpPanel();
}

function _hideFicheSections() {
  ['dd-fill-section','dd-lots-section','dd-loc-section','dd-actions-section','dd-more-section','dd-fa-section']
    .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
}

// backToFiche → cuverie-drawer.js

// ── Sélection du type ──────────────────────────────────────────
function selectOpType(type) {
  if (!opState) return;
  _syncOpMeta();
  const prevMode = _opMode(opState.type);
  const newMode  = _opMode(type);
  opState.type = type;

  if (prevMode !== newMode) {
    opState.srcRows = []; opState.dstRows = []; opState.implRows = [];
    opState.prodRows = []; opState.analyse = {}; opState.lotVentilation = {};
    opState.ecartHeadspace = { motif: '', comment: '' };
    opState.ecartLoss      = { motif: '', comment: '' };
    opState.preContenantIds.forEach(id => {
      const c = contenants.find(x => x.id === id);
      if (!c) return;
      if (newMode === 'mouvement') {
        opState.srcRows.push({ _uid: _opUid(), contenant_id: id, volume_hl: null });
      } else {
        const vol = (lotsMap.get(id) || []).reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
        opState.implRows.push({ _uid: _opUid(), contenant_id: id, volume_hl: vol || null });
      }
    });
  }
  renderOpPanel();
}

// ── Render principal ───────────────────────────────────────────
function renderOpPanel() {
  if (!opState) return;
  const typeDef = OP_TYPES_DEF.find(t => t.key === opState.type);
  const mode    = _opMode(opState.type);

  // Titre du drawer
  document.getElementById('dd-title').textContent =
    typeDef ? `${typeDef.icon} ${typeDef.label}` : 'Nouvelle opération';

  // Libellés enrichis : nom · vol courant / capacité · lot principal.
  // Zéro requête — lit lotsMap déjà en mémoire.
  const _cuveLabel = (c) => {
    const lots = lotsMap.get(c.id) || [];
    const vol  = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
    const lp   = getPrincipalLot(c) || lots[0];  // socle 5 : principal résolu
    const lotTxt = lots.length
      ? ` · ${escapeHtml(lp.nom)}${lp.millesime ? ' ' + lp.millesime : ''}${lots.length > 1 ? ` +${lots.length - 1}` : ''}`
      : ' · vide';
    return `${escapeHtml(c.nom)} · ${fmt(vol)} / ${fmt(c.capacite_hl)} hL${lotTxt}`;
  };
  const contOpts = contenants.map(c => `<option value="${c.id}">${_cuveLabel(c)}</option>`).join('');

  const prodOpts = (_opDataCache?.allProduits || []).map(p => {
    const pc = p.produits_catalogue;
    const nom = pc?.nom || '?';
    const lot = p.numero_lot ? ` [${p.numero_lot}]` : '';
    const dluo = p.dluo ? ` · DLUO ${p.dluo.slice(0,10)}` : '';
    const stock = p.quantite != null ? ` · ${p.quantite} ${pc?.unite_stock||''}` : '';
    return `<option value="${p.id}">${escapeHtml(nom)}${lot}${dluo}${stock}</option>`;
  }).join('');

  document.getElementById('dd-op-panel').innerHTML = `

    <!-- Sélecteur de type -->
    <div style="padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)">
      <div class="op-section-title">Type d'opération</div>
      <div class="op-types-grid">
        ${OP_TYPES_DEF.map(t => `
          <button class="op-type-btn${opState.type === t.key ? ' selected' : ''}"
                  onclick="selectOpType('${t.key}')">
            <span class="ot-icon">${t.icon}</span>
            <span class="ot-label">${t.label}</span>
          </button>`).join('')}
      </div>
    </div>

    ${opState.type ? `

    <!-- Méta -->
    <div class="op-section">
      <div class="op-section-title">📋 Informations générales</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
        <div class="field">
          <label class="field-label">Date *</label>
          <input class="input" type="date" id="op-f-date"
            value="${opState.date}" oninput="opState.date=this.value">
        </div>
        <div class="field">
          <label class="field-label">Statut</label>
          <select class="select" id="op-f-statut" onchange="opState.statut=this.value">
            <option value="realise"${opState.statut==='realise'?' selected':''}>✓ Réalisé</option>
            <option value="planifie"${opState.statut==='planifie'?' selected':''}>⏳ Planifié</option>
            <option value="annule"${opState.statut==='annule'?' selected':''}>✕ Annulé</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Opérateur</label>
          <input class="input" type="text" id="op-f-operateur"
            value="${escapeHtml(opState.operateur)}" placeholder="Prénom…"
            oninput="opState.operateur=this.value">
        </div>
        <div class="field">
          <label class="field-label">Référence</label>
          <input class="input" type="text" id="op-f-reference"
            value="${escapeHtml(opState.reference)}" placeholder="Réf…"
            oninput="opState.reference=this.value">
        </div>
      </div>
    </div>

    <!-- Contenants -->
    ${mode === 'mouvement' ? _opBuildMouvement(contOpts) : _opBuildSimpleCont(contOpts)}

    <!-- Décision d'agrément (mode 'agrement') -->
    ${mode === 'agrement' ? _opBuildAgrement() : ''}

    <!-- Produits (modes traitement) -->
    ${['traitement','sulfitage','levurage','chaptalisation','collage','malo'].includes(opState.type)
        ? _opBuildProduits(prodOpts) : ''}

    <!-- Champs analyse -->
    ${opState.type === 'analyse' ? _opBuildAnalyse() : ''}

    <!-- Notes -->
    <div class="op-section op-section-last">
      <div class="op-section-title">📝 Notes</div>
      <textarea class="input" id="op-f-notes" rows="2" style="resize:vertical"
        placeholder="Notes libres…"
        oninput="opState.notes=this.value">${escapeHtml(opState.notes)}</textarea>
    </div>

    ` : `
    <div style="padding:var(--space-6);text-align:center;color:var(--color-ink-tertiary)">
      Choisissez un type d'opération ci-dessus
    </div>
    `}
  `;
  _updateOpSums();   // totaux src/dst dès le 1er affichage
}

// ── Sections contenants ────────────────────────────────────────
function _opBuildMouvement(contOpts) {
  return `
  <div class="op-section">
    <div class="op-section-title">🔀 Contenants</div>
    <div class="op-role-zones">
      <div class="op-zone src">
        <div class="op-zone-head">
          <span>← Source</span>
          <button class="btn btn--ghost btn--sm" style="padding:2px 8px;font-size:var(--text-caption)"
                  onclick="_opSyncAndAdd('src')">+ Source</button>
        </div>
        <div id="op-src-rows">
          ${opState.srcRows.map(r => _opContRow(r, 'src', contOpts)).join('') ||
            '<div style="font-size:var(--text-caption);color:var(--color-ink-quaternary);padding:4px 0">Aucune source</div>'}
        </div>
        <div id="op-src-sum" style="text-align:right;font-size:var(--text-caption);color:var(--color-ink-secondary);padding:4px 8px 0;font-variant-numeric:tabular-nums"></div>
      </div>
      <div class="op-zone dst">
        <div class="op-zone-head">
          <span>→ Destination</span>
          <button class="btn btn--ghost btn--sm" style="padding:2px 8px;font-size:var(--text-caption)"
                  onclick="_opSyncAndAdd('dst')">+ Dest.</button>
        </div>
        <div id="op-dst-rows">
          ${opState.dstRows.map(r => _opContRow(r, 'dst', contOpts)).join('') ||
            '<div style="font-size:var(--text-caption);color:var(--color-ink-quaternary);padding:4px 0">Aucune destination</div>'}
        </div>
        <div id="op-dst-sum" style="text-align:right;font-size:var(--text-caption);color:var(--color-ink-secondary);padding:4px 8px 0;font-variant-numeric:tabular-nums"></div>
      </div>
    </div>
  </div>
  ${_opBuildVentilation()}
  <!-- Écarts de volume : section qui apparaît quand un écart est détecté
       (espace libre en dest, ou perte src > dst). Les annotations sont
       préfixées dans les notes au save (frontend pur, zéro SQL). -->
  ${(() => {
    const ecH = opState.ecartHeadspace || { motif:'', comment:'' };
    const ecL = opState.ecartLoss      || { motif:'', comment:'' };
    const optsH = [
      ['',                '— Motif (optionnel) —'],
      ['ouillage_prevu',  'À ouiller plus tard'],
      ['ciel_garde',      'Ciel gardé volontairement'],
      ['mise_a_venir',    'Mise en bouteille à venir'],
      ['autre',           'Autre'],
    ];
    const optsL = [
      ['',                  '— Motif (à renseigner) —'],
      ['erreur_epalement',  "Erreur d'épalement"],
      ['perte_caviste',     'Perte caviste'],
      ['evaporation',       'Évaporation'],
      ['non_explicable',    'Non explicable'],
      ['autre',             'Autre'],
    ];
    const opt = (cur) => ([v, lbl]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${lbl}</option>`;
    return `
  <div class="op-section" id="op-ecarts-section" style="display:none">
    <div class="op-section-title">⚠ Écarts de volume</div>
    <div id="op-ecart-headspace-row" style="display:none;margin-bottom:var(--space-3)">
      <div style="font-size:var(--text-footnote);margin-bottom:var(--space-1)">
        💧 Espace libre dans la destination : <b id="op-headspace-val"></b>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
        <select class="select" id="op-ecart-headspace-motif"
          onchange="opState.ecartHeadspace.motif=this.value">${optsH.map(opt(ecH.motif)).join('')}</select>
        <input class="input" type="text" id="op-ecart-headspace-cmt"
          placeholder="Commentaire (optionnel)"
          value="${escapeHtml(ecH.comment || '')}"
          oninput="opState.ecartHeadspace.comment=this.value">
      </div>
    </div>
    <div id="op-ecart-loss-row" style="display:none">
      <div style="font-size:var(--text-footnote);margin-bottom:var(--space-1);color:#b91c1c">
        🩸 Perte détectée (source > destination) : <b id="op-loss-val"></b>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
        <select class="select" id="op-ecart-loss-motif"
          onchange="opState.ecartLoss.motif=this.value">${optsL.map(opt(ecL.motif)).join('')}</select>
        <input class="input" type="text" id="op-ecart-loss-cmt"
          placeholder="Commentaire (optionnel)"
          value="${escapeHtml(ecL.comment || '')}"
          oninput="opState.ecartLoss.comment=this.value">
      </div>
    </div>
  </div>`;
  })()}`;
}

function _opBuildSimpleCont(contOpts) {
  return `
  <div class="op-section">
    <div class="op-section-title">${CUVE_SVG} Contenants concernés</div>
    <div id="op-impl-rows">
      ${opState.implRows.map(r => _opContRow(r, 'impl', contOpts)).join('')}
    </div>
    <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-2)"
            onclick="_opSyncAndAdd('impl')">+ Ajouter un contenant</button>
  </div>`;
}

// ── Décision d'agrément (mode 'agrement', mig 094) ──────────────
// L'agrément se pose À LA CUVE. 3 décisions : soumettre (en_attente, pose le
// verrou des mouvements), valider ou refuser (lèvent le verrou). Bouton choisi
// stocké dans opState.agrementDecision ; saveOpForm route vers la RPC dédiée.
const _AGREMENT_DECISIONS = [
  { key:'en_attente', ico:'🔒', label:'Soumettre à agrément', desc:'Bloque les mouvements de la cuve', clr:'#e65100' },
  { key:'valide',     ico:'✅', label:'Valider',              desc:'Lève le verrou',                 clr:'#2e7d32' },
  { key:'refuse',     ico:'❌', label:'Refuser',              desc:'Lève le verrou (décision rendue)', clr:'#c62828' },
];
function _opBuildAgrement() {
  return `
  <div class="op-section">
    <div class="op-section-title">🔒 Décision d'agrément *</div>
    <div style="display:flex;flex-direction:column;gap:var(--space-2)">
      ${_AGREMENT_DECISIONS.map(d => {
        const sel = opState.agrementDecision === d.key;
        return `<button type="button"
          onclick="selectAgrementDecision('${d.key}')"
          style="display:flex;align-items:center;gap:var(--space-2);text-align:left;
                 padding:10px 12px;border-radius:var(--radius-md);cursor:pointer;
                 border:2px solid ${sel ? d.clr : 'var(--color-border)'};
                 background:${sel ? d.clr + '14' : 'var(--color-bg-elevated)'}">
          <span style="font-size:20px;flex-shrink:0">${d.ico}</span>
          <span style="flex:1;min-width:0">
            <span style="font-weight:600;display:block">${d.label}</span>
            <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">${d.desc}</span>
          </span>
          ${sel ? `<span style="color:${d.clr};font-weight:700">✓</span>` : ''}
        </button>`;
      }).join('')}
    </div>
    <div class="field-help" style="margin-top:var(--space-2)">
      L'agrément est enregistré comme une opération et journalisé. Le motif/référence
      se saisit dans « Notes » ci-dessous.
    </div>
  </div>`;
}
function selectAgrementDecision(key) {
  if (!opState) return;
  opState.agrementDecision = key;
  renderOpPanel();
}

function _opBuildVentilation() {
  const multiLotSrcs = opState.srcRows.filter(r =>
    r.contenant_id && (lotsMap.get(r.contenant_id)||[]).length > 1
  );
  if (!multiLotSrcs.length) return '';

  const dstTotal = opState.dstRows.reduce((s, r) => s + (Number(r.volume_hl)||0), 0);

  return multiLotSrcs.map(srcRow => {
    const cid   = srcRow.contenant_id;
    const c     = contenants.find(x => x.id === cid);
    const lots  = lotsMap.get(cid) || [];
    const totalLotVol = lots.reduce((s, l) => s + (Number(l.volume_hl)||0), 0);
    const opVol = srcRow.volume_hl ?? (dstTotal > 0 ? dstTotal : 0);

    if (!opState.lotVentilation[cid]) {
      opState.lotVentilation[cid] = { mode: 'prop', lots: lots.map(l => ({ lot_id: l.id, volume_hl: null })) };
    }
    const vent     = opState.lotVentilation[cid];
    const isManual = vent.mode === 'manual';

    const lotRows = lots.map(l => {
      const pct     = totalLotVol > 0 ? Math.round((Number(l.volume_hl)||0) / totalLotVol * 100) : 0;
      const propVol = totalLotVol > 0 ? opVol * (Number(l.volume_hl)||0) / totalLotVol : 0;
      const ventLot = vent.lots.find(vl => vl.lot_id === l.id);
      const lotNom  = `${escapeHtml(l.nom)}${l.millesime ? ' '+l.millesime : ''}`;
      const lotInfo = `<span style="color:var(--color-ink-tertiary)">(${fmt(Number(l.volume_hl)||0)} hL · ${pct}%)</span>`;
      if (isManual) {
        return `
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1)">
          <span style="flex:1;font-size:var(--text-caption)">${lotNom} ${lotInfo}</span>
          <input class="input vol-inp" type="number" min="0" step="0.01" placeholder="hL"
            value="${ventLot?.volume_hl != null ? ventLot.volume_hl : ''}"
            style="width:80px"
            oninput="_ventilUpdate('${cid}','${l.id}',parseFloat(this.value)||null)">
        </div>`;
      } else {
        return `
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-1)">
          <span style="flex:1;font-size:var(--text-caption)">${lotNom} ${lotInfo}</span>
          <span style="font-size:var(--text-caption);font-weight:600;color:var(--color-ink-secondary);min-width:60px;text-align:right">${fmt(propVol)} hL</span>
        </div>`;
      }
    }).join('');

    const manualSum = vent.lots.reduce((s, vl) => s + (Number(vl.volume_hl)||0), 0);
    const showWarn  = isManual && opVol > 0 && Math.abs(manualSum - opVol) > 0.001;

    return `
    <div class="op-section" style="border:2px solid var(--color-warning,#f9a825);background:var(--color-warning-bg,#fff8e1)">
      <div class="op-section-title" style="color:var(--color-warning-ink,#e65100)">⚖️ Ventilation lots — ${escapeHtml(c?.nom || cid)}</div>
      <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2)">
        <button class="btn btn--sm${!isManual ? ' btn--primary' : ' btn--ghost'}"
                onclick="_ventilSetMode('${cid}','prop')">Proportionnel</button>
        <button class="btn btn--sm${isManual ? ' btn--primary' : ' btn--ghost'}"
                onclick="_ventilSetMode('${cid}','manual')">Manuel</button>
      </div>
      ${lotRows}
      <div id="ventil-warn-${cid}" style="margin-top:var(--space-1);font-size:var(--text-caption);color:var(--color-error,#c62828);${showWarn ? '' : 'display:none'}">
        ⚠️ Total saisi : ${fmt(manualSum)} hL — volume opération : ${fmt(opVol)} hL
      </div>
    </div>`;
  }).join('');
}

function _ventilSetMode(cid, mode) {
  _syncOpMeta();
  if (!opState.lotVentilation[cid]) {
    const lots = lotsMap.get(cid) || [];
    opState.lotVentilation[cid] = { mode, lots: lots.map(l => ({ lot_id: l.id, volume_hl: null })) };
  } else {
    opState.lotVentilation[cid].mode = mode;
  }
  renderOpPanel();
}

function _ventilUpdate(cid, lotId, value) {
  if (!opState.lotVentilation[cid]) return;
  const entry = opState.lotVentilation[cid].lots.find(vl => vl.lot_id === lotId);
  if (entry) entry.volume_hl = value;
  _updateVentilWarning(cid);
}

function _updateVentilWarning(cid) {
  const warnEl = document.getElementById(`ventil-warn-${cid}`);
  if (!warnEl) return;
  const srcRow  = opState.srcRows.find(r => r.contenant_id === cid);
  const dstTotal = opState.dstRows.reduce((s, r) => s + (Number(r.volume_hl)||0), 0);
  const opVol   = srcRow?.volume_hl ?? (dstTotal > 0 ? dstTotal : 0);
  const vent    = opState.lotVentilation[cid];
  if (!vent) return;
  const manualSum = vent.lots.reduce((s, vl) => s + (Number(vl.volume_hl)||0), 0);
  if (opVol > 0 && Math.abs(manualSum - opVol) > 0.001) {
    warnEl.style.display = '';
    warnEl.textContent = `⚠️ Total saisi : ${fmt(manualSum)} hL — volume opération : ${fmt(opVol)} hL`;
  } else {
    warnEl.style.display = 'none';
  }
}

function _buildLotsArr(contenantsArr) {
  const lotsArr = [];
  const seen    = new Set();
  const dstTotal = opState.dstRows.reduce((s, r) => s + (Number(r.volume_hl)||0), 0);

  contenantsArr.forEach(cr => {
    const lots = lotsMap.get(cr.contenant_id) || [];
    if (cr.role === 'source' && lots.length > 1) {
      const vent = opState.lotVentilation[cr.contenant_id];
      const totalLotVol = lots.reduce((s, l) => s + (Number(l.volume_hl)||0), 0);
      const opVol = cr.volume_hl ?? (dstTotal > 0 ? dstTotal : 0);
      lots.forEach(l => {
        if (seen.has(l.id)) return;
        seen.add(l.id);
        let vol = null;
        if (vent) {
          if (vent.mode === 'prop') {
            vol = totalLotVol > 0 ? Math.round(opVol * (Number(l.volume_hl)||0) / totalLotVol * 10000) / 10000 : null;
          } else {
            const vl = vent.lots.find(x => x.lot_id === l.id);
            vol = vl?.volume_hl ?? null;
          }
        }
        lotsArr.push({ lot_id: l.id, role: 'traite', volume_hl: vol });
      });
    } else {
      lots.forEach(l => {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          lotsArr.push({ lot_id: l.id, role: 'traite', volume_hl: null });
        }
      });
    }
  });

  return lotsArr;
}

function _opContRow(r, zone, contOpts) {
  // Pour les destinations : exclure les cuves à 100% de capacité
  const listC = zone === 'dst'
    ? contenants.filter(c => {
        if (c.actif === false) return false;
        if (!c.capacite_hl) return true;
        const vol = (lotsMap.get(c.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0);
        return vol < c.capacite_hl;
      })
    : contenants;
  const selOpts = `<option value="">— Choisir —</option>` +
    listC.map(c => {
      const lots   = lotsMap.get(c.id) || [];
      const volOcc = lots.reduce((s, l) => s + (Number(l.volume_hl)||0), 0);
      const dispo  = c.capacite_hl ? c.capacite_hl - volOcc : null;
      // Libellé constant : nom · vol courant / capacité · lot principal.
      // Suffixes contextuels (libre / dispo destination) conservés.
      let lbl = `${escapeHtml(c.nom)} · ${fmt(volOcc)} / ${fmt(c.capacite_hl)} hL`;
      if (lots.length) {
        const nomLots = lots.slice(0,2).map(l => l.nom + (l.millesime ? ' '+l.millesime : '')).join(', ');
        lbl += ` · ${escapeHtml(nomLots)}${lots.length > 2 ? ` +${lots.length-2}` : ''}`;
      } else {
        lbl += ' · vide';
      }
      if (zone === 'dst' && dispo != null && dispo > 0 && lots.length) lbl += ` (${fmt(dispo)} hL dispo)`;
      return `<option value="${c.id}"${c.id === r.contenant_id ? ' selected' : ''}>${lbl}</option>`;
    }).join('');
  // Mini-carte « tableau » : présentation structurée des infos clés
  // de la cuve sélectionnée (lit lotsMap, zéro requête). Apparaît sous
  // la ligne dès qu'une cuve est choisie ; reste vide sinon.
  const _selC = r.contenant_id ? contenants.find(x => x.id === r.contenant_id) : null;
  let infoCard = '';
  if (_selC) {
    const _lots = lotsMap.get(_selC.id) || [];
    const _vol  = _lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
    const _pctReal = _selC.capacite_hl ? Math.round(_vol / _selC.capacite_hl * 100) : 0;
    const _pctBar  = Math.min(100, _pctReal);
    const _pct  = _pctReal;
    const _lp   = getPrincipalLot(_selC) || _lots[0];  // socle 5 : principal résolu
    const _fill = _pctReal >= 100 ? '#ef4444' : _pctReal > 0 ? '#22c55e' : 'var(--color-border)';
    const _dot  = _lp ? (LOT_COULEUR_DOT[_lp.couleur] || '') : '';
    const _lotTxt = _lp
      ? `${_dot} ${escapeHtml(_lp.nom)}${_lp.millesime ? ' ' + _lp.millesime : ''}${_lots.length > 1 ? ` <span style="color:var(--color-ink-tertiary)">+${_lots.length - 1}</span>` : ''}`
      : '<span style="color:var(--color-ink-tertiary)">— vide</span>';
    const _stP  = _lp ? (LOT_STATUT_COLORS[_lp.statut] || '#eee|#555').split('|') : null;
    const _stB  = _lp
      ? `<span style="background:${_stP[0]};color:${_stP[1]};padding:1px 6px;border-radius:999px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px">${LOT_STATUT_SHORT[_lp.statut] || _lp.statut}</span>`
      : '';
    const _dispo = _selC.capacite_hl ? Math.max(0, Number((_selC.capacite_hl - _vol).toFixed(2))) : 0;
    const _fillBtn = (zone === 'dst' && _dispo > 0) ? `
      <button class="btn btn--ghost btn--sm" type="button"
        style="padding:2px 8px;font-size:var(--text-caption);white-space:nowrap"
        title="Pose le volume = capacité − volume actuel"
        onclick="_opDstFillToCapa('${r._uid}')">📏 Plein (${fmt(_dispo)} hL)</button>` : '';
    infoCard = `
    <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px 12px;align-items:center;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:6px 10px;margin:4px 4px 8px;font-size:var(--text-caption)">
      <div style="font-weight:700;font-size:var(--text-footnote)">${escapeHtml(_selC.nom)}</div>
      <div>${_lotTxt}</div>
      <div style="white-space:nowrap;font-variant-numeric:tabular-nums${_pctReal > 100 ? ';color:var(--color-danger);font-weight:700' : ''}"><b>${fmt(_vol)}</b> / ${fmt(_selC.capacite_hl)} hL · ${_pctReal}%</div>
      <div></div>
      <div style="display:flex;align-items:center;gap:var(--space-2)">
        ${_stB}
        <div style="flex:1;max-width:160px;height:5px;border-radius:3px;background:var(--color-bg-mute);overflow:hidden">
          <div style="width:${_pctBar}%;height:100%;background:${_fill}"></div>
        </div>
      </div>
      <div>${_fillBtn}</div>
    </div>`;
  }

  // Bouton « Mesurer » (épalement) : saisie creux/jauge → volume réel via
  // barémage. Disponible dès qu'une cuve est choisie (toutes zones).
  const _mesureBtn = _selC ? `
    <button class="btn btn--ghost btn--sm" type="button"
      style="padding:2px 8px;font-size:var(--text-caption);white-space:nowrap"
      title="Calculer le volume réel à partir d'un creux ou d'une jauge (barémage)"
      onclick="_opOpenMesure('${zone}','${r._uid}','${_selC.id}')">📏 Mesurer</button>` : '';

  return `
  <div class="op-cont-row">
    <select class="select"
      onchange="opContSet('${zone}','${r._uid}','cid',this.value)">${selOpts}</select>
    <input class="input vol-inp" type="number" min="0" step="0.01" placeholder="hL"
      data-uid="${r._uid}"
      value="${r.volume_hl != null ? r.volume_hl : ''}"
      oninput="opContSet('${zone}','${r._uid}','vol',parseFloat(this.value)||null)">
    ${_mesureBtn}
    <button class="op-row-del" onclick="_opSyncAndRemoveCont('${zone}','${r._uid}')">✕</button>
  </div>
  <div id="op-mesure-${r._uid}" style="display:none;margin:2px 4px 8px;padding:8px 10px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:var(--radius-sm)"></div>
  ${infoCard}
  ${zone === 'dst' ? `
  <div style="margin:-2px 0 8px 4px">
    <input class="input" type="text"
      placeholder="✏️ Renommer / Scinder le lot dans cette cuve (nouveau lot si source non vidée)"
      title="Si la source reste non vide après l'op (soutirage/transfert partiel), un NOUVEAU lot est créé pour cette destination (scission + filiation). Sinon, le lot existant est juste renommé."
      value="${escapeHtml(r.lotNom || '')}"
      oninput="opContSet('dst','${r._uid}','lotNom',this.value)"
      style="font-size:var(--text-caption);padding:4px 8px;width:100%;max-width:420px">
  </div>` : ''}`;
}

function _opBuildProduits(prodOpts) {
  return `
  <div class="op-section">
    <div class="op-section-title">🧪 Produits œnologiques</div>
    <div id="op-prod-rows">
      ${opState.prodRows.map(r => _opProdRow(r, prodOpts)).join('')}
    </div>
    <button class="btn btn--ghost btn--sm" style="margin-top:var(--space-2)"
            onclick="_opSyncAndAddProd()">+ Ajouter un produit</button>
  </div>`;
}

function _opProdRow(r, prodOpts) {
  const today = new Date().toISOString().slice(0, 10);
  const selOpts = `<option value="">— Lot produit —</option>` +
    (_opDataCache?.allProduits || []).map(p => {
      const pc  = p.produits_catalogue;
      const nom = pc?.nom || '?';
      const lot = p.numero_lot ? ` [${p.numero_lot}]` : '';
      // R1 - DLUO expirée signalée dans l'option
      const dluoStr = p.dluo ? p.dluo.slice(0, 10) : null;
      const isExpired = dluoStr && dluoStr < today;
      const dluo = dluoStr ? `${isExpired ? ' ⚠ DLUO EXPIRÉE' : ' · DLUO'} ${dluoStr}` : '';
      return `<option value="${p.id}"${p.id === r.produit_lot_id ? ' selected' : ''}>${escapeHtml(nom)}${lot}${dluo}</option>`;
    }).join('');
  // R5 - Unité forcée à pc.unite_stock
  const selectedProd = (_opDataCache?.allProduits || []).find(p => p.id === r.produit_lot_id);
  const pc = selectedProd?.produits_catalogue;
  const forcedUnit = pc?.unite_stock || r.unite || '';
  if (pc?.unite_stock && r.unite !== pc.unite_stock) {
    r.unite = pc.unite_stock;
  }
  const hasConc = pc && pc.concentration != null;
  // Catalogue incomplet
  const missingFields = [];
  if (pc) {
    if (!pc.unite_stock)              missingFields.push('unité');
    if (pc.concentration == null)     missingFields.push('concentration');
    if (pc.dose_max == null)          missingFields.push('dose max');
  }
  const catWarn = (pc && missingFields.length)
    ? `<div style="font-size:var(--text-caption);color:#92400e;background:#fef3c7;padding:3px 8px;border-radius:var(--radius-sm);margin-top:var(--space-1)">⚠ Catalogue incomplet : ${missingFields.join(', ')} — éditer dans Produits.</div>`
    : '';

  // T8-A — Multi-cuves : toggle « Doser par cuve » + grille de doses
  // individuelles. Visible si l'op concerne ≥ 2 cuves ET que le catalogue
  // a une concentration (sinon pas de conversion dose ↔ qty possible).
  const cuvesImpl = (opState.implRows || []).filter(x => x.contenant_id);
  const cuvesDst  = (opState.dstRows || []).filter(x => x.contenant_id);
  const cuves     = cuvesImpl.length ? cuvesImpl : cuvesDst;
  const showPerCuve = cuves.length > 1 && hasConc;
  const perCuveBlock = showPerCuve ? _opRenderPerCuveBlock(r, cuves, pc) : '';

  return `
  <div class="op-prod-row">
    <select class="select"
      onchange="opProdSet('${r._uid}','pid',this.value)">${selOpts}</select>
    <input class="input qty-inp" type="number" min="0" step="0.001" placeholder="Qté"
      id="op-pr-qty-${r._uid}"
      value="${r.quantite != null ? r.quantite : ''}"
      oninput="opProdSet('${r._uid}','qty',this.value)">
    <input class="input unite-inp" type="text" placeholder="unité"
      style="background:var(--color-bg-subtle);color:var(--color-ink-secondary);cursor:not-allowed"
      value="${escapeHtml(forcedUnit)}" readonly
      title="Unité forcée par le catalogue produit (évite incohérence de stock)">
    ${hasConc ? `
    <input class="input" type="number" min="0" step="any" placeholder="Dose cible" style="width:90px"
      id="op-pr-conc-${r._uid}"
      oninput="_opLiveConcToQty('${r._uid}')">
    <select class="select" id="op-pr-conc-unit-${r._uid}" style="width:80px"
      onchange="_opLiveConcToQty('${r._uid}')">
      <option value="mg_l">mg/L</option>
      <option value="g_hl" selected>g/hL</option>
      <option value="cl_hl">cL/hL</option>
      <option value="ml_hl">mL/hL</option>
    </select>
    ` : ''}
    <button class="op-row-del" onclick="_opSyncAndRemoveProd('${r._uid}')">✕</button>
  </div>
  ${hasConc ? `
  <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);padding:2px 0 4px;display:flex;gap:var(--space-3);flex-wrap:wrap"
       id="op-pr-hint-${r._uid}">
    <span id="op-pr-hint-actif-${r._uid}"></span>
    <span id="op-pr-hint-dose-${r._uid}"></span>
  </div>` : ''}
  ${perCuveBlock}
  ${catWarn}`;
}

// T8-A — Rendu du toggle + grille de doses par cuve.
// Comportement : si l'opérateur saisit des doses par cuve, on ignore la
// saisie globale (Qté + Dose cible) et on somme les quantités cuve par
// cuve dans row.quantite (envoyé au backend en un seul operation_produits).
function _opRenderPerCuveBlock(r, cuves, pc) {
  const isOpen = !!r.perCuveOpen;
  const unite  = pc.unite_stock || '';
  const concG  = Number(pc.concentration);

  const rows = cuves.map(cuve => {
    const c = contenants.find(x => x.id === cuve.contenant_id);
    const vol = Number(cuve.volume_hl) || 0;
    const doseGHl = (r.perCuveDoses && r.perCuveDoses[cuve.contenant_id]) ?? '';
    const qty = (doseGHl !== '' && Number(doseGHl) > 0 && vol > 0 && concG > 0)
      ? _opToSigFig((Number(doseGHl) * 10 * vol * 100) / (concG * 1000), 3)
      : null;
    const overMax = (pc.dose_max != null && doseGHl !== '' && Number(doseGHl) * 10 > Number(pc.dose_max));
    const doseColor = overMax ? 'color:var(--color-danger);font-weight:700' : '';
    return `
    <tr>
      <td style="padding:4px 6px">${escapeHtml(c?.nom || '?')}</td>
      <td style="padding:4px 6px;text-align:right;color:var(--color-ink-tertiary)">${vol} hL</td>
      <td style="padding:4px 6px;text-align:right">
        <input type="number" min="0" step="0.01" placeholder="—" value="${doseGHl}"
          style="width:75px;text-align:right;padding:2px 4px;${doseColor}"
          oninput="_opSetPerCuveDose('${r._uid}','${cuve.contenant_id}',this.value)">
        <span style="font-size:10px;color:var(--color-ink-tertiary)">g/hL</span>
      </td>
      <td data-percuve-qty="${r._uid}-${cuve.contenant_id}"
          style="padding:4px 6px;text-align:right;font-variant-numeric:tabular-nums">${qty != null ? qty : '—'}</td>
    </tr>`;
  }).join('');

  // Total qté = somme des qty par cuve
  const total = cuves.reduce((s, cuve) => {
    const vol = Number(cuve.volume_hl) || 0;
    const doseGHl = (r.perCuveDoses && r.perCuveDoses[cuve.contenant_id]) ?? '';
    if (doseGHl === '' || vol <= 0 || !(concG > 0)) return s;
    return s + (Number(doseGHl) * 10 * vol * 100) / (concG * 1000);
  }, 0);

  return `
  <div style="margin:6px 0">
    <button class="btn btn--ghost btn--sm" type="button"
      onclick="_opTogglePerCuve('${r._uid}')"
      style="font-size:var(--text-caption)">
      ${isOpen ? '🔼 Masquer dosage par cuve' : `📊 Doser par cuve (${cuves.length} cuves)`}
    </button>
    ${isOpen ? `
    <div style="margin-top:6px;padding:var(--space-2);background:var(--color-bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--color-border)">
      <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-bottom:6px">
        Une dose par cuve. La quantité totale ${escapeHtml(unite)} est sommée et appliquée au stock. La saisie globale (Qté/Dose cible ci-dessus) est ignorée tant que ce mode est actif.
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="color:var(--color-ink-tertiary);text-align:left;border-bottom:1px solid var(--color-border)">
          <th style="padding:4px 6px">Cuve</th>
          <th style="padding:4px 6px;text-align:right">Volume</th>
          <th style="padding:4px 6px;text-align:right">Dose</th>
          <th style="padding:4px 6px;text-align:right">Qté ${escapeHtml(unite)}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="border-top:1px solid var(--color-border);font-weight:600">
          <td colspan="3" style="padding:6px;text-align:right">Total :</td>
          <td data-percuve-total="${r._uid}"
              style="padding:6px;text-align:right;font-variant-numeric:tabular-nums">${_opToSigFig(total, 3)} ${escapeHtml(unite)}</td>
        </tr></tfoot>
      </table>
    </div>` : ''}
  </div>`;
}

// Toggle ouverture / fermeture grille par cuve
function _opTogglePerCuve(uid) {
  const row = opState.prodRows.find(r => r._uid === uid);
  if (!row) return;
  row.perCuveOpen = !row.perCuveOpen;
  if (row.perCuveOpen && !row.perCuveDoses) row.perCuveDoses = {};
  _opReRenderProdRow(uid);
}

// Saisie d'une dose par cuve → recalcule la quantité totale SANS re-render
// global (sinon le champ input perd le focus à chaque chiffre saisi). On
// met à jour UNIQUEMENT les cellules concernées via querySelector.
function _opSetPerCuveDose(uid, cid, value) {
  const row = opState.prodRows.find(r => r._uid === uid);
  if (!row) return;
  if (!row.perCuveDoses) row.perCuveDoses = {};
  if (value === '' || value == null) delete row.perCuveDoses[cid];
  else                                row.perCuveDoses[cid] = value;

  const pl = (_opDataCache?.allProduits || []).find(p => p.id === row.produit_lot_id);
  const pc = pl?.produits_catalogue;
  const concG = Number(pc?.concentration);
  if (!(concG > 0)) return;

  // Calcule la quantité de chaque cuve + total
  const cuvesImpl = (opState.implRows || []).filter(x => x.contenant_id);
  const cuvesDst  = (opState.dstRows || []).filter(x => x.contenant_id);
  const cuves     = cuvesImpl.length ? cuvesImpl : cuvesDst;
  let total = 0;
  for (const cuve of cuves) {
    const vol = Number(cuve.volume_hl) || 0;
    const doseGHl = row.perCuveDoses[cuve.contenant_id];
    const qty = (doseGHl != null && doseGHl !== '' && vol > 0)
      ? (Number(doseGHl) * 10 * vol * 100) / (concG * 1000)
      : null;
    // Mise à jour ciblée de la cellule "Qté" pour cette cuve uniquement
    const cell = document.querySelector(`[data-percuve-qty="${uid}-${cuve.contenant_id}"]`);
    if (cell) cell.textContent = (qty != null) ? _opToSigFig(qty, 3) : '—';
    if (qty != null) total += qty;
  }
  row.quantite = total > 0 ? _opToSigFig(total, 4) : null;

  // Mise à jour du total dans le tfoot + du champ Qté global en haut
  const totalCell = document.querySelector(`[data-percuve-total="${uid}"]`);
  if (totalCell) totalCell.textContent = `${_opToSigFig(total, 3)} ${pc.unite_stock || ''}`;
  const qtyGlobal = document.getElementById(`op-pr-qty-${uid}`);
  if (qtyGlobal && document.activeElement !== qtyGlobal) {
    qtyGlobal.value = row.quantite != null ? row.quantite : '';
  }
}

// Helper arrondi 2 chiffres significatifs (partagé avec operations.html style)
// _opToSigFig → extrait dans cuverie-utils.js (socle 9)

// Volume effectif de l'opération courante (somme des contenants impliqués
// ou destinations). Utilisé pour le calcul dose ↔ quantité.
function _opCurrentVol() {
  const impl = (opState.implRows || []).reduce((s, r) => s + (Number(r.volume_hl) || 0), 0);
  if (impl > 0) return impl;
  const dst  = (opState.dstRows || []).reduce((s, r) => s + (Number(r.volume_hl) || 0), 0);
  if (dst > 0) return dst;
  // fallback : volumes courants des cuves srcRows si pas de volume saisi
  const src = (opState.srcRows || []).reduce((s, r) => {
    if (r.volume_hl != null) return s + Number(r.volume_hl);
    const lots = lotsMap.get(r.contenant_id) || [];
    return s + lots.reduce((a, l) => a + (Number(l.volume_hl) || 0), 0);
  }, 0);
  return src;
}

// Saisie quantité → met à jour hint actif/dose + remplit le champ dose cible
function _opLiveQtyToConc(uid) {
  const row = opState.prodRows.find(r => r._uid === uid);
  if (!row) return;
  const pl = (_opDataCache?.allProduits || []).find(p => p.id === row.produit_lot_id);
  const pc = pl?.produits_catalogue;
  if (!pc || pc.concentration == null) return;
  const hintActif = document.getElementById(`op-pr-hint-actif-${uid}`);
  const hintDose  = document.getElementById(`op-pr-hint-dose-${uid}`);
  const concEl    = document.getElementById(`op-pr-conc-${uid}`);
  if (!hintActif || !hintDose) return;
  const qty = Number(row.quantite);
  if (!qty) {
    hintActif.textContent = ''; hintDose.textContent = '';
    if (concEl && document.activeElement !== concEl) concEl.value = '';
    return;
  }
  const gActif = qty * Number(pc.concentration);
  hintActif.textContent = gActif >= 1000
    ? `⚗️ ${(gActif/1000).toLocaleString('fr-FR',{maximumFractionDigits:3})} kg actif`
    : `⚗️ ${gActif.toLocaleString('fr-FR',{maximumFractionDigits:2})} g actif`;
  const volHl = _opCurrentVol();
  if (volHl > 0) {
    const mgL = (gActif / (volHl * 100)) * 1000;
    if (concEl && document.activeElement !== concEl) {
      const concUnit = document.getElementById(`op-pr-conc-unit-${uid}`)?.value || 'g_hl';
      let displayValue;
      if      (concUnit === 'g_hl')  displayValue = mgL / 10;
      else if (concUnit === 'cl_hl') displayValue = qty * 100 / volHl;
      else if (concUnit === 'ml_hl') displayValue = qty * 1000 / volHl;
      else                            displayValue = mgL;
      concEl.value = _opToSigFig(displayValue, 3);
    }
    const maxOk = pc.dose_max == null || mgL <= Number(pc.dose_max);
    const color = maxOk ? 'var(--color-ink-tertiary)' : 'var(--color-danger)';
    const weight = maxOk ? '' : 'font-weight:700;';
    const sufx = !maxOk ? ` ⚠ > max ${pc.dose_max}` : '';
    const nCuves = ((opState.implRows || []).filter(r => r.contenant_id).length)
                  + ((opState.dstRows || []).filter(r => r.contenant_id).length);
    const perCuveHint = (nCuves > 1)
      ? ` · ${nCuves} cuves → ~${(mgL/nCuves).toFixed(1)} mg/L/cuve si répartition égale`
      : '';
    hintDose.innerHTML = `<span style="color:${color};${weight}">= ${mgL.toLocaleString('fr-FR',{maximumFractionDigits:1})} mg/L sur ${volHl} hL${sufx}${perCuveHint}</span>`;
  } else {
    hintDose.textContent = '(saisir un volume pour calculer la dose)';
    if (concEl && document.activeElement !== concEl) concEl.value = '';
  }
}

// Saisie dose cible → calcule la quantité
function _opLiveConcToQty(uid) {
  const row = opState.prodRows.find(r => r._uid === uid);
  if (!row) return;
  const pl = (_opDataCache?.allProduits || []).find(p => p.id === row.produit_lot_id);
  const pc = pl?.produits_catalogue;
  if (!pc || pc.concentration == null) return;
  const doseInput = parseFloat(document.getElementById(`op-pr-conc-${uid}`)?.value);
  const doseUnit  = document.getElementById(`op-pr-conc-unit-${uid}`)?.value || 'g_hl';
  const volHl = _opCurrentVol();
  if (isNaN(doseInput) || doseInput <= 0 || volHl <= 0) return;
  const concG = Number(pc.concentration);
  // Conversion vers mg/L canonique (cl/hL et mL/hL valent pour produits liquides) :
  //   g/hL  → mgL = doseInput × 10
  //   cL/hL → mgL = doseInput × concentration / 10
  //   mL/hL → mgL = doseInput × concentration / 100
  //   mg/L  → mgL = doseInput
  let mgL;
  if      (doseUnit === 'g_hl')  mgL = doseInput * 10;
  else if (doseUnit === 'cl_hl') mgL = doseInput * concG / 10;
  else if (doseUnit === 'ml_hl') mgL = doseInput * concG / 100;
  else                            mgL = doseInput;
  // qty (en unite_stock) = (mgL × volHl × 100) / (concentration × 1000)
  // 3 chiffres significatifs (précision dosage cave)
  const qty = (mgL * volHl * 100) / (concG * 1000);
  row.quantite = _opToSigFig(qty, 3);
  const qtyEl = document.getElementById(`op-pr-qty-${uid}`);
  if (qtyEl) qtyEl.value = row.quantite;
  _opLiveQtyToConc(uid);
}

function _opBuildAnalyse() {
  const a = opState.analyse;
  const implCid = opState.implRows[0]?.contenant_id || null;
  const lotsInCuve = implCid ? (lotsMap.get(implCid) || []) : [];

  const fld = (lbl, step, key) => `
    <div class="field">
      <label class="field-label">${lbl}</label>
      <input class="input" type="number" step="${step}" placeholder="—"
        value="${a[key] != null ? a[key] : ''}"
        oninput="opState.analyse['${key}']=parseFloat(this.value)||null">
    </div>`;

  let lotSelect = '';
  if (lotsInCuve.length > 1) {
    const opts = `<option value="">— Choisir le lot —</option>` +
      `<option value="__none__"${a._chosen_lot_id === '__none__' ? ' selected' : ''}>📦 Analyse contenant uniquement (sans lot)</option>` +
      lotsInCuve.map(l =>
        `<option value="${l.id}"${a._chosen_lot_id === l.id ? ' selected' : ''}>${escapeHtml(l.nom)}${l.millesime ? ' '+l.millesime : ''}</option>`
      ).join('');
    lotSelect = `
    <div class="field" style="grid-column:1/-1;background:var(--color-warning-bg,#fff8e1);border:1px solid var(--color-warning,#f9a825);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3)">
      <label class="field-label" style="color:var(--color-warning-ink,#e65100)">⚠️ Cuve multi-lots — Lot concerné</label>
      <select class="select" onchange="opState.analyse._chosen_lot_id=this.value||null">${opts}</select>
    </div>`;
  } else if (lotsInCuve.length === 1) {
    lotSelect = `<div class="field" style="grid-column:1/-1;font-size:var(--text-caption);color:var(--color-ink-tertiary)">🍷 Lot : <b>${escapeHtml(lotsInCuve[0].nom)}</b></div>`;
  }

  return `
  <div class="op-section">
    <div class="op-section-title">🔬 Résultats d'analyse</div>
    <div class="analyse-grid">
      ${lotSelect}
      ${fld('SO₂ libre (mg/L)','0.1','so2_libre')}
      ${fld('SO₂ total (mg/L)','0.1','so2_total')}
      ${fld('SO₂ actif (mg/L)','0.01','so2_actif')}
      ${fld('pH','0.01','ph')}
      ${fld('AT (g/L)','0.01','ta')}
      ${fld('AV (g/L)','0.01','acidite_volatile')}
      ${fld('TAV (% vol)','0.01','tav')}
      ${fld('Sucres (g/L)','0.1','sucres_residuels')}
      ${fld('Densité','0.0001','densite')}
      ${fld('A. malique (g/L)','0.01','acide_malique')}
      ${fld('A. lactique (g/L)','0.01','acide_lactique')}
      ${fld('GF -5°C','0.1','gf_neg5')}
      ${fld('GF +5°C','0.1','gf_pos5')}
      ${fld('CO₂ (g/L)','0.01','co2')}
      ${fld('Turbidité (NTU)','0.1','turbidite')}
    </div>
  </div>`;
}

// ── Mutations d'état des lignes ────────────────────────────────
function opContSet(zone, uid, field, value) {
  const rows = zone==='src' ? opState.srcRows : zone==='dst' ? opState.dstRows : opState.implRows;
  const row  = rows.find(r => r._uid === uid);
  if (!row) return;
  if (field === 'cid') {
    const prevCid = row.contenant_id;
    row.contenant_id = value || null;
    // Cas spécifique source : ventilation multi-lots
    if (zone === 'src') {
      if (prevCid && prevCid !== value) delete opState.lotVentilation[prevCid];
      if (value) {
        const lots = lotsMap.get(value) || [];
        if (lots.length > 1 && !opState.lotVentilation[value]) {
          opState.lotVentilation[value] = { mode: 'prop', lots: lots.map(l => ({ lot_id: l.id, volume_hl: null })) };
        }
      }
    }
    // Re-render pour TOUTES les zones (src, dst, impl) → la mini-carte
    // et le bouton « Plein » apparaissent immédiatement à la sélection.
    _syncOpMeta();
    renderOpPanel();
  } else if (field === 'vol') {
    row.volume_hl = value;
    _updateOpSums();              // total live sans re-render complet (focus préservé)
  } else if (field === 'lotNom') {
    row.lotNom = value;          // renommage post-save (zone dst uniquement)
  }
}

// Met à jour les totaux affichés en bas des zones source/destination.
// Patch DOM ciblé : évite renderOpPanel() (qui perdrait le focus saisie).
function _updateOpSums() {
  const fmtSum = (rows) => {
    const filled = rows.filter(r => r.contenant_id);
    if (!filled.length) return '';
    const vols = filled.filter(r => r.volume_hl != null).map(r => Number(r.volume_hl) || 0);
    const sum  = vols.reduce((a, b) => a + b, 0);
    const missing = filled.length - vols.length;
    return missing > 0
      ? `Total saisi : <b>${fmt(sum)} hL</b> <span style="color:var(--color-ink-tertiary)">· ${missing} ligne(s) sans volume</span>`
      : `Total : <b>${fmt(sum)} hL</b>`;
  };
  const s = document.getElementById('op-src-sum'); if (s) s.innerHTML = fmtSum(opState?.srcRows || []);
  const d = document.getElementById('op-dst-sum'); if (d) d.innerHTML = fmtSum(opState?.dstRows || []);

  // Écarts (mode mouvement uniquement) — espace libre dest + perte src>dst.
  if (opState && _opMode(opState.type) === 'mouvement') {
    const srcSum = (opState.srcRows || []).reduce((a, r) => a + (Number(r.volume_hl) || 0), 0);
    const dstSum = (opState.dstRows || []).reduce((a, r) => a + (Number(r.volume_hl) || 0), 0);
    const loss   = srcSum > dstSum + 0.01 ? srcSum - dstSum : 0;
    // Headspace = Σ (capa − (volCourant + volSaisiOp)) sur les destinations
    let headspace = 0;
    (opState.dstRows || []).forEach(r => {
      if (!r.contenant_id) return;
      const c = contenants.find(x => x.id === r.contenant_id);
      if (!c || !c.capacite_hl) return;
      const cur   = (lotsMap.get(c.id) || []).reduce((a, l) => a + (Number(l.volume_hl) || 0), 0);
      const after = cur + (Number(r.volume_hl) || 0);
      headspace += Math.max(0, c.capacite_hl - after);
    });

    const sec = document.getElementById('op-ecarts-section');
    const headRow = document.getElementById('op-ecart-headspace-row');
    const lossRow = document.getElementById('op-ecart-loss-row');
    if (sec && headRow && lossRow) {
      const showHead = headspace > 0.01;
      const showLoss = loss > 0.01;
      headRow.style.display = showHead ? '' : 'none';
      lossRow.style.display = showLoss ? '' : 'none';
      sec.style.display     = (showHead || showLoss) ? '' : 'none';
      const hv = document.getElementById('op-headspace-val');
      const lv = document.getElementById('op-loss-val');
      if (hv) hv.textContent = fmt(headspace) + ' hL';
      if (lv) lv.textContent = fmt(loss) + ' hL';
    }
  }
}

// Construit les notes effectivement envoyées au save : préfixe avec les
// annotations d'écart (Espace libre / Perte) si motif renseigné. Permet
// de tracer l'info en texte (recherche plus tard) sans schéma backend.
const _ECH_LBL = {
  ouillage_prevu:'à ouiller', ciel_garde:'ciel gardé',
  mise_a_venir:'mise à venir', autre:'autre',
};
const _ECL_LBL = {
  erreur_epalement:"erreur d'épalement", perte_caviste:'perte caviste',
  evaporation:'évaporation', non_explicable:'non explicable', autre:'autre',
};
function _buildOpNotes(extraPrefix) {
  if (!opState) return null;
  const tags = [];
  if (extraPrefix) tags.push(extraPrefix);
  // Épalement : tracer les mesures creux/jauge → volume saisies sur les cuves.
  const mesures = [];
  ['srcRows', 'dstRows', 'implRows'].forEach(z => {
    (opState[z] || []).forEach(r => {
      if (r._mesure && r.contenant_id) {
        const c = contenants.find(x => x.id === r.contenant_id);
        const lbl = r._mesure.mode === 'jauge_bas' ? 'jauge' : 'creux';
        mesures.push(`${c ? c.nom : '?'} ${lbl} ${r._mesure.val}cm→${fmt(r._mesure.vol)}hL`);
      }
    });
  });
  if (mesures.length) tags.push(`[Épalement · ${mesures.join(' ; ')}]`);
  const ecH = opState.ecartHeadspace;
  if (ecH && ecH.motif) tags.push(`[Espace libre · ${_ECH_LBL[ecH.motif] || ecH.motif}${ecH.comment ? ': ' + ecH.comment : ''}]`);
  const ecL = opState.ecartLoss;
  if (ecL && ecL.motif) tags.push(`[Perte · ${_ECL_LBL[ecL.motif] || ecL.motif}${ecL.comment ? ': ' + ecL.comment : ''}]`);
  const base = (opState.notes || '').trim();
  return tags.length ? tags.join(' ') + (base ? ' — ' + base : '') : (base || null);
}

// ── Épalement : saisie creux/jauge → volume réel (barémage mig 060) ──
// Ouvre un mini-panneau sous la ligne de cuve : champ mesure + mode
// (creux/jauge) + bouton calculer. Le volume calculé remplit le champ hL
// de la ligne → alimente directement les doses (via _opCurrentVol).
function _opOpenMesure(zone, uid, contenantId) {
  const box = document.getElementById('op-mesure-' + uid);
  if (!box) return;
  if (box.style.display !== 'none') { box.style.display = 'none'; return; }
  box.style.display = '';
  box.innerHTML = `
    <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:end">
      <div class="field"><label class="field-label" style="font-size:var(--text-caption)">Mesure (cm)</label>
        <input class="input" type="number" step="0.1" id="opm-val-${uid}" style="width:100px"></div>
      <div class="field"><label class="field-label" style="font-size:var(--text-caption)">Mode</label>
        <select class="select" id="opm-mode-${uid}">
          <option value="creux">Creux (haut cheminée)</option>
          <option value="jauge_bas">Jauge (par le bas)</option>
        </select></div>
      <button class="btn btn--primary btn--sm" type="button"
        onclick="_opApplyMesure('${zone}','${uid}','${contenantId}')">Calculer le volume</button>
      <span id="opm-res-${uid}" style="font-size:var(--text-caption);padding-bottom:6px"></span>
    </div>`;
}

async function _opApplyMesure(zone, uid, contenantId) {
  const val  = parseFloat(document.getElementById('opm-val-' + uid)?.value);
  const mode = document.getElementById('opm-mode-' + uid)?.value || 'creux';
  const res  = document.getElementById('opm-res-' + uid);
  if (isNaN(val)) { if (res) res.textContent = '— saisis une mesure'; return; }
  try {
    const v = await WB3DB.volumeFromMesure(contenantId, val, mode);
    if (v == null) {
      if (res) res.innerHTML = '<span style="color:var(--color-danger)">cuve non calibrée (voir Paramètres → Épalement)</span>';
      return;
    }
    const vol = Number(v);
    // remplir le champ volume de la ligne + état
    opContSet(zone, uid, 'vol', vol);
    const input = document.querySelector(`input.vol-inp[data-uid="${uid}"]`);
    if (input) input.value = vol;
    // tracer la mesure dans l'état pour les notes de l'op
    const rows = zone==='src' ? opState.srcRows : zone==='dst' ? opState.dstRows : opState.implRows;
    const row = rows.find(r => r._uid === uid);
    if (row) row._mesure = { val, mode, vol };
    if (res) res.innerHTML = `= <b style="color:var(--color-primary)">${fmt(vol)} hL</b>`;
    _updateOpSums();
  } catch(e) {
    if (res) res.innerHTML = `<span style="color:var(--color-danger)">${escapeHtml(e.message)}</span>`;
  }
}

// Bouton « Plein » d'une ligne destination : pose le volume = capacité − vol courant.
function _opDstFillToCapa(uid) {
  const row = opState?.dstRows.find(r => r._uid === uid);
  if (!row || !row.contenant_id) return;
  const c = contenants.find(x => x.id === row.contenant_id);
  if (!c || !c.capacite_hl) return;
  const cur   = (lotsMap.get(c.id) || []).reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const dispo = Math.max(0, Number((c.capacite_hl - cur).toFixed(2)));
  row.volume_hl = dispo;
  const input = document.querySelector(`input.vol-inp[data-uid="${uid}"]`);
  if (input) input.value = dispo;
  _updateOpSums();
}

function opProdSet(uid, field, value) {
  const row = opState.prodRows.find(r => r._uid === uid);
  if (!row) return;
  if (field === 'pid') {
    row.produit_lot_id = value || null;
    // Reset l'unité pour qu'elle prenne celle du nouveau produit catalogue
    // au prochain render (sinon ancien produit kg + nouveau L → bug R5).
    row.unite = '';
    // Re-render des prods uniquement (lourd : tout le panel ; léger :
    // remplacer #op-prod-rows par le nouveau HTML).
    _opReRenderProdRow(uid);
  }
  else if (field === 'qty') {
    row.quantite = parseFloat(value) || null;
    _opLiveQtyToConc(uid);
  }
  else if (field === 'unite') row.unite = value;
}

// Re-rend une ligne produit (et son hint) sans relancer tout le panel.
// Appelé après changement de produit_lot_id pour rafraîchir l'unité forcée
// et faire apparaître/disparaître le calculateur dose selon hasConc.
function _opReRenderProdRow(uid) {
  const idx = opState.prodRows.findIndex(r => r._uid === uid);
  if (idx < 0) return;
  const container = document.getElementById('op-prod-rows');
  if (!container) return;
  // Re-rend la totalité des lignes prods (simple et sûr ; peu de lignes).
  container.innerHTML = opState.prodRows.map(r => _opProdRow(r, null)).join('');
}

function _syncOpMeta() {
  const get = id => document.getElementById(id);
  if (get('op-f-date'))      opState.date      = get('op-f-date').value;
  if (get('op-f-statut'))    opState.statut    = get('op-f-statut').value;
  if (get('op-f-operateur')) opState.operateur = get('op-f-operateur').value;
  if (get('op-f-reference')) opState.reference = get('op-f-reference').value;
  if (get('op-f-notes'))     opState.notes     = get('op-f-notes').value;
}

function _opSyncAndAdd(zone) {
  _syncOpMeta();
  const row = { _uid: _opUid(), contenant_id: null, volume_hl: null };
  if (zone === 'src')       opState.srcRows.push(row);
  else if (zone === 'dst')  opState.dstRows.push(row);
  else                      opState.implRows.push(row);
  renderOpPanel();
}

function _opSyncAndRemoveCont(zone, uid) {
  _syncOpMeta();
  if (zone === 'src')      opState.srcRows   = opState.srcRows.filter(r => r._uid !== uid);
  else if (zone === 'dst') opState.dstRows   = opState.dstRows.filter(r => r._uid !== uid);
  else                     opState.implRows  = opState.implRows.filter(r => r._uid !== uid);
  renderOpPanel();
}

function _opSyncAndAddProd() {
  _syncOpMeta();
  opState.prodRows.push({ _uid: _opUid(), produit_lot_id: null, quantite: null, unite: '' });
  renderOpPanel();
}

function _opSyncAndRemoveProd(uid) {
  _syncOpMeta();
  opState.prodRows = opState.prodRows.filter(r => r._uid !== uid);
  renderOpPanel();
}

// ── Sauvegarde ────────────────────────────────────────────────
async function saveOpForm() {
  if (!opState) return;
  _syncOpMeta();

  if (!opState.type) { toast('Choisissez un type d\'opération', 'error'); return; }
  if (!opState.date) { toast('La date est obligatoire', 'error'); return; }

  // ── Agrément (mig 094) : opération À LA CUVE via RPC dédiée. Ne passe pas
  // par wb3_save_operation_graph — la RPC pose contenants.agrement_statut ET
  // journalise l'opération 'agrement' + operation_contenants.
  if (opState.type === 'agrement') {
    const cids = (opState.implRows || []).map(r => r.contenant_id).filter(Boolean);
    if (!cids.length)               { toast('Choisissez au moins une cuve', 'error'); return; }
    if (!opState.agrementDecision)  { toast('Choisissez une décision d\'agrément', 'error'); return; }
    const btnA = document.getElementById('dd-save-op-btn');
    if (btnA) { btnA.disabled = true; btnA.textContent = '⏳…'; }
    let okA = 0; const errsA = [];
    for (const cid of cids) {
      try { await WB3DB.setAgrementContenant(cid, opState.agrementDecision, opState.notes || null); okA++; }
      catch (e) { console.warn('[WB3 agrement]', cid, e); errsA.push(WB3DB.errMsg ? WB3DB.errMsg(e) : (e?.message || e)); }
    }
    try { await loadCuverieData(); render(); } catch (_) {}
    if (btnA) { btnA.disabled = false; btnA.textContent = '💾 Enregistrer'; }
    if (errsA.length) { toast('Agrément : ' + errsA[0], 'error'); }
    else { toast(`Agrément enregistré sur ${okA} cuve${okA > 1 ? 's' : ''}`, 'success'); closeDetailDrawer(); }
    return;
  }

  const mode = _opMode(opState.type);

  // VERROU métier : interdit l'ajout d'un produit (sulfitage/traitement…) dans
  // une cuve VIDE. Sans lot/volume, il n'y a rien à traiter — l'opération
  // produirait un mouvement de stock sans support œnologique.
  const _hasProduits = (opState.prodRows || []).some(r => r.produit_lot_id);
  if (_hasProduits) {
    const _cibleCids = ((opState.implRows && opState.implRows.length ? opState.implRows : opState.srcRows) || [])
      .filter(r => r.contenant_id).map(r => r.contenant_id);
    const _vides = _cibleCids.filter(cid => {
      const ls = lotsMap.get(cid) || [];
      const vol = ls.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
      return ls.length === 0 || vol <= 0;
    });
    if (_vides.length) {
      const noms = _vides.map(cid => contenants.find(c => c.id === cid)?.nom || cid).join(', ');
      toast(`Ajout de produit impossible : la cuve ${noms} est vide. Réceptionnez un apport ou affectez un lot avant de traiter.`, 'error');
      return;
    }
  }

  // Contenants avec rôles
  const contenantsArr = [];
  if (mode === 'mouvement') {
    // Volume des destinations = volume réellement transféré
    const dstTotal = opState.dstRows.reduce((s, r) => s + (Number(r.volume_hl) || 0), 0);
    // Source : si volume_hl non saisi par l'utilisateur, utiliser la somme des destinations
    // (évite de soustraire le volume total de la cuve au lieu du volume transféré)
    opState.srcRows.forEach(r => {
      if (r.contenant_id) contenantsArr.push({
        contenant_id: r.contenant_id,
        role: 'source',
        volume_hl: r.volume_hl ?? (dstTotal > 0 ? dstTotal : null),
      });
    });
    opState.dstRows.forEach(r => { if (r.contenant_id) contenantsArr.push({ contenant_id: r.contenant_id, role: 'destination', volume_hl: r.volume_hl }); });
  } else {
    opState.implRows.forEach(r => { if (r.contenant_id) contenantsArr.push({ contenant_id: r.contenant_id, role: 'implique', volume_hl: r.volume_hl }); });
  }

  // Lots : auto-détectés avec ventilation par lot pour les sources multi-lots
  const lotsArr = _buildLotsArr(contenantsArr);

  // Validation ventilation manuelle avant sauvegarde
  if (mode === 'mouvement') {
    const dstTotal = opState.dstRows.reduce((s, r) => s + (Number(r.volume_hl)||0), 0);
    for (const srcRow of opState.srcRows) {
      const cid = srcRow.contenant_id;
      if (!cid) continue;
      const srcLots = lotsMap.get(cid) || [];
      if (srcLots.length <= 1) continue;
      const vent = opState.lotVentilation[cid];
      if (!vent || vent.mode !== 'manual') continue;
      const c = contenants.find(x => x.id === cid);
      const opVol = srcRow.volume_hl ?? (dstTotal > 0 ? dstTotal : 0);
      const incomplete = vent.lots.some(vl => vl.volume_hl == null);
      if (incomplete) {
        toast(`Saisissez le volume pour chaque lot de ${c?.nom || 'la cuve'}`, 'error');
        return;
      }
      const manualSum = vent.lots.reduce((s, vl) => s + (Number(vl.volume_hl)||0), 0);
      if (opVol > 0 && Math.abs(manualSum - opVol) > 0.01) {
        toast(`Ventilation manuelle incorrecte pour ${c?.nom || 'la cuve'} : ${fmt(manualSum)} hL saisis ≠ ${fmt(opVol)} hL`, 'error');
        return;
      }
    }
  }

  // Auto-split du RELOGEMENT quand un même lot est présent dans ≥ 2 cuves
  // sources (le backend ne ventile pas par couple lot×contenant en 1 op).
  // On émet N opérations séquentielles (1 par cuve source) vers 1 unique
  // destination. Limites assumées :
  //   - perte d'atomicité : si l'op N°k échoue, les précédentes restent
  //     enregistrées (rapport clair dans le toast) ;
  //   - audit log : N entrées au lieu d'1, regroupées par référence
  //     commune (REL-<ts>-i/N) ;
  //   - cas multi-destinations : non pris en charge (ambigu) → message.
  // Le volume effectivement transféré par cuve source = src.volume_hl
  // (le user saisi ; sinon volume courant total de la source).
  if (_opMode(opState.type) === 'mouvement' && opState.type === 'relogement') {
    const srcWithCid = opState.srcRows.filter(r => r.contenant_id);
    const lotCount = new Map();
    srcWithCid.forEach(r => (lotsMap.get(r.contenant_id) || []).forEach(l => {
      lotCount.set(l.id, (lotCount.get(l.id) || 0) + 1);
    }));
    const needSplit = [...lotCount.values()].some(n => n >= 2);
    if (needSplit) {
      const dstRowsCid = opState.dstRows.filter(r => r.contenant_id);
      if (dstRowsCid.length !== 1) {
        toast('Relogement multi-sources (même lot) : une seule cuve destination est supportée. Décompose en plusieurs opérations sinon.', 'error');
        return;
      }
      const dst = dstRowsCid[0];
      const btn0 = document.getElementById('dd-save-op-btn');
      if (btn0) { btn0.disabled = true; btn0.textContent = '⏳…'; }
      const sharedRef = ((opState.reference || 'REL').trim() || 'REL') + '-' + Date.now().toString(36);
      const total = srcWithCid.length;
      let okCount = 0; const errs = [];
      for (let i = 0; i < total; i++) {
        const src = srcWithCid[i];
        const srcVol = src.volume_hl != null ? Number(src.volume_hl) : null;
        const cArr = [
          { contenant_id: src.contenant_id, role: 'source',      volume_hl: srcVol },
          { contenant_id: dst.contenant_id, role: 'destination', volume_hl: srcVol },
        ];
        const lArr = _buildLotsArr(cArr);
        const opP = {
          type_operation: 'relogement',
          date_operation: opState.date,
          statut:         opState.statut,
          operateur:      opState.operateur || null,
          reference:      `${sharedRef}-${i+1}/${total}`,
          notes:          _buildOpNotes(`[split relogement ${i+1}/${total} multi-sources même lot]`),
        };
        try {
          await WB3DB.saveOperationGraphAtomic(opP, { lots: lArr, contenants: cArr, produits: [] });
          okCount++;
          await refreshContenantLocal(src.contenant_id);
          await refreshContenantLocal(dst.contenant_id);   // état frais pour l'op suivante
        } catch(e) {
          errs.push({ src: src.contenant_id, msg: e?.message || String(e) });
          console.warn('[WB3 split relogement]', src.contenant_id, e);
        }
      }
      // Renommage facultatif du lot dest (même règle que branche normale)
      if (okCount > 0 && (dst.lotNom || '').trim()) {
        try {
          await refreshContenantLocal(dst.contenant_id);
          const lotsInDst = lotsMap.get(dst.contenant_id) || [];
          if (lotsInDst.length === 1) {
            await WB3DB.updateRow('lots', lotsInDst[0].id, { nom: dst.lotNom.trim() });
          } else if (lotsInDst.length > 1) {
            toast(`Cuve dest avec ${lotsInDst.length} lots — renommage non appliqué`, 'error');
          }
        } catch(e) {
          toast('Renommage lot dest impossible : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e?.message || e)), 'error');
        }
      }
      if (errs.length) {
        toast(`Relogement split : ${okCount}/${total} enregistré(s), ${errs.length} échec(s) — voir console.`, 'error');
      } else {
        toast(`Relogement enregistré (split en ${total} ops, réf ${sharedRef})`, 'success');
        closeDetailDrawer();
      }
      if (btn0) { btn0.disabled = false; btn0.textContent = '💾 Enregistrer'; }
      return;
    }
  }

  const btn = document.getElementById('dd-save-op-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }

  try {
    if (opState.type === 'analyse') {
      // Sauvegarde dans la table analyses
      const implCid    = opState.implRows[0]?.contenant_id || null;
      const lotsInCuve = implCid ? (lotsMap.get(implCid) || []) : [];
      // Lot : choix explicite si multi-lots, auto si mono-lot, null si vide
      const chosenId = opState.analyse._chosen_lot_id;
      const lotId = chosenId === '__none__' ? null : (chosenId || (lotsInCuve.length === 1 ? lotsInCuve[0].id : null));
      if (lotsInCuve.length > 1 && !chosenId) {
        toast('Choisissez le lot concerné ou "Analyse contenant uniquement"', 'error');
        if (btn) { btn.disabled = false; btn.textContent = '💾 Enregistrer'; }
        return;
      }
      // Extraire les champs analytiques (hors clés internes)
      const { _chosen_lot_id, ...analyseFields } = opState.analyse;
      await WB3DB.insertRow('analyses', {
        date_analyse: opState.date,
        contenant_id: implCid,
        lot_id:       lotId,
        notes:        opState.notes || null,
        ...Object.fromEntries(Object.entries(analyseFields).filter(([, v]) => v != null)),
      });
    } else {
      const opPayload = {
        type_operation: opState.type,
        date_operation: opState.date,
        statut:         opState.statut,
        operateur:      opState.operateur || null,
        reference:      opState.reference || null,
        notes:          _buildOpNotes(),     // préfixe les motifs d'écarts (Espace libre / Perte) si renseignés
      };
      // Filtre quantité > 0 : pas de operation_produits inutile (produit
      // sélectionné sans quantité saisie) → bruit + aucun décrément stock.
      const produitsArr = opState.prodRows
        .filter(r => r.produit_lot_id && Number(r.quantite) > 0)
        .map(r => ({ produit_lot_id: r.produit_lot_id, quantite: r.quantite, unite: r.unite || null }));

      // R1+R2 — Garde-fou DLUO expirée et dose > dose_max.
      // Confirm() non bloquant (compromis ; l'opérateur peut forcer). Si
      // l'opérateur accepte malgré l'avertissement, on TRACE la dérogation
      // dans les notes (preuve auditable « l'opérateur a confirmé »).
      {
        const todayStr = new Date().toISOString().slice(0, 10);
        const warns = [];
        const volTotalOp = (opState.implRows || []).reduce((s, r) => s + (Number(r.volume_hl)||0), 0)
                       || (opState.dstRows || []).reduce((s, r) => s + (Number(r.volume_hl)||0), 0);
        for (const pr of produitsArr) {
          const pl = (_opDataCache?.allProduits || []).find(x => x.id === pr.produit_lot_id);
          if (!pl) continue;
          const pc = pl.produits_catalogue;
          if (pl.dluo && pl.dluo < todayStr) {
            warns.push(`${pc?.nom||'?'} DLUO expirée (${pl.dluo})`);
          }
          if (pc?.dose_max != null && pc.concentration != null && pr.quantite > 0 && volTotalOp > 0) {
            const gActif = Number(pr.quantite) * Number(pc.concentration);
            const mgL = (gActif / (volTotalOp * 100)) * 1000;
            if (mgL > Number(pc.dose_max)) {
              warns.push(`${pc.nom} dose ${mgL.toFixed(1)} mg/L > max ${pc.dose_max}`);
            }
          }
        }
        if (warns.length) {
          if (!(await WB3UI.confirm('Points d\'attention sur cette opération :\n\n' + warns.map(w => '⚠ ' + w).join('\n') + '\n\nContinuer quand même ?', { title:'Points d\'attention', okText:'Continuer' }))) {
            if (btn) { btn.disabled = false; btn.textContent = '💾 Enregistrer'; }
            return;
          }
          // Dérogation acceptée → trace auditable dans les notes
          opPayload.notes = '[Dérogation acceptée : ' + warns.join(' ; ') + ']'
                          + (opPayload.notes ? ' — ' + opPayload.notes : '');
        }
      }

      // Preuve dose par cuve (T8-A) : si l'opérateur a saisi des doses par
      // cuve, on persiste le détail dans les notes (le payload backend ne
      // garde que la quantité totale agrégée par produit). Preuve lisible
      // pour audit/contrôle réglementaire.
      {
        const perCuveProof = [];
        for (const pr of (opState.prodRows || [])) {
          if (!pr.produit_lot_id || !pr.perCuveDoses) continue;
          const pl = (_opDataCache?.allProduits || []).find(x => x.id === pr.produit_lot_id);
          const pcNom = pl?.produits_catalogue?.nom || '?';
          const entries = Object.entries(pr.perCuveDoses).filter(([, d]) => d !== '' && d != null);
          if (!entries.length) continue;
          const detail = entries.map(([cid, dose]) => {
            const c = contenants.find(x => x.id === cid);
            return `${c?.nom || cid} ${dose} g/hL`;
          }).join(', ');
          perCuveProof.push(`${pcNom}: ${detail}`);
        }
        if (perCuveProof.length) {
          opPayload.notes = (opPayload.notes ? opPayload.notes + ' ' : '')
                          + '[Dose par cuve · ' + perCuveProof.join(' | ') + ']';
        }
      }

      // Phase 2 multi-lots → assemblage. Détection sur op réalisée de type
      // source/dest dont au moins une destination contient déjà un AUTRE lot
      // que les lots traités. Modal de décision ; si "assemblage" → on
      // sauvegarde l'op puis on ouvre directement _openConvertAssemblageModal
      // sur la cuve dst (on est déjà sur cuverie, pas besoin de redirection).
      const _PHASE2_TYPES_OP = new Set(['soutirage','transfert','relogement','filtration','ecoulage']);
      let _pendingConvCid = null;
      if (opPayload.statut === 'realise' && _PHASE2_TYPES_OP.has(opPayload.type_operation)) {
        const dstRows = contenantsArr.filter(r => r.role === 'destination' && r.contenant_id);
        // Les lots "qui arrivent" dans la destination = ceux actuellement
        // dans les cuves SOURCES. Note : _buildLotsArr met role='traite' sur
        // tous les lots des cuves impliquées (sources + destinations), donc
        // on NE peut PAS dériver via lotsArr.filter(role !== 'destination').
        // On part directement de contenantsArr.role='source' → lotsMap.
        const srcContIds = contenantsArr
          .filter(r => r.role === 'source' && r.contenant_id)
          .map(r => r.contenant_id);
        const arrivingIds = new Set();
        srcContIds.forEach(cid => {
          (lotsMap.get(cid) || []).forEach(l => arrivingIds.add(l.id));
        });
        for (const dst of dstRows) {
          try {
            const existing = await WB3DB.listTable('lot_contenants', {
              select: 'id, lot_id, volume_hl, lots(id, nom, statut, millesime)',
              filter: { contenant_id: dst.contenant_id },
            });
            // "autres lots" = lots déjà dans la dst MAIS qui ne viennent
            // pas des sources (sinon ce sont les mêmes lots qui se posent).
            const otherLots = (existing || []).filter(lc =>
              lc.lots && !arrivingIds.has(lc.lot_id)
            );
            if (otherLots.length) {
              const cuveNom = (contenants.find(c => c.id === dst.contenant_id) || {}).nom || '?';
              const arrivingNames = [];
              srcContIds.forEach(cid => {
                (lotsMap.get(cid) || []).forEach(l => {
                  if (!arrivingNames.includes(l.nom)) arrivingNames.push(l.nom);
                });
              });
              const lotsTraiteTxt = arrivingNames.join(', ') || '?';
              const lotsExistTxt = otherLots.map(lc =>
                lc.lots.nom + (lc.lots.millesime ? ' ' + lc.lots.millesime : '') + ` (${lc.volume_hl ?? '?'} hL)`
              ).join(', ');
              const choix = await _cuvAskAssemblageDecision({
                cuveNom, lotsTraiteTxt, lotsExistTxt, nbOther: otherLots.length,
                typeLabel: (opPayload.type_operation || '').replace(/_/g,' '),
              });
              if (choix === 'cancel') {
                if (btn) { btn.disabled = false; btn.textContent = '💾 Enregistrer'; }
                return;
              }
              if (choix === 'assemblage') _pendingConvCid = dst.contenant_id;
            }
          } catch (e) {
            console.warn('[WB3 cuverie] Phase 2 detect KO :', e);
          }
        }
      }

      await WB3DB.saveOperationGraphAtomic(opPayload, { lots: lotsArr, contenants: contenantsArr, produits: produitsArr });

      // Phase 2 — déclenche directement la conversion d'assemblage sur la
      // cuve dst désignée (on est déjà sur cuverie, pas de redirection).
      // 250 ms laisse le temps au reload de propager le nouveau lot_contenants.
      if (_pendingConvCid) {
        setTimeout(async () => {
          try { await loadCuverieData(); render(); } catch (_) {}
          _openConvertAssemblageModal(_pendingConvCid);
        }, 250);
      }

      // Renommage / Scission du lot présent dans chaque cuve destination.
      // L'op est déjà sauvée — les erreurs ici ne doivent PAS la faire
      // remonter comme échec (chaque rename est try/catch isolé).
      //
      // Sémantique métier (corrigée) :
      //   • Si le lot existe encore dans une AUTRE cuve (soutirage/transfert
      //     partiel) → SCISSION : crée un nouveau lot avec le nom saisi,
      //     copie les métadonnées du lot source (couleur, millésime,
      //     statut, etc.), repointe la ligne lot_contenants destination
      //     vers le nouveau lot (DELETE+INSERT pour que les triggers
      //     volume_actuel_hl + history se déclenchent proprement), crée
      //     un lien filiation (parent = lot source).
      //   • Sinon (op totale, lot quitte la source) → RENAME pur :
      //     updateRow lots.nom (le lot est unique, le rename est sûr).
      //
      // Limites assumées :
      //   • Si la cuve dst contient plusieurs lots après l'op (cas exotique
      //     ex: cuve déjà occupée par un lot et arrivée d'un autre) → skip
      //     avec toast (ambigu, l'utilisateur doit choisir manuellement).
      const renames = opState.dstRows.filter(r => r.contenant_id && (r.lotNom || '').trim());
      for (const r of renames) {
        try {
          await refreshContenantLocal(r.contenant_id);     // recharge l'état réel post-op
          const lotsInDst = lotsMap.get(r.contenant_id) || [];
          if (lotsInDst.length === 0) continue;             // rien à renommer
          if (lotsInDst.length > 1) {
            toast(`Cuve destination avec ${lotsInDst.length} lots — renommage/scission non appliqué (ambigu)`, 'error');
            continue;
          }

          const lotDst = lotsInDst[0];      // objet enrichi par refreshContenantLocal
          const newNom = r.lotNom.trim();

          // Détecter si le lot existe encore ailleurs (= scission requise).
          // listTable filtre RLS + tenant ; on compte les contenants autres
          // que la destination courante.
          const otherRows = await WB3DB.listTable('lot_contenants', {
            select: 'id, contenant_id, volume_hl',
            filter: { lot_id: lotDst.id },
          });
          const remainingElsewhere = (otherRows || [])
            .filter(lc => lc.contenant_id !== r.contenant_id);
          const dstRow = (otherRows || [])
            .find(lc => lc.contenant_id === r.contenant_id);

          if (remainingElsewhere.length === 0) {
            // RENAME pur — le lot n'existe plus que dans cette cuve.
            await WB3DB.updateRow('lots', lotDst.id, { nom: newNom });
          } else if (dstRow) {
            // SCISSION — via RPC wb3_scission_lot (mig 086, P6) : nouveau
            // lot (numéro auto, hérite des caractéristiques), repointage
            // de la cuve, filiation 'manual' ET couple sortie/entrée
            // journalisé dans lot_mouvements — le tout atomique.
            // (Remplace le repointage DELETE+INSERT client-side, devenu
            // impossible depuis le scellement de lot_contenants.)
            await WB3DB.scissionLot(lotDst.id, r.contenant_id, newNom);
            toast(`Scission : nouveau lot « ${newNom} » créé · filiation depuis ${lotDst.nom}`, 'success');
          }
        } catch(e) {
          console.warn('[WB3] rename/scission lot dst:', e);
          toast('Renommage/scission impossible : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e?.message || e)), 'error');
        }
      }

      // ── Machine à états lots (cuverie) — proposer transitions de statut
      // après l'opération. Aligné avec operations.html LOT_TRANSITIONS.
      // Cas concret : soutirage d'un lot en FA → proposer FML ou Élevage.
      // On lit les lots impliqués FRESH (refresh court-circuite tout cache
      // local potentiellement stale) puis on ouvre la modal si match.
      try {
        await _cuverieMaybeShowTransitions(opState.type, lotsArr);
      } catch (eTr) {
        console.warn('[WB3] machine à états transitions :', eTr);
      }
    }
    toast('Enregistré', 'success');
    closeDetailDrawer();
  } catch(e) {
    console.error('[WB3] saveOpForm:', e);
    toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Enregistrer'; }
  }
}

// ============================================================
// Machine à états lots — transitions de statut post-opération
// ------------------------------------------------------------
// Aligné avec operations.html (mêmes règles, même UI modal). Triggered
// après saveOpForm() pour proposer à l'utilisateur d'appliquer la
// transition naturelle (ex: soutirage sur lot FA → FML ou Élevage).
// Lit le statut FRESH des lots concernés (pas de cache local stale).
// ============================================================
const CUV_LOT_TRANSITIONS = {
  pressoir:          { from: new Set(['vendange']),                                                    to: 'mout',          toLabel: 'Moût' },
  enzymage:          { from: new Set(['vendange', 'mout']),                                            to: 'mout_debourbe', toLabel: 'Moût (débourbage)' },
  levurage:          { from: new Set(['mout', 'mout_stabule', 'mout_debourbe']),                       to: 'fa',            toLabel: 'Fermentation alcoolique' },
  ecoulage:          { from: new Set(['fa']),                                                          to: 'vin',           toLabel: 'Vin jeune' },
  malo:              { from: new Set(['vin', 'elevage']),                                              to: 'fml',           toLabel: 'FML en cours' },
  soutirage:         { from: new Set(['fml', 'vin', 'mout', 'fa']),                                    to: 'elevage',       toLabel: 'Élevage' },
  filtration:        { from: new Set(['vin', 'fml', 'elevage']),                                       to: 'vin_filtre',    toLabel: 'Vin filtré' },
  mise_en_bouteille: { from: new Set(['vin', 'fml', 'elevage', 'vin_filtre', 'pre_mise']),             to: 'conditionne',   toLabel: 'Conditionné' },
  sortie_lot:        { from: new Set(['vin','elevage','vin_filtre','conditionne','pre_mise','mout']),  to: 'sorti',         toLabel: 'Sorti' },
};
// Choix alternatifs : soutirage d'un lot en FA = signal de fin de FA.
// FA → FML (rouge, malo prévue) OU FA → Élevage (saute la malo).
const CUV_LOT_TRANSITION_CHOICES = {
  soutirage: {
    fa: [
      { to: 'fml',     toLabel: 'FML en cours' },
      { to: 'elevage', toLabel: 'Élevage (sans FML)' },
    ],
  },
};
const CUV_LOT_STATUT_LABELS = {
  vendange:'Vendange', mout:'Moût', mout_stabule:'Moût stabulé', mout_debourbe:'Moût débourbé',
  fa:'Fermentation alc.', fml:'FML', vin:'Vin', vin_filtre:'Vin filtré',
  elevage:'Élevage', pre_mise:'Pré-mise', conditionne:'Conditionné', sorti:'Sorti',
};

async function _cuverieMaybeShowTransitions(typeVal, lotsArr) {
  const rule = CUV_LOT_TRANSITIONS[typeVal];
  if (!rule) return;
  // Lots impliqués hors destination (les destinations sont les nouveaux
  // contenants qui reçoivent — le changement de statut concerne les lots
  // qui ont été traités/soutirés/etc.).
  const impactedIds = [...new Set(
    (lotsArr || [])
      .filter(l => l.lot_id && l.role !== 'destination')
      .map(l => l.lot_id)
  )];
  if (!impactedIds.length) return;

  // Fetch FRESH : statut en cache via lotsMap peut être périmé (mini-form
  // FA modifie le lot sans propager dans lotsMap). On lit chaque lot
  // directement en DB (listTable n'a pas .in() → boucle parallèle).
  const lotsFresh = (await Promise.all(impactedIds.map(id =>
    WB3DB.listTable('lots', { select: 'id, nom, statut', filter: { id }, limit: 1 })
      .then(rows => rows?.[0]).catch(() => null)
  ))).filter(Boolean);

  const suggestions = lotsFresh.map(lot => {
    if (!rule.from.has(lot.statut)) return null;
    const choices = CUV_LOT_TRANSITION_CHOICES[typeVal]?.[lot.statut];
    if (choices && choices.length) return { lot, choices };
    return { lot, to: rule.to, toLabel: rule.toLabel };
  }).filter(Boolean);

  if (!suggestions.length) return;
  _cuverieShowTransitionModal(suggestions, typeVal);
}

function _cuverieShowTransitionModal(suggestions, typeVal) {
  document.getElementById('wb3-cuv-transition-modal')?.remove();
  const opLabel = (typeVal || '').replace(/_/g, ' ');

  const rows = suggestions.map(s => {
    if (s.choices && s.choices.length) {
      const lotId = s.lot.id;
      const fromStatut = escapeHtml(CUV_LOT_STATUT_LABELS[s.lot.statut] || s.lot.statut);
      const radios = s.choices.map((c, i) => `
        <label style="display:inline-flex;align-items:center;gap:5px;font-size:var(--text-caption);
                      padding:4px 9px;background:var(--color-bg-subtle);border-radius:var(--radius-pill);
                      cursor:pointer;border:1px solid var(--color-border)">
          <input type="radio" name="cuv-tr-${lotId}" value="${c.to}" ${i === 0 ? 'checked' : ''}>
          ${escapeHtml(c.toLabel)}
        </label>`).join(' ');
      return `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;
                    border:1px solid var(--color-border);border-radius:var(--radius-md);
                    background:var(--color-bg-elevated);cursor:pointer;margin-bottom:6px">
        <input type="checkbox" data-lot-id="${lotId}" data-choice-group="cuv-tr-${lotId}"
               checked style="flex-shrink:0;margin-top:3px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:var(--text-callout)">${escapeHtml(s.lot.nom)}</div>
          <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-bottom:6px">
            ${fromStatut} <span style="margin:0 4px">→</span>
            <span style="color:var(--color-accent);font-weight:600">choisir :</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap" onclick="event.stopPropagation()">${radios}</div>
        </div>
      </label>`;
    }
    return `
    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                  border:1px solid var(--color-border);border-radius:var(--radius-md);
                  background:var(--color-bg-elevated);cursor:pointer;margin-bottom:6px">
      <input type="checkbox" data-lot-id="${s.lot.id}" data-to="${s.to}" checked style="flex-shrink:0">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:var(--text-callout)">${escapeHtml(s.lot.nom)}</div>
        <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">
          ${escapeHtml(CUV_LOT_STATUT_LABELS[s.lot.statut] || s.lot.statut)}
          <span style="margin:0 4px">→</span>
          <span style="color:var(--color-accent);font-weight:600">${escapeHtml(s.toLabel)}</span>
        </div>
      </div>
    </label>`;
  }).join('');

  const el = document.createElement('div');
  el.id = 'wb3-cuv-transition-modal';
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:600;
                display:flex;align-items:flex-end;justify-content:center"
         onclick="if(event.target===this)document.getElementById('wb3-cuv-transition-modal')?.remove()">
      <div style="background:var(--color-bg-elevated);border-radius:16px 16px 0 0;padding:var(--space-6);max-width:520px;
                  width:100%;box-shadow:0 -8px 32px rgba(0,0,0,.18);max-height:80vh;overflow-y:auto">
        <div style="font-weight:700;font-size:16px;margin-bottom:var(--space-1)">🔄 Transition de statut suggérée</div>
        <div style="font-size:var(--text-caption);color:var(--color-ink-secondary);margin-bottom:var(--space-4)">
          Opération « ${escapeHtml(opLabel)} » — cochez les lots à mettre à jour :
        </div>
        <div>${rows}</div>
        <div style="display:flex;gap:var(--space-2);justify-content:flex-end;
                    padding-top:var(--space-4);border-top:1px solid var(--color-border);margin-top:var(--space-2)">
          <button class="btn btn--secondary"
                  onclick="document.getElementById('wb3-cuv-transition-modal')?.remove()">Ignorer</button>
          <button class="btn" onclick="_cuverieApplyTransitions()">✅ Appliquer</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
}

async function _cuverieApplyTransitions() {
  const modal = document.getElementById('wb3-cuv-transition-modal');
  if (!modal) return;
  const checked = [...modal.querySelectorAll('input[type="checkbox"]:checked')];
  if (!checked.length) { modal.remove(); return; }
  let ok = 0;
  for (const cb of checked) {
    try {
      let to = cb.dataset.to;
      if (!to && cb.dataset.choiceGroup) {
        const r = modal.querySelector(`input[name="${cb.dataset.choiceGroup}"]:checked`);
        to = r?.value;
      }
      if (!to) continue;
      await WB3DB.updateRow('lots', cb.dataset.lotId, { statut: to });
      ok++;
    } catch (e) {
      console.warn('[WB3 cuv-tr] update statut KO :', e);
      toast('Erreur transition : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e?.message || e)), 'error');
    }
  }
  modal.remove();
  if (ok) {
    toast(`${ok} lot${ok > 1 ? 's' : ''} mis à jour`, 'success');
    // Rafraîchir l'état cuverie pour refléter le nouveau statut
    // (impacte les badges, les quick-actions, le mini-form FA, etc.).
    try { await loadCuverieData(); render(); } catch (_) {}
  }
}

// ============================================================
// Phase 2 — Modal de décision opération vers cuve déjà occupée.
// Pattern identique à apports.html / operations.html. Retourne
// 'assemblage' | 'multi' | 'cancel' via Promise.
// ============================================================
function _cuvAskAssemblageDecision({ cuveNom, lotsTraiteTxt, lotsExistTxt, nbOther, typeLabel }) {
  return new Promise((resolve) => {
    document.getElementById('wb3-cuv-ask-asm')?.remove();
    const el = document.createElement('div');
    el.id = 'wb3-cuv-ask-asm';
    const finish = (choix) => { el.remove(); resolve(choix); };
    el.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:800;
                  display:flex;align-items:center;justify-content:center;padding:var(--space-4)">
        <div style="background:var(--color-bg-elevated, #fff);border-radius:12px;padding:var(--space-5);
                    max-width:540px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.25)">
          <div style="font-weight:700;font-size:var(--text-title-2);margin-bottom:var(--space-2)">🔀 Cuve destination déjà occupée</div>
          <div style="font-size:var(--text-footnote);color:#555;margin-bottom:14px;line-height:1.55">
            Opération <b>${escapeHtml(typeLabel)}</b> vers la cuve <b>${escapeHtml(cuveNom)}</b>.<br>
            Lot(s) traité(s) : <b>${escapeHtml(lotsTraiteTxt)}</b>.<br>
            La cuve contient déjà ${nbOther} autre${nbOther>1?'s':''} lot${nbOther>1?'s':''} :<br>
            <span style="color:#888">${escapeHtml(lotsExistTxt)}</span><br><br>
            Comment veux-tu gérer la cohabitation ?
          </div>
          <div style="display:flex;flex-direction:column;gap:var(--space-2)">
            <button class="btn" id="cuv-ask-go"
              style="text-align:left;padding:12px 14px;line-height:1.4">
              <b>🔀 Créer un assemblage</b><br>
              <span style="font-size:var(--text-caption);opacity:.75">L'opération est enregistrée, puis je propose la fusion automatique (recommandé)</span>
            </button>
            <button class="btn btn--secondary" id="cuv-ask-multi"
              style="text-align:left;padding:12px 14px;line-height:1.4">
              <b>⚠ Garder en multi-lots</b><br>
              <span style="font-size:var(--text-caption);opacity:.75">Cohabitation acceptée. Conversion possible plus tard via 🔀 sur la cuve.</span>
            </button>
            <button type="button" id="cuv-ask-cancel"
              style="text-align:left;padding:12px 14px;line-height:1.4;border:1.5px solid #b91c1c;background:#fef2f2;color:#7f1d1d;border-radius:var(--radius-sm);cursor:pointer;font-family:inherit">
              <b>✕ Annuler l'opération</b><br>
              <span style="font-size:var(--text-caption);opacity:.85">Retour au formulaire, rien n'est sauvegardé.</span>
            </button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#cuv-ask-go').onclick     = () => finish('assemblage');
    el.querySelector('#cuv-ask-multi').onclick  = () => finish('multi');
    el.querySelector('#cuv-ask-cancel').onclick = () => finish('cancel');
    el.firstElementChild.onclick = (ev) => { if (ev.target === ev.currentTarget) finish('cancel'); };
  });
}

// ============================================================
// Multi-lots → Assemblage (Phase 0 du sprint Option A)
// ------------------------------------------------------------
// Cuve avec ≥ 2 lots distincts = situation legacy (cas Richemer : A1-06,
// A1-08 avec Chardonnay + Vermentino). L'opérateur convertit cette
// co-habitation en un VRAI assemblage : un nouveau lot avec filiation
// vers les lots parents, les lots parents disparaissent de cette cuve
// (préservés ailleurs s'ils ont d'autres affectations cuves), nouveau
// lot prend tout le volume.
//
// Chemin durci utilisé : wb3_save_operation_graph type=assemblage
// (mig 035+037+038) → applique automatiquement filiation + lot_mouvements
// + DELETE/INSERT lot_contenants. Aucune écriture directe.
// ============================================================
async function _openConvertAssemblageModal(cuveId) {
  const c = contenants.find(x => x.id === cuveId);
  const lots = lotsMap.get(cuveId) || [];
  if (!c || lots.length < 2) {
    toast('Conversion possible uniquement sur cuve avec ≥ 2 lots.', 'error');
    return;
  }
  document.getElementById('wb3-asm-modal')?.remove();

  const volTotal = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const sourcesHtml = lots.map(l => {
    const [bg, fg] = (LOT_STATUT_COLORS[l.statut] || '#eee|#555').split('|');
    return `<div style="display:flex;align-items:center;gap:var(--space-2);padding:6px 10px;background:var(--color-bg-subtle);border-radius:var(--radius-sm);margin-bottom:var(--space-1)">
      <span style="background:${bg};color:${fg};padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;flex-shrink:0">${LOT_STATUT_SHORT[l.statut]||l.statut}</span>
      <span style="flex:1;font-weight:500">${LOT_COULEUR_DOT[l.couleur]||''} ${escapeHtml(l.nom)}${l.millesime ? ' · ' + l.millesime : ''}</span>
      <span style="font-variant-numeric:tabular-nums;color:var(--color-ink-tertiary)">${fmt(l.volume_hl)} hL</span>
    </div>`;
  }).join('');

  const statutOpts = Object.keys(LOT_STATUT_SHORT).map(s =>
    `<option value="${s}">${escapeHtml(LOT_STATUT_SHORT[s])}</option>`).join('');

  // Hétérogénéité de statut → avertissement (Q2 défaut accepté).
  const uniqStatuts = [...new Set(lots.map(l => l.statut).filter(Boolean))];
  const warnHetero = uniqStatuts.length > 1 ? `
    <div style="margin-bottom:var(--space-2);padding:8px 12px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:var(--radius-sm);color:#92400e;font-size:var(--text-footnote)">
      ⚠ <b>Statuts hétérogènes</b> — ${uniqStatuts.map(s => LOT_STATUT_SHORT[s] || s).join(' + ')}. Choisis le statut du nouveau lot avec soin.
    </div>` : '';

  // Couleur dominante (par volume) : pré-sélection du radio.
  const colorByVol = new Map();
  lots.forEach(l => { if (l.couleur) colorByVol.set(l.couleur, (colorByVol.get(l.couleur)||0) + (Number(l.volume_hl)||0)); });
  const dominantColor = [...colorByVol.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || 'rouge';

  // Millésime majoritaire par volume (pour pré-remplir).
  const milByVol = new Map();
  lots.forEach(l => { if (l.millesime) milByVol.set(l.millesime, (milByVol.get(l.millesime)||0) + (Number(l.volume_hl)||0)); });
  const dominantMil = [...milByVol.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] || new Date().getFullYear();

  const el = document.createElement('div');
  el.id = 'wb3-asm-modal';
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:700;
                display:flex;align-items:center;justify-content:center;padding:var(--space-4)"
         onclick="if(event.target===this)document.getElementById('wb3-asm-modal')?.remove()">
      <div style="background:var(--color-bg-elevated);border-radius:var(--radius-lg);padding:var(--space-5);
                  max-width:560px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.25);max-height:90vh;overflow-y:auto">
        <div style="font-weight:700;font-size:18px;margin-bottom:var(--space-1)">🔀 Convertir ${escapeHtml(c.nom)} en assemblage</div>
        <div style="font-size:var(--text-caption);color:var(--color-ink-secondary);margin-bottom:var(--space-4)">
          ${lots.length} lots actuels → 1 nouveau lot d'assemblage, volume total ${fmt(volTotal)} hL. Les lots parents seront référencés via filiation.
        </div>
        ${warnHetero}
        <div style="margin-bottom:var(--space-2);font-size:var(--text-caption);color:var(--color-ink-tertiary);text-transform:uppercase;letter-spacing:.4px;font-weight:600">Lots sources</div>
        ${sourcesHtml}
        <div style="margin:var(--space-3) 0 var(--space-2);font-size:var(--text-caption);color:var(--color-ink-tertiary);text-transform:uppercase;letter-spacing:.4px;font-weight:600">Nouveau lot d'assemblage</div>
        <div style="display:grid;grid-template-columns:1fr 120px;gap:var(--space-2);margin-bottom:var(--space-2)">
          <input class="input" id="asm-nom" type="text" placeholder="Nom (ex: Assemblage A1-06 ${dominantMil})" required>
          <input class="input" id="asm-mil" type="number" min="1900" max="2099" value="${dominantMil}" placeholder="Millésime">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin-bottom:var(--space-2)">
          <label style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">Statut <span style="color:var(--color-danger)">*</span></span>
            <select class="select" id="asm-statut" required>
              <option value="">— Choisir —</option>
              ${statutOpts}
            </select>
          </label>
          <label style="display:flex;flex-direction:column;gap:2px">
            <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">Couleur</span>
            <select class="select" id="asm-couleur">
              <option value="rouge" ${dominantColor==='rouge'?'selected':''}>🔴 Rouge</option>
              <option value="blanc" ${dominantColor==='blanc'?'selected':''}>⚪ Blanc</option>
              <option value="rose"  ${dominantColor==='rose' ?'selected':''}>🌸 Rosé</option>
              <option value="gris"  ${dominantColor==='gris' ?'selected':''}>🩶 Gris</option>
            </select>
          </label>
        </div>
        <textarea class="input" id="asm-notes" rows="2" placeholder="Notes (optionnel)" style="width:100%;font-family:inherit"></textarea>
        <div style="display:flex;gap:var(--space-2);justify-content:flex-end;
                    padding-top:var(--space-3);border-top:1px solid var(--color-border);margin-top:var(--space-3)">
          <button class="btn btn--secondary"
                  onclick="document.getElementById('wb3-asm-modal')?.remove()">Annuler</button>
          <button class="btn" id="asm-go"
                  onclick="_submitConvertAssemblage('${cuveId}')">🔀 Lancer l'assemblage</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => document.getElementById('asm-nom')?.focus(), 50);
}

async function _submitConvertAssemblage(cuveId) {
  const c = contenants.find(x => x.id === cuveId);
  const lots = lotsMap.get(cuveId) || [];
  if (!c || lots.length < 2) { toast('État changé, conversion annulée', 'error'); return; }

  const nom     = document.getElementById('asm-nom').value.trim();
  const millesime = parseInt(document.getElementById('asm-mil').value, 10) || null;
  const statut  = document.getElementById('asm-statut').value;
  const couleur = document.getElementById('asm-couleur').value;
  const notes   = document.getElementById('asm-notes').value.trim() || null;

  if (!nom)    { toast('Nom obligatoire', 'error'); return; }
  if (!statut) { toast('Statut obligatoire (choix opérateur)', 'error'); return; }

  const btn = document.getElementById('asm-go');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Assemblage en cours…'; }

  const volTotal = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const newLotPayload = {
    nom, couleur, statut, millesime,
    notes: notes || ('Assemblage de ' + lots.map(l => l.nom).join(' + ')),
    reference: 'CONV-' + c.nom + '-' + Date.now().toString(36),
  };
  // Socle 4 (mig 055) : le volume est RECALCULÉ côté SQL depuis lot_contenants.
  // On n'envoie plus que lot_id (volume_hl front ignoré, anti-falsification).
  const sourceLots = lots.map(l => ({ lot_id: l.id }));

  try {
    // Voie privilégiée : RPC atomique (mig 051/055) → création lot + op
    // assemblage dans UNE transaction. Aucun lot orphelin si échec.
    const res = await WB3DB.convertMultilotToAssemblage(cuveId, newLotPayload, sourceLots);
    const volReel = (res && res.volume_total_hl != null) ? Number(res.volume_total_hl) : volTotal;

    document.getElementById('wb3-asm-modal')?.remove();
    toast(`Assemblage créé : ${nom} (${fmt(volReel)} hL, ${lots.length} lots fusionnés)`, 'success');
    await loadCuverieData();
    render();
  } catch (e) {
    if (e?.code === 'PGRST202' && window.WB3_DEV_MODE) {
      // Fallback DEV uniquement (WB3_DEV_MODE) : RPC 051 pas encore
      // appliquée. Ancien flux JS MAIS avec rollback explicite (suppression
      // du lot si l'op assemblage échoue). Niveau de garantie inférieur à la
      // transaction SQL (best-effort). En prod, convertMultilotToAssemblage
      // lève déjà une erreur bloquante (requireCapability) → on n'arrive
      // jamais ici sans WB3_DEV_MODE.
      console.warn('[WB3-DEV convert] RPC 051 introuvable, fallback JS rollback (WB3_DEV_MODE=true)');
      let createdLotId = null;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const newLot = await WB3DB.insertRow('lots', {
          nom, couleur, statut, millesime,
          volume_initial_hl: volTotal,
          volume_actuel_hl:  volTotal,
          date_entree:       today,
          notes:             newLotPayload.notes,
        });
        if (!newLot?.id) throw new Error('Création du nouveau lot échouée');
        createdLotId = newLot.id;

        const lotsPayload = [
          ...lots.map(l => ({ lot_id: l.id, role: 'source', volume_hl: l.volume_hl })),
          { lot_id: newLot.id, role: 'destination', volume_hl: volTotal },
        ];
        const contenantsPayload = [
          { contenant_id: cuveId, role: 'source',      volume_hl: volTotal },
          { contenant_id: cuveId, role: 'destination', volume_hl: volTotal },
        ];
        await WB3DB.saveOperationGraphAtomic({
          type_operation:  'assemblage',
          date_operation:  today,
          heure_operation: new Date().toTimeString().slice(0, 5),
          statut:          'realise',
          reference:       newLotPayload.reference,
          notes:           'Conversion legacy multi-lots → assemblage. Lots fusionnés : '
                           + lots.map(l => l.nom).join(' + '),
        }, { opId: null, lots: lotsPayload, contenants: contenantsPayload, produits: [] });

        document.getElementById('wb3-asm-modal')?.remove();
        toast(`Assemblage créé : ${nom} (${fmt(volTotal)} hL, ${lots.length} lots fusionnés)`, 'success');
        await loadCuverieData();
        render();
      } catch (e2) {
        // Rollback : supprimer le lot orphelin créé avant l'échec
        if (createdLotId) {
          try { await WB3DB.deleteRow('lots', createdLotId); }
          catch (eDel) { console.warn('[WB3 convert] rollback lot orphelin KO :', eDel); }
        }
        console.error('[WB3 convert assemblage fallback]', e2);
        toast('Erreur : ' + (e2?.message || e2), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🔀 Lancer l\'assemblage'; }
      }
    } else {
      console.error('[WB3 convert assemblage]', e);
      toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e?.message || e)), 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🔀 Lancer l\'assemblage'; }
    }
  }
}
