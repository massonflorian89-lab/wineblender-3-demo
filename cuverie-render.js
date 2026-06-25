/* cuverie-render.js — Étape 1 extraction cuverie.html
 * Extrait de cuverie.html (était aux lignes 4168–4261 + 4812–4947).
 * Chargé avant le <script> principal → toutes les fonctions sont globales.
 *
 * Dépendances (restent dans cuverie.html ou d'autres fichiers) :
 *   - Globals lus : lotsMap, cuverieEtatMap, contenants
 *   - Consts lues : TYPE_ICONS, TYPE_LABELS, LOT_STATUT_COLORS, LOT_STATUT_SHORT
 *   - Foncs lues  : getPrincipalLot, getContenantEtat, escapeHtml, fmt,
 *                   fmtDays, daysSince, formatLotNumero, getTraveeNom,
 *                   onCuveClick, openOpPanel, openDetailDrawer,
 *                   _openConvertAssemblageModal, openCuveActions
 *   - API         : WB3DB.isPrivileged
 */

// ── Couleurs de la bande latérale par couleur de vin ─────────
const COULEUR_STRIP = { rouge:'#b00020', blanc:'#d4c089', rose:'#d89dad', gris:'#9e9ea0' };
// Teinte de remplissage (fond de carte). Translucide pour garder le texte lisible.
const COULEUR_FILL  = { rouge:'rgba(176,0,32,.13)', blanc:'rgba(196,166,90,.20)', rose:'rgba(216,157,173,.20)', gris:'rgba(150,150,154,.16)' };

const ETAT_BADGE_LABELS = {
  plein:'Plein', vidange:'En vidange', vide:'Vide', inactif:'Inactif',
};

// ── Quick-actions contextuelles sur cartes (D7 + Sprint 2) ───
// Source principale : lotsMap + contenants (rapide, zéro requête).
// Source enrichissement : cuverieEtatMap (flags v_cuverie_etat — fa_stuck,
// volume_incoherent, analyse_en_retard, sur_capacite, dluo_produit_proche).
// Si la map est vide (mode dégradé), le fallback historique s'applique
// (anciennes heuristiques côté JS — « cuve pleine ≥95 % » comme proxy
// d'« analyse à faire »).
function _quickActions(c, lots) {
  if (!c || c.actif === false) return [];
  // Socle 5 : lot principal résolu (aligné cuverieEtatMap.lot_id), pas lots[0]
  // aveugle — les actions critiques (fa_stuck, volume_incoherent) doivent
  // cibler le vrai lot principal.
  const lp  = getPrincipalLot(c);
  const vol = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const pct = c.capacite_hl ? (vol / c.capacite_hl) * 100 : 0;
  const etat = cuverieEtatMap.get(c.id) || null;
  const acts = [];

  // Priorité 1 (flags critiques v_cuverie_etat) — affichés en tête.
  if (etat) {
    if (etat.fa_stuck && lp) {
      acts.push({ ico: '🚨', lab: 'FA bloquée — densité stagne (≥2 j sans baisse)',
        js: `openOpPanel('analyse',['${c.id}'])` });
    }
    if (etat.volume_incoherent && lp) {
      acts.push({ ico: '⚖️', lab: 'Volume incohérent (Σ lot_contenants ≠ lots.volume_actuel_hl) — ouvrir fiche',
        js: `var _cc=contenants.find(x=>x.id==='${c.id}');if(_cc){openDetailDrawer(_cc);}` });
    }
    if (etat.sur_capacite) {
      acts.push({ ico: '⛔', lab: 'Sur-capacité (volume cuve > capacité) — corriger',
        js: `var _cc=contenants.find(x=>x.id==='${c.id}');if(_cc){openDetailDrawer(_cc);}` });
    }
  }

  // Sprint multi-lots Phase 0 — convertir une cuve multi-lots legacy en
  // assemblage. Visible uniquement si ≥ 2 lots distincts dans la cuve.
  if (lots.length > 1) {
    acts.push({ ico: '🔀', lab: 'Convertir multi-lots en assemblage (filiation + fusion)',
      js: `_openConvertAssemblageModal('${c.id}')` });
  }

  // Priorité 2 — actions standard (peuvent être suggérées par flags).
  if (lp && lp.statut === 'fa') {
    acts.push({ ico: '🌡', lab: 'Relevé densité',
      js: `openOpPanel('analyse',['${c.id}'])` });
  } else if (lp && vol > 0) {
    const enRetard = etat && etat.analyse_en_retard;
    if (enRetard) {
      acts.push({ ico: '🔬', lab: 'Analyse en retard (>30 j)',
        js: `openOpPanel('analyse',['${c.id}'])` });
    } else if (pct >= 95) {
      acts.push({ ico: '🔬', lab: 'Analyse',
        js: `openOpPanel('analyse',['${c.id}'])` });
    }
  }
  if (lp && lp.statut === 'elevage' && c.type === 'fut') {
    acts.push({ ico: '🪣', lab: 'Ouillage',
      js: `openOpPanel('ouillage',['${c.id}'])` });
  }
  // 🍇 Réceptionner un apport — disponible sur cuve vide OU partielle
  // (volume < capacité). MASQUÉ sur cuve pleine (≥ 100% remplissage)
  // car réceptionner du raisin sur une cuve déjà pleine n'a pas de sens
  // métier (déborderait). Si la cuve est partielle et occupée par un
  // autre lot, le drawer apport détectera le multi-lots et proposera
  // l'assemblage automatique (Phase 1).
  if (pct < 100) {
    acts.push({
      ico: '🍇',
      lab: vol === 0 && !lots.length
        ? 'Réceptionner un apport ici'
        : 'Réceptionner un apport (cuve déjà occupée → proposera un assemblage)',
      js: `(window.top||window).location.href='apports.html?new=1&contenant='+encodeURIComponent('${c.id}')`,
    });
  }
  // Périmètre caviste : on ne garde que les actions de consultation / analyse
  // (les opérations sont réservées aux responsables — verrou DB mig 076).
  if (WB3DB.isPrivileged && !WB3DB.isPrivileged()) {
    return acts.filter(a => {
      const j = a.js || '';
      if (j.includes('_openConvertAssemblageModal')) return false;
      if (j.includes('openOpPanel(') && !j.includes("openOpPanel('analyse'")) return false;
      return true;
    }).slice(0, 3);
  }
  return acts.slice(0, 3);
}

// ── Rendu d'une carte cuve (vue Grille) ───────────────────────
function renderCard(c) {
  const el = document.createElement('div');
  const lots = lotsMap.get(c.id) || [];
  const etat = getContenantEtat(c);
  el.className = 'contenant-card-pro'
    + (!c.actif ? ' inactive' : lots.length ? '' : ' empty')
    + (etat === 'vidange' ? ' card-vidange' : '');

  const typeLine  = [TYPE_LABELS[c.type] || c.type, c.materiau].filter(Boolean).join(' ');
  const traveeNom = getTraveeNom(c.travee_id);
  const locParts  = [];
  if (traveeNom)      locParts.push(`📍 ${escapeHtml(traveeNom)}`);
  if (c.localisation) locParts.push(escapeHtml(c.localisation));

  // Bande couleur du lot principal (résolu via getPrincipalLot → aligné
  // sur cuverieEtatMap.lot_id si dispo, sinon lots[0] trié canonique).
  const lotPrincipal = getPrincipalLot(c);
  const stripColor   = lotPrincipal ? (COULEUR_STRIP[lotPrincipal.couleur] || '#ccc') : 'var(--color-border)';

  // Fill bar
  // pctReal = vérité (peut dépasser 100% en sur-capacité, affiché tel quel)
  // pctBar  = largeur visuelle de la barre (clampée à 100 pour pas overflow)
  const volTotal = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const pctReal = c.capacite_hl && volTotal ? Math.round(volTotal / c.capacite_hl * 100) : 0;
  const pctBar  = Math.min(100, pctReal);
  const pct = pctReal;  // alias pour les usages existants (footer-row, _faHTML, etc.)
  // #1 — teinte de remplissage (fond) selon la couleur du vin ; rien si cuve vide.
  const fillBg = (lots.length && lotPrincipal) ? (COULEUR_FILL[lotPrincipal.couleur] || 'rgba(120,120,120,.12)') : 'transparent';

  // Bloc lot(s)
  let lotBlock = '';
  if (lots.length) {
    const [bg, fg] = (LOT_STATUT_COLORS[lotPrincipal.statut] || '#eee|#555').split('|');
    const jours    = daysSince(lotPrincipal.date_affectation);
    const joursTxt = fmtDays(jours);
    const joursClr = jours != null && jours > 365 ? '#d97706' : 'var(--color-ink-tertiary)';
    const numLot = formatLotNumero(lotPrincipal);
    // Agrément à la cuve en attente : cadenas visuel, mouvements physiques de
    // la cuve bloqués au niveau base (trg_op_cont_agrement_lock, mig 094).
    const lockBadge = c.agrement_statut === 'en_attente'
      ? `<span class="lot-statut-badge" title="Agrément en attente pour la cuve ${escapeHtml(c.nom)} — mouvements bloqués" style="background:#fff0e0;color:#e65100">🔒</span>`
      : '';
    lotBlock = `
      <div class="lot-numero" style="display:flex;align-items:center;gap:5px;flex-wrap:nowrap">
        ${lockBadge}
        <span class="lot-statut-badge" style="background:${bg};color:${fg}">${LOT_STATUT_SHORT[lotPrincipal.statut]||lotPrincipal.statut}</span>
        <span class="lot-nom">${escapeHtml(lotPrincipal.nom)}${lotPrincipal.millesime ? ` · ${lotPrincipal.millesime}` : ''}</span>
        ${joursTxt ? `<span class="lot-jours" style="color:${joursClr}">⏱ ${joursTxt}</span>` : ''}
      </div>
      ${numLot ? `<div class="lot-num">${escapeHtml(numLot)}</div>` : ''}
      ${lots.length > 1 ? `<div class="meta card-sub" style="cursor:default">+${lots.length - 1} autre lot${lots.length > 2 ? 's' : ''}</div>` : ''}`;
  }

  // D8 — Mini-form FA inline. Détection basée sur faLots (TOUS les lots en
  // FA), pas seulement le lot principal : une cuve multi-lots peut avoir un
  // lot FA qui n'est pas le plus gros volume.
  //   - Mono-lot FA            → mini-form inline (saisie directe sur ce lot).
  //   - Multi-lots avec ≥1 FA  → bouton « 🚥 Multi-lots » → suivi-fa-drawer
  //     (sélecteur de lot, saisie sur le BON lot FA, jamais lots[0] aveugle).
  const faLots      = lots.filter(l => l.statut === 'fa');
  const _faActive   = c.actif !== false && faLots.length > 0;
  const _faMonoLot  = _faActive && lots.length === 1;     // 1 seul lot, en FA
  const _faMulti    = _faActive && lots.length > 1;       // multi-lots, ≥1 FA
  // Saisie densité inline sur carte RETIRÉE (allègement) — la saisie se fait
  // via la modale ⌨️ « Saisie densités ». Le suivi FA détaillé reste accessible
  // par la fiche cuve (clic sur la carte) et le filtre 🌡 Suivi FA.
  const _faHTML = '';

  const _qa = _quickActions(c, lots);
  // Bouton « ⋯ » → menu d'actions rapides depuis la cuve (C4). Toujours présent
  // sur une cuve active, même sans quick-action contextuelle.
  const _moreBtn = (c.actif !== false)
    ? `<button class="wb-quick-btn wb-quick-more" type="button" title="Actions rapides"
         onpointerdown="event.stopPropagation()"
         onclick="event.stopPropagation();openCuveActions('${c.id}')">⋯</button>`
    : '';
  const _qaHTML = (_qa.length || _moreBtn) ? `
    <div class="wb-quick">${_qa.map(a => `<button class="wb-quick-btn" type="button"
        title="${escapeHtml(a.lab)}"
        onpointerdown="event.stopPropagation()"
        onclick="event.stopPropagation();${a.js}">${a.ico}</button>`).join('')}${_moreBtn}</div>` : '';

  // P0.3 — Alertes cuve : pilules colorées (max 2 visibles + "+N reste").
  // Ordre : critique en premier (fa_stuck, sur_capacite), warn ensuite.
  const _etatRow = cuverieEtatMap.get(c.id) || null;
  let _alerteHTML = '';
  if (_etatRow) {
    const _ALERT_DEFS = [
      { flag: 'fa_stuck',               ico: '🚨', label: 'FA bloquée',       clr: '#ef4444', txt: '#fff' },
      { flag: 'sur_capacite',           ico: '⛔', label: 'Sur-capacité',     clr: '#ef4444', txt: '#fff' },
      { flag: 'volume_incoherent',      ico: '⚠️', label: 'Vol. incohérent',  clr: '#f97316', txt: '#fff' },
      { flag: 'analyse_en_retard',      ico: '🔬', label: 'Analyse > 30 j',   clr: '#f59e0b', txt: '#1a1a1a' },
      { flag: 'sans_operation_recente', ico: '⏱',  label: 'Sans opération',   clr: '#8b5cf6', txt: '#fff' },
      { flag: 'dluo_produit_proche',    ico: '📦', label: 'DLUO proche',      clr: '#6b7280', txt: '#fff' },
    ];
    const _active = _ALERT_DEFS.filter(a => _etatRow[a.flag]);
    if (_active.length > 0) {
      const _shown = _active.slice(0, 2);
      const _rest  = _active.length - _shown.length;
      const _tip   = escapeHtml(_active.map(a => a.ico + ' ' + a.label).join(' · '));
      _alerteHTML = `<div class="wb-alertes" title="${_tip}" aria-label="Alertes cuve">
        ${_shown.map(a => `<span class="wb-alerte-pill" style="background:${a.clr};color:${a.txt}">${a.ico} ${escapeHtml(a.label)}</span>`).join('')}
        ${_rest > 0 ? `<span class="wb-alerte-pill" style="background:#6b7280;color:#fff">+${_rest}</span>` : ''}
      </div>`;
    }
  }

  el.innerHTML = `
    <div class="cuve-fill" style="height:${pctBar}%;background:${fillBg}"></div>
    ${_qaHTML}
    ${_alerteHTML}
    ${!c.actif ? '<span class="inactive-badge">inactif</span>' : ''}
    <div class="cuve-strip" style="background:${stripColor}"></div>
    <div class="card-head" style="margin-top:var(--space-1)">
      <div>
        <div class="nom">${escapeHtml(c.nom)}</div>
        <div class="meta">${escapeHtml(typeLine)} · ${fmt(c.capacite_hl)} hL</div>
      </div>
      <div class="type-icon">${TYPE_ICONS[c.type] || '📦'}</div>
    </div>
    ${locParts.length ? `<div class="meta card-sub">${locParts.join(' · ')}</div>` : ''}
    <div style="height:var(--space-1)"></div>
    ${lotBlock}
    <div class="footer-row" style="min-width:0;gap:6px">
      <span class="etat-badge etat-${etat}" style="flex-shrink:0">${ETAT_BADGE_LABELS[etat]}</span>
      <span class="vol vol-trunc${pctReal > 100 ? ' vol-over' : ''}"
            ${pctReal > 100 ? `title="Sur-capacité : ${pctReal}% (${fmt(volTotal - c.capacite_hl)} hL en trop)"` : ''}>${pct > 0 ? fmt(volTotal)+' / ' : ''}${fmt(c.capacite_hl)} hL${pctReal > 100 ? ' · ' + pctReal + '%' : ''}</span>
    </div>
    ${_faHTML}
  `;
  el.style.position = 'relative';
  el.style.overflow  = 'hidden';
  el.dataset.cid = c.id;            // ciblage Realtime (patch d'1 carte)
  el.addEventListener('click', () => onCuveClick(c));
  return el;
}

// ── Vue Grille (flat) ─────────────────────────────────────────
function renderGrid(items) {
  const container = document.getElementById('content');
  container.innerHTML = '<div class="cuverie-grid" id="grid"></div>';
  const grid = document.getElementById('grid');
  items.forEach(c => grid.appendChild(renderCard(c)));
}

// ── Vue Grille groupée ────────────────────────────────────────
function renderGroupedGrid(items) {
  WBWin.destroy();
  const container = document.getElementById('content');
  container.innerHTML = '';
  const groups = computeGroups(items);
  groups.forEach(g => {
    const totalCapa = g.items.reduce((s, c) => s + (Number(c.capacite_hl) || 0), 0);
    const volOcc    = g.items.reduce((s, c) => s + (lotsMap.get(c.id)||[]).reduce((a,l)=>a+(Number(l.volume_hl)||0),0), 0);
    const pctGroup  = totalCapa ? Math.round(volOcc / totalCapa * 100) : 0;
    const isCollapsed = collapsedGroups.has(g.id);
    const section = document.createElement('div');
    section.className = 'group-section' + (isCollapsed ? ' collapsed' : '');
    section.innerHTML = `
      <div class="group-header" data-group-id="${g.id}">
        <h3>${g.icon ? g.icon + ' ' : ''}${escapeHtml(g.nom)}</h3>
        <span class="meta"><b>${g.items.length}</b> contenant${g.items.length>1?'s':''} · <b>${fmt(volOcc)}</b> / <b>${fmt(totalCapa)}</b> hL${pctGroup > 0 ? ` · ${pctGroup}%` : ''}</span>
        <span class="chevron">▼</span>
      </div>
      <div class="group-content">
        <div class="cuverie-grid"></div>
      </div>
    `;
    section.querySelector('.group-header').addEventListener('click', () => toggleGroup(g.id));
    container.appendChild(section);
    if (!isCollapsed) {
      WBWin.fillGrid(
        g.items,
        section.querySelector('.cuverie-grid'),
        section.querySelector('.group-content'),
        c => { const el = renderCard(c); el.classList.add('wb-cv-card'); return el; }
      );
    }
  });
}

// ── Vue Tableau (flat) ────────────────────────────────────────
function renderTable(items) {
  const container = document.getElementById('content');
  const cols = getVisibleColumns();
  container.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table data-table--resizable">
      ${tableColgroup(cols)}
      <thead>
        <tr>
          <th style="text-align:center"><input type="checkbox" id="select-all-cb" title="Tout sélectionner/désélectionner"></th>
          ${cols.map(col => renderTableHeader(col)).join('')}
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    </div>
  `;
  const tbody = container.querySelector('tbody');
  items.forEach(c => {
    const tr = document.createElement('tr');
    tr.dataset.cid = c.id;
    if (selectedIds.has(c.id)) tr.classList.add('row-selected');
    tr.innerHTML = `<td style="text-align:center;padding:var(--space-1)"><input type="checkbox" ${selectedIds.has(c.id)?'checked':''} onclick="event.stopPropagation();toggleSelect('${c.id}',this.checked)"></td>`
      + cols.map(col => `<td${col.numeric ? ' class="num"' : ''}>${col.render(c)}</td>`).join('')
      + _renderTableActionsCell(c);
    tr.addEventListener('click', () => onCuveClick(c));
    tbody.appendChild(tr);
  });
  bindHeaderSort(container);
  const allCb = container.querySelector('#select-all-cb');
  if (allCb) {
    allCb.checked = items.length > 0 && items.every(c => selectedIds.has(c.id));
    allCb.indeterminate = !allCb.checked && items.some(c => selectedIds.has(c.id));
    allCb.addEventListener('click', e => { e.stopPropagation(); toggleSelectAll(allCb.checked, items); });
  }
}

// Cellule actions (vue tableau) — parité avec la vue grille. Réutilise
// _quickActions(c, lots) : mêmes règles de visibilité et mêmes handlers.
function _renderTableActionsCell(c) {
  const lots = lotsMap.get(c.id) || [];
  const qa = _quickActions(c, lots);
  const btnStyle = 'width:24px;height:24px;font-size:12px;margin-left:2px;padding:0;pointer-events:auto';
  const moreBtn = (c.actif !== false)
    ? `<button class="wb-quick-btn wb-quick-more" type="button" title="Actions rapides (étiquette, fiche…)"
         style="${btnStyle};opacity:.7"
         onpointerdown="event.stopPropagation()"
         onclick="event.stopPropagation();openCuveActions('${c.id}')">⋯</button>`
    : '';
  const btns = qa.map(a =>
    `<button class="wb-quick-btn" type="button"
       title="${escapeHtml(a.lab)}"
       style="${btnStyle};opacity:1"
       onpointerdown="event.stopPropagation()"
       onclick="event.stopPropagation();${a.js}">${a.ico}</button>`
  ).join('');
  return `<td style="white-space:nowrap;text-align:right;padding:2px 6px;overflow:visible">${btns}${moreBtn}</td>`;
}

// Construit UNE ligne tableau — partagé par le tableau groupé et le patch Realtime.
function buildCuverieTr(c, cols) {
  const tr = document.createElement('tr');
  tr.dataset.cid = c.id;
  if (selectedIds.has(c.id)) tr.classList.add('row-selected');
  tr.innerHTML = `<td style="text-align:center;padding:var(--space-1)"><input type="checkbox" ${selectedIds.has(c.id)?'checked':''} onclick="event.stopPropagation();toggleSelect('${c.id}',this.checked)"></td>`
    + cols.map(col => `<td${col.numeric ? ' class="num"' : ''}>${col.render(c)}</td>`).join('')
    + _renderTableActionsCell(c);
  tr.addEventListener('click', () => onCuveClick(c));
  return tr;
}

function renderTableHeader(col) {
  const active = isFilterActive(col.key);
  const filterBtn = `<button class="col-filter-btn${active ? ' active' : ''}" title="${active ? 'Filtre actif – modifier' : 'Filtrer'}" onclick="openFilterDropdown(event,'${col.key}')">▾</button>`;
  const drag = ` draggable="true" data-col-key="${col.key}"`;
  const grip = `<span class="col-resize" data-col-key="${col.key}" draggable="false" title="Glisser pour redimensionner · double-clic pour réinitialiser"></span>`;
  if (!col.sortable) return `<th${drag}${col.numeric ? ' class="num"' : ''}>${escapeHtml(col.label)}${filterBtn}${grip}</th>`;
  const isSorted = sortBy === col.sortKey;
  const cls = ['sortable'];
  if (col.numeric) cls.push('num');
  if (isSorted) cls.push('sorted');
  if (isSorted && sortAsc) cls.push('asc');
  return `<th${drag} class="${cls.join(' ')}" data-sort="${col.sortKey}">${escapeHtml(col.label)}${filterBtn}${grip}</th>`;
}

// ── Vue Tableau groupée ───────────────────────────────────────
function renderGroupedTable(items) {
  WBWin.destroy();
  const container = document.getElementById('content');
  const cols = getVisibleColumns();
  container.innerHTML = `
    <div style="overflow-x:auto">
    <table class="data-table data-table--resizable">
      ${tableColgroup(cols)}
      <thead>
        <tr>
          <th></th>
          ${cols.map(col => renderTableHeader(col)).join('')}
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
    </div>
  `;
  const tbody = container.querySelector('tbody');
  const colspan = cols.length + 2;
  const groups = computeGroups(items);
  const makeTr = (c) => buildCuverieTr(c, cols);
  groups.forEach(g => {
    const totalCapa = g.items.reduce((s, c) => s + (Number(c.capacite_hl) || 0), 0);
    const volOcc    = g.items.reduce((s, c) => s + (lotsMap.get(c.id)||[]).reduce((a,l)=>a+(Number(l.volume_hl)||0),0), 0);
    const pctGroup  = totalCapa ? Math.round(volOcc / totalCapa * 100) : 0;
    const isCollapsed = collapsedGroups.has(g.id);
    const headerRow = document.createElement('tr');
    headerRow.className = 'row-group-header';
    headerRow.dataset.groupId = g.id;
    headerRow.innerHTML = `
      <td colspan="${colspan}">
        ${isCollapsed ? '▶' : '▼'} ${g.icon ? g.icon + ' ' : ''}${escapeHtml(g.nom)}
        <span class="meta">${g.items.length} contenant${g.items.length>1?'s':''} · ${fmt(volOcc)} / ${fmt(totalCapa)} hL${pctGroup > 0 ? ` · ${pctGroup}%` : ''}</span>
      </td>
    `;
    headerRow.addEventListener('click', () => toggleGroup(g.id));
    tbody.appendChild(headerRow);
    if (isCollapsed) return;
    WBWin.fillRows(g.items, tbody, makeTr, colspan);
  });
  bindHeaderSort(container);
}

// ── Stats dashboard ───────────────────────────────────────────
function renderStats() {
  const actifs = contenants.filter(c => c.actif);
  const totalCapa = actifs.reduce((s, c) => s + (Number(c.capacite_hl) || 0), 0);
  const cuves    = actifs.filter(c => c.type === 'cuve');
  const foudres  = actifs.filter(c => c.type === 'foudre');
  const futs     = actifs.filter(c => c.type === 'fut');
  const pressoirs= actifs.filter(c => c.type === 'pressoir');

  const volOcc = actifs.reduce((s, c) => s + (lotsMap.get(c.id)||[]).reduce((a,l)=>a+(Number(l.volume_hl)||0),0), 0);
  const pctGlobal = totalCapa ? Math.round(volOcc / totalCapa * 100) : 0;
  const cuvesVides = actifs.filter(c => getContenantEtat(c) === 'vide').length;

  const allLots = new Map();
  contenants.forEach(c => (lotsMap.get(c.id)||[]).forEach(l => allLots.set(l.id, l)));
  const lotsEnFA = [...allLots.values()].filter(l => l.statut === 'fa' || l.statut === 'fml').length;

  const volC = { rouge: 0, blanc: 0, rose: 0, gris: 0 };
  allLots.forEach(l => { if (l.couleur in volC) volC[l.couleur] += Number(l.volume_hl) || 0; });

  const pctBar = (pct) => `<div style="height:3px;border-radius:2px;background:var(--color-border);margin-top:var(--space-1)"><div style="height:100%;width:${pct}%;border-radius:2px;background:${pct>=80?'#ef4444':pct>=50?'#22c55e':'#f59e0b'}"></div></div>`;

  const tiles = {
    total:       `<div class="stat-card"><div class="label">Contenants</div><div class="value">${actifs.length}</div><div class="sub">${contenants.length - actifs.length} inactif${contenants.length - actifs.length !== 1 ? 's' : ''}</div></div>`,
    capacite:    `<div class="stat-card"><div class="label">Capacité totale</div><div class="value">${fmt(totalCapa)}</div><div class="sub">hectolitres</div></div>`,
    remplissage: `<div class="stat-card"><div class="label">Remplissage global</div><div class="value">${pctGlobal}%</div><div class="sub">${fmt(volOcc)} / ${fmt(totalCapa)} hL</div>${pctBar(pctGlobal)}</div>`,
    vides:       `<div class="stat-card"><div class="label">⚪ Contenants vides</div><div class="value">${cuvesVides}</div><div class="sub">disponibles immédiatement</div></div>`,
    fermentation:`<div class="stat-card"><div class="label">🌡 En fermentation</div><div class="value">${lotsEnFA}</div><div class="sub">lots FA + FML actifs</div></div>`,
    cuves:       `<div class="stat-card"><div class="label">${CUVE_SVG} Cuves</div><div class="value">${cuves.length}</div><div class="sub">${fmt(sum(cuves))} hL</div></div>`,
    foudres:     `<div class="stat-card"><div class="label">🛢 Foudres</div><div class="value">${foudres.length}</div><div class="sub">${fmt(sum(foudres))} hL</div></div>`,
    futs:        `<div class="stat-card"><div class="label">🛢 Fûts</div><div class="value">${futs.length}</div><div class="sub">${fmt(sum(futs))} hL</div></div>`,
    pressoirs:   `<div class="stat-card"><div class="label">⚙️ Pressoirs</div><div class="value">${pressoirs.length}</div><div class="sub">${fmt(sum(pressoirs))} hL</div></div>`,
    vol_rouge:   `<div class="stat-card"><div class="label">🔴 Volume rouge</div><div class="value">${fmt(volC.rouge)}</div><div class="sub">hL</div></div>`,
    vol_blanc:   `<div class="stat-card"><div class="label">⚪ Volume blanc</div><div class="value">${fmt(volC.blanc)}</div><div class="sub">hL</div></div>`,
    vol_rose:    `<div class="stat-card"><div class="label">🌸 Volume rosé</div><div class="value">${fmt(volC.rose)}</div><div class="sub">hL</div></div>`,
  };

  const visible = (userPrefs.visible_stats && userPrefs.visible_stats.length)
    ? userPrefs.visible_stats
    : Object.keys(tiles);

  const stats = document.getElementById('stats');
  stats.innerHTML = visible.map(id => tiles[id] || '').join('');
  stats.style.display = visible.length ? '' : 'none';
}

// ── Feed d'activité récente ───────────────────────────────────
function renderActivityFeed() {
  const el = document.getElementById('activity-feed');
  if (!el) return;
  if (!recentOps.length) { el.style.display = 'none'; return; }

  const OP_ICONS = {
    relogement:'🔀', traitement:'🧪', analyse:'🔬', sulfitage:'🧂',
    levurage:'🦠', chaptalisation:'🍬', collage:'🫧', malo:'🧫',
    filtration:'⚗️', autre:'📋', agrement:'🔒',
  };
  const rows = recentOps.slice(0, 10).map(op => {
    const icon  = OP_ICONS[op.type_operation] || '📋';
    const date  = op.date_operation ? new Date(op.date_operation).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) : '—';
    const lots  = (op.operation_lots || []).map(ol => ol.lots?.nom).filter(Boolean);
    const lotTxt = lots.length ? escapeHtml(lots.slice(0,2).join(', ')) + (lots.length > 2 ? ` +${lots.length-2}` : '') : '—';
    const op_txt = escapeHtml(op.type_operation || 'op.');
    const opTxt = op.notes ? escapeHtml(op.notes.slice(0,60)) : op_txt;
    return `<div style="display:flex;align-items:baseline;gap:var(--space-2);padding:5px 0;border-bottom:1px solid var(--color-border)">
      <span style="font-size:var(--text-callout);flex-shrink:0">${icon}</span>
      <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);flex-shrink:0;min-width:52px">${date}</span>
      <span style="flex:1;font-size:var(--text-footnote);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lotTxt}</span>
      <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);flex-shrink:0">${escapeHtml(op.type_operation||'')}</span>
    </div>`;
  }).join('');

  el.style.display = '';
  el.innerHTML = `
    <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4)">
      <div style="font-size:var(--text-caption);font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--color-ink-tertiary);margin-bottom:var(--space-2)">
        ⏱ Activité récente
      </div>
      ${rows}
    </div>`;
}

// ── Compteurs onglets filtre statut ──────────────────────────
function renderTabCounts() {
  const sel = document.getElementById('filter-statut');
  if (!sel) return;
  const counts = {
    all:        contenants.length,
    plein:   contenants.filter(ETAT_FILTERS.plein).length,
    vidange: contenants.filter(ETAT_FILTERS.vidange).length,
    vide:    contenants.filter(ETAT_FILTERS.vide).length,
    inactif: contenants.filter(ETAT_FILTERS.inactif).length,
  };
  const labels = {
    all: '📦 Tous', plein: '🔴 Plein (100%)',
    vidange: '🟡 En vidange', vide: '⚪ Vide', inactif: '⏸ Inactif',
  };
  Array.from(sel.options).forEach(opt => {
    if (labels[opt.value] !== undefined) {
      opt.textContent = `${labels[opt.value]} (${counts[opt.value] || 0})`;
    }
  });
}
