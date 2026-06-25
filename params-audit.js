/* params-audit.js — Paramètres : section Audit (journal des modifications) */
'use strict';

const AUDIT_TABLE_LABELS = {
  lots:'🍷 Lots', contenants:'🛢 Contenants', apports:'🍇 Apports',
  operations:'⚙️ Opérations', produits_catalogue:'🧪 Produits',
  produits_lots:'📦 Lots produits', analyses:'🔬 Analyses',
  ajustements_volume:'⚖️ Ajustements', lot_mouvements:'🔄 Mouvements',
};
const AUDIT_ACTION_BADGE = {
  INSERT: { lbl:'Création',     bg:'#e8f5e9', fg:'#2e7d32' },
  UPDATE: { lbl:'Modification', bg:'#e3f2fd', fg:'#1565c0' },
  DELETE: { lbl:'Suppression',  bg:'#fce8e8', fg:'#c62828' },
};
// var = window.* : les onclick générés mutent _auditFilters directement
var _auditFilters = { table_name:'', action:'', limit:200 };

async function renderAudit() {
  const root = document.getElementById('settings-content');
  if (!_isAdmin) {
    root.innerHTML = `<h2>🛡 Audit</h2>
      <div class="drawer-section"><div class="drawer-section-content"
        style="padding:var(--space-5);text-align:center;color:var(--color-ink-tertiary)">
        🔒 Réservé aux administrateurs.</div></div>`;
    return;
  }

  const tableOpts = ['<option value="">Toutes les tables</option>']
    .concat(Object.entries(AUDIT_TABLE_LABELS).map(([k,v]) =>
      `<option value="${k}"${_auditFilters.table_name===k?' selected':''}>${v}</option>`)).join('');
  const actionOpts = ['<option value="">Toutes les actions</option>']
    .concat(['INSERT','UPDATE','DELETE'].map(a =>
      `<option value="${a}"${_auditFilters.action===a?' selected':''}>${AUDIT_ACTION_BADGE[a].lbl}</option>`)).join('');

  root.innerHTML = `
    <h2>🛡 Audit</h2>
    <p class="lead">Journal des créations / modifications / suppressions sur les
       données métier. Lecture seule, réservé aux administrateurs.</p>
    <div class="filter-row" style="margin-bottom:var(--space-3);display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center">
      <select class="input" style="width:auto" onchange="_auditFilters.table_name=this.value;renderAudit()">${tableOpts}</select>
      <select class="input" style="width:auto" onchange="_auditFilters.action=this.value;renderAudit()">${actionOpts}</select>
      <select class="input" style="width:auto" onchange="_auditFilters.limit=+this.value;renderAudit()">
        <option value="100"${_auditFilters.limit===100?' selected':''}>100 dernières</option>
        <option value="200"${_auditFilters.limit===200?' selected':''}>200 dernières</option>
        <option value="500"${_auditFilters.limit===500?' selected':''}>500 dernières</option>
      </select>
      ${(_auditFilters.table_name||_auditFilters.action) ? `<button class="btn btn--secondary btn--sm" onclick="_auditFilters={table_name:'',action:'',limit:200};renderAudit()">✕ Réinitialiser</button>`:''}
    </div>
    <div id="audit-body"><div class="loading-state"><div class="spinner"></div>Chargement…</div></div>
  `;

  const body = document.getElementById('audit-body');
  try {
    const rows = await WB3DB.queryAuditLog({
      table_name: _auditFilters.table_name || undefined,
      action:     _auditFilters.action     || undefined,
      limit:      _auditFilters.limit,
    });
    if (!rows.length) {
      body.innerHTML = `<div class="drawer-section"><div class="drawer-section-content"
        style="padding:var(--space-5);text-align:center;color:var(--color-ink-tertiary)">
        Aucune trace pour ces filtres.</div></div>`;
      return;
    }
    window._auditRows = rows;
    body.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-section-title">${rows.length} trace${rows.length>1?'s':''}</div>
        <div class="drawer-section-content" style="padding:0">
          ${rows.map((r, i) => {
            const b = AUDIT_ACTION_BADGE[r.action] || { lbl:r.action, bg:'#eee', fg:'#555' };
            const when = new Date(r.created_at).toLocaleString('fr-FR',
              { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
            const tbl = AUDIT_TABLE_LABELS[r.table_name] || r.table_name;
            const fields = (r.changed_fields || []).length
              ? `<span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)"> · ${r.changed_fields.slice(0,6).join(', ')}${r.changed_fields.length>6?'…':''}</span>` : '';
            return `<div style="border-bottom:1px solid var(--color-border)">
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);cursor:pointer"
                   onclick="toggleAuditDetail(${i})">
                <span style="background:${b.bg};color:${b.fg};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;white-space:nowrap">${b.lbl}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:var(--text-callout)">${tbl}${fields}</div>
                  <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">
                    ${when}${r.actor ? ` · 👤 ${String(r.actor).slice(0,8)}` : ' · (système)'}
                  </div>
                </div>
                <span id="audit-caret-${i}" style="color:var(--color-ink-tertiary)">▾</span>
              </div>
              <div id="audit-detail-${i}" style="display:none;padding:0 var(--space-4) var(--space-3)"></div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  } catch (e) {
    body.innerHTML = `<div class="drawer-section"><div class="drawer-section-content"
      style="padding:var(--space-4);color:var(--color-danger)">❌ ${escapeHtml(e.message)}</div></div>`;
  }
}

function toggleAuditDetail(i) {
  const el = document.getElementById('audit-detail-' + i);
  const caret = document.getElementById('audit-caret-' + i);
  if (!el) return;
  if (el.style.display !== 'none') { el.style.display = 'none'; if (caret) caret.textContent = '▾'; return; }
  const r = (window._auditRows || [])[i];
  if (!r) return;
  let html = '';
  if (r.action === 'UPDATE') {
    const fields = r.changed_fields || [];
    html = `<table style="width:100%;border-collapse:collapse;font-size:var(--text-caption)">
      <thead><tr style="background:var(--color-bg-subtle);text-align:left">
        <th style="padding:4px 8px">Champ</th><th style="padding:4px 8px">Avant</th><th style="padding:4px 8px">Après</th>
      </tr></thead><tbody>
      ${fields.map(f => `<tr style="border-top:1px solid var(--color-border)">
        <td style="padding:4px 8px;font-weight:600">${escapeHtml(f)}</td>
        <td style="padding:4px 8px;color:#c62828">${escapeHtml(_auditFmt(r.old_data?.[f]))}</td>
        <td style="padding:4px 8px;color:#2e7d32">${escapeHtml(_auditFmt(r.new_data?.[f]))}</td>
      </tr>`).join('')}
      </tbody></table>`;
  } else {
    const snap = r.action === 'DELETE' ? r.old_data : r.new_data;
    html = `<pre style="margin:0;padding:var(--space-3);background:var(--color-bg-subtle);border-radius:var(--radius-sm);font-size:var(--text-caption);overflow:auto;max-height:300px">${escapeHtml(JSON.stringify(snap, null, 2))}</pre>`;
  }
  el.innerHTML = html;
  el.style.display = 'block';
  if (caret) caret.textContent = '▴';
}

function _auditFmt(v) {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
