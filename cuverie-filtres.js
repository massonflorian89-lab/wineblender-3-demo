// cuverie-filtres.js — Filtrage, groupements, recherche, filtres-colonne
// Extrait de cuverie.html (Étape 3 de la refactorisation progressive).
//
// Globals lus (définis dans cuverie.html) :
//   lotsMap, contenants, travees, ETAT_FILTERS, PHASE_FILTERS, COLUMNS_CATALOG,
//   LOT_COULEUR_DOT, TYPE_LABELS, LOT_STATUT_SHORT, lotCepagesMap
// État global read/write :
//   faFilterOn, activeTab, filterPhase, filterType, filterCouleur, filterTravee,
//   filterMillesime, searchQuery, sortBy, sortAsc, columnFilters, activeFilterCol,
//   groupMode, _tourneeOn, currentPage
// Consts de cuverie-render.js : ETAT_BADGE_LABELS
// Fonctions dans le script principal : getTraveeNom, getContenantEtat,
//   escapeHtml, savePrefs, render, toast

// ── Groupements ───────────────────────────────────────────────
function groupByTravee(items) {
  const groups = new Map();
  travees.forEach(t => groups.set(t.id, { id: t.id, icon: '📍', nom: t.nom, items: [] }));
  groups.set('__none', { id: '__none', icon: '', nom: 'Sans travée', items: [] });
  items.forEach(c => {
    const k = c.travee_id || '__none';
    if (!groups.has(k)) groups.set(k, { id: k, icon: '📍', nom: '?', items: [] });
    groups.get(k).items.push(c);
  });
  return Array.from(groups.values()).filter(g => g.items.length > 0);
}

function groupByCouleur(items) {
  const ORDER = ['rouge', 'blanc', 'rose', 'gris', '__none'];
  const LABELS = { rouge:'Rouge', blanc:'Blanc', rose:'Rosé', gris:'Gris', __none:'Sans lot' };
  const groups = new Map(ORDER.map(k => [k, { id: k, icon: LOT_COULEUR_DOT[k] || '', nom: LABELS[k], items: [] }]));
  items.forEach(c => {
    const lots = lotsMap.get(c.id) || [];
    const k = lots.length ? (lots[0].couleur || '__none') : '__none';
    if (!groups.has(k)) groups.set(k, { id: k, icon: '', nom: k, items: [] });
    groups.get(k).items.push(c);
  });
  return Array.from(groups.values()).filter(g => g.items.length > 0);
}

function groupByStatut(items) {
  const ETAT_ICONS = { plein:'🔴', vidange:'🟡', vide:'⚪', inactif:'⏸' };
  const ORDER = ['plein', 'vidange', 'vide', 'inactif'];
  const groups = new Map(ORDER.map(k => [k, { id: k, icon: ETAT_ICONS[k] || '', nom: ETAT_BADGE_LABELS[k] || k, items: [] }]));
  items.forEach(c => {
    const k = getContenantEtat(c);
    if (!groups.has(k)) groups.set(k, { id: k, icon: '', nom: k, items: [] });
    groups.get(k).items.push(c);
  });
  return Array.from(groups.values()).filter(g => g.items.length > 0);
}

function groupByMillesime(items) {
  const groups = new Map();
  items.forEach(c => {
    const lots = lotsMap.get(c.id) || [];
    const k = lots.length && lots[0].millesime ? String(lots[0].millesime) : '__none';
    if (!groups.has(k)) groups.set(k, { id: k, icon: k === '__none' ? '' : '📅', nom: k === '__none' ? 'Sans millésime' : k, items: [] });
    groups.get(k).items.push(c);
  });
  return Array.from(groups.values())
    .sort((a, b) => a.id === '__none' ? 1 : b.id === '__none' ? -1 : Number(b.id) - Number(a.id))
    .filter(g => g.items.length > 0);
}

function computeGroups(items) {
  if (groupMode === 'couleur')   return groupByCouleur(items);
  if (groupMode === 'statut')    return groupByStatut(items);
  if (groupMode === 'millesime') return groupByMillesime(items);
  return groupByTravee(items);
}

// ── Filtres par colonne — primitives ─────────────────────────
function getRawValue(key, c) {
  switch(key) {
    case 'nom':                return c.nom || '';
    case 'type':               return TYPE_LABELS[c.type] || c.type || '';
    case 'materiau':           return c.materiau || '';
    case 'capacite_hl':        return c.capacite_hl;
    case 'travee':             return getTraveeNom(c.travee_id) || '';
    case 'localisation':       return c.localisation || '';
    case 'marque':             return c.marque || '';
    case 'annee_mise_service': return c.annee_mise_service;
    case 'prix_achat':         return c.prix_achat;
    case 'tags':               return c.tags || [];
    case 'actif':              return c.actif ? 'Actif' : 'Inactif';
    case 'lot':                return (lotsMap.get(c.id)||[]).map(l=>l.nom).join(', ');
    case 'volume_actuel_hl':   return (lotsMap.get(c.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0);
    case 'pct_fill':           return c.capacite_hl ? Math.round((lotsMap.get(c.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0)/c.capacite_hl*100) : 0;
    default:                   return '';
  }
}

function isNumericColumn(key) {
  return ['capacite_hl', 'annee_mise_service', 'prix_achat', 'volume_actuel_hl', 'pct_fill'].includes(key);
}

function getUniqueValues(key) {
  const vals = new Set();
  contenants.forEach(c => {
    const raw = getRawValue(key, c);
    if (Array.isArray(raw)) {
      raw.forEach(v => v && vals.add(String(v)));
    } else {
      vals.add(raw == null ? '' : String(raw));
    }
  });
  return [...vals].sort((a, b) => {
    if (a === '' && b !== '') return 1;
    if (a !== '' && b === '') return -1;
    return a.localeCompare(b, 'fr');
  });
}

function isFilterActive(key) {
  const f = columnFilters[key];
  if (!f) return false;
  if (f.type === 'values') return Array.isArray(f.values) && f.values.length > 0;
  if (f.type === 'range')  return (f.min != null && f.min !== '') || (f.max != null && f.max !== '');
  return false;
}

function hasActiveColumnFilters() {
  return Object.keys(columnFilters).some(k => isFilterActive(k));
}

function passesColumnFilters(c) {
  for (const [key, filter] of Object.entries(columnFilters)) {
    if (!isFilterActive(key)) continue;
    const raw = getRawValue(key, c);
    if (filter.type === 'values') {
      if (key === 'tags') {
        const tags = Array.isArray(raw) ? raw.map(String) : [];
        if (!filter.values.some(v => tags.includes(v))) return false;
      } else {
        const str = raw == null ? '' : String(raw);
        if (!filter.values.includes(str)) return false;
      }
    } else if (filter.type === 'range') {
      const num = Number(raw);
      if (filter.min != null && filter.min !== '' && !isNaN(Number(filter.min)) && num < Number(filter.min)) return false;
      if (filter.max != null && filter.max !== '' && !isNaN(Number(filter.max)) && num > Number(filter.max)) return false;
    }
  }
  return true;
}

// ── Filtre principal + tri ────────────────────────────────────
function getFiltered() {
  return contenants
    .filter(c => !faFilterOn || (lotsMap.get(c.id) || []).some(l => l.statut === 'fa'))   // D9d
    .filter(c => (ETAT_FILTERS[activeTab] || ETAT_FILTERS.all)(c))
    .filter(c => (PHASE_FILTERS[filterPhase] || PHASE_FILTERS.all)(c))
    .filter(c => filterType === 'all' || c.type === filterType)
    .filter(c => {
      if (filterCouleur === 'all') return true;
      return (lotsMap.get(c.id) || []).some(l => l.couleur === filterCouleur);
    })
    .filter(c => {
      if (filterTravee === 'all')  return true;
      if (filterTravee === 'none') return !c.travee_id;
      return c.travee_id === filterTravee;
    })
    .filter(c => {
      if (filterMillesime === 'all') return true;
      return (lotsMap.get(c.id) || []).some(l => String(l.millesime) === filterMillesime);
    })
    .filter(c => {
      if (!searchQuery) return true;
      const traveeNom = getTraveeNom(c.travee_id);
      const lots = lotsMap.get(c.id) || [];
      const lotHay = lots.map(l => [
        l.nom, l.millesime, l.numero_lot,
        LOT_STATUT_SHORT[l.statut] || l.statut, l.statut, l.couleur,
        (lotCepagesMap.get(l.id) || []).join(' ')
      ].filter(Boolean).join(' ')).join(' ');
      const hay = [
        c.nom, c.localisation, c.materiau, c.marque, traveeNom,
        TYPE_LABELS[c.type] || c.type, c.capacite_hl, ...(c.tags || []), lotHay
      ].filter(v => v != null && v !== '').join(' ').toLowerCase();
      // Multi-termes : tous les mots doivent matcher (ET). Ex. « b2 merlot ».
      return searchQuery.split(/\s+/).filter(Boolean).every(term => hay.includes(term));
    })
    .filter(c => passesColumnFilters(c))
    .sort((a, b) => {
      let av, bv;
      if (sortBy === 'travee_id') {
        av = getTraveeNom(a.travee_id) || '';
        bv = getTraveeNom(b.travee_id) || '';
      } else if (sortBy === 'volume_actuel_hl') {
        av = (lotsMap.get(a.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0);
        bv = (lotsMap.get(b.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0);
      } else if (sortBy === 'pct_fill') {
        av = a.capacite_hl ? (lotsMap.get(a.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0)/a.capacite_hl : 0;
        bv = b.capacite_hl ? (lotsMap.get(b.id)||[]).reduce((s,l)=>s+(Number(l.volume_hl)||0),0)/b.capacite_hl : 0;
      } else {
        av = a[sortBy];
        bv = b[sortBy];
      }
      if (typeof av === 'string' || typeof bv === 'string') {
        const cmp = String(av || '').localeCompare(String(bv || ''), 'fr');
        return sortAsc ? cmp : -cmp;
      }
      av = Number(av) || 0;
      bv = Number(bv) || 0;
      return sortAsc ? av - bv : bv - av;
    });
}

// Peuple le filtre millésime à partir des lots présents (préserve la sélection).
function _populateMillesimeFilter() {
  const sel = document.getElementById('filter-millesime');
  if (!sel) return;
  const set = new Set();
  lotsMap.forEach(lots => lots.forEach(l => { if (l.millesime != null && l.millesime !== '') set.add(String(l.millesime)); }));
  const vals = [...set].sort((a, b) => b.localeCompare(a, 'fr', { numeric: true }));
  const sig = vals.join(',');
  if (sel.dataset.sig === sig) return;
  sel.dataset.sig = sig;
  const cur = filterMillesime;
  sel.innerHTML = '<option value="all">📅 Tous millésimes</option>' +
    vals.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  sel.value = vals.includes(cur) ? cur : 'all';
  if (sel.value !== cur) filterMillesime = sel.value;
}

// ── Surlignage des termes recherchés dans les cartes/tableau ─
function _highlightSearch() {
  const root = document.getElementById('content');
  if (!root) return;
  root.querySelectorAll('mark.wb-hl').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
  if (!searchQuery || _tourneeOn) return;
  const terms = searchQuery.split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) return;
  const rx = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  const SKIP = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'SCRIPT', 'STYLE', 'MARK', 'BUTTON']);
  const lowTerms = terms.map(t => t.toLowerCase());
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      let p = n.parentElement;
      while (p && p !== root) { if (SKIP.has(p.tagName) || p.isContentEditable) return NodeFilter.FILTER_REJECT; p = p.parentElement; }
      const low = n.nodeValue.toLowerCase();
      return lowTerms.some(t => low.includes(t)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const targets = []; let node;
  while ((node = walker.nextNode())) targets.push(node);
  targets.forEach(n => {
    const s = n.nodeValue; const frag = document.createDocumentFragment();
    let last = 0; rx.lastIndex = 0; let m;
    while ((m = rx.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      const mk = document.createElement('mark'); mk.className = 'wb-hl'; mk.textContent = m[0]; frag.appendChild(mk);
      last = m.index + m[0].length;
      if (m.index === rx.lastIndex) rx.lastIndex++;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    n.replaceWith(frag);
  });
}

// ── Dropdown filtre-colonne (style Excel) ────────────────────
function openFilterDropdown(event, colKey) {
  event.stopPropagation();
  if (activeFilterCol === colKey) { closeFilterDropdown(); return; }
  activeFilterCol = colKey;
  const dd = document.getElementById('col-filter-dropdown');
  dd.innerHTML = buildFilterDropdownContent(colKey);
  dd.classList.add('open');
  const rect = event.currentTarget.getBoundingClientRect();
  const ddW  = 260;
  let left = rect.left;
  if (left + ddW > window.innerWidth - 8) left = window.innerWidth - ddW - 8;
  if (left < 8) left = 8;
  dd.style.left = left + 'px';
  dd.style.top  = (rect.bottom + 4) + 'px';
}

function closeFilterDropdown() {
  activeFilterCol = null;
  const dd = document.getElementById('col-filter-dropdown');
  dd.classList.remove('open');
}

function buildFilterDropdownContent(colKey) {
  const col = COLUMNS_CATALOG.find(c => c.key === colKey);
  if (!col) return '';
  const filter = columnFilters[colKey] || {};

  if (isNumericColumn(colKey)) {
    const minV = (filter.type === 'range' && filter.min != null) ? filter.min : '';
    const maxV = (filter.type === 'range' && filter.max != null) ? filter.max : '';
    return `
      <div class="col-filter-title">🔢 ${escapeHtml(col.label)}</div>
      <div class="col-filter-range">
        <input class="input" type="number" id="cf-min" placeholder="Min" value="${escapeHtml(String(minV))}">
        <span style="color:var(--color-ink-tertiary);flex-shrink:0">→</span>
        <input class="input" type="number" id="cf-max" placeholder="Max" value="${escapeHtml(String(maxV))}">
      </div>
      <div class="col-filter-footer">
        <button class="btn btn--ghost btn--sm" onclick="clearColumnFilter('${colKey}')">✕ Effacer</button>
        <button class="btn btn--sm" onclick="applyRangeFilter('${colKey}')">Appliquer</button>
      </div>`;
  }

  const uniqueVals = getUniqueValues(colKey);
  const activeVals = (filter.type === 'values' && Array.isArray(filter.values)) ? filter.values : [];
  const valItems = uniqueVals.length === 0
    ? `<div style="padding:var(--space-2);color:var(--color-ink-tertiary);font-size:var(--text-caption)">Aucune valeur</div>`
    : uniqueVals.map(v => `
        <label class="col-filter-value-item">
          <input type="checkbox" value="${escapeHtml(v)}" ${activeVals.includes(v) ? 'checked' : ''}
            onchange="toggleFilterValue('${colKey}',this.value,this.checked)">
          <span>${v === '' ? '<em style="color:var(--color-ink-tertiary)">vide</em>' : escapeHtml(v)}</span>
        </label>`).join('');

  return `
    <div class="col-filter-title">🔡 ${escapeHtml(col.label)}</div>
    <input class="input col-filter-search" type="text" id="cf-search" placeholder="Rechercher une valeur…"
      oninput="filterValuesSearch(this.value)">
    <div class="col-filter-values" id="cf-values-list">${valItems}</div>
    <div class="col-filter-footer">
      <button class="btn btn--ghost btn--sm" onclick="clearColumnFilter('${colKey}')">✕ Effacer</button>
      <button class="btn btn--ghost btn--sm" onclick="selectAllFilterValues()">Tout décocher</button>
    </div>`;
}

function toggleFilterValue(colKey, value, checked) {
  if (!columnFilters[colKey] || columnFilters[colKey].type !== 'values') {
    columnFilters[colKey] = { type: 'values', values: [] };
  }
  const vals = columnFilters[colKey].values;
  if (checked && !vals.includes(value)) vals.push(value);
  else if (!checked) columnFilters[colKey].values = vals.filter(v => v !== value);
  savePrefs();
  render();
}

function applyRangeFilter(colKey) {
  const min = document.getElementById('cf-min')?.value.trim();
  const max = document.getElementById('cf-max')?.value.trim();
  if (!min && !max) {
    delete columnFilters[colKey];
  } else {
    columnFilters[colKey] = {
      type: 'range',
      min: min !== '' ? Number(min) : null,
      max: max !== '' ? Number(max) : null,
    };
  }
  savePrefs();
  closeFilterDropdown();
  render();
}

function clearColumnFilter(colKey) {
  delete columnFilters[colKey];
  savePrefs();
  closeFilterDropdown();
  render();
}

function clearAllColumnFilters() {
  columnFilters = {};
  savePrefs();
  render();
}

function selectAllFilterValues() {
  const list = document.getElementById('cf-values-list');
  if (!list || !activeFilterCol) return;
  list.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; });
  if (columnFilters[activeFilterCol]) columnFilters[activeFilterCol].values = [];
  savePrefs();
  render();
}

function filterValuesSearch(query) {
  const list = document.getElementById('cf-values-list');
  if (!list) return;
  const q = query.toLowerCase();
  list.querySelectorAll('.col-filter-value-item').forEach(item => {
    const span = item.querySelector('span');
    const text = span ? span.textContent.toLowerCase() : '';
    item.style.display = q === '' || text.includes(q) ? '' : 'none';
  });
}

// ── Filtre Suivi FA (D9d) ─────────────────────────────────────
function toggleFaFilter() {
  faFilterOn = !faFilterOn;
  savePrefs();
  _refreshFaFilterBtn();
  render();
}

function _refreshFaFilterBtn() {
  const b = document.getElementById('btn-fa-filter');
  if (!b) return;
  if (faFilterOn) {
    b.classList.remove('btn--secondary');
    b.classList.add('btn--primary');
    b.textContent = '🌡 Suivi FA · ON';
  } else {
    b.classList.add('btn--secondary');
    b.classList.remove('btn--primary');
    b.textContent = '🌡 Suivi FA';
  }
}
