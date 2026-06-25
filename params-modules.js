/* params-modules.js — Paramètres : section Modules (activation par cave, super-admin) */
'use strict';

const PLATFORM_MODULES = [
  { key: 'reception',   label: '🧺 Réception coopérative', mig: '090/091' },
  { key: 'epalement',   label: '⚖️ Épalement (barémage)',  mig: '060/061' },
  { key: 'assemblage',  label: '🧪 Assemblage / essais',   mig: '063' },
  { key: 'echantillon', label: '🍾 Échantillons clients',  mig: '093' },
  { key: 'planning',    label: '🗓️ Planning / fiches',     mig: '064/070' },
  { key: 'inventaire',  label: '📦 Inventaire',            mig: '066' },
  { key: 'plan_cave',   label: '🗺 Plan de cave & mur',    mig: '092' },
  { key: 'ia',          label: '🤖 Assistant IA',          mig: '102' },
];

async function renderModulesSection() {
  const root = document.getElementById('settings-content');
  if (!WB3DB.isPlatformAdmin || !(await WB3DB.isPlatformAdmin())) {
    root.innerHTML = `<div class="empty-state"><div class="icon">🔒</div><div class="title">Réservé au créateur de l'application</div></div>`;
    return;
  }
  let tenants = [];
  try { tenants = await WB3DB.platformListTenants(); }
  catch (e) { root.innerHTML = `<p style="color:var(--color-danger)">${escapeHtml(WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e))}</p>`; return; }

  const cur = WB3DB.getCurrentTenantId ? WB3DB.getCurrentTenantId() : null;
  root.innerHTML = `
    <div class="settings-section-head"><h2>🧩 Modules par cave</h2>
      <p class="muted">Active ou désactive les modules vendange optionnels, cave par cave. Les modules cœur (cuverie, apports, analyses, opérations) restent toujours actifs.</p></div>
    <div class="card" style="padding:var(--space-4)">
      <div class="field" style="max-width:420px">
        <label class="field-label">Cave (tenant)</label>
        <select class="select" id="pm-tenant" onchange="loadTenantModules()">
          ${tenants.map(t => `<option value="${t.id}"${t.id === cur ? ' selected' : ''}>${escapeHtml(t.nom)}${t.slug ? ' · ' + escapeHtml(t.slug) : ''}</option>`).join('')}
        </select>
      </div>
      <div id="pm-list" style="margin-top:var(--space-3)"><div class="loading-state"><div class="spinner"></div>Chargement…</div></div>
    </div>`;
  await loadTenantModules();
}

async function loadTenantModules() {
  const box = document.getElementById('pm-list');
  const tid = document.getElementById('pm-tenant')?.value;
  if (!box || !tid) return;
  let rows = [];
  try { rows = await WB3DB.platformListTenantModules(tid); }
  catch (e) { box.innerHTML = `<p style="color:var(--color-danger)">${escapeHtml(WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e))}</p>`; return; }
  const stored = {}; rows.forEach(r => { stored[r.module_key] = r.enabled; });
  box.innerHTML = PLATFORM_MODULES.map(m => {
    const on = stored[m.key] !== false;
    return `<label style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:11px 4px;border-top:1px solid var(--color-border-subtle,#eee)">
      <span><b>${m.label}</b> <span class="muted" style="font-size:var(--text-caption)">mig ${m.mig}</span></span>
      <input type="checkbox" ${on ? 'checked' : ''} onchange="toggleTenantModule('${tid}','${m.key}',this.checked)" style="width:20px;height:20px;cursor:pointer">
    </label>`;
  }).join('');
}

async function toggleTenantModule(tenantId, key, enabled) {
  try {
    await WB3DB.platformSetTenantModule(tenantId, key, enabled);
    toast(`${PLATFORM_MODULES.find(m => m.key === key)?.label || key} ${enabled ? 'activé' : 'désactivé'}`, 'success');
  } catch (e) {
    toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)), 'error');
    await loadTenantModules();
  }
}
