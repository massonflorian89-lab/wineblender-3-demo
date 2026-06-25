/* params-vue-cuverie.js — Paramètres : sous-section Vue cuverie (préférences affichage)
 * Dépend de : _getSubRoot() (params-cuverie-groupe.js), CUVE_SVG (var dans main).
 */
'use strict';

const CUVERIE_STATS = [
  { id: 'total',        label: 'Contenants',          desc: 'Nombre total + nb inactifs' },
  { id: 'capacite',     label: 'Capacité totale',     desc: 'Cumul en hectolitres' },
  { id: 'remplissage',  label: 'Remplissage global',  desc: 'Taux d\'occupation de la cave + barre' },
  { id: 'vides',        label: '⚪ Contenants vides',  desc: 'Disponibles immédiatement' },
  { id: 'fermentation', label: '🌡 En fermentation',   desc: 'Lots en FA + FML actifs' },
  { id: 'cuves',        label: `${CUVE_SVG} Cuves`,   desc: 'Nombre + capacité totale' },
  { id: 'foudres',      label: '🛢 Foudres',          desc: 'Nombre + capacité totale' },
  { id: 'futs',         label: '🛢 Fûts',             desc: 'Nombre + capacité totale' },
  { id: 'pressoirs',    label: '⚙️ Pressoirs',        desc: 'Nombre + capacité totale' },
  { id: 'vol_rouge',    label: '🔴 Volume rouge',     desc: 'Total hL des lots rouges' },
  { id: 'vol_blanc',    label: '⚪ Volume blanc',      desc: 'Total hL des lots blancs' },
  { id: 'vol_rose',     label: '🌸 Volume rosé',       desc: 'Total hL des lots rosés' },
];

const CUVERIE_DEFAULTS = {
  default_view:  'table',
  default_group: 'none',
  default_sort:  'nom',
  visible_stats: ['total', 'capacite', 'cuves', 'foudres', 'futs', 'pressoirs'],
  page_size:     50,
  wall_view:     'auto',
};

let cuveriePrefs = { ...CUVERIE_DEFAULTS };

async function renderCuverieSettings() {
  const root = _getSubRoot();
  root.innerHTML = `<div class="loading-state"><div class="spinner"></div>Chargement des préférences…</div>`;
  try {
    const prefs = await WB3DB.getUserPref('cuverie');
    cuveriePrefs = { ...CUVERIE_DEFAULTS, ...prefs };
  } catch(e) { console.warn(e); }

  root.innerHTML = `
    <h2>${CUVE_SVG} Vue cuverie</h2>
    <p class="lead">Personnalise l'affichage par défaut quand tu ouvres la cuverie. Synchronisé entre tous tes appareils.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Vue par défaut au démarrage</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap" id="pref-view">
          <label class="toggle"><input type="radio" name="view" value="grid" ${cuveriePrefs.default_view==='grid'?'checked':''}> ▦ Grille</label>
          <label class="toggle"><input type="radio" name="view" value="table" ${cuveriePrefs.default_view==='table'?'checked':''}> ☰ Tableau</label>
          <label class="toggle"><input type="radio" name="view" value="plan" ${cuveriePrefs.default_view==='plan'?'checked':''}> ▥ Plan du chai</label>
          <label class="toggle"><input type="radio" name="view" value="caveplan" ${cuveriePrefs.default_view==='caveplan'?'checked':''}> 🗺 Plan de cave</label>
        </div>
        <p class="t-footnote" style="margin:var(--space-2) 0 0">🗺 Plan de cave : disposition libre, réservée à l'ordinateur (≥ 13″).</p>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Vue affichée sur le mur 🖥️</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">Quelle vue afficher quand tu ouvres le mur. « Auto » = plan de cave s'il est composé, sinon grille.</p>
        <select id="pref-wallview" style="max-width:320px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
          ${[['auto','Auto (plan de cave si composé, sinon grille)'],['grid','▦ Grille'],['table','☰ Tableau'],['plan','▥ Plan du chai'],['caveplan','🗺 Plan de cave']]
            .map(([v,l]) => `<option value="${v}" ${(cuveriePrefs.wall_view||'auto')===v?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Mode de groupement par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap" id="pref-group">
          <label class="toggle"><input type="radio" name="group" value="none" ${cuveriePrefs.default_group==='none'?'checked':''}> — Liste plate</label>
          <label class="toggle"><input type="radio" name="group" value="travee" ${cuveriePrefs.default_group==='travee'?'checked':''}> 📍 Par travée</label>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Tri par défaut</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap" id="pref-sort">
          <label class="toggle"><input type="radio" name="sort" value="nom" ${cuveriePrefs.default_sort==='nom'?'checked':''}> A→Z (nom)</label>
          <label class="toggle"><input type="radio" name="sort" value="capacite_hl" ${cuveriePrefs.default_sort==='capacite_hl'?'checked':''}> 📏 Capacité</label>
          <label class="toggle"><input type="radio" name="sort" value="type" ${cuveriePrefs.default_sort==='type'?'checked':''}> 🔧 Type</label>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Contenants par page</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">Nombre d'éléments affichés par page en vue Grille ou Tableau.</p>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap" id="pref-pagesize">
          ${[50, 100, 200, 500].map(n => `
            <label class="toggle">
              <input type="radio" name="pagesize" value="${n}" ${(cuveriePrefs.page_size || 50) === n ? 'checked' : ''}>
              ${n} par page
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Tuiles statistiques affichées</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">Choisis les tuiles à afficher en haut de la page Cuverie.</p>
        <div style="display:flex;flex-direction:column;gap:var(--space-2)" id="pref-stats">
          ${CUVERIE_STATS.map(s => `
            <label class="toggle" style="padding:8px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg-elevated)">
              <input type="checkbox" data-stat="${s.id}" ${cuveriePrefs.visible_stats.includes(s.id)?'checked':''}>
              <div style="flex:1">
                <div style="font-weight:600;font-size:var(--text-callout)">${s.label}</div>
                <div class="t-footnote" style="margin:0">${s.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <div style="display:flex;gap:var(--space-2);justify-content:flex-end;padding-top:var(--space-3);border-top:1px solid var(--color-border)">
      <button class="btn btn--secondary" onclick="renderCuverieSettings()">Annuler les modifications</button>
      <button class="btn" onclick="saveCuveriePrefs()">💾 Enregistrer</button>
    </div>
  `;
}

async function saveCuveriePrefs() {
  const newPrefs = {
    ...cuveriePrefs,
    default_view:  document.querySelector('#pref-view input[name="view"]:checked')?.value   || 'table',
    default_group: document.querySelector('#pref-group input[name="group"]:checked')?.value || 'none',
    default_sort:  document.querySelector('#pref-sort input[name="sort"]:checked')?.value   || 'nom',
    page_size:     Number(document.querySelector('#pref-pagesize input[name="pagesize"]:checked')?.value || 50),
    wall_view:     document.getElementById('pref-wallview')?.value || 'auto',
    visible_stats: Array.from(document.querySelectorAll('#pref-stats input[type="checkbox"]:checked'))
      .map(i => i.dataset.stat),
  };

  if (!newPrefs.visible_stats.length) {
    toast('Sélectionne au moins une tuile à afficher', 'error');
    return;
  }

  if (!await WB3Bootstrap.waitTenant(5000)) {
    toast('Tenant non chargé — recharge la page', 'error');
    return;
  }

  try {
    await WB3DB.setUserPref('cuverie', newPrefs);
    cuveriePrefs = newPrefs;
    toast('Préférences enregistrées', 'success');
  } catch(e) {
    console.error(e);
    toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}
