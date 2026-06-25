/* params-qualite.js — Paramètres : section Qualité (seuils analytiques) */
'use strict';

const QUALITE_SEUILS = [
  { cle:'ph_min',               label:'pH minimum',           unite:'',     defaut:2.8, d:1, desc:'Alerte si pH < seuil (acide)' },
  { cle:'ph_max',               label:'pH maximum',           unite:'',     defaut:4.2, d:1, desc:'Alerte si pH > seuil (basique)' },
  { cle:'tav_min',              label:'TAV minimum',          unite:'%vol', defaut:7,   d:1, desc:'Alerte si titre alcoométrique < seuil' },
  { cle:'tav_max',              label:'TAV maximum',          unite:'%vol', defaut:17,  d:1, desc:'Alerte si titre alcoométrique > seuil' },
  { cle:'av_max',               label:'Acidité volatile max', unite:'g/L',  defaut:1.5, d:2, desc:'Alerte si AV > seuil' },
  { cle:'so2_libre_max',        label:'SO₂ libre max',        unite:'mg/L', defaut:120, d:0, desc:'Alerte si SO₂ libre > seuil' },
  { cle:'temp_max',             label:'Température max',      unite:'°C',   defaut:30,  d:0, desc:'Alerte si T° mesurée > seuil' },
  { cle:'analyse_retard_jours', label:'Analyse en retard',    unite:'j',    defaut:30,  d:0, desc:'Alerte si aucune analyse depuis N jours' },
  { cle:'fa_stuck_jours',       label:'FA bloquée',           unite:'j',    defaut:2,   d:0, desc:'Alerte si densité stagne depuis N jours' },
  { cle:'ouillage_retard_jours',label:'Ouillage en retard',   unite:'j',    defaut:14,  d:0, desc:'Alerte si un fût en élevage n\'a pas été ouillé depuis N jours' },
];

// var pour les oninput générés : oninput="_qualiteVals['${s.cle}']=parseFloat(this.value)"
var _qualiteVals    = {};
let _qualiteLoading = false;

async function renderQualiteSection() {
  const root = document.getElementById('settings-content');
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    _qualiteVals = await WB3DB.getTolerances({ force: true });
  } catch(e) {
    _qualiteVals = {};
  }
  _renderQualiteUI();
}

function _renderQualiteUI() {
  const root = document.getElementById('settings-content');
  const isPriv = WB3DB.isPrivileged && WB3DB.isPrivileged();

  let _grpShown = {};
  const rows = QUALITE_SEUILS.map(s => {
    const current  = _qualiteVals[s.cle] != null ? Number(_qualiteVals[s.cle]) : s.defaut;
    const isCustom = current !== s.defaut;
    let sep = '';
    if (s.groupe && !_grpShown[s.groupe]) {
      _grpShown[s.groupe] = true;
      const titres = { vendange:'🍇 Vendange & volumes' };
      sep = `<tr><td colspan="4" style="padding:14px 12px 4px;font-weight:700;font-size:var(--text-caption);text-transform:uppercase;letter-spacing:.4px;color:var(--color-ink-tertiary);border-top:2px solid var(--color-border)">${titres[s.groupe] || s.groupe}</td></tr>`;
    }
    return sep + `
      <tr>
        <td style="padding:10px 12px;font-weight:600">${escapeHtml(s.label)}</td>
        <td style="padding:10px 12px;font-size:var(--text-caption);color:var(--color-ink-tertiary)">${escapeHtml(s.desc)}</td>
        <td style="padding:10px 12px;text-align:right;color:var(--color-ink-tertiary)">${s.defaut} ${escapeHtml(s.unite)}</td>
        <td style="padding:10px 12px">
          ${isPriv ? `
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <input type="number" step="any" class="input" style="width:90px;text-align:right"
                     id="q-${s.cle}" value="${current}"
                     oninput="_qualiteVals['${s.cle}']=parseFloat(this.value)">
              <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">${escapeHtml(s.unite)}</span>
              ${isCustom ? `<button class="btn btn--ghost btn--sm" style="color:var(--color-ink-tertiary);padding:2px 6px"
                onclick="_qualiteReset('${s.cle}')" title="Revenir au défaut (${s.defaut})">↺</button>` : ''}
            </div>
          ` : `
            <span style="font-weight:700;color:${isCustom?'var(--color-primary)':'var(--color-ink)'}">
              ${current} ${escapeHtml(s.unite)}${isCustom ? ' <span style="font-size:10px;color:var(--color-primary)">(personnalisé)</span>' : ''}
            </span>
          `}
        </td>
      </tr>`;
  }).join('');

  root.innerHTML = `
    <h2>⚗️ Seuils qualité analytique</h2>
    <p class="lead">Définit les seuils d'alerte utilisés dans les analyses, la fiche lot, la fiche cuve et les rapports.
      Synchronisé entre appareils. ${!isPriv ? '<b>Lecture seule</b> — modification réservée aux rôles admin/œnologue.' : ''}</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Paramètres analytiques</div>
      <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th style="padding:8px 12px;text-align:left;font-size:var(--text-caption);color:var(--color-ink-tertiary);border-bottom:1px solid var(--color-border)">Seuil</th>
          <th style="padding:8px 12px;text-align:left;font-size:var(--text-caption);color:var(--color-ink-tertiary);border-bottom:1px solid var(--color-border)">Description</th>
          <th style="padding:8px 12px;text-align:right;font-size:var(--text-caption);color:var(--color-ink-tertiary);border-bottom:1px solid var(--color-border)">Défaut</th>
          <th style="padding:8px 12px;font-size:var(--text-caption);color:var(--color-ink-tertiary);border-bottom:1px solid var(--color-border)">Valeur cave</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    </div>

    ${isPriv ? `
    <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);align-items:center">
      <button class="btn btn--primary" onclick="saveQualiteSeuils()">💾 Enregistrer les seuils</button>
      <span id="qualite-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓ Enregistré</span>
    </div>
    <p style="margin-top:var(--space-3);font-size:var(--text-caption);color:var(--color-ink-tertiary)">
      ↺ Cliquer sur l'icône de retour remet la valeur au défaut WB3. Les seuils sont appliqués immédiatement dans les analyses, fiches lot/cuve et rapports.
    </p>` : ''}
  `;
}

async function _qualiteReset(cle) {
  const s = QUALITE_SEUILS.find(x => x.cle === cle);
  if (!s) return;
  try {
    await WB3DB.resetTolerance(cle);
    _qualiteVals[cle] = s.defaut;
    await WB3DB.getTolerances({ force: true });
    _renderQualiteUI();
    toast(`"${s.label}" remis au défaut (${s.defaut})`, 'success');
  } catch(e) {
    toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
  }
}

const QUALITE_PAIRS  = [['ph_min','ph_max'], ['tav_min','tav_max']];
const QUALITE_BORNES = {
  ph_min:[0,14], ph_max:[0,14], tav_min:[0,25], tav_max:[0,25],
  av_max:[0,5], so2_libre_max:[0,500], temp_max:[0,60],
  analyse_retard_jours:[1,365], fa_stuck_jours:[1,60], ouillage_retard_jours:[1,90],
};

function _qualiteValidate() {
  const vals = {};
  for (const s of QUALITE_SEUILS) {
    const input = document.getElementById('q-' + s.cle);
    if (!input) continue;
    const v = parseFloat(input.value);
    if (isNaN(v)) return { ok:false, msg:`"${s.label}" : valeur numérique requise.` };
    if (v < 0)    return { ok:false, msg:`"${s.label}" : valeur négative interdite.` };
    const b = QUALITE_BORNES[s.cle];
    if (b && (v < b[0] || v > b[1]))
      return { ok:false, msg:`"${s.label}" : valeur hors plage plausible (${b[0]}–${b[1]}).` };
    vals[s.cle] = v;
  }
  for (const [lo, hi] of QUALITE_PAIRS) {
    if (vals[lo] != null && vals[hi] != null && vals[lo] >= vals[hi]) {
      const sLo = QUALITE_SEUILS.find(x => x.cle === lo);
      const sHi = QUALITE_SEUILS.find(x => x.cle === hi);
      return { ok:false, msg:`"${sLo.label}" doit être strictement inférieur à "${sHi.label}".` };
    }
  }
  return { ok:true, vals };
}

async function saveQualiteSeuils() {
  if (WB3DB.can && !WB3DB.can('qualite.edit')) { toast('Lecture seule : modifier les seuils est réservé aux responsables.', 'error'); return; }
  const check = _qualiteValidate();
  if (!check.ok) { toast('⚠ ' + check.msg, 'error'); return; }
  try {
    for (const [cle, val] of Object.entries(check.vals)) {
      await WB3DB.setTolerance(cle, val);
    }
    await WB3DB.getTolerances({ force: true });
    const el = document.getElementById('qualite-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2500); }
    toast('Seuils qualité enregistrés', 'success');
    _renderQualiteUI();
  } catch(e) {
    const msg = /row-level security|permission|policy/i.test(e.message || '')
      ? 'Droits insuffisants : seuls les rôles admin/œnologue peuvent modifier les seuils.'
      : e.message;
    toast('Erreur : ' + msg, 'error');
  }
}
