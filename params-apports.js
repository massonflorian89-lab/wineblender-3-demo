/* params-apports.js — Paramètres : section Apports (Vue | Import CSV | Export CSV | Rendement)
 * Dépend de : _subIc() (params-cuverie-groupe.js).
 * apportsVuePrefs doit être var (muté par onchange).
 */
'use strict';

const APPORTS_VUE_DEFAULTS = { view_mode: 'table' };
// var car apportsVuePrefs.view_mode muté par onchange généré
var apportsVuePrefs     = { ...APPORTS_VUE_DEFAULTS };
let activeApportsSubtab = 'vue';

const APPORTS_IMPORT_FIELDS = [
  { key:'date_apport',    label:'Date apport',       type:'date' },
  { key:'heure_apport',   label:'Heure apport',      type:'text' },
  { key:'numero',         label:'Numéro',            type:'text' },
  { key:'apporteur',      label:'Apporteur',         type:'text' },
  { key:'provenance',     label:'Provenance',        type:'text' },
  { key:'cepage_libre',   label:'Cépage (libre)',    type:'text' },
  { key:'millesime',      label:'Millésime',         type:'int'  },
  { key:'poids_kg',       label:'Poids (kg)',        type:'float'},
  { key:'volume_hl',      label:'Volume (hL)',       type:'float'},
  { key:'degre_probable', label:'Degré probable',    type:'float'},
  { key:'tat',            label:'TAT',               type:'float'},
  { key:'ph',             label:'pH',                type:'float'},
  { key:'temperature_c',  label:'Température (°C)',  type:'float'},
  { key:'notes',          label:'Notes',             type:'text' },
];

// var car mutés directement par onchange dans _apBuildMappingUI
var _apportsCsvHeaders = [];
var _apportsCsvRows    = [];
var _apportsCsvMapping = {};

async function renderApportsVueSettings() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const p = await WB3DB.getUserPref('apports_vue');
    apportsVuePrefs = { ...APPORTS_VUE_DEFAULTS, ...(p || {}) };
  } catch(e) { console.warn(e); }
  _renderApportsRoot();
}

function _renderApportsRoot() {
  const root = document.getElementById('settings-content');
  root.innerHTML = `
    <div style="display:flex;gap:var(--space-2);border-bottom:1px solid var(--color-border);margin-bottom:var(--space-4);padding-bottom:var(--space-2)">
      <button class="subtab-btn${activeApportsSubtab==='vue'?' active':''}"
              onclick="setApportsSubtab('vue')">${_subIc('settings')}Vue par défaut</button>
      <button class="subtab-btn${activeApportsSubtab==='import'?' active':''}"
              onclick="setApportsSubtab('import')">${_subIc('download')}Import CSV</button>
      <button class="subtab-btn${activeApportsSubtab==='export'?' active':''}"
              onclick="setApportsSubtab('export')">${_subIc('upload')}Export CSV</button>
      <button class="subtab-btn${activeApportsSubtab==='rendement'?' active':''}"
              onclick="setApportsSubtab('rendement')">${_subIc('trendingUp')}Rendement</button>
    </div>
    <div id="apports-subroot"></div>
  `;
  _renderApportsSubContent();
}

function setApportsSubtab(key) {
  activeApportsSubtab = key;
  document.querySelectorAll('#settings-content .subtab-btn').forEach(b => {
    b.classList.toggle('active',
      (key==='vue'       && b.textContent.includes('Vue'))     ||
      (key==='import'    && b.textContent.includes('Import'))  ||
      (key==='export'    && b.textContent.includes('Export'))  ||
      (key==='rendement' && b.textContent.includes('Rendement'))
    );
  });
  _renderApportsSubContent();
}

function _renderApportsSubContent() {
  if      (activeApportsSubtab === 'vue')       _renderApportsVueUI();
  else if (activeApportsSubtab === 'import')    _renderApportsImport();
  else if (activeApportsSubtab === 'export')    _renderApportsExport();
  else if (activeApportsSubtab === 'rendement') _renderApportsRendement();
}

// ── Rendement vendange ─────────────────────────────────────────

let _apRdtDefaut  = 130;
let _apRdtCepages = [];

async function _renderApportsRendement() {
  const root = document.getElementById('apports-subroot') || document.getElementById('settings-content');
  if (WB3DB.ensureModule && !(await WB3DB.ensureModule('apports_rendement', root))) return;
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const [tol, ceps] = await Promise.all([
      WB3DB.getTolerances ? WB3DB.getTolerances() : Promise.resolve({}),
      WB3DB.listRendementCepage ? WB3DB.listRendementCepage() : Promise.resolve([]),
    ]);
    if (tol && tol.rendement_kg_hl != null) _apRdtDefaut = Number(tol.rendement_kg_hl);
    _apRdtCepages = ceps || [];
  } catch(e) { console.warn('[rendement]', e); }
  _renderApportsRendementUI();
}

function _renderApportsRendementUI() {
  const root = document.getElementById('apports-subroot') || document.getElementById('settings-content');
  const isPriv = WB3DB.isPrivileged && WB3DB.isPrivileged();
  const cepRows = _apRdtCepages.map(c => `
    <tr>
      <td style="padding:6px 12px;font-weight:600">${escapeHtml(c.cepage)}</td>
      <td style="padding:6px 12px;text-align:right">${c.rendement_kg_hl} kg/hL</td>
      <td style="padding:6px 12px;text-align:right">
        ${isPriv ? `<button class="btn btn--ghost btn--sm" onclick="apRdtDeleteCepage('${escapeHtml(c.cepage)}')" title="Supprimer">🗑</button>` : ''}
      </td>
    </tr>`).join('');

  root.innerHTML = `
    <h2>📈 Rendement vendange</h2>
    <p class="lead">Coefficient de référence kg de raisin pour 1 hL de jus. Sert au calcul
      du rendement et du % d'extraction à l'apport. ${!isPriv ? '<b>Lecture seule.</b>' : ''}</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Coefficient par défaut (toute la cave)</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input class="input" type="number" step="1" id="ap-rdt-defaut" value="${_apRdtDefaut}"
                 ${isPriv ? '' : 'disabled'} style="width:110px;text-align:right">
          <span>kg/hL</span>
          ${isPriv ? `<button class="btn btn--primary btn--sm" onclick="apRdtSaveDefaut()">💾 Enregistrer</button>
            <span id="ap-rdt-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓</span>` : ''}
        </div>
        <p style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin:var(--space-2) 0 0">
          Usuel : 130 kg/hL. Plus la valeur est basse, meilleure est l'extraction.
        </p>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Surcharge par cépage <span style="font-weight:400;color:var(--color-ink-tertiary)">(optionnel)</span></div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        ${isPriv ? `
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:end;margin-bottom:var(--space-3)">
          <div class="field"><label class="field-label">Cépage</label>
            <input class="input" type="text" id="ap-rdt-cep-nom" placeholder="Chardonnay" style="width:180px"></div>
          <div class="field"><label class="field-label">Rendement</label>
            <input class="input" type="number" step="1" id="ap-rdt-cep-val" placeholder="130" style="width:110px"></div>
          <button class="btn btn--secondary btn--sm" onclick="apRdtAddCepage()">+ Ajouter</button>
        </div>` : ''}
        ${_apRdtCepages.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:var(--text-callout)">
          <thead><tr style="color:var(--color-ink-tertiary)">
            <th style="text-align:left;padding:6px 12px">Cépage</th>
            <th style="text-align:right;padding:6px 12px">Rendement</th>
            <th></th>
          </tr></thead><tbody>${cepRows}</tbody>
        </table>` : '<p class="t-secondary" style="margin:0">Aucune surcharge — le coefficient par défaut s\'applique à tous les cépages.</p>'}
      </div>
    </div>
  `;
}

async function apRdtSaveDefaut() {
  const v = parseFloat(document.getElementById('ap-rdt-defaut').value);
  if (isNaN(v) || v < 50 || v > 300) { toast('Valeur invalide (50–300 kg/hL)', 'error'); return; }
  try {
    await WB3DB.setTolerance('rendement_kg_hl', v);
    _apRdtDefaut = v;
    const el = document.getElementById('ap-rdt-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2000); }
    toast('Rendement de référence enregistré', 'success');
  } catch(e) {
    const msg = /row-level security|permission|policy/i.test(e.message||'')
      ? 'Droits insuffisants (admin/œnologue).' : e.message;
    toast('Erreur : ' + msg, 'error');
  }
}

async function apRdtAddCepage() {
  const nom = document.getElementById('ap-rdt-cep-nom').value.trim();
  const val = parseFloat(document.getElementById('ap-rdt-cep-val').value);
  if (!nom)  { toast('Cépage requis', 'error'); return; }
  if (isNaN(val) || val < 50 || val > 300) { toast('Valeur invalide (50–300)', 'error'); return; }
  try {
    await WB3DB.saveRendementCepage(nom, val);
    await _renderApportsRendement();
    toast('Surcharge enregistrée', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function apRdtDeleteCepage(nom) {
  try {
    await WB3DB.deleteRendementCepage(nom);
    await _renderApportsRendement();
    toast('Surcharge supprimée', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

// ── Vue apports ────────────────────────────────────────────────

function _renderApportsVueUI() {
  const root = document.getElementById('apports-subroot') || document.getElementById('settings-content');
  const p = apportsVuePrefs;
  root.innerHTML = `
    <h2>🍇 Vue apports</h2>
    <p class="lead">Personnalise l'affichage par défaut quand tu ouvres la page Apports. Synchronisé entre tous tes appareils.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Mode d'affichage par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          ${[
            { key:'grid',  label:'⊞ Grille (cartes)',  desc:'Affichage en cartes.' },
            { key:'table', label:'☰ Tableau',           desc:'Colonnes détaillées (défaut).' },
          ].map(v => `
            <label style="flex:1;min-width:200px;display:flex;gap:10px;align-items:flex-start;padding:var(--space-3);border:2px solid ${p.view_mode===v.key?'var(--color-primary)':'var(--color-border)'};border-radius:var(--radius-md);cursor:pointer;background:${p.view_mode===v.key?'var(--color-primary-soft)':'var(--color-bg-elevated)'}">
              <input type="radio" name="ap-view" value="${v.key}" ${p.view_mode===v.key?'checked':''} onchange="apportsVuePrefs.view_mode=this.value;_renderApportsVueUI()">
              <div><div style="font-weight:600">${v.label}</div><div style="font-size:12px;color:var(--color-ink-tertiary)">${v.desc}</div></div>
            </label>`).join('')}
        </div>
      </div>
    </div>

    <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
      <button class="btn btn--primary" onclick="saveApportsVuePrefs()">💾 Enregistrer</button>
      <span id="apports-vue-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓ Enregistré</span>
    </div>
  `;
}

async function saveApportsVuePrefs() {
  try {
    await WB3DB.setUserPref('apports_vue', apportsVuePrefs);
    const el = document.getElementById('apports-vue-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2500); }
    toast('Préférences apports enregistrées', 'success');
  } catch(e) {
    toast('Erreur lors de la sauvegarde', 'error');
  }
}

// ── Import CSV apports ─────────────────────────────────────────

function _renderApportsImport() {
  const root = document.getElementById('apports-subroot') || document.getElementById('settings-content');
  root.innerHTML = `
    <h2>📥 Import CSV / XLS apports</h2>
    <p class="lead">Importe tes apports depuis un fichier CSV ou Excel. Formats acceptés : <b>CSV</b>
      (séparateur <code>;</code> ou <code>,</code>, UTF-8/ANSI), <b>XLS</b> et <b>XLSX</b>
      (premier onglet utilisé). Aucune structure imposée — choix du mapping colonne par colonne.</p>

    <div id="ap-import-step-1">
      <div class="drawer-section">
        <div class="drawer-section-title">Choisir le fichier</div>
        <div class="drawer-section-content" style="padding:var(--space-4)">
          <input type="file" id="ap-import-file" accept=".csv,.txt,.xls,.xlsx" class="input"
                 style="margin-bottom:var(--space-3)"
                 onchange="apImportParseFile()">
          <p style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin:0">
            La lecture démarre dès la sélection du fichier.
          </p>
        </div>
      </div>
    </div>

    <div id="ap-import-step-2" style="display:none">
      <div class="drawer-section">
        <div class="drawer-section-title">Mapping des colonnes</div>
        <div class="drawer-section-content" style="padding:var(--space-4)">
          <p style="font-size:var(--text-caption);margin:0 0 var(--space-3)">
            Associe chaque champ WB3 à une colonne du fichier. Laisse « — Ignorer » pour les champs absents.
          </p>
          <div id="ap-import-mapping"></div>
          <div class="import-preview" id="ap-import-preview" style="margin-top:var(--space-3)"></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-3);gap:var(--space-2)">
        <button class="btn btn--ghost btn--sm" onclick="_renderApportsImport()">← Retour</button>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn--secondary" onclick="setApportsSubtab('import')">Annuler</button>
          <button class="btn" id="ap-btn-do-import" onclick="apDoImport()">
            Importer <span id="ap-import-count"></span>
          </button>
        </div>
      </div>
    </div>
  `;
}

function apImportParseFile() {
  const file = document.getElementById('ap-import-file').files[0];
  if (!file) return;
  const isXLS = /\.(xlsx?)$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows2D;
      if (isXLS) {
        if (typeof XLSX === 'undefined') { toast('Bibliothèque XLSX non chargée', 'error'); return; }
        const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array', cellDates:true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows2D = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' })
          .map(row => row.map(c => { if (c instanceof Date) return c.toISOString().slice(0,10); return String(c??'').trim(); }));
      } else {
        const text = new TextDecoder('utf-8').decode(e.target.result);
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        const sep = lines[0].includes(';') ? ';' : ',';
        rows2D = lines.map(l => _apParseCSVLine(l, sep));
      }
      if (!rows2D.length) { toast('Fichier vide ou illisible', 'error'); return; }
      _apportsCsvHeaders = rows2D[0].map(h=>String(h).trim());
      _apportsCsvRows    = rows2D.slice(1,6).map(row=>row.map(c=>String(c??'').trim()));
      const autoMap = {
        'date':['date_apport'],'date apport':['date_apport'],'date_apport':['date_apport'],
        'heure':['heure_apport'],'numero':['numero'],'n°':['numero'],'num':['numero'],
        'apporteur':['apporteur'],'fournisseur':['apporteur'],'vigneron':['apporteur'],
        'provenance':['provenance'],'parcelle':['provenance'],'lieu-dit':['provenance'],
        'cepage':['cepage_libre'],'cépage':['cepage_libre'],'variete':['cepage_libre'],
        'millesime':['millesime'],'millésime':['millesime'],'annee':['millesime'],
        'poids':['poids_kg'],'poids_kg':['poids_kg'],'kg':['poids_kg'],
        'volume':['volume_hl'],'volume_hl':['volume_hl'],'hl':['volume_hl'],
        'degre':['degre_probable'],'degré':['degre_probable'],'tap':['degre_probable'],
        'tat':['tat'],'ph':['ph'],
        'temperature':['temperature_c'],'température':['temperature_c'],'temp':['temperature_c'],
        'notes':['notes'],'observations':['notes'],'commentaire':['notes'],
      };
      _apportsCsvMapping = {};
      _apportsCsvHeaders.forEach(h => {
        const norm = h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
        const mapped = autoMap[norm] || autoMap[h.toLowerCase().trim()];
        if (mapped) _apportsCsvMapping[mapped[0]] = h;
      });
      _apBuildMappingUI();
      document.getElementById('ap-import-step-1').style.display = 'none';
      document.getElementById('ap-import-step-2').style.display = '';
    } catch(err) { toast('Erreur lecture : ' + err.message, 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

function _apParseCSVLine(line, sep) {
  const result=[]; let cur='', inQ=false;
  for (let i=0;i<line.length;i++) {
    const c=line[i];
    if (c==='"') { inQ=!inQ; }
    else if (c===sep&&!inQ) { result.push(cur.trim()); cur=''; }
    else { cur+=c; }
  }
  result.push(cur.trim());
  return result;
}

function _apBuildMappingUI() {
  const container = document.getElementById('ap-import-mapping');
  const options = `<option value="">— Ignorer —</option>` +
    _apportsCsvHeaders.map(h=>`<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join('');
  container.innerHTML = APPORTS_IMPORT_FIELDS.map(f => {
    const sel = _apportsCsvMapping[f.key] || '';
    return `<div class="mapping-row">
      <label>${escapeHtml(f.label)}</label>
      <select class="select" data-field="${f.key}"
              onchange="_apportsCsvMapping['${f.key}']=this.value">
        ${options.replace(`value="${escapeHtml(sel)}"`,`value="${escapeHtml(sel)}" selected`)}
      </select></div>`;
  }).join('');
  document.getElementById('ap-import-preview').innerHTML = `
    <b style="font-size:var(--text-caption)">Aperçu (5 premières lignes)</b>
    <table><thead><tr>${_apportsCsvHeaders.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${_apportsCsvRows.map(row=>`<tr>${row.map(c=>`<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const file = document.getElementById('ap-import-file').files[0];
  if (file) {
    const r2 = new FileReader();
    r2.onload = e2 => {
      const total = e2.target.result.split(/\r?\n/).filter(l=>l.trim()).length - 1;
      const el = document.getElementById('ap-import-count');
      if (el) el.textContent = `(${total} lignes)`;
    };
    r2.readAsText(file,'UTF-8');
  }
}

async function apDoImport() {
  const file = document.getElementById('ap-import-file').files[0];
  if (!file) return;
  const btn = document.getElementById('ap-btn-do-import');
  btn.disabled = true; btn.textContent = 'Import en cours…';
  const isXLS = /\.(xlsx?)$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      let rows2D;
      if (isXLS) {
        const wb = XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows2D = XLSX.utils.sheet_to_json(ws,{header:1,defval:''})
          .map(row=>row.map(c=>{if(c instanceof Date)return c.toISOString().slice(0,10);return String(c??'').trim();}));
      } else {
        const text=new TextDecoder('utf-8').decode(e.target.result);
        const lines=text.split(/\r?\n/).filter(l=>l.trim());
        const sep=lines[0].includes(';')?';':',';
        rows2D=lines.map(l=>_apParseCSVLine(l,sep));
      }
      const headers=rows2D[0].map(h=>String(h).trim());
      const dataLines=rows2D.slice(1);
      const rows=dataLines.map(cells=>{
        const row={meta:{}};
        APPORTS_IMPORT_FIELDS.forEach(f=>{
          const colName=_apportsCsvMapping[f.key]; if(!colName)return;
          const idx=headers.indexOf(colName); if(idx<0)return;
          const raw=String(cells[idx]??'').trim(); if(!raw)return;
          if(f.type==='int')        row[f.key]=parseInt(raw,10)||null;
          else if(f.type==='float') row[f.key]=parseFloat(raw.replace(',','.'))||null;
          else if(f.type==='date')  row[f.key]=/^\d{2}\/\d{2}\/\d{4}$/.test(raw)?raw.split('/').reverse().join('-'):raw;
          else row[f.key]=raw;
        });
        return row;
      }).filter(r=>Object.keys(r).length>2);
      const inserted = await WB3DB.importApportsBatch(rows);
      toast(`${inserted} apport${inserted>1?'s':''} importé${inserted>1?'s':''}`, 'success');
      _renderApportsImport();
    } catch(err) {
      toast('Erreur import : ' + err.message, 'error');
      btn.disabled=false; btn.textContent='Importer';
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Export CSV apports ─────────────────────────────────────────

function _renderApportsExport() {
  const root = document.getElementById('apports-subroot') || document.getElementById('settings-content');
  root.innerHTML = `
    <h2>📤 Export CSV apports</h2>
    <p class="lead">Exporte la liste complète de tes apports au format CSV (compatible Excel/LibreOffice).</p>
    <div class="drawer-section">
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p>Le fichier contiendra toutes les colonnes : numéro, date, apporteur, provenance,
           cépage, millésime, lot, contenant, poids, volume, degré, TAT, pH, température,
           statut, notes.</p>
        <button class="btn btn--primary" style="margin-top:var(--space-3)"
                onclick="apExportCSV()">📤 Télécharger le CSV</button>
        <div id="ap-export-status" style="margin-top:var(--space-3);font-size:var(--text-caption)"></div>
      </div>
    </div>
  `;
}

async function apExportCSV() {
  const statusEl = document.getElementById('ap-export-status');
  if (statusEl) statusEl.textContent = 'Chargement des apports…';
  try {
    const tenantId = WB3DB.getCurrentTenantId();
    const apports = await WB3DB.listTable('apports', {
      select: '*,lots(nom),contenants(nom)',
      filter: { tenant_id: tenantId },
      order: 'date_apport', ascending: false, limit: 10000,
    });
    if (!apports.length) { toast('Aucun apport à exporter', 'error'); if(statusEl)statusEl.textContent=''; return; }
    const headers = ['Numéro','Date','Heure','Apporteur','Provenance','Cépage','Millésime',
      'Lot','Contenant','Poids (kg)','Volume (hL)','Degré','TAT','pH','Température','Statut','Notes'];
    const rows = apports.map(a => [
      a.numero||'', a.date_apport||'', a.heure_apport||'',
      a.apporteur||'', a.provenance||'', a.cepage_libre||'', a.millesime||'',
      a.lots?.nom||'', a.contenants?.nom||'',
      a.poids_kg??'', a.volume_hl??'', a.degre_probable??'',
      a.tat??'', a.ph??'', a.temperature_c??'',
      a.statut||'', a.notes||'',
    ]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a2  = document.createElement('a');
    const today = new Date().toISOString().slice(0,10);
    a2.href=url; a2.download=`apports-${today}.csv`; a2.click();
    URL.revokeObjectURL(url);
    toast(`${apports.length} apport${apports.length>1?'s':''} exporté${apports.length>1?'s':''}`, 'success');
    if(statusEl) statusEl.textContent = `✓ ${apports.length} apports exportés`;
  } catch(e) {
    toast('Erreur export : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    if(statusEl) statusEl.textContent='';
  }
}
