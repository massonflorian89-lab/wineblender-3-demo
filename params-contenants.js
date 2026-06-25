/* params-contenants.js — Paramètres : sous-section Contenants
 * Dépend de : _getSubRoot() (params-cuverie-groupe.js),
 *             CUVE_SVG (var dans main), travees / contenants / editingContenantId (var dans main).
 */
'use strict';

const CONTENANT_TYPES = [
  { value:'cuve',       label:'Cuve inox'  },
  { value:'foudre',     label:'Foudre'     },
  { value:'fut',        label:'Fût'        },
  { value:'demi_muid',  label:'Demi-muid'  },
  { value:'cuve_bois',  label:'Cuve bois'  },
  { value:'pressoir',   label:'Pressoir'   },
  { value:'autre',      label:'Autre'      },
];
const BARREL_TYPES = new Set(['fut','foudre','demi_muid','cuve_bois']);
const CHAUFFE_OPTIONS = [
  { value:'',            label:'—'           },
  { value:'legere',      label:'Légère'      },
  { value:'moyenne',     label:'Moyenne'     },
  { value:'forte',       label:'Forte'       },
  { value:'extra_forte', label:'Extra-forte' },
];

async function renderContenantsSection() {
  const root = _getSubRoot();
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    contenants = await WB3DB.listTable('contenants', { order: 'nom', ascending: true });
  } catch(e) { contenants = []; console.warn(e); }
  editingContenantId = null;
  _renderContenantsUI();
}

function _contenantTypeLabel(t) {
  return CONTENANT_TYPES.find(x => x.value === t)?.label || t;
}

function _renderContenantsUI() {
  const root = _getSubRoot();
  const traveeMap = new Map(travees.map(t => [t.id, t.nom]));

  const groups = {};
  contenants.forEach(c => {
    const key = c.travee_id ? (traveeMap.get(c.travee_id) || 'Travée inconnue') : 'Sans travée';
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const listHtml = !contenants.length
    ? `<div class="empty-state" style="padding:var(--space-8) var(--space-4)">
        <div class="icon">${CUVE_SVG}</div>
        <div class="title">Aucun contenant</div>
        <div class="desc">Crée ton premier contenant avec le bouton ci-dessus, ou importe-les via CSV (onglet Cuverie → Import).</div>
       </div>`
    : Object.entries(groups).map(([traveeNom, list]) => `
        <div style="margin-bottom:var(--space-5)">
          <div style="font-weight:600;font-size:var(--text-caption);color:var(--color-ink-tertiary);
                      text-transform:uppercase;letter-spacing:.5px;margin-bottom:var(--space-2)">
            📍 ${escapeHtml(traveeNom)} <span style="font-weight:400">(${list.length})</span>
          </div>
          ${list.map(c => `
            <div class="list-item">
              <div class="item-main">
                <div class="nom">${escapeHtml(c.nom)}</div>
                <div class="desc">
                  <span class="tag" style="font-size:10px">${escapeHtml(_contenantTypeLabel(c.type))}</span>
                  ${c.capacite_hl} hL
                  ${c.materiau ? ' · ' + escapeHtml(c.materiau) : ''}
                  ${!c.actif ? '<span class="tag" style="font-size:10px;opacity:.6">Inactif</span>' : ''}
                </div>
              </div>
              <div class="item-actions">
                <button title="Modifier" onclick="openContenantForm('${c.id}')">✏️</button>
                <button class="danger" title="Supprimer" onclick="deleteContenant('${c.id}')">🗑</button>
              </div>
            </div>`).join('')}
        </div>`).join('');

  root.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-4)">
      <div>
        <h2 style="margin:0 0 var(--space-1)">${CUVE_SVG} Contenants</h2>
        <p class="t-footnote" style="margin:0;color:var(--color-ink-tertiary)">
          ${contenants.length} contenant${contenants.length !== 1 ? 's' : ''} enregistré${contenants.length !== 1 ? 's' : ''}
        </p>
      </div>
      <button class="btn" onclick="openContenantForm(null)">+ Nouveau contenant</button>
    </div>
    <div id="contenant-form-area" style="display:none"></div>
    <div id="contenants-list">${listHtml}</div>
  `;
}

function openContenantForm(id) {
  editingContenantId = id;
  const c = id ? contenants.find(x => x.id === id) : null;
  const isBarrel = c ? BARREL_TYPES.has(c.type) : false;
  const mkTypeOpts   = () => CONTENANT_TYPES.map(t =>
    `<option value="${t.value}"${(c?.type || 'cuve') === t.value ? ' selected' : ''}>${t.label}</option>`).join('');
  const mkTraveeOpts = () => `<option value="">— Sans travée —</option>` +
    travees.map(t => `<option value="${t.id}"${c?.travee_id === t.id ? ' selected' : ''}>${escapeHtml(t.nom)}</option>`).join('');
  const mkChauffeOpts = () => CHAUFFE_OPTIONS.map(o =>
    `<option value="${o.value}"${(c?.chauffe || '') === o.value ? ' selected' : ''}>${o.label}</option>`).join('');

  const formArea = document.getElementById('contenant-form-area');
  formArea.style.display = '';
  formArea.innerHTML = `
    <div class="drawer-section" style="margin-bottom:var(--space-4);border:2px solid var(--color-primary);border-radius:var(--radius-lg);background:var(--color-bg-elevated)">
      <div class="drawer-section-title">${c ? 'Modifier · ' + escapeHtml(c.nom) : 'Nouveau contenant'}</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-3);margin-bottom:var(--space-3)">
          <div>
            <label class="label">Nom *</label>
            <input class="input" id="cf-nom" type="text" maxlength="100" placeholder="CX001, Fût 12…" value="${escapeHtml(c?.nom || '')}">
          </div>
          <div>
            <label class="label">Type *</label>
            <select class="select" id="cf-type" onchange="updateContenantFormBarrel()">${mkTypeOpts()}</select>
          </div>
          <div>
            <label class="label">Capacité (hL) *</label>
            <input class="input" id="cf-capa" type="number" step="0.01" min="0.01" placeholder="150" value="${c?.capacite_hl || ''}">
          </div>
          <div>
            <label class="label">Travée</label>
            <select class="select" id="cf-travee">${mkTraveeOpts()}</select>
          </div>
          <div>
            <label class="label">Matériaux</label>
            <input class="input" id="cf-mat" type="text" maxlength="60" placeholder="INOX, Béton, Chêne…" value="${escapeHtml(c?.materiau || '')}">
          </div>
          <div>
            <label class="label">Marque / Fabricant</label>
            <input class="input" id="cf-marque" type="text" maxlength="80" placeholder="Pera-Pellenc…" value="${escapeHtml(c?.marque || '')}">
          </div>
          <div>
            <label class="label">Année mise en service</label>
            <input class="input" id="cf-annee" type="number" min="1900" max="2100" placeholder="2018" value="${c?.annee_mise_service || ''}">
          </div>
          <div style="display:flex;flex-direction:column;justify-content:flex-end">
            <label class="toggle" style="padding:8px 0">
              <input type="checkbox" id="cf-actif" ${(c?.actif ?? true) ? 'checked' : ''}>
              Actif (visible en cuverie)
            </label>
          </div>
        </div>

        <div id="cf-barrel-fields" style="${isBarrel ? '' : 'display:none'}">
          <div style="border-top:1px solid var(--color-border);padding-top:var(--space-3);margin-bottom:var(--space-3)">
            <div style="font-weight:600;font-size:var(--text-caption);color:var(--color-ink-tertiary);
                        text-transform:uppercase;letter-spacing:.5px;margin-bottom:var(--space-3)">Tonnellerie</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--space-3)">
              <div>
                <label class="label">Tonnelier</label>
                <input class="input" id="cf-tonnelier" type="text" maxlength="80" placeholder="Stockinger…" value="${escapeHtml(c?.tonnelier || '')}">
              </div>
              <div>
                <label class="label">Origine du bois</label>
                <input class="input" id="cf-origine" type="text" maxlength="80" placeholder="Chêne Allier…" value="${escapeHtml(c?.origine_bois || '')}">
              </div>
              <div>
                <label class="label">Chauffe</label>
                <select class="select" id="cf-chauffe">${mkChauffeOpts()}</select>
              </div>
              <div>
                <label class="label">Spécificités</label>
                <input class="input" id="cf-specificites" type="text" maxlength="200" placeholder="Grain serré…" value="${escapeHtml(c?.specificites || '')}">
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:var(--space-2);justify-content:flex-end;padding-top:var(--space-3);border-top:1px solid var(--color-border)">
          <button class="btn btn--secondary" onclick="closeContenantForm()">Annuler</button>
          <button class="btn" onclick="saveContenant()">💾 ${c ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </div>
    </div>
  `;
  formArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateContenantFormBarrel() {
  const type   = document.getElementById('cf-type')?.value;
  const barrel = document.getElementById('cf-barrel-fields');
  if (barrel) barrel.style.display = BARREL_TYPES.has(type) ? '' : 'none';
}

function closeContenantForm() {
  const fa = document.getElementById('contenant-form-area');
  if (fa) { fa.style.display = 'none'; fa.innerHTML = ''; }
  editingContenantId = null;
}

async function saveContenant() {
  const nom  = document.getElementById('cf-nom')?.value.trim();
  const type = document.getElementById('cf-type')?.value;
  const capa = parseFloat(document.getElementById('cf-capa')?.value);
  if (!nom)               { toast('Le nom est obligatoire', 'error'); return; }
  if (isNaN(capa) || capa <= 0) { toast('La capacité doit être > 0', 'error'); return; }

  const isBarrel  = BARREL_TYPES.has(type);
  const travee_id = document.getElementById('cf-travee')?.value || null;

  const payload = {
    nom, type, capacite_hl: capa,
    travee_id:          travee_id || null,
    materiau:           document.getElementById('cf-mat')?.value.trim()    || null,
    marque:             document.getElementById('cf-marque')?.value.trim() || null,
    annee_mise_service: parseInt(document.getElementById('cf-annee')?.value || '') || null,
    actif:              document.getElementById('cf-actif')?.checked ?? true,
    tonnelier:    isBarrel ? (document.getElementById('cf-tonnelier')?.value.trim()    || null) : null,
    origine_bois: isBarrel ? (document.getElementById('cf-origine')?.value.trim()      || null) : null,
    chauffe:      isBarrel ? (document.getElementById('cf-chauffe')?.value             || null) : null,
    specificites: isBarrel ? (document.getElementById('cf-specificites')?.value.trim() || null) : null,
  };

  try {
    if (editingContenantId) {
      const row = await WB3DB.updateRow('contenants', editingContenantId, payload);
      if (row) {
        const i = contenants.findIndex(x => x.id === editingContenantId);
        if (i >= 0) contenants[i] = row; else contenants.push(row);
      }
      toast('Contenant mis à jour', 'success');
    } else {
      const row = await WB3DB.insertRow('contenants', { ...payload, tags: [] });
      if (row) contenants.push(row);
      toast('Contenant créé', 'success');
    }
    closeContenantForm();
    _renderContenantsUI();
  } catch(e) {
    if (e.code === '23505' || /duplicate/i.test(e.message))
      toast('Un contenant avec ce nom existe déjà', 'error');
    else
      toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}

async function deleteContenant(id) {
  const c = contenants.find(x => x.id === id);
  if (!c) return;
  if (!(await WB3UI.confirm(`Supprimer "${c.nom}" ?\n\nSi ce contenant est associé à des lots ou des opérations, la suppression sera bloquée.`, { title:'Supprimer le contenant', okText:'Supprimer', danger:true }))) return;
  try {
    await WB3DB.deleteRow('contenants', id);
    contenants = contenants.filter(x => x.id !== id);
    if (editingContenantId === id) closeContenantForm();
    _renderContenantsUI();
    toast('Contenant supprimé', 'success');
  } catch(e) {
    if (e.code === '23503' || /foreign key/i.test(e.message))
      toast('Ce contenant est utilisé — impossible à supprimer', 'error');
    else
      toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}
