/* params-apparence.js — Paramètres : sections Apparence (thèmes) + IA */
'use strict';

const WB3_THEMES = [
  { key: '',        label: 'Marine',   primary: '#1a4870', accent: '#e8b04a', desc: 'Bleu marine — défaut' },
  { key: 'richemer',label: 'Richemer', primary: '#6a1b2a', accent: '#c8a87e', desc: 'Bordeaux / crème' },
  { key: 'foret',   label: 'Forêt',   primary: '#2d5a3d', accent: '#d4a574', desc: 'Vert sapin / sable' },
  { key: 'soleil',  label: 'Soleil',  primary: '#b8800a', accent: '#4a7bb5', desc: 'Or chaud / ivoire' },
  { key: 'charbon', label: 'Charbon', primary: '#3a3a3c', accent: '#c47b4f', desc: 'Anthracite / cuivre' },
  { key: 'lavande', label: 'Lavande', primary: '#8470b8', accent: '#e8a87c', desc: 'Violet doux / abricot' },
  { key: 'peche',   label: 'Pêche',   primary: '#c4765a', accent: '#6b9cc4', desc: 'Terracotta / bleu poudré' },
  { key: 'sauge',   label: 'Sauge',   primary: '#7aab8a', accent: '#c8a87e', desc: 'Vert sauge / sable' },
  { key: 'ciel',    label: 'Ciel',    primary: '#5b9ec4', accent: '#e8b864', desc: 'Bleu ciel / miel' },
];

async function renderIASection() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';

  const [tol, isPlatform] = await Promise.all([
    WB3DB.getTolerances({ force: true }).catch(() => ({})),
    WB3DB.isPlatformAdmin().catch(() => false),
  ]);

  const provider  = tol.ia_provider ?? 'gemini';
  const iaEnabled = tol.ia_module_enabled === true;

  const PROVIDERS = {
    gemini:    { label: 'Gemini (Google)',         models: ['gemini-2.5-flash','gemini-2.5-pro','gemini-2.0-flash'] },
    mistral:   { label: 'Mistral AI (RGPD 🇫🇷)',  models: ['mistral-large-latest','mistral-medium-latest','mistral-small-latest'] },
    anthropic: { label: 'Claude (Anthropic)',      models: ['claude-sonnet-4-6','claude-haiku-4-5-20251001','claude-opus-4-8'] },
  };

  let keysConfig = {};
  if (isPlatform) {
    try {
      const rows = await WB3DB.client.rpc('wb3_platform_ia_list');
      (rows.data || []).forEach(r => { keysConfig[r.provider] = r; });
    } catch (_) { /**/ }
  }

  function modelOptions(prov) {
    const models = PROVIDERS[prov]?.models ?? [];
    const cur    = tol[`ia_model_${prov}`] ?? models[0];
    return models.map(m => `<option value="${m}"${m === cur ? ' selected' : ''}>${m}</option>`).join('');
  }

  function keyStatusBadge(prov) {
    const cfg = keysConfig[prov];
    if (!cfg) return `<span style="color:var(--color-ink-tertiary);font-size:12px">— non configuré</span>`;
    return cfg.key_set
      ? `<span style="color:#16a34a;font-size:12px;font-weight:600">✓ Clé présente</span>`
      : `<span style="color:#dc2626;font-size:12px">✗ Aucune clé</span>`;
  }

  const keysSection = isPlatform ? `
    <hr style="margin:24px 0;border:none;border-top:1px solid var(--color-border)">
    <h3 style="font-size:15px;margin:0 0 4px">🔑 Clés API — accès super-administrateur</h3>
    <p class="t-footnote" style="margin:0 0 16px;color:var(--color-ink-tertiary)">
      Les clés sont stockées en base de données (chiffrées au repos par Supabase).<br>
      Elles ne sont jamais transmises au navigateur — uniquement utilisées côté serveur (Edge Function).
    </p>
    ${Object.entries(PROVIDERS).map(([k, v]) => `
    <div style="border:1px solid var(--color-border);border-radius:8px;padding:14px 16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <strong style="font-size:13px">${v.label}</strong>
        ${keyStatusBadge(k)}
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="password" id="ia-key-${k}"
          placeholder="sk-... ou AIza... (laisser vide pour ne pas changer)"
          style="flex:1;font-family:var(--font-mono,monospace);font-size:13px;padding:7px 10px;
                 border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg-elevated)">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;white-space:nowrap">
          <input type="checkbox" id="ia-enabled-${k}" ${(keysConfig[k]?.enabled !== false) ? 'checked' : ''}
            style="width:15px;height:15px">
          Activé
        </label>
        <button class="btn btn--secondary btn--sm" onclick="_iaSaveKey('${k}')">💾 Enregistrer</button>
      </div>
    </div>`).join('')}` : '';

  root.innerHTML = `
    <div class="section-card">
      <h2 style="margin-bottom:6px">🍇 OenoPulse</h2>
      <p class="t-footnote" style="margin:0 0 18px;color:var(--color-ink-tertiary)">
        Module OenoPulse (assistant cave IA) multi-provider. Le provider actif est utilisé pour toutes les cuves du tenant.<br>
        ${isPlatform ? '<strong>Mode super-administrateur</strong> — configuration complète disponible.' : 'Configuration réservée au super-administrateur.'}
      </p>

      <div class="field-group" style="margin-bottom:20px">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="ia-enabled" ${iaEnabled ? 'checked' : ''}
            style="width:18px;height:18px;accent-color:var(--color-primary)">
          <span><strong>Module IA activé</strong> pour ce tenant</span>
        </label>
        <p class="t-footnote" style="margin:4px 0 0 28px;color:var(--color-ink-tertiary)">
          Désactiver interdit toute requête IA pour ce client, même si les clés sont configurées.
        </p>
      </div>

      ${isPlatform ? `
      <div class="field-group" style="margin-bottom:16px">
        <label class="field-label">Fournisseur IA actif</label>
        <select id="ia-provider" class="form-control" style="max-width:320px">
          ${Object.entries(PROVIDERS).map(([k, v]) =>
            `<option value="${k}"${k === provider ? ' selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
        <p class="t-footnote" style="margin:4px 0 0;color:var(--color-ink-tertiary)">
          Mistral = hébergement européen (RGPD). Gemini = Google IA. La clé du provider sélectionné doit être renseignée ci-dessous.
        </p>
      </div>
      ${Object.entries(PROVIDERS).map(([k, v]) => `
      <div class="field-group ia-model-group" data-provider="${k}" style="margin-bottom:12px;display:${k === provider ? '' : 'none'}">
        <label class="field-label">Modèle — ${v.label}</label>
        <select id="ia-model-${k}" class="form-control" style="max-width:340px">${modelOptions(k)}</select>
      </div>`).join('')}` : `
      <div style="background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:8px;padding:12px 14px;font-size:13px">
        Provider actif : <strong>${PROVIDERS[provider]?.label ?? provider}</strong><br>
        <span style="color:var(--color-ink-tertiary)">Modification réservée au super-administrateur.</span>
      </div>`}

      <div style="margin-top:18px">
        <button id="ia-save-btn" class="btn btn--primary btn--sm">Enregistrer les réglages</button>
        <span id="ia-save-status" style="margin-left:12px;font-size:13px;color:var(--color-ink-tertiary)"></span>
      </div>

      ${keysSection}
    </div>`;

  const providerSel = document.getElementById('ia-provider');
  if (providerSel) {
    providerSel.addEventListener('change', () => {
      const p = providerSel.value;
      document.querySelectorAll('.ia-model-group').forEach(el => {
        el.style.display = el.dataset.provider === p ? '' : 'none';
      });
    });
  }

  document.getElementById('ia-save-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('ia-save-status');
    statusEl.textContent = 'Enregistrement…';
    try {
      const newEnabled  = document.getElementById('ia-enabled').checked;
      const newProvider = document.getElementById('ia-provider')?.value ?? provider;
      const newModel    = document.getElementById(`ia-model-${newProvider}`)?.value;
      await Promise.all([
        WB3DB.setTolerance('ia_module_enabled', newEnabled,  { kind: 'bool' }),
        WB3DB.setTolerance('ia_provider',       newProvider, { kind: 'text' }),
        newModel ? WB3DB.setTolerance(`ia_model_${newProvider}`, newModel, { kind: 'text' }) : Promise.resolve(),
      ]);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'wb3:ia-changed', enabled: newEnabled }, '*');
      }
      await renderIASection();
    } catch (e) {
      const statusEl2 = document.getElementById('ia-save-status');
      if (statusEl2) statusEl2.textContent = `Erreur : ${e.message}`;
    }
  });
}

async function _iaSaveKey(provider) {
  const keyInp = document.getElementById(`ia-key-${provider}`);
  const enInp  = document.getElementById(`ia-enabled-${provider}`);
  if (!keyInp) return;
  const key     = keyInp.value.trim();
  const enabled = enInp ? enInp.checked : true;
  if (!key) { WB3Toast.warn('Saisir une clé (ou laisser le champ vide pour ne pas modifier).'); return; }
  try {
    const { error } = await WB3DB.client.rpc('wb3_platform_ia_set_key', {
      p_provider: provider,
      p_api_key:  key,
      p_enabled:  enabled,
    });
    if (error) throw error;
    keyInp.value = '';
    WB3Toast.success(`Clé ${provider} enregistrée ✓`);
    renderIASection();
  } catch (e) {
    WB3Toast.error(`Erreur : ${e.message}`);
  }
}

function renderApparenceSection() {
  const root    = document.getElementById('settings-content');
  const current = localStorage.getItem('wb3_theme') || '';

  const cards = WB3_THEMES.map(t => {
    const active = t.key === current;
    return `
      <button class="theme-card${active ? ' theme-card--active' : ''}"
              onclick="applyTheme('${t.key}')" data-theme-key="${t.key}">
        <div class="theme-swatch">
          <div class="theme-swatch-primary" style="background:${t.primary}"></div>
          <div class="theme-swatch-accent"  style="background:${t.accent}"></div>
        </div>
        <div class="theme-label">${t.label}</div>
        <div class="theme-desc">${t.desc}</div>
        ${active ? '<div class="theme-check">✓</div>' : ''}
      </button>`;
  }).join('');

  const mode = (current === 'dark') ? 'dark' : (current === 'auto') ? 'auto' : 'light';

  root.innerHTML = `
    <h2>🎨 Apparence</h2>
    <p class="lead">Choisis le mode d'affichage et le thème de couleur. Le choix est sauvegardé sur ton compte.</p>
    <div class="drawer-section">
      <div class="drawer-section-title">Mode d'affichage</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div class="mode-toggle" role="group" aria-label="Mode d'affichage">
          <button type="button" class="mode-btn${mode === 'light' ? ' is-active' : ''}" aria-pressed="${mode === 'light'}" onclick="applyMode('')">☀️ Clair</button>
          <button type="button" class="mode-btn${mode === 'dark' ? ' is-active' : ''}"  aria-pressed="${mode === 'dark'}"  onclick="applyMode('dark')">🌙 Sombre</button>
          <button type="button" class="mode-btn${mode === 'auto' ? ' is-active' : ''}"  aria-pressed="${mode === 'auto'}"  onclick="applyMode('auto')">🖥️ Auto</button>
        </div>
        <p style="margin:var(--space-2) 0 0;font-size:var(--text-caption);color:var(--color-ink-tertiary)">
          « Auto » suit le réglage clair / sombre de votre système.
        </p>
      </div>
    </div>
    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Thème de couleur</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div class="theme-grid">${cards}</div>
      </div>
    </div>
    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">Disposition</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p style="margin:0 0 var(--space-3);font-size:var(--text-caption);color:var(--color-ink-tertiary)">
          Réinitialise la barre latérale et les panneaux à leur largeur d'origine.
        </p>
        <button class="btn" type="button" onclick="resetLayoutWidths()">↺ Restaurer les largeurs par défaut</button>
      </div>
    </div>
  `;
}

function applyMode(key) {
  applyTheme(key);
  renderApparenceSection();
}

async function applyTheme(key) {
  if (key) {
    document.documentElement.setAttribute('data-theme', key);
    localStorage.setItem('wb3_theme', key);
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('wb3_theme');
  }
  try {
    if (window.parent && window.parent !== window) {
      window.parent.WB3Shell?.setTheme?.(key);
    }
  } catch(e) {}
  try {
    await WB3DB.setUserPref('apparence', { theme: key || '' });
  } catch(e) { console.warn('[WB3] setUserPref apparence:', e); }
  document.querySelectorAll('.theme-card').forEach(card => {
    const active = card.dataset.themeKey === key;
    card.classList.toggle('theme-card--active', active);
    const existing = card.querySelector('.theme-check');
    if (active && !existing) {
      const check = document.createElement('div');
      check.className = 'theme-check';
      check.textContent = '✓';
      card.appendChild(check);
    } else if (!active && existing) {
      existing.remove();
    }
  });
  const mode = (key === 'dark') ? 'dark' : (key === 'auto') ? 'auto' : 'light';
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const on = btn.getAttribute('onclick') === "applyMode('" + (mode === 'light' ? '' : mode) + "')";
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  toast('Thème appliqué', 'success');
}

async function resetLayoutWidths() {
  const ok = await WB3UI.confirm(
    'Toutes vos largeurs personnalisées (barre latérale et panneaux) seront effacées et remises aux valeurs par défaut.',
    { title: 'Réinitialiser les largeurs ?', okText: 'Réinitialiser' }
  );
  if (!ok) return;

  const DRAWER_MODULES = ['cuverie', 'apports', 'lots', 'operations', 'produits'];
  try {
    await WB3DB.setUserPref('ui_sidebar', {});
    for (const m of DRAWER_MODULES) await WB3DB.setUserPref('drawer_width_' + m, {});
  } catch (e) { console.warn('[WB3] reset largeurs (prefs):', e); }

  ['wb3_sidebar_width', 'wb3_nav_state', 'wb3_nav_collapsed'].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });

  _applyDefaultLayout(document);
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      _applyDefaultLayout(window.parent.document);
    }
  } catch (e) {}

  toast('Largeurs réinitialisées', 'success');
}

function _applyDefaultLayout(doc) {
  try {
    const de = doc.documentElement;
    de.style.setProperty('--wb3-nav-w', '220px');
    de.style.setProperty('--nav-w', '220px');
    de.style.setProperty('--wb3-drawer-w', '420px');
    ['wb3-nav', 'shell-nav'].forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.classList.remove('collapsed', 'wb3-large');
    });
    if (doc.body) doc.body.classList.remove('wb3-collapsed', 'wb3-large');
    const sb = doc.getElementById('shell-body');
    if (sb) sb.classList.remove('nav-collapsed', 'nav-large');
    const tg = doc.getElementById('wb3-nav-toggle') || doc.getElementById('nav-toggle');
    if (tg) tg.textContent = '☰';
  } catch (e) {}
}
