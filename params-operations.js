/* params-operations.js — Paramètres : section Opérations (préférences d'affichage)
 * Extrait de parametres.html (mig-refactor step 1).
 * Chargé en <script src="..."> avant le bloc inline principal.
 *
 * Règles d'extraction :
 *   • Les déclarations function deviennent automatiquement window.* (pas de type="module").
 *   • operationsVuePrefs est var (= window.operationsVuePrefs) car des onclick générés
 *     par _renderOperationsVueUI() le mutent directement en portée globale.
 *   • OPERATIONS_VUE_DEFAULTS est const : jamais référencé depuis un onclick HTML.
 *   • toast() et WB3DB sont définis dans les scripts chargés avant ce fichier.
 */
'use strict';

const OPERATIONS_VUE_DEFAULTS = { view_mode: 'table' };
// eslint-disable-next-line no-var
var operationsVuePrefs = { ...OPERATIONS_VUE_DEFAULTS };

async function renderOperationsVueSettings() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const p = await WB3DB.getUserPref('operations_vue');
    operationsVuePrefs = { ...OPERATIONS_VUE_DEFAULTS, ...(p || {}) };
  } catch(e) { console.warn(e); }
  _renderOperationsVueUI();
}

function _renderOperationsVueUI() {
  const root = document.getElementById('settings-content');
  const p = operationsVuePrefs;
  root.innerHTML = `
    <h2>⚙️ Vue opérations</h2>
    <p class="lead">Personnalise l'affichage par défaut quand tu ouvres la page Opérations. Synchronisé entre tous tes appareils.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Mode d'affichage par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap">
          ${[
            { key:'grid',  label:'⊞ Grille (cartes)',  desc:'Affichage en cartes.' },
            { key:'table', label:'☰ Tableau',           desc:'Colonnes détaillées (défaut).' },
          ].map(v => `
            <label style="flex:1;min-width:200px;display:flex;gap:10px;align-items:flex-start;padding:var(--space-3);border:2px solid ${p.view_mode===v.key?'var(--color-primary)':'var(--color-border)'};border-radius:var(--radius-md);cursor:pointer;background:${p.view_mode===v.key?'var(--color-primary-soft)':'var(--color-bg-elevated)'}">
              <input type="radio" name="op-view" value="${v.key}" ${p.view_mode===v.key?'checked':''} onchange="operationsVuePrefs.view_mode=this.value;_renderOperationsVueUI()">
              <div><div style="font-weight:600">${v.label}</div><div style="font-size:12px;color:var(--color-ink-tertiary)">${v.desc}</div></div>
            </label>`).join('')}
        </div>
      </div>
    </div>

    <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
      <button class="btn btn--primary" onclick="saveOperationsVuePrefs()">💾 Enregistrer</button>
      <span id="operations-vue-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓ Enregistré</span>
    </div>
  `;
}

async function saveOperationsVuePrefs() {
  try {
    await WB3DB.setUserPref('operations_vue', operationsVuePrefs);
    const el = document.getElementById('operations-vue-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2500); }
    toast('Préférences opérations enregistrées', 'success');
  } catch(e) {
    toast('Erreur lors de la sauvegarde', 'error');
  }
}
