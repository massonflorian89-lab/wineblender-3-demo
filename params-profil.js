/* params-profil.js — Paramètres : section Profil + Export des données */
'use strict';

async function renderProfil() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';

  const user   = WB3DB.getCurrentUser?.() || null;
  const tenant = WB3DB.getCurrentTenant?.() || null;

  let profil = { prenom: '', nom: '' };
  try {
    const p = await WB3DB.getUserPref('profil');
    if (p) { profil.prenom = p.prenom || ''; profil.nom = p.nom || ''; }
  } catch(e) { /* defaults */ }

  root.innerHTML = `
    <h2>👤 Mon profil</h2>
    <p class="lead">Renseigne ton prénom et ton nom pour personnaliser l'interface (salutation, rapports…).</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Identité</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-3)">
          <div class="field">
            <label class="field-label">Prénom</label>
            <input class="input" id="profil-prenom" type="text" value="${escapeHtml(profil.prenom)}"
              placeholder="ex : Florian" autocomplete="given-name">
          </div>
          <div class="field">
            <label class="field-label">Nom</label>
            <input class="input" id="profil-nom" type="text" value="${escapeHtml(profil.nom)}"
              placeholder="ex : Masson" autocomplete="family-name">
          </div>
        </div>
        <button class="btn" onclick="saveProfil()">💾 Enregistrer</button>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Compte</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div class="field" style="margin-bottom:var(--space-3)">
          <label class="field-label">Adresse e-mail</label>
          <input class="input" type="text" value="${escapeHtml(user?.email || '—')}" readonly>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3)">
          <div class="field">
            <label class="field-label">Cave</label>
            <input class="input" type="text" value="${escapeHtml(tenant?.nom || '—')}" readonly>
          </div>
          <div class="field">
            <label class="field-label">Rôle</label>
            <input class="input" type="text" value="${escapeHtml(tenant?.role || '—')}" readonly>
          </div>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Export des données</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="lead" style="margin-top:0">
          Télécharge l'intégralité des données de ta cave (lots, contenants,
          apports, opérations, analyses…) dans un seul fichier JSON.
          Utile pour une sauvegarde annuelle ou un archivage de millésime.
        </p>
        <button class="btn" id="btn-export-tenant" onclick="exportTenantData()">
          📦 Exporter toutes mes données (JSON)
        </button>
        <span id="export-status" style="margin-left:var(--space-3);font-size:var(--text-caption);color:var(--color-ink-tertiary)"></span>
      </div>
    </div>
  `;
}

async function exportTenantData() {
  const btn    = document.getElementById('btn-export-tenant');
  const status = document.getElementById('export-status');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Export en cours…'; }
  if (status) status.textContent = '';
  try {
    const data = await WB3DB.exportTenant();
    const sections = Object.entries(data || {})
      .filter(([, v]) => Array.isArray(v))
      .reduce((s, [, v]) => s + v.length, 0);
    const caveName = (data?.tenant?.slug || data?.tenant?.nom || 'cave')
      .toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `wb3-export-${caveName}-${stamp}.json`;
    WB3Nav.downloadFile(JSON.stringify(data, null, 2), fileName, 'application/json');
    if (status) status.textContent = `✅ ${sections} enregistrements exportés → ${fileName}`;
    toast('Export terminé', 'success');
  } catch (e) {
    console.error('[WB3 export]', e);
    if (status) status.textContent = '❌ ' + (e.message || 'Erreur export');
    toast('Échec de l\'export', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📦 Exporter toutes mes données (JSON)'; }
  }
}

async function saveProfil() {
  const prenom = document.getElementById('profil-prenom')?.value?.trim() || '';
  const nom    = document.getElementById('profil-nom')?.value?.trim()    || '';
  try {
    await WB3DB.setUserPref('profil', { prenom, nom });
    toast('Profil enregistré', 'success');
  } catch(e) {
    toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}
