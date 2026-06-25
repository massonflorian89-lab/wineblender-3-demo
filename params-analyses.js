/* params-analyses.js — Paramètres : section Analyses (params, alertes SO2, import CSV, cuves WineScan)
 * Dépend de : splitCsvLine() (params-import-cuverie.js).
 */
'use strict';

const ANALYSE_PARAMS = [
  { key:'so2_libre',        label:'SO₂ libre',         unit:'mg/L',   csvHint:'SO2 L',     builtin:true },
  { key:'so2_total',        label:'SO₂ total',         unit:'mg/L',   csvHint:'SO2 T',     builtin:true },
  { key:'so2_actif',        label:'SO₂ actif',         unit:'mg/L',   csvHint:'SO2 Actif', builtin:true },
  { key:'ph',               label:'pH',                unit:'',       csvHint:'pH',        builtin:true },
  { key:'ta',               label:'Acidité titrable',  unit:'g/L',    csvHint:'AT',        builtin:true },
  { key:'acidite_volatile', label:'Acidité volatile',  unit:'g/L',    csvHint:'VA 111',    builtin:true },
  { key:'tav',              label:'TAV',               unit:'% vol',  csvHint:'TAV',       builtin:true },
  { key:'gf_neg5',          label:'GF-5',              unit:'g/L',    csvHint:'GF-5',      builtin:true },
  { key:'gf_pos5',          label:'GF+5',              unit:'g/L',    csvHint:'GF+5',      builtin:true },
  { key:'acide_malique',    label:'Acide malique',     unit:'g/L',    csvHint:'Malic',     builtin:true },
  { key:'acide_lactique',   label:'Acide lactique',    unit:'g/L',    csvHint:'ALac',      builtin:true },
  { key:'sucres_residuels', label:'Sucres résiduels',  unit:'g/L',    csvHint:'',          builtin:true },
  { key:'densite',          label:'Densité',           unit:'',       csvHint:'D',         builtin:true },
  { key:'co2',              label:'CO₂',               unit:'g/L',    csvHint:'CO2',       builtin:true },
  { key:'turbidite',        label:'Turbidité',         unit:'NTU',    csvHint:'',          builtin:true },
];

const ANALYSE_PREFS_DEFAULTS = {
  visible_params: ['so2_libre','so2_total','so2_actif','ph','ta','acidite_volatile','tav','gf_neg5','gf_pos5','acide_malique','acide_lactique'],
  import_mapping: {
    date_col:'Date', lot_col:'ID',
    so2_libre:'SO2 L', so2_total:'SO2 T', so2_actif:'SO2 Actif', ph:'pH',
    ta:'AT', acidite_volatile:'VA 111', tav:'TAV',
    gf_neg5:'GF-5', gf_pos5:'GF+5',
    acide_malique:'Malic', acide_lactique:'ALac',
    densite:'D', co2:'CO2', sucres_residuels:'', turbidite:'',
  },
  custom_params:   [],
  so2_thresholds: { libre_bas: 15, libre_haut: 30, av_alert: 0.9 },
};

// var pour onchange générés : onchange="analysePrefs.import_mapping['${f.key}']=this.value"
var analysePrefs      = { ...ANALYSE_PREFS_DEFAULTS };
let _analyseSubTab    = 'params';
let _analyseImportParsed = null;
let _analyseCsvCols   = [];

// ── Cuves WineScan : carte cuve (ID WineScan) → contenant ─────
let _wsCuveMapState    = null;
let _wsContenantsCache = null;

function _wsNorm(s) {
  return String(s||'').toLowerCase().replace(/[\s._]+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').replace(/\d+/g, m => String(parseInt(m, 10)));
}

function _renderCuvesTab() {
  return `
    <div class="drawer-section">
      <div class="drawer-section-title">Correspondance cuve WineScan → contenant</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Relie le code de cuve lu dans l'<b>ID WineScan</b> (ex. <code>B1-10</code>) à un <b>contenant</b>.
          Ces correspondances accélèrent l'import des analyses ; les choix faits pendant un import
          (cuves « ❌ inconnues ») sont mémorisés ici automatiquement.
        </p>
        <div id="ws-cuves-box"><div class="loading-state"><div class="spinner"></div>Chargement…</div></div>
      </div>
    </div>`;
}

async function _wsLoadCuvesUI() {
  const box = document.getElementById('ws-cuves-box'); if (!box) return;
  try {
    if (!_wsContenantsCache) _wsContenantsCache = await WB3DB.listTable('contenants', { select:'id, nom', filter:{ actif:true }, order:'nom', ascending:true });
    const p = await WB3DB.getUserPref('winescan');
    _wsCuveMapState = (p && p.cuve_map) ? { ...p.cuve_map } : {};
    _wsRenderCuvesMap();
  } catch (e) {
    box.innerHTML = `<p style="color:var(--color-danger)">${escapeHtml(WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e))}</p>`;
  }
}

function _wsRenderCuvesMap() {
  const box = document.getElementById('ws-cuves-box'); if (!box) return;
  const opts = sel => '<option value="">— contenant —</option>' + (_wsContenantsCache||[]).map(c =>
    `<option value="${c.id}" ${sel===c.id?'selected':''}>${escapeHtml(c.nom)}</option>`).join('');
  const sel = 'padding:5px 8px;border:1px solid var(--color-border);border-radius:var(--radius-md);font-family:inherit;font-size:var(--text-callout)';
  const entries = Object.entries(_wsCuveMapState || {}).sort((a,b) => a[0].localeCompare(b[0], 'fr', { numeric:true }));
  box.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px">
      ${entries.length ? entries.map(([k,cid]) => `
        <div style="display:flex;align-items:center;gap:8px">
          <code style="min-width:120px;font-size:var(--text-callout)">${escapeHtml(k)}</code><span style="color:var(--color-ink-tertiary)">→</span>
          <select onchange="_wsMapSet('${escapeHtml(k)}', this.value)" style="${sel};flex:1;max-width:280px">${opts(cid)}</select>
          <button class="btn btn--ghost btn--sm" onclick="_wsMapDel('${escapeHtml(k)}')" style="color:var(--color-danger);padding:2px 8px">✕</button>
        </div>`).join('') : '<div class="t-footnote" style="color:var(--color-ink-tertiary)">Aucune correspondance enregistrée.</div>'}
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:var(--space-3);flex-wrap:wrap">
      <input id="ws-new-cuve" placeholder="code cuve (B1-10)" style="${sel};width:150px">
      <span style="color:var(--color-ink-tertiary)">→</span>
      <select id="ws-new-cont" style="${sel};flex:1;max-width:280px">${opts(null)}</select>
      <button class="btn btn--sm" onclick="_wsMapAdd()">+ Ajouter</button>
    </div>`;
}

async function _wsSaveCuveMap() { try { await WB3DB.setUserPref('winescan', { cuve_map: _wsCuveMapState }); } catch (e) { toast('Erreur sauvegarde', 'error'); } }

async function _wsMapSet(key, contId) {
  if (!contId) delete _wsCuveMapState[key]; else _wsCuveMapState[key] = contId;
  await _wsSaveCuveMap(); _wsRenderCuvesMap();
}
async function _wsMapDel(key) { delete _wsCuveMapState[key]; await _wsSaveCuveMap(); _wsRenderCuvesMap(); }
async function _wsMapAdd() {
  const k = _wsNorm(document.getElementById('ws-new-cuve')?.value);
  const cid = document.getElementById('ws-new-cont')?.value;
  if (!k) { toast('Indique un code de cuve', 'error'); return; }
  if (!cid) { toast('Choisis un contenant', 'error'); return; }
  _wsCuveMapState[k] = cid; await _wsSaveCuveMap(); _wsRenderCuvesMap();
  toast('Correspondance ajoutée', 'success');
}

function _renderParamsTab() {
  return `
    <div class="drawer-section">
      <div class="drawer-section-title">Paramètres analytiques actifs</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Sélectionne les paramètres à afficher dans les formulaires d'analyse et les rapports.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--space-2)" id="analyse-params-list">
          ${ANALYSE_PARAMS.map(p => `
            <label class="toggle" style="padding:8px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg-elevated)">
              <input type="checkbox" data-param="${p.key}" ${analysePrefs.visible_params.includes(p.key) ? 'checked' : ''}>
              <div style="flex:1">
                <div style="font-weight:600;font-size:var(--text-callout)">${p.label}</div>
                ${p.unit ? `<div class="t-footnote" style="margin:0;color:var(--color-ink-tertiary)">${p.unit}</div>` : ''}
              </div>
            </label>`).join('')}
        </div>
        <div style="margin-top:var(--space-3)">
          <button class="btn" onclick="saveAnalyseParamPrefs()">💾 Enregistrer les paramètres</button>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Paramètres analytiques personnalisés</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Ajoute des paramètres spécifiques à ta cave (ex&nbsp;: couleur, extrait sec…).
          Leurs valeurs seront stockées dans le champ <code>extra_params</code> de chaque analyse.
        </p>
        <div id="custom-params-list" style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-3)">
          ${_renderCustomParamsList()}
        </div>
        <details>
          <summary style="cursor:pointer;font-weight:600;font-size:var(--text-callout);color:var(--color-ink-secondary)">
            ＋ Ajouter un paramètre
          </summary>
          <div style="margin-top:var(--space-3);display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:var(--space-2);align-items:end" id="new-param-form">
            <div>
              <label style="font-size:var(--text-footnote);font-weight:600;color:var(--color-ink-tertiary);display:block;margin-bottom:var(--space-1)">Nom interne (clé)</label>
              <input class="input" id="np-key" placeholder="ex: extrait_sec" style="width:100%" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'_')">
            </div>
            <div>
              <label style="font-size:var(--text-footnote);font-weight:600;color:var(--color-ink-tertiary);display:block;margin-bottom:var(--space-1)">Label affiché</label>
              <input class="input" id="np-label" placeholder="ex: Extrait sec" style="width:100%">
            </div>
            <div>
              <label style="font-size:var(--text-footnote);font-weight:600;color:var(--color-ink-tertiary);display:block;margin-bottom:var(--space-1)">Unité (optionnel)</label>
              <input class="input" id="np-unit" placeholder="ex: g/L" style="width:100%">
            </div>
            <button class="btn" onclick="addCustomParam()">Ajouter</button>
          </div>
        </details>
      </div>
    </div>`;
}

function _renderAlertesTab() {
  const thr = analysePrefs.so2_thresholds;
  return `
    <div class="drawer-section">
      <div class="drawer-section-title">Seuils SO₂ libre</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-4)">
          Ces seuils colorent les valeurs SO₂ libre dans les fiches lot et déclenchent les alertes tableau de bord.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);margin-bottom:var(--space-4)">
          <div>
            <div style="font-size:var(--text-caption);text-transform:uppercase;letter-spacing:.4px;color:var(--color-ink-tertiary);font-weight:600;margin-bottom:var(--space-2)">
              ⬇️ Seuil bas — alerte <span style="color:#d32f2f;font-weight:700">rouge</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <input type="number" id="al-so2-bas" class="input" style="width:90px;text-align:right"
                value="${thr.libre_bas}" min="0" max="100" step="1">
              <span class="t-footnote">mg/L</span>
            </div>
            <p class="t-footnote" style="margin:var(--space-1) 0 0;color:var(--color-ink-tertiary)">SO₂ libre en dessous → critique</p>
          </div>
          <div>
            <div style="font-size:var(--text-caption);text-transform:uppercase;letter-spacing:.4px;color:var(--color-ink-tertiary);font-weight:600;margin-bottom:var(--space-2)">
              ⬆️ Seuil haut — objectif <span style="color:#2e7d32;font-weight:700">vert</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <input type="number" id="al-so2-haut" class="input" style="width:90px;text-align:right"
                value="${thr.libre_haut}" min="0" max="200" step="1">
              <span class="t-footnote">mg/L</span>
            </div>
            <p class="t-footnote" style="margin:var(--space-1) 0 0;color:var(--color-ink-tertiary)">SO₂ libre au-dessus → objectif atteint</p>
          </div>
        </div>

        <div style="border-top:1px solid var(--color-border);padding-top:var(--space-4);margin-bottom:var(--space-4)">
          <div style="font-size:var(--text-caption);text-transform:uppercase;letter-spacing:.4px;color:var(--color-ink-tertiary);font-weight:600;margin-bottom:var(--space-2)">
            ⚠️ Acidité volatile — seuil alerte <span style="color:#f57c00;font-weight:700">orange</span>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
            <input type="number" id="al-av" class="input" style="width:90px;text-align:right"
              value="${thr.av_alert}" min="0" max="3" step="0.01">
            <span class="t-footnote">g/L</span>
          </div>
          <p class="t-footnote" style="margin:0;color:var(--color-ink-tertiary)">Limite légale indicative ~ 1.0 g/L (acide acétique)</p>
        </div>

        ${(!WB3DB.can || WB3DB.can('qualite.edit')) ? `<button class="btn" onclick="saveAlertePrefs()">💾 Enregistrer les seuils</button>` : '<span class="muted" style="font-size:12px">Seuils en lecture seule (responsables)</span>'}
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Aperçu de la colorimétrie</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div style="width:44px;height:44px;border-radius:var(--radius-md);background:#d32f2f;display:flex;align-items:center;justify-content:center;color:#fff;font-size:var(--text-caption);font-weight:700;text-align:center;line-height:1.2">&lt;${thr.libre_bas}</div>
            <span class="t-footnote">Critique (rouge)</span>
          </div>
          <span style="color:var(--color-ink-quaternary);font-size:20px">→</span>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div style="width:54px;height:44px;border-radius:var(--radius-md);background:#f57c00;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;text-align:center;line-height:1.2">${thr.libre_bas}–${thr.libre_haut}</div>
            <span class="t-footnote">Attention (orange)</span>
          </div>
          <span style="color:var(--color-ink-quaternary);font-size:20px">→</span>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div style="width:44px;height:44px;border-radius:var(--radius-md);background:#2e7d32;display:flex;align-items:center;justify-content:center;color:#fff;font-size:var(--text-caption);font-weight:700;text-align:center;line-height:1.2">&gt;${thr.libre_haut}</div>
            <span class="t-footnote">Objectif (vert)</span>
          </div>
        </div>
      </div>
    </div>`;
}

function _renderImportTab() {
  return `
    <div class="drawer-section">
      <div class="drawer-section-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>Import CSV analyses</span>
        <button class="btn btn--secondary btn--sm" onclick="downloadAnalyseTemplate()">📄 Télécharger la trame</button>
      </div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Importe les analyses depuis un CSV de ton labo (séparateur <b>point-virgule</b>).
          Configure le mapping ci-dessous une fois, puis dépose tes fichiers directement.
        </p>
        <details>
          <summary style="cursor:pointer;font-weight:600;font-size:var(--text-callout);margin-bottom:var(--space-2);color:var(--color-ink-secondary)">
            🔧 Mapping colonnes CSV → base de données
            ${_analyseCsvCols.length ? `<span style="font-size:var(--text-caption);font-weight:400;color:var(--color-ink-tertiary);margin-left:var(--space-2)">(colonnes détectées)</span>` : ''}
          </summary>
          <div style="margin-top:var(--space-3)">
            ${_analyseCsvCols.length ? `<p class="t-footnote" style="margin:0 0 var(--space-2)">Colonnes du dernier fichier : <code style="font-size:10px;background:var(--color-bg-mute);padding:2px 6px;border-radius:3px">${_analyseCsvCols.map(escapeHtml).join(' · ')}</code></p>` : ''}
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:var(--space-2)">
              ${_renderAnalyseMappingGrid()}
            </div>
            <div style="margin-top:var(--space-3)">
              <button class="btn btn--secondary btn--sm" onclick="saveAnalyseMapping()">💾 Sauvegarder le mapping</button>
            </div>
          </div>
        </details>
        <div style="margin-top:var(--space-4);border:2px dashed var(--color-border);border-radius:var(--radius-md);
             padding:var(--space-6);text-align:center;cursor:pointer;transition:border-color .15s,background .15s"
          onclick="document.getElementById('analyse-csv-input').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--color-primary)';this.style.background='color-mix(in srgb,var(--color-primary) 6%,transparent)'"
          ondragleave="this.style.borderColor='';this.style.background=''"
          ondrop="event.preventDefault();this.style.borderColor='';this.style.background='';handleAnalyseCsvDrop(event)">
          <div style="font-size:32px;margin-bottom:var(--space-2)">📊</div>
          <div style="font-weight:600;color:var(--color-ink-secondary)">Déposer un fichier CSV ici</div>
          <div class="t-footnote" style="margin:var(--space-1) 0 var(--space-3)">ou cliquer pour parcourir</div>
          <button class="btn btn--sm" onclick="event.stopPropagation();document.getElementById('analyse-csv-input').click()">
            📥 Importer analyses
          </button>
        </div>
        <input type="file" id="analyse-csv-input" accept=".csv,text/csv" style="display:none"
          onchange="handleAnalyseCsvFile(this)">
      </div>
    </div>
    <div id="analyse-import-preview" style="display:none"></div>`;
}

function _renderAnalysesUI() {
  const root = document.getElementById('settings-content');
  const sub  = _analyseSubTab;
  const tabBtn = (id, label) => `<button onclick="switchAnalyseSubTab('${id}')"
    style="padding:8px 18px;background:none;border:none;
           border-bottom:2px solid ${sub===id?'var(--color-primary)':'transparent'};
           color:${sub===id?'var(--color-primary)':'var(--color-ink-secondary)'};
           font-family:inherit;font-size:var(--text-callout);
           font-weight:${sub===id?'600':'400'};cursor:pointer;
           white-space:nowrap;transition:all .14s">${label}</button>`;

  root.innerHTML = `
    <h2>🔬 Analyses œnologiques</h2>
    <p class="lead">Configure les paramètres analytiques affichés dans l'application et l'import CSV depuis ton labo.</p>
    <div style="display:flex;border-bottom:1px solid var(--color-border);margin-bottom:var(--space-5);overflow-x:auto">
      ${tabBtn('params',  '🧪 Paramètres')}
      ${tabBtn('alertes', '⚠️ Alertes SO₂')}
      ${tabBtn('import',  '📥 Import CSV')}
      ${tabBtn('cuves',   '🔗 Cuves WineScan')}
    </div>
    ${sub === 'params'  ? _renderParamsTab()  : ''}
    ${sub === 'alertes' ? _renderAlertesTab() : ''}
    ${sub === 'import'  ? _renderImportTab()  : ''}
    ${sub === 'cuves'   ? _renderCuvesTab()   : ''}
  `;
  if (sub === 'cuves') _wsLoadCuvesUI();
}

async function renderAnalysesSection() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const p = await WB3DB.getUserPref('analyses');
    analysePrefs = {
      visible_params: p.visible_params || ANALYSE_PREFS_DEFAULTS.visible_params,
      import_mapping: { ...ANALYSE_PREFS_DEFAULTS.import_mapping, ...(p.import_mapping || {}) },
      custom_params:  Array.isArray(p.custom_params) ? p.custom_params : [],
      so2_thresholds: { ...ANALYSE_PREFS_DEFAULTS.so2_thresholds, ...(p.so2_thresholds || {}) },
    };
  } catch(e) { console.warn(e); }
  _renderAnalysesUI();
}

function switchAnalyseSubTab(tab) {
  _analyseSubTab = tab;
  _renderAnalysesUI();
}

async function saveAlertePrefs() {
  if (WB3DB.can && !WB3DB.can('qualite.edit')) { toast('Lecture seule : modifier les seuils est réservé aux responsables.', 'error'); return; }
  const bas  = parseFloat(document.getElementById('al-so2-bas')?.value);
  const haut = parseFloat(document.getElementById('al-so2-haut')?.value);
  const av   = parseFloat(document.getElementById('al-av')?.value);
  if (isNaN(bas) || isNaN(haut) || isNaN(av)) { toast('Valeurs invalides', 'error'); return; }
  if (bas >= haut) { toast('Le seuil bas doit être inférieur au seuil haut', 'error'); return; }
  analysePrefs.so2_thresholds = { libre_bas: bas, libre_haut: haut, av_alert: av };
  try {
    await WB3DB.setUserPref('analyses', analysePrefs);
    toast('Seuils enregistrés ✓', 'success');
    _renderAnalysesUI();
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

function _renderCustomParamsList() {
  if (!analysePrefs.custom_params?.length) {
    return `<div class="t-footnote" style="color:var(--color-ink-tertiary)">Aucun paramètre personnalisé pour l'instant.</div>`;
  }
  return analysePrefs.custom_params.map((p, i) => `
    <div style="display:flex;align-items:center;gap:var(--space-2);padding:8px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg-elevated)">
      <span style="font-weight:600;flex:1">${escapeHtml(p.label)}</span>
      <code style="font-size:10px;background:var(--color-bg-mute);padding:2px 6px;border-radius:3px;color:var(--color-ink-tertiary)">${escapeHtml(p.key)}</code>
      ${p.unit ? `<span class="t-footnote" style="color:var(--color-ink-tertiary)">${escapeHtml(p.unit)}</span>` : ''}
      <button class="btn btn--ghost btn--sm" onclick="deleteCustomParam(${i})" style="color:var(--color-danger);padding:2px 8px">✕</button>
    </div>`).join('');
}

async function addCustomParam() {
  const key   = document.getElementById('np-key')?.value?.trim();
  const label = document.getElementById('np-label')?.value?.trim();
  const unit  = document.getElementById('np-unit')?.value?.trim();
  if (!key || !label) { toast('Clé et label obligatoires', 'error'); return; }
  if (ANALYSE_PARAMS.some(p => p.key === key) || analysePrefs.custom_params.some(p => p.key === key)) {
    toast('Cette clé existe déjà', 'error'); return;
  }
  analysePrefs.custom_params = [...(analysePrefs.custom_params||[]), { key, label, unit: unit||'' }];
  await _saveCustomParamsPrefs();
  document.getElementById('np-key').value = '';
  document.getElementById('np-label').value = '';
  document.getElementById('np-unit').value = '';
  document.getElementById('custom-params-list').innerHTML = _renderCustomParamsList();
  toast('Paramètre ajouté', 'success');
}

async function deleteCustomParam(i) {
  analysePrefs.custom_params = analysePrefs.custom_params.filter((_, idx) => idx !== i);
  await _saveCustomParamsPrefs();
  document.getElementById('custom-params-list').innerHTML = _renderCustomParamsList();
  toast('Paramètre supprimé', 'success');
}

async function _saveCustomParamsPrefs() {
  try {
    await WB3DB.setUserPref('analyses', { ...analysePrefs, custom_params: analysePrefs.custom_params });
  } catch(e) { console.error(e); toast('Erreur sauvegarde', 'error'); }
}

function _renderAnalyseMappingGrid() {
  const cols = _analyseCsvCols.length
    ? _analyseCsvCols
    : [...new Set([
        ...Object.values(ANALYSE_PREFS_DEFAULTS.import_mapping).filter(Boolean),
        ...ANALYSE_PARAMS.map(p => p.csvHint).filter(Boolean),
      ])];

  const mkOpts = key => `<option value="">— Ignorer —</option>` +
    cols.map(c => `<option value="${escapeHtml(c)}"${analysePrefs.import_mapping[key] === c ? ' selected' : ''}>${escapeHtml(c)}</option>`).join('');

  const fields = [
    { key:'date_col', label:'📅 Date *' },
    { key:'lot_col',  label:'🍷 Lot (code)' },
    ...ANALYSE_PARAMS.map(p => ({ key: p.key, label: `${p.label}${p.unit ? ' ('+p.unit+')' : ''}` })),
  ];

  return fields.map(f => `
    <div style="display:flex;align-items:center;gap:var(--space-2)">
      <span style="font-size:var(--text-footnote);font-weight:600;min-width:150px;flex-shrink:0;color:var(--color-ink-secondary)">${escapeHtml(f.label)}</span>
      <select class="select" style="flex:1;font-size:var(--text-footnote)"
        onchange="analysePrefs.import_mapping['${f.key}']=this.value">
        ${mkOpts(f.key)}
      </select>
    </div>`).join('');
}

async function saveAnalyseParamPrefs() {
  const visible = Array.from(document.querySelectorAll('#analyse-params-list input:checked'))
    .map(cb => cb.dataset.param);
  if (!visible.length) { toast('Sélectionne au moins un paramètre', 'error'); return; }
  analysePrefs.visible_params = visible;
  try {
    await WB3DB.setUserPref('analyses', analysePrefs);
    toast('Paramètres enregistrés', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function saveAnalyseMapping() {
  try {
    await WB3DB.setUserPref('analyses', analysePrefs);
    toast('Mapping sauvegardé', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

function downloadAnalyseTemplate() {
  const m = analysePrefs.import_mapping;
  const header = [m.date_col||'Date', m.lot_col||'ID',
    ...ANALYSE_PARAMS.filter(p => analysePrefs.visible_params.includes(p.key))
      .map(p => m[p.key] || p.label)].join(';');
  const example = [new Date().toLocaleDateString('fr-FR'), 'L1-01',
    ...ANALYSE_PARAMS.filter(p => analysePrefs.visible_params.includes(p.key)).map(() => '')].join(';');
  const blob = new Blob(['﻿' + [header, example].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'trame-analyses-wineblender.csv'; a.click();
  toast('Trame téléchargée', 'success');
}

function handleAnalyseCsvDrop(e) {
  const file = e.dataTransfer?.files?.[0];
  if (file) _processAnalyseCsv(file);
}

function handleAnalyseCsvFile(input) {
  const file = input.files[0];
  if (file) _processAnalyseCsv(file);
}

function _processAnalyseCsv(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const result = _parseAnalyseCsv(e.target.result);
    if (result.error) { toast(result.error, 'error'); return; }
    _analyseImportParsed = result;
    _analyseCsvCols = result.csvCols;
    _renderAnalysesUI();
    _renderAnalysePreview(result);
  };
  reader.readAsText(file, 'UTF-8');
}

function _parseAnalyseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { error: 'Fichier vide ou sans données' };
  const sep  = lines[0].includes(';') ? ';' : ',';
  const cols = lines[0].split(sep).map(c => c.trim());
  const m    = analysePrefs.import_mapping;
  const ci   = k => m[k] ? cols.indexOf(m[k]) : -1;
  const dateIdx = ci('date_col');
  if (dateIdx === -1) return { error: `Colonne date "${m.date_col||'Date'}" introuvable. Vérifiez le mapping.` };
  const lotIdx  = ci('lot_col');
  const pIdxs   = ANALYSE_PARAMS.map(p => ({ key: p.key, idx: ci(p.key) }));
  const rows = [], errors = [];
  for (let i = 1; i < lines.length; i++) {
    const cells   = splitCsvLine(lines[i], sep);
    const rawDate = (cells[dateIdx] || '').trim();
    if (!rawDate) continue;
    let isoDate = rawDate;
    const dm = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dm) isoDate = `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`;
    const lotRef = lotIdx >= 0 ? (cells[lotIdx]||'').trim() : null;
    const row = { date_analyse: isoDate, _lotRef: lotRef };
    let hasData = false;
    pIdxs.forEach(({ key, idx }) => {
      if (idx < 0) return;
      const v = parseFloat((cells[idx]||'').replace(',','.'));
      if (!isNaN(v)) { row[key] = v; hasData = true; }
    });
    if (!hasData) { errors.push(`Ligne ${i+1} : aucune valeur numérique → ignorée`); continue; }
    rows.push(row);
  }
  return { rows, errors, csvCols: cols };
}

function _renderAnalysePreview(parsed) {
  const { rows, errors } = parsed;
  const preview = document.getElementById('analyse-import-preview');
  if (!preview) return;
  const activeCols = ANALYSE_PARAMS.filter(p => rows.some(r => r[p.key] != null));
  preview.style.display = '';
  preview.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title">Vérification avant import</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">
          <span class="tag tag--success">✅ ${rows.length} analyse${rows.length>1?'s':''} prête${rows.length>1?'s':''}</span>
          ${errors.length ? `<span class="tag" style="background:var(--color-warning-soft);color:var(--color-warning)">⚠️ ${errors.length} ligne${errors.length>1?'s':''} ignorée${errors.length>1?'s':''}</span>` : ''}
        </div>
        ${errors.length ? `<details style="margin-bottom:var(--space-3)"><summary style="cursor:pointer;font-size:var(--text-caption);color:var(--color-warning)">Voir les lignes ignorées</summary><ul style="margin:var(--space-2) 0 0 var(--space-4);font-size:var(--text-caption)">${errors.map(e=>`<li>${escapeHtml(e)}</li>`).join('')}</ul></details>` : ''}
        ${rows.length ? `
        <div style="overflow-x:auto;margin-bottom:var(--space-4)">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Lot réf.</th>${activeCols.map(p=>`<th>${p.label}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.slice(0,15).map(r=>`<tr><td style="white-space:nowrap">${escapeHtml(r.date_analyse)}</td><td>${r._lotRef?escapeHtml(r._lotRef):'<span style="color:var(--color-ink-tertiary)">—</span>'}</td>${activeCols.map(p=>`<td>${r[p.key]!=null?r[p.key]:'<span style="color:var(--color-ink-tertiary)">—</span>'}</td>`).join('')}</tr>`).join('')}
              ${rows.length>15?`<tr><td colspan="20" style="text-align:center;color:var(--color-ink-tertiary);font-size:var(--text-caption)">… et ${rows.length-15} autre${rows.length-15>1?'s':''}</td></tr>`:''}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn" id="btn-analyse-import" onclick="confirmAnalyseImport()">✅ Importer ${rows.length} analyse${rows.length>1?'s':''}</button>
          <button class="btn btn--ghost" onclick="cancelAnalyseImport()">Annuler</button>
        </div>` : ''}
      </div>
    </div>`;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelAnalyseImport() {
  _analyseImportParsed = null;
  const p = document.getElementById('analyse-import-preview');
  if (p) p.style.display = 'none';
  const inp = document.getElementById('analyse-csv-input');
  if (inp) inp.value = '';
}

async function confirmAnalyseImport() {
  if (!_analyseImportParsed?.rows?.length) return;
  const btn = document.getElementById('btn-analyse-import');
  if (btn) { btn.disabled = true; btn.textContent = 'Import en cours…'; }
  const { rows } = _analyseImportParsed;
  let lots = [];
  try { lots = await WB3DB.listTable('lots', { order: 'nom' }); } catch(_) {}
  let ok = 0, skipped = 0;
  for (const r of rows) {
    let lot_id = null;
    if (r._lotRef) {
      const match = lots.find(l =>
        l.nom?.toLowerCase() === r._lotRef.toLowerCase() ||
        l.code?.toLowerCase() === r._lotRef.toLowerCase()
      );
      if (match) lot_id = match.id;
    }
    const payload = { date_analyse: r.date_analyse, lot_id: lot_id || undefined };
    ANALYSE_PARAMS.forEach(p => { if (r[p.key] != null) payload[p.key] = r[p.key]; });
    try { await WB3DB.insertRow('analyses', payload); ok++; }
    catch(e) { console.warn(e); skipped++; }
  }
  toast(`✅ ${ok} analyse${ok>1?'s':''} importée${ok>1?'s':''}${skipped?` · ${skipped} erreur(s)`:''}`, ok > 0 ? 'success' : 'error');
  cancelAnalyseImport();
}
