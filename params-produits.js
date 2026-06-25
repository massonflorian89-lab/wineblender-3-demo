/* params-produits.js — Paramètres : section Produits (Vue par défaut + Import CSV)
 * Dépend de : _subIc() (params-cuverie-groupe.js).
 * produitsVuePrefs doit être var (muté par onchange).
 * NB : confirmProduitsImport() = anciennement confirmImport() dans ce module
 *      (renommé pour éviter la collision avec params-import-cuverie.js).
 */
'use strict';

const PRODUITS_VUE_DEFAULTS = {
  view_mode:    'table',
  sort_by:      'nom',
  sort_asc:     true,
  active_tab:   'catalogue',
};
// var car produitsVuePrefs.view_mode/.sort_by/.active_tab mutés par onchange
var produitsVuePrefs = { ...PRODUITS_VUE_DEFAULTS };

let activeProduitsSubtab = 'vue';

function renderProduitsGroup() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  WB3DB.getUserPref('produits_vue').then(p => {
    produitsVuePrefs = { ...PRODUITS_VUE_DEFAULTS, ...(p || {}) };
    _renderProduitsRoot();
  }).catch(() => _renderProduitsRoot());
}

function _renderProduitsRoot() {
  const root = document.getElementById('settings-content');
  root.innerHTML = `
    <div style="display:flex;gap:var(--space-2);border-bottom:1px solid var(--color-border);margin-bottom:var(--space-4);padding-bottom:var(--space-2)">
      <button class="subtab-btn${activeProduitsSubtab==='vue'?' active':''}"
              onclick="setProduitsSubtab('vue')">${_subIc('settings')}Vue par défaut</button>
      <button class="subtab-btn${activeProduitsSubtab==='import'?' active':''}"
              onclick="setProduitsSubtab('import')">${_subIc('download')}Import CSV</button>
    </div>
    <div id="produits-subroot"></div>
  `;
  _renderProduitsSubContent();
}

function setProduitsSubtab(key) {
  activeProduitsSubtab = key;
  document.querySelectorAll('#settings-content .subtab-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.toLowerCase().includes(key))
  );
  _renderProduitsSubContent();
}

function _renderProduitsSubContent() {
  if (activeProduitsSubtab === 'vue')         _renderProduitsVueUI();
  else if (activeProduitsSubtab === 'import') renderProduitsImport();
}

function _renderProduitsVueUI() {
  const root = document.getElementById('produits-subroot') || document.getElementById('settings-content');
  const p = produitsVuePrefs;
  root.innerHTML = `
    <h2>⚙️ Vue produits</h2>
    <p class="lead">Personnalise l'affichage par défaut de la page Produits. Synchronisé entre appareils.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Mode d'affichage par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          ${[
            { key:'grid',  label:'⊞ Grille (cartes)',  desc:'Affichage visuel en cartes.' },
            { key:'table', label:'☰ Tableau',           desc:'Colonnes détaillées, idéal sur grand écran.' },
          ].map(v => `
            <label style="flex:1;min-width:200px;display:flex;gap:10px;align-items:flex-start;padding:var(--space-3);
              border:2px solid ${p.view_mode===v.key?'var(--color-primary)':'var(--color-border)'};
              border-radius:var(--radius-md);cursor:pointer;
              background:${p.view_mode===v.key?'var(--color-primary-soft)':'var(--color-bg-elevated)'}">
              <input type="radio" name="pv-view" value="${v.key}" ${p.view_mode===v.key?'checked':''}
                     onchange="produitsVuePrefs.view_mode=this.value;_renderProduitsVueUI()">
              <div><div style="font-weight:600">${v.label}</div>
              <div style="font-size:12px;color:var(--color-ink-tertiary)">${v.desc}</div></div>
            </label>`).join('')}
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Onglet affiché par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          ${[
            { key:'catalogue', label:'🧪 Catalogue' },
            { key:'stock',     label:'📦 Stock (lots)' },
            { key:'alertes',   label:'🔔 Alertes DLUO' },
          ].map(t => `
            <button class="subtab-btn${p.active_tab===t.key?' active':''}"
                    onclick="produitsVuePrefs.active_tab='${t.key}';_renderProduitsVueUI()">
              ${t.label}
            </button>`).join('')}
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Tri par défaut (onglet Stock)</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap">
          <select class="select" style="width:auto" onchange="produitsVuePrefs.sort_by=this.value;_renderProduitsVueUI()">
            ${[
              { key:'nom',          label:'Nom produit' },
              { key:'categorie',    label:'Catégorie' },
              { key:'dluo',         label:'DLUO' },
              { key:'quantite_act', label:'Stock restant' },
            ].map(s => `<option value="${s.key}"${p.sort_by===s.key?' selected':''}>${s.label}</option>`).join('')}
          </select>
          <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer">
            <input type="checkbox" ${p.sort_asc?'checked':''}
                   onchange="produitsVuePrefs.sort_asc=this.checked">
            Ordre croissant
          </label>
        </div>
      </div>
    </div>

    <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
      <button class="btn btn--primary" onclick="saveProduitsVuePrefs()">💾 Enregistrer</button>
      <span id="produits-vue-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓ Enregistré</span>
    </div>
  `;
}

async function saveProduitsVuePrefs() {
  try {
    await WB3DB.setUserPref('produits_vue', produitsVuePrefs);
    const el = document.getElementById('produits-vue-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2500); }
    toast('Préférences produits enregistrées', 'success');
  } catch(e) {
    toast('Erreur lors de la sauvegarde', 'error');
  }
}

// ── Import CSV produits ────────────────────────────────────────

const IMPORT_CSV_COLUMNS = [
  { key:'nom_produit',           label:'Nom produit',           required:true,  type:'text'        },
  { key:'categorie',             label:'Catégorie',             required:true,  type:'cat'         },
  { key:'fournisseur',           label:'Fournisseur',           required:false, type:'text'        },
  { key:'unite_utilisation',     label:'Unité utilisation',     required:true,  type:'unite_use'   },
  { key:'unite_stockage',        label:'Unité stockage',        required:true,  type:'unite_stock' },
  { key:'concentration',         label:'Concentration',         required:false, type:'number'      },
  { key:'dose_max',              label:'Dose max (mg/L)',       required:false, type:'number'      },
  { key:'numero_lot',            label:'N° lot',                required:true,  type:'text'        },
  { key:'quantite_initiale',     label:'Quantité',              required:true,  type:'number'      },
  { key:'dluo',                  label:'DLUO',                  required:false, type:'date'        },
  { key:'date_reception',        label:'Date réception',        required:false, type:'date'        },
  { key:'concentration_libelle', label:'Libellé concentration', required:false, type:'text'        },
];
const CATEGORIES_COMMUNES = [
  'sulfites', 'levures', 'enzymes', 'nutriments', 'tanins',
  'gomme arabique', 'colle', 'acide', 'sucre', 'autre',
];
const UNITES_UTILISATION = ['g/hL', 'mg/L', 'mL/hL', 'mL/L', '%'];
const UNITES_STOCKAGE    = ['kg', 'g', 'L', 'mL', 'sachet'];

let importRows = [];
let importExistingProds = [];

async function renderProduitsImport() {
  const root = document.getElementById('produits-subroot') || document.getElementById('settings-content');
  root.innerHTML = `
    <h2>📥 Import CSV produits</h2>
    <p class="lead">Importe en masse ton catalogue produits + tes lots en stock depuis un fichier CSV. Recommandé pour la mise en route d'une cave.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Étape 1 — Télécharger la trame</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Récupère le modèle CSV pré-formaté avec les colonnes obligatoires. Ouvre-le dans Excel/LibreOffice
          (séparateur <b>;</b>, encodage UTF-8) et remplis une ligne par lot de produit.
        </p>
        <button class="btn btn--primary" onclick="downloadImportTemplate()">
          ⬇️ Télécharger la trame CSV
        </button>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Étape 2 — Charger le fichier rempli</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <input type="file" id="import-csv-file" accept=".csv,text/csv,text/plain"
               onchange="handleImportFile(event)"
               style="font-size:var(--text-callout)">
        <p class="t-footnote" style="margin:var(--space-2) 0 0;color:var(--color-ink-tertiary)">
          Le fichier sera prévisualisé dans une table éditable ci-dessous. Tu pourras corriger les erreurs avant l'import.
        </p>
      </div>
    </div>

    <div id="import-preview" style="margin-top:var(--space-4)"></div>
  `;
}

function downloadImportTemplate() {
  const headers = IMPORT_CSV_COLUMNS.map(c => c.key).join(';');
  const example = IMPORT_CSV_COLUMNS.map(c => {
    switch (c.key) {
      case 'nom_produit':           return 'SO2 P18';
      case 'categorie':             return 'sulfites';
      case 'fournisseur':           return 'Cooper';
      case 'unite_utilisation':     return 'g/hL';
      case 'unite_stockage':        return 'kg';
      case 'concentration':         return '180';
      case 'dose_max':              return '60';
      case 'numero_lot':            return 'LOT-2026-001';
      case 'quantite_initiale':     return '25';
      case 'dluo':                  return '2027-12-31';
      case 'date_reception':        return '2026-05-01';
      case 'concentration_libelle': return '180 g actif / kg';
      default: return '';
    }
  }).join(';');
  const example2 = IMPORT_CSV_COLUMNS.map(c => {
    switch (c.key) {
      case 'nom_produit':           return 'SO2 liquide 180';
      case 'categorie':             return 'sulfites';
      case 'fournisseur':           return 'Lafort';
      case 'unite_utilisation':     return 'g/hL';
      case 'unite_stockage':        return 'L';
      case 'concentration':         return '180';
      case 'dose_max':              return '60';
      case 'numero_lot':            return 'LIQ-2026-A';
      case 'quantite_initiale':     return '50';
      case 'dluo':                  return '2028-06-30';
      case 'date_reception':        return '2026-05-01';
      case 'concentration_libelle': return '180 g/L';
      default: return '';
    }
  }).join(';');
  const csv = '﻿' + headers + '\n' + example + '\n' + example2 + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wb3-produits-import-trame.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function handleImportFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseImportCSV(text);
  if (!rows.length) { toast('Aucune ligne valide dans le CSV', 'error'); return; }
  importRows = rows.map(r => ({ ...r, _selected: true, _errors: validateImportRow(r) }));
  try {
    const { data } = await WB3DB.client.from('produits_catalogue')
      .select('id, nom, categorie, unite_stock, concentration, dose_max')
      .eq('tenant_id', WB3DB.getCurrentTenantId());
    importExistingProds = data || [];
  } catch (e) {
    console.warn('[WB3 import] catalogue existant KO :', e);
    importExistingProds = [];
  }
  renderProduitsImportPreview();
}

function parseImportCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const sep = (lines[0].split(';').length >= lines[0].split(',').length) ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] != null ? cols[idx] : ''; });
    if (Object.values(obj).every(v => !v)) continue;
    rows.push(obj);
  }
  return rows;
}

function validateImportRow(row) {
  const errs = [];
  IMPORT_CSV_COLUMNS.forEach(col => {
    const val = (row[col.key] || '').trim();
    if (col.required && !val) { errs.push(`${col.label} obligatoire`); return; }
    if (val && col.type === 'number') {
      if (isNaN(parseFloat(val))) errs.push(`${col.label} doit être un nombre`);
    }
    if (val && col.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) errs.push(`${col.label} format YYYY-MM-DD`);
    }
  });
  return errs;
}

function renderProduitsImportPreview() {
  const root = document.getElementById('import-preview');
  if (!root) return;
  if (!importRows.length) { root.innerHTML = ''; return; }
  const okCount  = importRows.filter(r => r._selected && !r._errors.length).length;
  const errCount = importRows.filter(r => r._errors.length).length;
  const allCats  = [...new Set([
    ...CATEGORIES_COMMUNES,
    ...importExistingProds.map(p => p.categorie).filter(Boolean),
  ])].sort();
  root.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">
        Étape 3 — Aperçu et correction (${importRows.length} ligne${importRows.length>1?'s':''})
      </div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);align-items:center;margin-bottom:var(--space-3);flex-wrap:wrap">
          <span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:var(--radius-pill);font-weight:600;font-size:var(--text-caption)">✓ ${okCount} prêts</span>
          ${errCount > 0 ? `<span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:var(--radius-pill);font-weight:600;font-size:var(--text-caption)">⚠ ${errCount} avec erreurs</span>` : ''}
          <button class="btn btn--ghost btn--sm" onclick="importSelectAll(true)">Tout sélectionner</button>
          <button class="btn btn--ghost btn--sm" onclick="importSelectAll(false)">Tout désélectionner</button>
        </div>
        <div style="overflow-x:auto;border:1px solid var(--color-border);border-radius:var(--radius-md)">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:1200px">
            <thead>
              <tr style="background:var(--color-bg-subtle)">
                <th style="padding:6px 8px;text-align:center;width:32px">✓</th>
                <th style="padding:6px 8px;text-align:left">État</th>
                ${IMPORT_CSV_COLUMNS.map(c => `<th style="padding:6px 8px;text-align:left;white-space:nowrap">${c.label}${c.required?' <span style="color:#b91c1c">*</span>':''}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${importRows.map((row, i) => renderImportRow(row, i, allCats)).join('')}
            </tbody>
          </table>
        </div>
        <datalist id="import-cat-list">
          ${allCats.map(c => `<option value="${escapeHtml(c)}">`).join('')}
        </datalist>
        <datalist id="import-unite-use-list">
          ${UNITES_UTILISATION.map(u => `<option value="${u}">`).join('')}
        </datalist>
        <datalist id="import-unite-stock-list">
          ${UNITES_STOCKAGE.map(u => `<option value="${u}">`).join('')}
        </datalist>
        <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
          <button class="btn btn--primary" id="btn-confirm-import" onclick="confirmProduitsImport()"
            ${okCount === 0 ? 'disabled' : ''}>
            ✓ Importer ${okCount} ligne${okCount>1?'s':''}
          </button>
          <button class="btn btn--secondary" onclick="importRows=[];renderProduitsImport()">
            ✕ Annuler
          </button>
          <span id="import-status" style="font-size:var(--text-caption);color:var(--color-ink-tertiary)"></span>
        </div>
      </div>
    </div>
  `;
}

function renderImportRow(row, i, allCats) {
  const hasErr = row._errors.length > 0;
  const existingMatch = importExistingProds.find(p =>
    p.nom && row.nom_produit &&
    p.nom.trim().toLowerCase() === row.nom_produit.trim().toLowerCase()
  );
  const statusBadge = hasErr
    ? `<span style="background:#fee2e2;color:#991b1b;padding:1px 6px;border-radius:var(--radius-sm);font-size:10px;font-weight:600" title="${escapeHtml(row._errors.join(' · '))}">⚠ erreur</span>`
    : existingMatch
      ? `<span style="background:#e0f2fe;color:#075985;padding:1px 6px;border-radius:var(--radius-sm);font-size:10px;font-weight:600" title="Produit catalogue existant — ajoute un lot à ce produit existant">📦 +lot</span>`
      : `<span style="background:#dcfce7;color:#166534;padding:1px 6px;border-radius:var(--radius-sm);font-size:10px;font-weight:600">✨ nouveau</span>`;
  const cells = IMPORT_CSV_COLUMNS.map(col => {
    const val = row[col.key] || '';
    const cellStyle = (col.required && !val) ? 'background:#fef2f2' : '';
    let input = '';
    if (col.type === 'cat' || col.type === 'unite_use' || col.type === 'unite_stock') {
      const listId = col.type === 'cat' ? 'import-cat-list'
                   : col.type === 'unite_use' ? 'import-unite-use-list'
                   : 'import-unite-stock-list';
      input = `<input type="text" list="${listId}" value="${escapeHtml(val)}"
        oninput="updateImportCell(${i},'${col.key}',this.value)"
        style="width:100%;border:0;background:transparent;padding:2px 4px">`;
    } else if (col.type === 'date') {
      input = `<input type="date" value="${escapeHtml(val)}"
        oninput="updateImportCell(${i},'${col.key}',this.value)"
        style="width:100%;border:0;background:transparent;padding:2px 4px">`;
    } else if (col.type === 'number') {
      input = `<input type="number" step="any" value="${escapeHtml(val)}"
        oninput="updateImportCell(${i},'${col.key}',this.value)"
        style="width:100%;border:0;background:transparent;padding:2px 4px;text-align:right">`;
    } else {
      input = `<input type="text" value="${escapeHtml(val)}"
        oninput="updateImportCell(${i},'${col.key}',this.value)"
        style="width:100%;border:0;background:transparent;padding:2px 4px">`;
    }
    return `<td style="padding:0;border-top:1px solid var(--color-border);${cellStyle}">${input}</td>`;
  }).join('');
  return `
    <tr style="${hasErr ? 'background:#fef2f2' : ''}">
      <td style="padding:6px 8px;text-align:center;border-top:1px solid var(--color-border)">
        <input type="checkbox" ${row._selected?'checked':''} ${hasErr?'disabled':''}
          onchange="importRows[${i}]._selected=this.checked;renderProduitsImportPreview()">
      </td>
      <td style="padding:6px 8px;border-top:1px solid var(--color-border)">${statusBadge}</td>
      ${cells}
    </tr>`;
}

function updateImportCell(idx, key, value) {
  importRows[idx][key] = value;
  importRows[idx]._errors = validateImportRow(importRows[idx]);
  renderProduitsImportPreview();
}

function importSelectAll(state) {
  importRows.forEach(r => { if (!r._errors.length) r._selected = state; });
  renderProduitsImportPreview();
}

async function confirmProduitsImport() {
  const status = document.getElementById('import-status');
  const btn    = document.getElementById('btn-confirm-import');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Import en cours…'; }
  if (status) status.textContent = '';
  const toImport = importRows.filter(r => r._selected && !r._errors.length);
  let okProd = 0, okLot = 0, errs = [];
  const tenantId = WB3DB.getCurrentTenantId();
  for (let i = 0; i < toImport.length; i++) {
    const row = toImport[i];
    if (status) status.textContent = `Import ${i+1}/${toImport.length}…`;
    try {
      const nom = (row.nom_produit || '').trim();
      let existing = importExistingProds.find(p =>
        p.nom && p.nom.trim().toLowerCase() === nom.toLowerCase()
      );
      let produitId;
      if (existing) {
        produitId = existing.id;
      } else {
        const { data: newProd, error: ePc } = await WB3DB.client
          .from('produits_catalogue')
          .insert({
            tenant_id:             tenantId,
            nom:                   nom,
            categorie:             row.categorie || 'autre',
            fournisseur:           row.fournisseur || null,
            dose_unite:            row.unite_utilisation || null,
            unite_stock:           row.unite_stockage || null,
            concentration:         row.concentration ? parseFloat(row.concentration) : null,
            concentration_libelle: row.concentration_libelle || null,
            dose_max:              row.dose_max ? parseFloat(row.dose_max) : null,
          })
          .select('id, nom, categorie, unite_stock, concentration, dose_max')
          .single();
        if (ePc || !newProd) throw ePc || new Error('Création catalogue échouée');
        produitId = newProd.id;
        importExistingProds.push(newProd);
        okProd++;
      }
      const qty = parseFloat(row.quantite_initiale);
      const { error: ePl } = await WB3DB.client
        .from('produits_lots')
        .insert({
          tenant_id:         tenantId,
          produit_id:        produitId,
          numero_lot:        (row.numero_lot || '').trim() || null,
          quantite_initiale: isNaN(qty) ? null : qty,
          quantite_actuelle: isNaN(qty) ? null : qty,
          unite:             row.unite_stockage || null,
          dluo:              row.dluo || null,
          date_reception:    row.date_reception || null,
          fournisseur:       row.fournisseur || null,
        });
      if (ePl) throw ePl;
      okLot++;
    } catch (e) {
      console.warn('[WB3 import] ligne', i, 'KO :', e);
      errs.push(`Ligne ${i+1} (${row.nom_produit || '?'}) : ${e.message || e}`);
    }
  }
  if (btn) { btn.disabled = false; btn.textContent = `✓ Importer ${toImport.length} ligne${toImport.length>1?'s':''}`; }
  if (errs.length === 0) {
    toast(`Import OK : ${okLot} lot${okLot>1?'s':''} créé${okLot>1?'s':''} (${okProd} nouveaux produits catalogue)`, 'success');
    importRows = [];
    renderProduitsImport();
  } else {
    const msg = `Import partiel : ${okLot} OK / ${errs.length} échec${errs.length>1?'s':''}.\n\n` + errs.slice(0, 10).join('\n');
    WB3UI.alert(msg, { title:'Import partiel' });
    if (status) status.innerHTML = `<span style="color:var(--color-danger)">${errs.length} échec${errs.length>1?'s':''} — voir détail dans l'alerte</span>`;
  }
}
