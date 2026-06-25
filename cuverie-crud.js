// cuverie-crud.js — CRUD contenant (drawer édition/création), tags, export CSV
// Extrait de cuverie.html (Étape 8 de la refactorisation progressive).
//
// Périmètre : tout le cycle de vie « fiche contenant éditable » (≠ fiche
// lecture seule, qui est dans cuverie-drawer.js) :
//   • refreshTraveeSelect — peuple le <select> travée du formulaire
//   • openDrawer / closeDrawer — ouverture/fermeture du drawer d'édition
//   • saveContenant — insert/update contenant (WB3DB)
//   • deleteCurrent — archivage (soft-delete)
//   • updateBarrelFields — affiche/masque les champs bois selon le type
//   • onCuveClick — clic sur une carte/ligne → fiche lecture (openDetailDrawer)
//   • editContenantFromDetail — passerelle fiche → édition
//   • renderTags — input tags du formulaire
//   • exportCSV — export de la sélection filtrée
//
// Globals lus (cuverie.html principal ou modules précédents) :
//   contenants, travees, editingId, currentTags, WB3DB, WB3UI, toast,
//   escapeHtml, getFiltered, getTraveeNom, TYPE_LABELS,
//   openDetailDrawer, closeDetailDrawer (cuverie-drawer.js),
//   _pointBroadcast, renderTags+updateBarrelFields (définis ici)
//
// Scripts classiques : fonctions globales → atteignables par les handlers
// inline (onclick="editContenantFromDetail()") et par cuverie-render.js
// (addEventListener('click', () => onCuveClick(c))). Chargé avant le <script>
// principal ; aucun appel top-level → ordre de chargement indifférent.

'use strict';

// ============================================================
// Drawer (édition / création)
// ============================================================
function refreshTraveeSelect() {
  const sel = document.getElementById('f-travee');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Aucune travée —</option>' +
    travees.map(t => `<option value="${t.id}">${escapeHtml(t.nom)}</option>`).join('');
  // Restore previous selection if still valid
  if (current && travees.some(t => t.id === current)) sel.value = current;
}

function openDrawer(id = null) {
  if (WB3DB.isPrivileged && !WB3DB.isPrivileged()) {
    toast('Gestion des contenants réservée aux responsables.', 'error');
    return;
  }
  editingId = id;
  const isEdit = !!id;
  document.getElementById('drawer-title').textContent = isEdit ? 'Modifier le contenant' : 'Nouveau contenant';
  document.getElementById('drawer-quick').style.display = isEdit ? '' : 'none';
  document.getElementById('btn-delete').style.display = (isEdit && WB3DB.isPrivileged()) ? '' : 'none';

  // Toujours rafraîchir la liste des travées disponibles
  refreshTraveeSelect();

  if (isEdit) {
    const c = contenants.find(x => x.id === id);
    if (!c) return;
    document.getElementById('f-nom').value          = c.nom;
    document.getElementById('f-type').value         = c.type;
    document.getElementById('f-capacite').value     = c.capacite_hl;
    document.getElementById('f-travee').value       = c.travee_id || '';
    document.getElementById('f-localisation').value = c.localisation || '';
    document.getElementById('f-actif').checked      = c.actif;
    document.getElementById('f-materiau').value     = c.materiau || '';
    document.getElementById('f-marque').value       = c.marque || '';
    document.getElementById('f-tonnelier').value    = c.tonnelier || '';
    document.getElementById('f-annee').value        = c.annee_mise_service || '';
    document.getElementById('f-prix').value         = c.prix_achat || '';
    document.getElementById('f-origine-bois').value = c.origine_bois || '';
    document.getElementById('f-chauffe').value      = c.chauffe || '';
    document.getElementById('f-specificites').value = c.specificites || '';
    currentTags = [...(c.tags || [])];
  } else {
    document.getElementById('f-nom').value          = '';
    document.getElementById('f-type').value         = 'cuve';
    document.getElementById('f-capacite').value     = '';
    document.getElementById('f-travee').value       = '';
    document.getElementById('f-localisation').value = '';
    document.getElementById('f-actif').checked      = true;
    document.getElementById('f-materiau').value     = '';
    document.getElementById('f-marque').value       = '';
    document.getElementById('f-tonnelier').value    = '';
    document.getElementById('f-annee').value        = '';
    document.getElementById('f-prix').value         = '';
    document.getElementById('f-origine-bois').value = '';
    document.getElementById('f-chauffe').value      = '';
    document.getElementById('f-specificites').value = '';
    currentTags = [];
  }
  renderTags();
  updateBarrelFields();

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('open');
  setTimeout(() => document.getElementById('f-nom').focus(), 200);
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('open');
  editingId = null;
}

async function saveContenant() {
  const nom = document.getElementById('f-nom').value.trim();
  if (!nom) { toast('Le nom est obligatoire', 'error'); return; }
  const capacite = parseFloat(document.getElementById('f-capacite').value);
  if (isNaN(capacite) || capacite <= 0) { toast('Capacité invalide', 'error'); return; }

  const annee = parseInt(document.getElementById('f-annee').value, 10);
  const prix  = parseFloat(document.getElementById('f-prix').value);

  const type = document.getElementById('f-type').value;
  const isBarrel = ['fut','foudre','demi_muid','cuve_bois'].includes(type);

  const payload = {
    nom,
    type,
    capacite_hl:         capacite,
    travee_id:           document.getElementById('f-travee').value || null,
    localisation:        document.getElementById('f-localisation').value.trim() || null,
    tags:                currentTags,
    actif:               document.getElementById('f-actif').checked,
    materiau:            document.getElementById('f-materiau').value.trim() || null,
    marque:              document.getElementById('f-marque').value.trim()   || null,
    tonnelier:           document.getElementById('f-tonnelier').value.trim() || null,
    annee_mise_service:  isNaN(annee) ? null : annee,
    prix_achat:          isNaN(prix)  ? null : prix,
    origine_bois:        isBarrel ? (document.getElementById('f-origine-bois').value.trim() || null) : null,
    chauffe:             isBarrel ? (document.getElementById('f-chauffe').value || null)             : null,
    specificites:        isBarrel ? (document.getElementById('f-specificites').value.trim() || null) : null,
  };

  try {
    if (editingId) {
      await WB3DB.updateRow('contenants', editingId, payload);
      toast('Contenant mis à jour', 'success');
    } else {
      await WB3DB.insertRow('contenants', payload);
      toast('Contenant créé', 'success');
    }
    closeDrawer();
  } catch(e) {
    console.error(e);
    if (e.code === '23505' || /duplicate/i.test(e.message)) {
      toast('Un contenant avec ce nom existe déjà', 'error');
    } else {
      toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    }
  }
}

async function deleteCurrent() {
  if (!editingId) return;
  const c = contenants.find(x => x.id === editingId);
  if (!c) return;
  if (!(await WB3UI.confirm(`Archiver le contenant "${c.nom}" ?\n\nIl sera masqué de la cuverie mais conservé pour la traçabilité.\nRécupérable dans Paramètres → Corbeille.`, { title:'Archiver le contenant', okText:'Archiver' }))) return;
  try {
    await WB3DB.softDelete('contenants', editingId);
    toast('Contenant archivé', 'success');
    closeDrawer();
  } catch(e) {
    console.error(e);
    if (e.code === '23503' || /foreign key/i.test(e.message)) {
      toast('Impossible : ce contenant est référencé par des lots', 'error');
    } else {
      toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    }
  }
}

// ============================================================
// Barrel fields visibility
// ============================================================
function updateBarrelFields() {
  const type = document.getElementById('f-type')?.value || '';
  const show = ['fut','foudre','demi_muid','cuve_bois'].includes(type);
  const sec  = document.getElementById('barrel-section');
  if (sec) sec.style.display = show ? '' : 'none';
}

// ============================================================
// Click contenant → fiche rapide (toujours)
// ============================================================
function onCuveClick(c) {
  _pointBroadcast(c.id);   // M5 : pointe la cuve sur les autres fenêtres (mur, 2ᵉ écran)
  openDetailDrawer(c);
}

// ============================================================
// Fiche rapide contenant (drawer lecture)
// ============================================================
// _detailContenantId, _isBoisContenant, _NEXT_ACTION_BASE, _ddNextAction,
// _ddBarHot, _ddActbarContext → cuverie-drawer.js

// openDetailDrawer, closeDetailDrawer → cuverie-drawer.js

// _drawerTab, _drawerMoreOpen, _drawerResetMore, toggleDrawerMore → cuverie-drawer.js

// _n2Cache/Fetch/Prefetch/_wireN2Hover, selectDrawerTab,
// _drawerMarkUpdated, _ddShowLotPicker → cuverie-drawer.js

// openTraceFromDrawer, openTraceModal, closeTraceModal,
// buildTraceTree, GENO_MODE_COLORS, renderTraceTree → cuverie-trace.js

function editContenantFromDetail() {
  const id = _detailContenantId;
  closeDetailDrawer();
  if (id) openDrawer(id);
}

// ============================================================
// Tags input
// ============================================================
function renderTags() {
  const container = document.getElementById('f-tags-container');
  container.querySelectorAll('.tag-chip').forEach(t => t.remove());
  const input = document.getElementById('f-tags-input');
  currentTags.forEach((t, i) => {
    const el = document.createElement('span');
    el.className = 'tag-chip';
    el.innerHTML = `${escapeHtml(t)}<button type="button" data-i="${i}" aria-label="Retirer">×</button>`;
    el.querySelector('button').addEventListener('click', (e) => {
      currentTags.splice(parseInt(e.target.dataset.i, 10), 1);
      renderTags();
    });
    container.insertBefore(el, input);
  });
}

// ============================================================
// Export CSV — contenant + lot principal + métriques
// ============================================================
function exportCSV() {
  const items = getFiltered();
  if (!items.length) { toast('Aucun contenant à exporter', 'error'); return; }
  const headers = [
    'Nom', 'Type', 'Matériau', 'Capacité (hL)', 'Travée', 'Précision', 'Marque', 'Année', 'Prix (€)', 'Tags', 'Actif',
    'Lot principal', 'Millésime', 'Couleur', 'Statut lot', 'Volume (hL)', 'Remplissage (%)',
    'Nb lots', 'Lots (tous)',
  ];
  const rows = items.map(c => {
    const lots = lotsMap.get(c.id) || [];
    const lp   = getPrincipalLot(c);
    const vol  = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
    const pct  = (c.capacite_hl && vol) ? Math.round(vol / c.capacite_hl * 100) : '';
    return [
      c.nom,
      TYPE_LABELS[c.type] || c.type,
      c.materiau || '',
      c.capacite_hl,
      getTraveeNom(c.travee_id) || '',
      c.localisation || '',
      c.marque || '',
      c.annee_mise_service || '',
      c.prix_achat != null ? c.prix_achat : '',
      (c.tags || []).join('|'),
      c.actif ? 'oui' : 'non',
      lp ? lp.nom : '',
      lp ? (lp.millesime || '') : '',
      lp ? (lp.couleur || '') : '',
      lp ? (lp.statut || '') : '',
      vol > 0 ? vol : '',
      pct,
      lots.length || '',
      lots.map(l => l.nom + (l.millesime ? ' ' + l.millesime : '')).join(' | '),
    ];
  });
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cuverie-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`${items.length} contenant${items.length>1?'s':''} exporté${items.length>1?'s':''}`, 'success');
}
