/* params-corbeille.js — Paramètres : section Corbeille (éléments archivés) */
'use strict';

const CORBEILLE_TABLES = [
  { table:'apports',            label:'🍇 Apports',    libelle: r => r.numero || r.apporteur || r.provenance || r.id.slice(0,8),
    sub: r => [r.date_apport, r.cepage_libre, r.volume_hl!=null?`${r.volume_hl} hL`:null].filter(Boolean).join(' · ') },
  { table:'contenants',         label:'🛢 Contenants', libelle: r => r.nom || r.id.slice(0,8),
    sub: r => [r.type, r.capacite_hl!=null?`${r.capacite_hl} hL`:null].filter(Boolean).join(' · ') },
  { table:'produits_catalogue', label:'🧪 Produits',   libelle: r => r.nom || r.id.slice(0,8),
    sub: r => [r.categorie, r.fournisseur].filter(Boolean).join(' · ') },
  { table:'produits_lots',      label:'📦 Lots produits', libelle: r => r.numero_lot || r.id.slice(0,8),
    sub: r => [r.dluo?`DLUO ${r.dluo}`:null, r.quantite_actuelle!=null?`${r.quantite_actuelle}`:null].filter(Boolean).join(' · ') },
  { table:'analyses',           label:'🔬 Analyses',   libelle: r => r.date_analyse || r.id.slice(0,8),
    sub: r => [r.operateur, r.so2_libre!=null?`SO₂L ${r.so2_libre}`:null].filter(Boolean).join(' · ') },
];

async function renderCorbeille() {
  const root = document.getElementById('settings-content');
  root.innerHTML = `
    <h2>🗑 Corbeille</h2>
    <p class="lead">Éléments archivés (masqués des listes mais conservés pour la traçabilité).
       Tu peux les restaurer à tout moment.</p>
    <div id="corbeille-body"><div class="loading-state"><div class="spinner"></div>Chargement…</div></div>
  `;

  const body = document.getElementById('corbeille-body');
  try {
    const results = await Promise.all(
      CORBEILLE_TABLES.map(t =>
        WB3DB.listTable(t.table, { includeArchived: true })
          .then(rows => (rows || []).filter(r => r.archived_at))
          .catch(() => [])
      )
    );

    const totalArchived = results.reduce((s, arr) => s + arr.length, 0);
    if (totalArchived === 0) {
      body.innerHTML = `<div class="drawer-section"><div class="drawer-section-content"
        style="padding:var(--space-5);text-align:center;color:var(--color-ink-tertiary)">
        ✅ Corbeille vide — aucun élément archivé.</div></div>`;
      return;
    }

    body.innerHTML = CORBEILLE_TABLES.map((t, i) => {
      const rows = results[i];
      if (!rows.length) return '';
      const items = rows
        .sort((a, b) => (b.archived_at || '').localeCompare(a.archived_at || ''))
        .map(r => {
          const when = r.archived_at
            ? new Date(r.archived_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
            : '';
          const sub = (t.sub(r) || '');
          return `<div style="display:flex;align-items:center;gap:var(--space-3);
                       padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:var(--text-callout)">${escapeHtml(String(t.libelle(r)))}</div>
              <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">
                ${escapeHtml(sub)}${sub?' · ':''}archivé le ${when}</div>
            </div>
            <button class="btn btn--secondary btn--sm"
              onclick="restoreItem('${t.table}','${r.id}', this)">♻️ Restaurer</button>
          </div>`;
        }).join('');
      return `<div class="drawer-section">
        <div class="drawer-section-title">${t.label} <span style="opacity:.6">(${rows.length})</span></div>
        <div class="drawer-section-content" style="padding:0">${items}</div>
      </div>`;
    }).join('');
  } catch (e) {
    body.innerHTML = `<div class="drawer-section"><div class="drawer-section-content"
      style="padding:var(--space-4);color:var(--color-danger)">❌ ${escapeHtml(e.message)}</div></div>`;
  }
}

async function restoreItem(table, id, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '⏳…'; }
  try {
    await WB3DB.restore(table, id);
    toast('Élément restauré', 'success');
    renderCorbeille();
  } catch (e) {
    toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    if (btn) { btn.disabled = false; btn.textContent = '♻️ Restaurer'; }
  }
}
