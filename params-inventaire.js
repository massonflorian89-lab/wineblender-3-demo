/* params-inventaire.js — Paramètres : section Inventaire (cuves & produits — mig 066)
 * Dépend de : _subIc() (params-cuverie-groupe.js), activeInventaireSubtab (var dans main).
 */
'use strict';

const INVENTAIRE_SUBTABS = [
  { key:'cuve',    ic:'tank',  label:'Cuves'    },
  { key:'produit', ic:'flask', label:'Produits' },
];
let _invSessions = [];
let _invOpenId   = null;
let _invLignes   = [];

function _invNum(x){
  if (x == null || x === '') return '';
  const n = Number(x);
  if (Number.isNaN(n)) return '';
  return (Math.round(n * 1000) / 1000).toLocaleString('fr-FR');
}
function _invPriv(){ return !!(WB3DB.isPrivileged && WB3DB.isPrivileged()); }

async function renderInventaireGroup() {
  const root = document.getElementById('settings-content');
  if (WB3DB.ensureModule && !(await WB3DB.ensureModule('inventaire', root))) return;
  const tabs = INVENTAIRE_SUBTABS.map(t => `
    <button class="subtab-btn${activeInventaireSubtab === t.key ? ' active' : ''}"
            data-subtab="${t.key}" onclick="setInventaireSubtab('${t.key}')">
      ${_subIc(t.ic)}${t.label}
    </button>`).join('');
  root.innerHTML = `<div class="subtab-bar">${tabs}</div><div id="inventaire-sub"></div>`;
  _renderInventaireSub();
}

function setInventaireSubtab(key) {
  activeInventaireSubtab = key;
  _invOpenId = null; _invLignes = [];
  document.querySelectorAll('.subtab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.subtab === key));
  _renderInventaireSub();
}

async function _renderInventaireSub() {
  const root = document.getElementById('inventaire-sub');
  if (!root) return;
  const type = activeInventaireSubtab;
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    _invSessions = await WB3DB.listInventaires(type);
  } catch (e) {
    root.innerHTML = `<p style="color:var(--color-danger)">Erreur : ${escapeHtml(e.message || e)}</p>`;
    return;
  }

  const labelType = type === 'cuve' ? 'cuves' : 'produits';
  const list = _invSessions.length ? `
    <table class="data-table" style="margin-top:var(--space-2)">
      <thead><tr><th>Date</th><th>Libellé</th><th>Statut</th><th></th></tr></thead>
      <tbody>
        ${_invSessions.map(s => `<tr${s.id === _invOpenId ? ' style="background:var(--color-bg-subtle)"' : ''}>
          <td style="white-space:nowrap">${escapeHtml(new Date(s.date_inventaire + 'T00:00:00').toLocaleDateString('fr'))}</td>
          <td>${s.libelle ? escapeHtml(s.libelle) : '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
          <td>${s.statut === 'clos'
                ? '<span class="tag">🔒 Clos</span>'
                : '<span class="tag tag--success">✏️ Ouvert</span>'}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn--ghost btn--sm" onclick="openInventaire('${s.id}')">${s.id === _invOpenId ? 'Rafraîchir' : 'Ouvrir'}</button>
            ${_invPriv() ? `<button class="btn btn--ghost btn--sm" style="color:var(--color-danger)" onclick="deleteInventaire('${s.id}')" title="Supprimer">🗑</button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<p style="color:var(--color-ink-tertiary);margin-top:var(--space-2)">Aucun inventaire ${labelType} pour l'instant.</p>`;

  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap">
      <div>
        <h3 style="margin:0">📦 Inventaire ${labelType}</h3>
        <p style="margin:2px 0 0;font-size:var(--text-caption);color:var(--color-ink-tertiary)">
          Comparez la quantité théorique (système) à la quantité comptée, expliquez les écarts.</p>
      </div>
      <button class="btn btn--primary btn--sm" data-help="Démarre un inventaire du stock produits : tu comptes le réel, l'écart avec le stock théorique est enregistré." onclick="newInventaire()">+ Nouvel inventaire</button>
    </div>
    ${list}
    <div id="inv-detail" style="margin-top:var(--space-4)"></div>`;

  if (_invOpenId) _renderInventaireDetail();
}

async function newInventaire() {
  const type = activeInventaireSubtab;
  const libelle = await WB3UI.prompt(`Libellé de l'inventaire ${type === 'cuve' ? 'cuves' : 'produits'} (optionnel) :`,
    { title: 'Nouvel inventaire', placeholder: 'ex. Inventaire fin de mois', okText: 'Créer' });
  if (libelle === null) return;
  try {
    const inv = await WB3DB.createInventaire({ type, libelle: libelle.trim() || null });
    const lignes = await _invSnapshot(type);
    if (lignes.length) await WB3DB.addInventaireLignes(inv.id, lignes);
    await openInventaire(inv.id);
    toast(`✅ Inventaire créé — ${lignes.length} ligne${lignes.length > 1 ? 's' : ''}`);
  } catch (e) {
    console.error('[inventaire] new', e);
    toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error');
  }
}

async function _invSnapshot(type) {
  if (type === 'cuve') {
    const etat = await WB3DB.queryCuverieEtat();
    return etat
      .filter(c => Number(c.volume_actuel_hl ?? c.volume_total_hl ?? 0) > 0 || c.lot_nom)
      .map(c => ({
        ref_id: c.contenant_id,
        ref_label: c.contenant_nom,
        ref_detail: c.lot_nom || null,
        unite: 'hL',
        qte_theorique: Number(c.volume_actuel_hl ?? c.volume_total_hl ?? 0),
      }));
  }
  const lots = await WB3DB.getProduitLots();
  return lots.map(l => ({
    ref_id: l.id,
    ref_label: (l.produits_catalogue?.nom || 'Produit') + (l.numero_lot ? ' · ' + l.numero_lot : ''),
    ref_detail: l.fournisseur || l.produits_catalogue?.fournisseur || null,
    unite: l.unite || l.produits_catalogue?.unite_stock || '',
    qte_theorique: l.quantite_actuelle != null ? Number(l.quantite_actuelle) : null,
  }));
}

async function openInventaire(id) {
  _invOpenId = id;
  try { _invLignes = await WB3DB.getInventaireLignes(id); }
  catch (e) { toast('Erreur chargement : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error'); return; }
  await _renderInventaireSub();
  document.getElementById('inv-detail')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

async function deleteInventaire(id) {
  const s = _invSessions.find(x => x.id === id);
  const ok = await WB3UI.confirm(`Supprimer définitivement l'inventaire du ${s ? new Date(s.date_inventaire+'T00:00:00').toLocaleDateString('fr') : ''} ?`,
    { title: 'Supprimer l\'inventaire', okText: 'Supprimer', danger: true });
  if (!ok) return;
  try {
    await WB3DB.deleteInventaire(id);
    if (_invOpenId === id) { _invOpenId = null; _invLignes = []; }
    await _renderInventaireSub();
    toast('🗑 Inventaire supprimé');
  } catch (e) {
    console.error('[inventaire] delete', e);
    toast('Suppression refusée (privilégié uniquement).', 'error');
  }
}

async function _renderInventaireDetail() {
  const box = document.getElementById('inv-detail');
  if (!box) return;
  const sess = _invSessions.find(s => s.id === _invOpenId);
  if (!sess) { box.innerHTML = ''; return; }
  if (!_invLignes.length) {
    try { _invLignes = await WB3DB.getInventaireLignes(_invOpenId); }
    catch (e) { box.innerHTML = `<p style="color:var(--color-danger)">${escapeHtml(e.message||e)}</p>`; return; }
  }
  const clos = sess.statut === 'clos';
  const dis = clos ? 'disabled' : '';

  const rows = _invLignes.map(l => `
    <tr>
      <td>${escapeHtml(l.ref_label || '—')}${l.ref_detail ? `<br><small style="color:var(--color-ink-tertiary)">${escapeHtml(l.ref_detail)}</small>` : ''}</td>
      <td style="text-align:right;white-space:nowrap">${_invNum(l.qte_theorique)} ${escapeHtml(l.unite || '')}</td>
      <td style="text-align:right">
        <input type="number" step="0.001" value="${l.qte_comptee != null ? l.qte_comptee : ''}" ${dis}
               style="width:90px;text-align:right" onchange="invSetComptee('${l.id}', this.value)">
      </td>
      <td style="text-align:right;white-space:nowrap" id="inv-delta-${l.id}">${_invDeltaCell(l.qte_theorique, l.qte_comptee)}</td>
      <td><input type="text" value="${escapeHtml(l.explication || '')}" ${dis}
                 placeholder="Explication de l'écart…" style="width:100%" onchange="invSetExplication('${l.id}', this.value)"></td>
    </tr>`).join('');

  box.innerHTML = `
    <div class="drawer-section">
      <div class="drawer-section-title" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);flex-wrap:wrap">
        <span>${escapeHtml(sess.libelle || 'Inventaire')} — ${escapeHtml(new Date(sess.date_inventaire+'T00:00:00').toLocaleDateString('fr'))}
          ${clos ? '<span class="tag">🔒 Clos</span>' : ''}</span>
        <span id="inv-summary" style="font-size:var(--text-caption);font-weight:400"></span>
      </div>
      <div class="drawer-section-content" style="padding:var(--space-3)">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr>
              <th>${activeInventaireSubtab === 'cuve' ? 'Cuve' : 'Produit · lot'}</th>
              <th style="text-align:right">Théorique</th>
              <th style="text-align:right">Compté</th>
              <th style="text-align:right">Écart</th>
              <th>Explication</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="display:flex;gap:var(--space-2);margin-top:var(--space-3)">
          ${_invPriv() ? (clos
            ? `<button class="btn btn--secondary btn--sm" onclick="invSetStatut('${sess.id}','ouvert')">🔓 Rouvrir</button>`
            : `<button class="btn btn--secondary btn--sm" onclick="invSetStatut('${sess.id}','clos')">🔒 Clôturer</button>`) : ''}
          <button class="btn btn--ghost btn--sm" onclick="invExportCsv()">📤 Export CSV</button>
        </div>
      </div>
    </div>`;
  _invRefreshTotals();
}

function _invDeltaCell(theo, comptee) {
  if (comptee == null || comptee === '') return '<span style="color:var(--color-ink-tertiary)">—</span>';
  const d = Number(comptee) - Number(theo || 0);
  const eps = Math.abs(d) < 1e-9;
  const col = eps ? 'var(--color-ink-tertiary)' : (d < 0 ? '#c62828' : '#1565c0');
  const sign = d > 0 ? '+' : '';
  return `<span style="color:${col};font-weight:600">${sign}${_invNum(d)}</span>`;
}

function _invRefreshTotals() {
  const el = document.getElementById('inv-summary'); if (!el) return;
  const counted = _invLignes.filter(l => l.qte_comptee != null).length;
  let ecartTot = 0;
  _invLignes.forEach(l => { if (l.qte_comptee != null) ecartTot += (Number(l.qte_comptee) - Number(l.qte_theorique || 0)); });
  const unite = activeInventaireSubtab === 'cuve' ? 'hL' : '';
  const col = Math.abs(ecartTot) < 1e-9 ? 'var(--color-ink-tertiary)' : (ecartTot < 0 ? '#c62828' : '#1565c0');
  el.innerHTML = `${counted}/${_invLignes.length} comptées · écart total : <b style="color:${col}">${ecartTot>0?'+':''}${_invNum(ecartTot)} ${unite}</b>`;
}

async function invSetComptee(id, raw) {
  const val = String(raw).trim() === '' ? null : parseFloat(String(raw).replace(',', '.'));
  const lg = _invLignes.find(l => l.id === id); if (!lg) return;
  lg.qte_comptee = (val == null || Number.isNaN(val)) ? null : val;
  const cell = document.getElementById('inv-delta-' + id);
  if (cell) cell.innerHTML = _invDeltaCell(lg.qte_theorique, lg.qte_comptee);
  _invRefreshTotals();
  try { await WB3DB.updateInventaireLigne(id, { qte_comptee: lg.qte_comptee }); }
  catch (e) { console.error('[inventaire] comptee', e); toast('Échec sauvegarde', 'error'); }
}

async function invSetExplication(id, val) {
  const lg = _invLignes.find(l => l.id === id); if (lg) lg.explication = val;
  try { await WB3DB.updateInventaireLigne(id, { explication: val.trim() || null }); }
  catch (e) { console.error('[inventaire] explication', e); toast('Échec sauvegarde', 'error'); }
}

async function invSetStatut(id, statut) {
  try {
    await WB3DB.setInventaireStatut(id, statut);
    const s = _invSessions.find(x => x.id === id); if (s) s.statut = statut;
    await _renderInventaireSub();
    toast(statut === 'clos' ? '🔒 Inventaire clôturé' : '🔓 Inventaire rouvert');
  } catch (e) { console.error('[inventaire] statut', e); toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error'); }
}

function invExportCsv() {
  const sess = _invSessions.find(s => s.id === _invOpenId); if (!sess) return;
  const head = ['ref', 'detail', 'unite', 'theorique', 'compte', 'ecart', 'explication'];
  const lines = [head.join(';')].concat(_invLignes.map(l => {
    const ecart = (l.qte_comptee != null) ? (Number(l.qte_comptee) - Number(l.qte_theorique || 0)) : '';
    return [l.ref_label, l.ref_detail || '', l.unite || '', l.qte_theorique ?? '',
            l.qte_comptee ?? '', ecart, (l.explication || '').replace(/[\r\n;]+/g, ' ')]
      .map(v => String(v).replace('.', ',')).join(';');
  }));
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inventaire_${activeInventaireSubtab}_${sess.date_inventaire}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
