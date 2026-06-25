/* params-lots.js — Paramètres : groupe Lots de vin (sous-onglets Champs + Vue lots + Société)
 * Dépend de : _subIc(), _getSubRoot() (params-cuverie-groupe.js).
 * activeLotSubtab doit être déclaré var dans le script inline principal.
 */
'use strict';

const LOT_SUBTABS = [
  { key:'champs', ic:'list', label:'Champs'   },
  { key:'vue',    ic:'wine', label:'Vue lots' },
];

function renderLotsVinGroup() {
  const root = document.getElementById('settings-content');
  const tabs = LOT_SUBTABS.map(t => `
    <button class="subtab-btn${activeLotSubtab === t.key ? ' active' : ''}"
            data-subtab="${t.key}" onclick="setLotSubtab('${t.key}')">
      ${_subIc(t.ic)}${t.label}
    </button>`).join('');
  root.innerHTML = `<div class="subtab-bar">${tabs}</div><div id="lot-sub"></div>`;
  _renderLotSubContent();
}

function setLotSubtab(key) {
  activeLotSubtab = key;
  document.querySelectorAll('.subtab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.subtab === key)
  );
  _renderLotSubContent();
}

function _getLotsSubRoot() {
  return document.getElementById('lot-sub') || document.getElementById('settings-content');
}

async function _renderLotSubContent() {
  if      (activeLotSubtab === 'champs') await renderLotsVinSection();
  else if (activeLotSubtab === 'vue')    await renderLotVueSettings();
}

// ── Vue lots : préférences d'affichage ─────────────────────────

const LOT_VUE_DEFAULTS = {
  view_mode:    'table',
  group_mode:   'none',
  sort_by:      'nom',
  sort_asc:     true,
  show_archived: false,
};
// var car lotVuePrefs.view_mode / .group_mode mutés par onchange générés
var lotVuePrefs = { ...LOT_VUE_DEFAULTS };

async function renderLotVueSettings() {
  const root = _getLotsSubRoot();
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const p = await WB3DB.getUserPref('lots_vue');
    lotVuePrefs = { ...LOT_VUE_DEFAULTS, ...(p || {}) };
  } catch(e) { console.warn(e); }
  _renderLotVueUI();
}

function _renderLotVueUI() {
  const root = _getLotsSubRoot();
  const p = lotVuePrefs;
  root.innerHTML = `
    <h2>🍷 Vue lots</h2>
    <p class="lead">Personnalise l'affichage par défaut quand tu ouvres la liste des lots. Synchronisé entre tous tes appareils.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Mode d'affichage par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          ${[
            { key:'grid',  label:'⊞ Grille (cartes)',  desc:'Affichage en cartes, adapté à un usage tactile.' },
            { key:'table', label:'☰ Tableau',           desc:'Colonnes détaillées, idéal sur grand écran.' },
          ].map(v => `
            <label style="flex:1;min-width:200px;display:flex;gap:10px;align-items:flex-start;padding:var(--space-3);border:2px solid ${p.view_mode===v.key?'var(--color-primary)':'var(--color-border)'};border-radius:var(--radius-md);cursor:pointer;background:${p.view_mode===v.key?'var(--color-primary-soft)':'var(--color-bg-elevated)'}">
              <input type="radio" name="lv-view" value="${v.key}" ${p.view_mode===v.key?'checked':''} onchange="lotVuePrefs.view_mode=this.value;_renderLotVueUI()">
              <div><div style="font-weight:600">${v.label}</div><div style="font-size:12px;color:var(--color-ink-tertiary)">${v.desc}</div></div>
            </label>`).join('')}
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Groupement par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
          ${[
            { key:'none',      label:'Aucun'     },
            { key:'couleur',   label:'🎨 Couleur' },
            { key:'statut',    label:'🔄 Étape'   },
            { key:'millesime', label:'📅 Millésime'},
          ].map(g => `
            <button class="subtab-btn${p.group_mode===g.key?' active':''}"
                    onclick="lotVuePrefs.group_mode='${g.key}';_renderLotVueUI()">
              ${g.label}
            </button>`).join('')}
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Tri par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap">
          <select class="select" style="width:auto" onchange="lotVuePrefs.sort_by=this.value;_renderLotVueUI()">
            ${[
              { key:'nom',              label:'Nom' },
              { key:'millesime',        label:'Millésime' },
              { key:'volume_actuel_hl', label:'Volume actuel' },
              { key:'statut',           label:'Étape' },
              { key:'date_entree',      label:'Date d\'entrée' },
            ].map(s => `<option value="${s.key}"${p.sort_by===s.key?' selected':''}>${s.label}</option>`).join('')}
          </select>
          <label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer">
            <input type="checkbox" ${p.sort_asc?'checked':''} onchange="lotVuePrefs.sort_asc=this.checked">
            Ordre croissant
          </label>
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Options</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <label class="toggle" style="cursor:pointer">
          <input type="checkbox" ${p.show_archived?'checked':''} onchange="lotVuePrefs.show_archived=this.checked">
          <span>Afficher les lots archivés / inactifs par défaut</span>
        </label>
      </div>
    </div>

    <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
      <button class="btn btn--primary" onclick="saveLotVuePrefs()">💾 Enregistrer</button>
      <span id="lot-vue-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓ Enregistré</span>
    </div>
  `;
}

async function saveLotVuePrefs() {
  try {
    await WB3DB.setUserPref('lots_vue', lotVuePrefs);
    const el = document.getElementById('lot-vue-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2500); }
    toast('Préférences vue lots enregistrées', 'success');
  } catch(e) {
    toast('Erreur lors de la sauvegarde', 'error');
  }
}

// ── Champs configurables + Société ────────────────────────────

const LOT_FIELDS_CATALOG = [
  { key: 'millesime',   label: 'Millésime',    desc: 'Année de récolte du raisin',        icon: '📅', always: true  },
  { key: 'couleur',     label: 'Couleur',       desc: 'Rouge, blanc, rosé, gris…',         icon: '🎨', always: true  },
  { key: 'statut',      label: 'Étape',         desc: 'Vendange, moût, FA, FML, élevage…', icon: '🔄', always: true  },
  { key: 'type_lot',    label: 'Type matière',  desc: 'Vin, moût, jus, base mousse…',      icon: '🧪', always: false },
  { key: 'appellation', label: 'Appellation',   desc: 'AOC, IGP, vin de France…',          icon: '📜', always: false },
  { key: 'destination', label: 'Destination',   desc: 'Vrac, bouteille, export, BIB…',     icon: '📦', always: false },
  { key: 'notes',       label: 'Notes',         desc: 'Champ libre de commentaires',        icon: '📝', always: true  },
  { key: 'tags',        label: 'Tags',          desc: 'Étiquettes libres pour filtrer',     icon: '🏷', always: true  },
];

const LOT_FIELDS_DEFAULTS = {
  type_lot:    false,
  appellation: false,
  destination: false,
};

let lotFieldsPrefs = { ...LOT_FIELDS_DEFAULTS };
let _paramSocietes = [];

async function renderLotsVinSection() {
  const root = _getLotsSubRoot();
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const p = await WB3DB.getUserPref('lot_fields');
    lotFieldsPrefs = { ...LOT_FIELDS_DEFAULTS, ...(p || {}) };
  } catch(e) { console.warn(e); }
  try { _paramSocietes = await WB3DB.listLotSocietes(); } catch(e) { _paramSocietes = []; }
  _renderLotsVinUI();
}

function _renderLotsVinUI() {
  const root = _getLotsSubRoot();
  root.innerHTML = `
    <h2>🍷 Lots de vin — Champs configurables</h2>
    <p class="lead">Active ou désactive les champs optionnels selon les besoins de ta cave.<br>
    Les champs activés apparaissent dans les formulaires de lot et les colonnes disponibles de la cuverie.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Champs du lot</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-2)">
          ${LOT_FIELDS_CATALOG.map(f => {
            const isActive   = f.always || lotFieldsPrefs[f.key] !== false;
            const isDisabled = f.always;
            return `
            <label class="toggle" style="padding:12px 14px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg-elevated);gap:var(--space-3);${isDisabled?'opacity:.55;cursor:not-allowed':'cursor:pointer'}">
              <input type="checkbox" data-field="${f.key}"
                ${isActive ? 'checked' : ''}
                ${isDisabled ? 'disabled' : ''}
                onchange="_lotFieldToggle(this)">
              <div style="flex:1">
                <div style="font-weight:600;font-size:var(--text-callout)">${f.icon} ${f.label}
                  ${isDisabled ? '<span style="font-size:10px;color:var(--color-ink-tertiary);font-weight:400;margin-left:6px">toujours actif</span>' : ''}
                </div>
                <div class="t-footnote" style="margin:2px 0 0;color:var(--color-ink-tertiary)">${f.desc}</div>
              </div>
            </label>`;
          }).join('')}
        </div>

        <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
          <button class="btn" onclick="saveLotFieldsPrefs()">💾 Enregistrer</button>
          <span id="lot-fields-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓ Enregistré</span>
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Colonnes cuverie — champs lot</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Les colonnes du tableau cuverie liées aux lots peuvent être affichées ou masquées directement
          depuis la vue cuverie (⚙ Colonnes). Cette section indique les colonnes disponibles selon les champs activés ci-dessus.
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-2)">
          ${[
            { key:'lot_couleur',      label:'Couleur lot',  field:'couleur'     },
            { key:'lot_millesime',    label:'Millésime',    field:'millesime'   },
            { key:'lot_type',         label:'Type matière', field:'type_lot'    },
            { key:'lot_statut',       label:'Étape',        field:'statut'      },
            { key:'lot_appellation',  label:'Appellation',  field:'appellation' },
            { key:'lot_destination',  label:'Destination',  field:'destination' },
            { key:'lot_societe',      label:'Société',      field:'societe'     },
          ].map(col => {
            const active = LOT_FIELDS_CATALOG.find(f=>f.key===col.field)?.always || lotFieldsPrefs[col.field] !== false;
            return `<span class="tag" style="padding:5px 10px;font-size:12px;${active?'':'opacity:.4'}">
              ${active ? '✓' : '○'} ${col.label}
            </span>`;
          }).join('')}
        </div>
        <p class="t-footnote" style="margin:var(--space-2) 0 0;color:var(--color-ink-tertiary)">
          Pour activer une colonne dans la cuverie, allez dans <a href="cuverie.html" style="color:var(--color-primary)">Cuverie</a> → ⚙ Colonnes.
        </p>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">🏢 Société</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">Structures juridiques proposées à la saisie sur un lot (ex : négoce, cave coopérative). Renommer une entrée met à jour tous les lots existants qui la référencent.</p>
        <div style="display:flex;gap:6px;margin-bottom:var(--space-3);max-width:400px">
          <input type="text" id="societe-add" placeholder="Nouvelle société" style="flex:1;padding:7px 9px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit"
            onkeydown="if(event.key==='Enter')paramAddSociete()">
          <button class="btn btn--secondary btn--sm" onclick="paramAddSociete()">+ Ajouter</button>
        </div>
        <div id="societe-list" style="max-width:400px"></div>
      </div>
    </div>
  `;
  _renderSocieteList();
}

function _renderSocieteList() {
  const el = document.getElementById('societe-list');
  if (!el) return;
  if (!_paramSocietes.length) { el.innerHTML = '<div class="t-footnote" style="color:var(--color-ink-tertiary)">Aucune pour l\'instant.</div>'; return; }
  el.innerHTML = _paramSocietes.map(s => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--color-border)">
      <span style="flex:1">${escapeHtml(s.nom)}</span>
      <button class="btn btn--ghost btn--sm" title="Renommer" onclick="paramRenameSociete('${s.id}')">✏️</button>
      <button class="btn btn--ghost btn--sm" title="Supprimer" onclick="paramDeleteSociete('${s.id}')">🗑</button>
    </div>`).join('');
}

async function paramAddSociete() {
  const inp = document.getElementById('societe-add');
  const nom = (inp.value || '').trim(); if (!nom) return;
  try {
    await WB3DB.addLotSociete(nom);
    inp.value = '';
    _paramSocietes = await WB3DB.listLotSocietes();
    _renderSocieteList();
  } catch(e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function paramRenameSociete(id) {
  const cur = _paramSocietes.find(x => x.id === id); if (!cur) return;
  const nv = await WB3UI.prompt('Renommer « ' + cur.nom + ' » :', { value: cur.nom });
  if (nv == null) return;
  const clean = String(nv).trim(); if (!clean || clean === cur.nom) return;
  try {
    await WB3DB.renameLotSociete(id, cur.nom, clean);
    _paramSocietes = await WB3DB.listLotSocietes();
    _renderSocieteList();
    toast('Renommé', 'success');
  } catch(e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function paramDeleteSociete(id) {
  const cur = _paramSocietes.find(x => x.id === id); if (!cur) return;
  if (!await WB3UI.confirm(`Supprimer « ${cur.nom} » de la liste ? (les lots existants gardent ce nom)`, { title:'Supprimer', okText:'Supprimer', danger:true })) return;
  try {
    await WB3DB.deleteLotSociete(id);
    _paramSocietes = await WB3DB.listLotSocietes();
    _renderSocieteList();
  } catch(e) { toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

function _lotFieldToggle(checkbox) {
  const field = checkbox.dataset.field;
  lotFieldsPrefs[field] = checkbox.checked;
}

async function saveLotFieldsPrefs() {
  try {
    await WB3DB.setUserPref('lot_fields', lotFieldsPrefs);
    const saved = document.getElementById('lot-fields-saved');
    if (saved) { saved.style.display = ''; setTimeout(() => saved.style.display = 'none', 2500); }
    toast('Préférences enregistrées', 'success');
    _renderLotsVinUI();
  } catch(e) {
    console.error(e);
    toast('Erreur lors de la sauvegarde', 'error');
  }
}
