// ============================================================
// cuverie-tournee.js — mode tournée cuverie (socle 9)
// Chargé par <script src="cuverie-tournee.js"> AVANT le script
// principal de cuverie.html.
//
// Dépendances (injectées à l'exécution via window, pas au chargement) :
//   - window._WB3T     : objet d'état partagé avec cuverie.html
//                        (on/checks/data/loading) — défini par cuverie.html
//                        au tout début de son script principal.
//   - window.WB3DB     : db.js
//   - window.render    : render() de cuverie.html
//   - window.toast     : toast() de cuverie.html
//   - window.openOpPanel, _openSuiviFa, openDetailDrawer
//   - window.contenants : tableau des contenants (let exposé via _WB3T)
//   - window.escapeHtml : helper XSS de cuverie.html
// Toutes ces fonctions/variables sont lues à l'APPEL (pas au chargement)
// → pas de problème d'ordre de chargement.
// ============================================================
'use strict';

function _tourneeSessionKey() {
  const t = (typeof WB3DB !== 'undefined' && WB3DB.getCurrentTenantId)
    ? (WB3DB.getCurrentTenantId() || 'na') : 'na';
  const d = new Date().toISOString().slice(0, 10);
  return 'wb3_tournee_' + t + '_' + d;
}

function _tourneeLoadChecks() {
  try {
    const raw = sessionStorage.getItem(_tourneeSessionKey());
    _WB3T.checks = new Set(raw ? JSON.parse(raw) : []);
  } catch(_) { _WB3T.checks = new Set(); }
}

function _tourneeSaveChecks() {
  if (!_WB3T.checks) return;
  try {
    sessionStorage.setItem(_tourneeSessionKey(), JSON.stringify([..._WB3T.checks]));
  } catch(_) {}
}

function _tourneeKey(cid, kind) { return cid + '::' + kind; }

function _refreshTourneeBtn() {
  const b = document.getElementById('btn-tournee');
  if (!b) return;
  if (_WB3T.on) {
    b.classList.remove('btn--secondary'); b.classList.add('btn--primary');
    b.textContent = '🗒 Tournée · ON';
  } else {
    b.classList.add('btn--secondary'); b.classList.remove('btn--primary');
    b.textContent = '🗒 Tournée';
  }
}

async function toggleTournee() {
  _WB3T.on = !_WB3T.on;
  if (_WB3T.on) {
    _tourneeLoadChecks();
    if (!_WB3T.data) await _tourneeLoad();
  }
  _refreshTourneeBtn();
  render();
}

async function _tourneeLoad() {
  if (_WB3T.loading) return;
  _WB3T.loading = true;
  try {
    _WB3T.data = (typeof WB3DB !== 'undefined' && WB3DB.queryCuverieEtat)
      ? await WB3DB.queryCuverieEtat()
      : [];
  } catch (e) {
    console.warn('[WB3 D10] queryCuverieEtat KO:', e);
    _WB3T.data = [];
    toast('Impossible de charger l\'état tournée : ' + (e?.message || e), 'error');
  } finally {
    _WB3T.loading = false;
  }
}

async function _tourneeReload() {
  _WB3T.data = null;
  await _tourneeLoad();
  render();
}

function _tourneeCheck(cid, kind, checked) {
  if (!_WB3T.checks) _tourneeLoadChecks();
  const k = _tourneeKey(cid, kind);
  if (checked) _WB3T.checks.add(k); else _WB3T.checks.delete(k);
  _tourneeSaveChecks();
  const row = document.querySelector(`#content [data-tournee-key="${k}"]`);
  if (row) row.classList.toggle('done', checked);
}

function _tourneeAction(cid, kind, lotId) {
  if (kind === 'analyse')  { openOpPanel('analyse',  [cid]); return; }
  if (kind === 'ouillage') { openOpPanel('ouillage', [cid]); return; }
  if (kind === 'fa') {
    if (lotId) { _openSuiviFa(cid, lotId); return; }
  }
  const c = _WB3T.contenants().find(x => x.id === cid);
  if (c) openDetailDrawer(c);
}

function _tourneeBuildGroups(rows) {
  const g = { analyse:[], fa:[], ouillage:[], alerte:[] };
  rows.forEach(r => {
    const isFa = r.statut === 'fa';
    if (r.fa_stuck || (isFa && r.analyse_en_retard))
      g.fa.push({ ...r, _kind:'fa',
        _reason: r.fa_stuck ? 'FA bloquée (densité en plateau)' : 'FA — analyse en retard' });
    else if (r.analyse_en_retard)
      g.analyse.push({ ...r, _kind:'analyse', _reason:'Analyse en retard' });
    if (r.sans_operation_recente && r.statut === 'elevage')
      g.ouillage.push({ ...r, _kind:'ouillage',
        _reason:'Élevage sans op récente — ouillage à prévoir' });
    if (r.volume_incoherent)
      g.alerte.push({ ...r, _kind:'alerte-vol',
        _reason:'Volume incohérent (lot vs lot_contenants)' });
    if (r.sur_capacite)
      g.alerte.push({ ...r, _kind:'alerte-cap',
        _reason:'Sur-capacité (vol > capacité)' });
    if (r.dluo_produit_proche)
      g.alerte.push({ ...r, _kind:'alerte-dluo',
        _reason:'DLUO produit utilisé proche (< 30 j)' });
  });
  const sortBy = (a, b) => {
    const ord = { critique:0, warn:1, ok:2 };
    const oa = ord[a.niveau_alerte] ?? 99, ob = ord[b.niveau_alerte] ?? 99;
    return oa !== ob ? oa - ob
      : String(a.contenant_nom || '').localeCompare(String(b.contenant_nom || ''), 'fr');
  };
  Object.values(g).forEach(arr => arr.sort(sortBy));
  return g;
}

function _renderTourneePanel() {
  const container = document.getElementById('content');
  if (!container) return;
  document.getElementById('pagination-bar').style.display = 'none';
  const btnCA = document.getElementById('btn-collapse-all');
  if (btnCA) btnCA.style.display = 'none';

  if (_WB3T.loading || !_WB3T.data) {
    container.innerHTML = `<div style="padding:24px;text-align:center"><div class="spinner"></div><div style="margin-top:8px;font-size:var(--text-caption);color:var(--color-ink-tertiary)">Chargement de l'état cuverie…</div></div>`;
    return;
  }

  const g = _tourneeBuildGroups(_WB3T.data);
  const total = g.analyse.length + g.fa.length + g.ouillage.length + g.alerte.length;
  const doneCount = total
    ? [...(_WB3T.checks || [])].filter(k => {
        const [cid, kind] = k.split('::');
        return [...g.analyse, ...g.fa, ...g.ouillage, ...g.alerte]
          .some(r => r.contenant_id === cid && r._kind === kind);
      }).length
    : 0;

  const row = (r, actionLabel) => {
    const key = _tourneeKey(r.contenant_id, r._kind);
    const isDone = _WB3T.checks && _WB3T.checks.has(key);
    const lotInfo = r.lot_nom
      ? ` <span style="font-weight:400;color:var(--color-ink-tertiary)">· ${escapeHtml(r.lot_nom)}${r.millesime ? ' ' + r.millesime : ''}</span>`
      : '';
    return `
      <div data-tournee-key="${key}" class="tournee-row${isDone ? ' done' : ''}"
        style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--color-border)">
        <input type="checkbox" ${isDone ? 'checked' : ''}
          onchange="_tourneeCheck('${r.contenant_id}','${r._kind}',this.checked)"
          style="width:18px;height:18px;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div class="tournee-row-title" style="font-weight:600">${escapeHtml(r.contenant_nom || '?')}${lotInfo}</div>
          <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">${escapeHtml(r._reason)}</div>
        </div>
        <button class="btn btn--sm" type="button"
          onclick="_tourneeAction('${r.contenant_id}','${r._kind}','${r.lot_id || ''}')">${actionLabel}</button>
      </div>`;
  };
  const group = (label, icon, items, actionLabel, hint) => {
    if (!items.length) return '';
    return `
      <div style="margin-bottom:var(--space-3);background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden">
        <div style="padding:8px 12px;background:var(--color-bg-subtle);font-weight:700;font-size:var(--text-footnote);display:flex;align-items:baseline;gap:8px">
          <span>${icon} ${escapeHtml(label)}</span>
          <span style="color:var(--color-ink-tertiary);font-weight:400">· ${items.length} à faire</span>
          ${hint ? `<span style="margin-left:auto;font-size:10px;color:var(--color-ink-tertiary);font-weight:400">${escapeHtml(hint)}</span>` : ''}
        </div>
        ${items.map(r => row(r, actionLabel)).join('')}
      </div>`;
  };

  const today = new Date().toLocaleDateString('fr-FR',
    { weekday:'long', day:'2-digit', month:'long' });
  container.innerHTML = `
    <div style="margin-bottom:var(--space-3);padding:10px 14px;background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:var(--radius-md);display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <div style="font-weight:700">🗒 Mode tournée — ${escapeHtml(today)}</div>
        <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">
          ${total === 0 ? 'Rien à traiter aujourd\'hui.' : `${total} cuve(s) à traiter · ${doneCount} cochée(s)`}
        </div>
      </div>
      <button class="btn btn--ghost btn--sm" type="button" onclick="_tourneeReload()" title="Recharger l'état v_cuverie_etat">↻ Rafraîchir</button>
      <button class="btn btn--ghost btn--sm" type="button" onclick="toggleTournee()" title="Quitter le mode tournée">✕ Quitter</button>
    </div>
    ${group('Analyses en retard',       '🔬', g.analyse,  '🔬 Analyse',  'Routine contrôle')}
    ${group('FA à suivre',               '🌡', g.fa,       '🌡 Suivi FA', 'Densité + T° à relever')}
    ${group('Ouillages dus',             '🪣', g.ouillage, '🪣 Ouillage', 'Élevage sans op récente')}
    ${group('Alertes volume / DLUO',     '⚠',  g.alerte,   'ℹ Détails',   'À investiguer')}
    ${total === 0 ? `<div style="padding:32px;text-align:center;color:var(--color-ink-tertiary)">✨ Rien à signaler — bonne journée.</div>` : ''}
    <div style="margin-top:var(--space-3);padding:8px 12px;font-size:11px;color:var(--color-ink-tertiary);text-align:center">
      Mode tournée : la liste se calcule à partir de la vue <code>v_cuverie_etat</code>. Cochage gardé pour la session (sessionStorage).
      Les actions passent par les flux opérations existants — aucune écriture base depuis cet écran.
    </div>
  `;
}
