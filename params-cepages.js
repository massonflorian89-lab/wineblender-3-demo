/* params-cepages.js — Paramètres : section Cépages */
'use strict';

const COULEUR_LABELS = { rouge:'Rouge', blanc:'Blanc', rose:'Rosé', gris:'Gris' };
const COULEUR_ICONS  = { rouge:'🔴', blanc:'⚪', rose:'🌸', gris:'🩶' };

const CEPAGES_STANDARD = [
  // ── Rouges (N) ──
  { nom:'Grenache N', couleur:'rouge' },                 { nom:'Syrah N', couleur:'rouge' },
  { nom:'Mourvèdre N', couleur:'rouge' },                { nom:'Carignan N', couleur:'rouge' },
  { nom:'Cinsaut N', couleur:'rouge' },                  { nom:'Merlot N', couleur:'rouge' },
  { nom:'Cabernet-Sauvignon N', couleur:'rouge' },       { nom:'Cabernet franc N', couleur:'rouge' },
  { nom:'Marselan N', couleur:'rouge' },                 { nom:'Caladoc N', couleur:'rouge' },
  { nom:'Alicante Henri Bouschet N', couleur:'rouge' },  { nom:'Lledoner pelut N', couleur:'rouge' },
  { nom:'Counoise N', couleur:'rouge' },                 { nom:'Terret noir N', couleur:'rouge' },
  { nom:'Pinot noir N', couleur:'rouge' },               { nom:'Gamay N', couleur:'rouge' },
  { nom:'Côt N', couleur:'rouge' },                      { nom:'Petit Verdot N', couleur:'rouge' },
  { nom:'Tempranillo N', couleur:'rouge' },              { nom:'Nielluccio N', couleur:'rouge' },
  { nom:'Portan N', couleur:'rouge' },                   { nom:'Aramon noir N', couleur:'rouge' },
  { nom:'Muscat de Hambourg N', couleur:'rouge' },
  // ── Blancs (B) ──
  { nom:'Chardonnay B', couleur:'blanc' },               { nom:'Sauvignon B', couleur:'blanc' },
  { nom:'Viognier B', couleur:'blanc' },                 { nom:'Vermentino B', couleur:'blanc' },
  { nom:'Grenache blanc B', couleur:'blanc' },           { nom:'Roussanne B', couleur:'blanc' },
  { nom:'Marsanne B', couleur:'blanc' },                 { nom:'Clairette B', couleur:'blanc' },
  { nom:'Piquepoul blanc B', couleur:'blanc' },          { nom:'Bourboulenc B', couleur:'blanc' },
  { nom:'Maccabeu B', couleur:'blanc' },                 { nom:'Terret blanc B', couleur:'blanc' },
  { nom:'Carignan blanc B', couleur:'blanc' },           { nom:'Ugni blanc B', couleur:'blanc' },
  { nom:'Colombard B', couleur:'blanc' },                { nom:'Chasan B', couleur:'blanc' },
  { nom:'Chenin B', couleur:'blanc' },                   { nom:'Mauzac B', couleur:'blanc' },
  { nom:'Sémillon B', couleur:'blanc' },                 { nom:'Muscat à petits grains blancs B', couleur:'blanc' },
  { nom:'Muscat d\'Alexandrie B', couleur:'blanc' },
  // ── Gris (G) ──
  { nom:'Grenache gris G', couleur:'gris' },             { nom:'Pinot gris G', couleur:'gris' },
  { nom:'Terret gris G', couleur:'gris' },               { nom:'Sauvignon gris G', couleur:'gris' },
  { nom:'Carignan gris G', couleur:'gris' },
];

let cepages = [];

async function renderCepagesSection() {
  const root = document.getElementById('settings-content');
  root.innerHTML = `<div class="loading-state"><div class="spinner"></div>Chargement…</div>`;
  try {
    cepages = await WB3DB.listTable('cepages', { order: 'ordre' });
    cepages.sort((a, b) => a.couleur.localeCompare(b.couleur) || a.nom.localeCompare(b.nom, 'fr'));
  } catch(e) { cepages = []; console.warn(e); }
  _renderCepagesUI();
}

function _renderCepagesUI() {
  const root = document.getElementById('settings-content');
  const byCouleur = { rouge:[], blanc:[], rose:[], gris:[] };
  cepages.filter(c => c.actif).forEach(c => { if (byCouleur[c.couleur]) byCouleur[c.couleur].push(c); });

  root.innerHTML = `
    <h2>🍇 Cépages</h2>
    <p class="lead">Référentiel des cépages disponibles lors de la création d'un lot. Ajoute, renomme ou désactive les cépages selon ta réalité.</p>

    ${!cepages.length ? `
      <div style="background:var(--color-warning-soft);border-left:3px solid var(--color-warning);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4)">
        <b>Liste vide.</b> Importe la liste OIV (noms officiels) ou ajoute tes cépages manuellement.
      </div>` : ''}

    <div class="add-form" style="margin-bottom:var(--space-3)">
      <input class="input" type="text" id="new-cepage-nom" maxlength="60" placeholder="Nom du cépage…">
      <select class="select" id="new-cepage-couleur" style="max-width:130px">
        <option value="rouge">🔴 Rouge</option>
        <option value="blanc">⚪ Blanc</option>
        <option value="rose">🌸 Rosé</option>
        <option value="gris">🩶 Gris</option>
      </select>
      <button class="btn" onclick="addCepage()">+ Ajouter</button>
    </div>

    ${cepages.length === 0 ? '' : `
    <div style="display:flex;gap:var(--space-6);flex-wrap:wrap">
      ${Object.entries(byCouleur).map(([couleur, list]) => list.length ? `
        <div style="flex:1;min-width:180px">
          <div style="font-weight:600;font-size:var(--text-caption);color:var(--color-ink-tertiary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:var(--space-2)">
            ${COULEUR_ICONS[couleur]} ${COULEUR_LABELS[couleur]}
          </div>
          ${list.map(c => `
            <div class="list-item" style="padding:6px 10px">
              <div class="item-main" style="font-size:var(--text-callout)">${escapeHtml(c.nom)}</div>
              <div class="item-actions">
                <button title="Renommer" onclick="renameCepage('${c.id}')">✏️</button>
                <button class="danger" title="Supprimer" onclick="deleteCepage('${c.id}')">🗑</button>
              </div>
            </div>`).join('')}
        </div>` : '').join('')}
    </div>`}

    <div style="padding-top:var(--space-4);border-top:1px solid var(--color-border);margin-top:var(--space-4);display:flex;gap:var(--space-2)">
      <button class="btn btn--secondary" onclick="loadStandardCepages()">
        🌍 Importer la liste OIV (${CEPAGES_STANDARD.length} cépages, noms officiels)
      </button>
    </div>
  `;
}

async function addCepage() {
  const nom = document.getElementById('new-cepage-nom').value.trim();
  const couleur = document.getElementById('new-cepage-couleur').value;
  if (!nom) return;
  try {
    const maxOrdre = cepages.length ? Math.max(...cepages.map(c => c.ordre)) : 0;
    await WB3DB.insertRow('cepages', { nom, couleur, ordre: maxOrdre + 1 });
    document.getElementById('new-cepage-nom').value = '';
    cepages = await WB3DB.listTable('cepages', { order: 'ordre' });
    _renderCepagesUI();
    toast('Cépage ajouté', 'success');
  } catch(e) {
    if (e.code === '23505' || /duplicate/i.test(e.message)) toast('Ce cépage existe déjà', 'error');
    else toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}

async function renameCepage(id) {
  const c = cepages.find(x => x.id === id);
  if (!c) return;
  const newNom = await WB3UI.prompt('Nouveau nom du cépage :', { title:'Renommer le cépage', value:c.nom, okText:'Renommer' });
  if (!newNom || newNom.trim() === c.nom) return;
  try {
    await WB3DB.updateRow('cepages', id, { nom: newNom.trim() });
    cepages = await WB3DB.listTable('cepages', { order: 'ordre' });
    _renderCepagesUI();
    toast('Cépage renommé', 'success');
  } catch(e) {
    if (e.code === '23505') toast('Ce nom est déjà utilisé', 'error');
    else toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}

async function deleteCepage(id) {
  const c = cepages.find(x => x.id === id);
  if (!c) return;
  if (!(await WB3UI.confirm(`Supprimer le cépage "${c.nom}" ?\n\nLes lots qui l'utilisent ne seront pas affectés.`, { title:'Supprimer le cépage', okText:'Supprimer', danger:true }))) return;
  try {
    await WB3DB.deleteRow('cepages', id);
    cepages = cepages.filter(x => x.id !== id);
    _renderCepagesUI();
    toast('Cépage supprimé', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function loadStandardCepages() {
  if (!(await WB3UI.confirm(`Importer les ${CEPAGES_STANDARD.length} cépages OIV (noms officiels) ?\n\nLes cépages déjà présents ne seront pas dupliqués.`, { title:'Liste OIV', okText:'Importer' }))) return;
  const existing = new Set(cepages.map(c => c.nom.toLowerCase()));
  const toAdd    = CEPAGES_STANDARD.filter(c => !existing.has(c.nom.toLowerCase()));
  if (!toAdd.length) { toast('Tous les cépages OIV sont déjà présents', 'info'); return; }
  let maxOrdre = cepages.length ? Math.max(...cepages.map(c => c.ordre)) : 0;
  let ok = 0;
  for (const c of toAdd) {
    try {
      maxOrdre++;
      await WB3DB.insertRow('cepages', { nom: c.nom, couleur: c.couleur, ordre: maxOrdre });
      ok++;
    } catch(_) {}
  }
  cepages = await WB3DB.listTable('cepages', { order: 'ordre' });
  _renderCepagesUI();
  toast(`${ok} cépage${ok > 1 ? 's' : ''} ajouté${ok > 1 ? 's' : ''}`, 'success');
}
