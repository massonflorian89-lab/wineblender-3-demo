/* params-epalement.js — Paramètres : section Épalement (barémage — mig 060/061)
 * Dépend de : _getSubRoot() (params-cuverie-groupe.js), _invNum() (params-inventaire.js).
 */
'use strict';

let _epModeles    = [];
let _epBaremages  = [];
let _epContenants = [];

function _epNormCuve(nom) {
  const s = String(nom || '').trim();
  const m = s.match(/^(.*-)(\d+)$/);
  if (!m) return s;
  return m[1] + m[2].padStart(2, '0');
}

let _epArrondi = 1;
// var pour les onclick générés : onchange="_epFilterNonCal=this.checked;_renderEpalementUI()"
var _epFilterNonCal = false;
let _epEditModeleId = null;

function _epIsCalibree(b) { return !!(b && (b.modele_id || b.volume_metrique_hl_cm)); }

async function renderEpalementSection() {
  const root = _getSubRoot();
  if (WB3DB.ensureModule && !(await WB3DB.ensureModule('epalement', root))) return;
  root.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  try {
    const [conts, mods, bars, tol] = await Promise.all([
      WB3DB.listTable('contenants', { order: 'nom', ascending: true }),
      WB3DB.listModeles(),
      WB3DB.listBaremages(),
      WB3DB.getTolerances ? WB3DB.getTolerances() : Promise.resolve({}),
    ]);
    _epContenants = conts; _epModeles = mods; _epBaremages = bars;
    if (tol && tol.volume_arrondi_hl != null) _epArrondi = Number(tol.volume_arrondi_hl);
  } catch(e) { console.warn('[épalement]', e); }
  _renderEpalementUI();
}

function _renderEpalementUI() {
  const root = _getSubRoot();
  const isPriv = WB3DB.isPrivileged && WB3DB.isPrivileged();
  const barByCont = {};
  _epBaremages.forEach(b => { barByCont[b.contenant_id] = b; });

  root.innerHTML = `
    <h2>⚖️ Épalement (barémage des cuves)</h2>
    <p class="lead">Calibration creux→volume par cuve. Importe le classeur Excel
      d'épalement (abaques + onglet <b>Grille</b>) : les modèles d'abaque sont créés
      et chaque cuve est reliée automatiquement à son abaque.
      ${!isPriv ? '<b>Lecture seule</b> — modification réservée admin/œnologue.' : ''}</p>

    ${isPriv ? `
    <div class="drawer-section">
      <div class="drawer-section-title">📥 Import du classeur Excel</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <input type="file" id="ep-file" accept=".xlsx,.xls" class="input"
               onchange="epImportFile(this)">
        <p style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin:var(--space-2) 0 0">
          Crée 1 modèle par onglet abaque + relie chaque cuve via l'onglet Grille
          (noms Excel A1-1 convertis en A1-01).
        </p>
        <div id="ep-import-report" style="margin-top:var(--space-3)"></div>
      </div>
    </div>` : ''}

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">📊 État</div>
      <div class="drawer-section-content" style="padding:var(--space-4);display:flex;gap:var(--space-4);flex-wrap:wrap">
        <div><b>${_epModeles.length}</b> modèle(s) d'abaque</div>
        <div><b>${_epContenants.filter(c => _epIsCalibree(barByCont[c.id])).length}</b> / ${_epContenants.length} cuve(s) calibrée(s)</div>
      </div>
    </div>

    ${isPriv ? `
    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">🗂 Modèles d'abaque
        <button class="btn btn--primary btn--sm" style="margin-left:var(--space-2)" data-help="Crée un modèle d'abaque (barémage) : la table creux→volume d'un type de cuve." onclick="epNewModele()">➕ Nouveau modèle</button>
      </div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div id="ep-modele-editor"></div>
        ${_epModeles.length ? `
        <table style="width:100%;border-collapse:collapse;font-size:var(--text-callout);margin-top:var(--space-2)">
          <thead><tr>
            <th style="text-align:left;padding:6px 10px;border-bottom:1px solid var(--color-border)">Modèle</th>
            <th style="text-align:right;padding:6px 10px;border-bottom:1px solid var(--color-border)">Capacité (hL)</th>
            <th style="padding:6px 10px;border-bottom:1px solid var(--color-border)"></th>
          </tr></thead>
          <tbody>${_epModeles.map(m => `<tr>
            <td style="padding:6px 10px;font-weight:600">${escapeHtml(m.nom)}</td>
            <td style="padding:6px 10px;text-align:right;color:var(--color-ink-tertiary)">${m.capacite_nominale_hl != null ? m.capacite_nominale_hl : '—'}</td>
            <td style="padding:6px 10px;text-align:right;white-space:nowrap">
              <button class="btn btn--ghost btn--sm" onclick="epEditModele('${m.id}')">✎ Éditer</button>
              <button class="btn btn--ghost btn--sm" onclick="epDeleteModele('${m.id}','${escapeHtml(m.nom)}')">🗑</button>
            </td></tr>`).join('')}</tbody>
        </table>` : '<p style="color:var(--color-ink-tertiary);font-size:var(--text-caption)">Aucun modèle. Crée-en un à la main, ou importe le classeur Excel ci-dessus.</p>'}
      </div>
    </div>` : ''}

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">⚙️ Arrondi du volume mesuré</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <select class="select" id="ep-arrondi" ${isPriv ? '' : 'disabled'} style="width:auto">
            <option value="0"${_epArrondi==0?' selected':''}>Hectolitre entier (837 hL)</option>
            <option value="1"${_epArrondi==1?' selected':''}>0,1 hL (836,9 hL)</option>
            <option value="2"${_epArrondi==2?' selected':''}>0,01 hL (836,92 hL)</option>
          </select>
          ${isPriv ? `<button class="btn btn--primary btn--sm" onclick="epSaveArrondi()">💾 Enregistrer</button>
            <span id="ep-arrondi-saved" style="font-size:var(--text-caption);color:var(--color-success);display:none">✓</span>`
           : '<span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">(admin/œnologue)</span>'}
        </div>
        <p style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin:var(--space-2) 0 0">
          Précision d'arrondi des volumes calculés par épalement (creux/jauge).
        </p>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">🧪 Test : mesure → volume</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:end">
          <div class="field"><label class="field-label">Cuve</label>
            <select class="select" id="ep-test-cuve" style="min-width:140px">
              <option value="">—</option>
              ${_epContenants.map(c => `<option value="${c.id}">${escapeHtml(c.nom)}</option>`).join('')}
            </select></div>
          <div class="field"><label class="field-label">Mesure (cm)</label>
            <input class="input" type="number" step="0.1" id="ep-test-mesure" style="width:110px"></div>
          <div class="field"><label class="field-label">Mode</label>
            <select class="select" id="ep-test-mode">
              <option value="creux">Creux (haut cheminée)</option>
              <option value="jauge_bas">Jauge (par le bas)</option>
            </select></div>
          <button class="btn btn--primary" onclick="epLiveTest()">Calculer</button>
          <div id="ep-test-result" style="font-weight:700;font-size:1.1rem;padding-bottom:6px"></div>
        </div>
      </div>
    </div>

    <div class="drawer-section" style="margin-top:var(--space-4)">
      <div class="drawer-section-title">🔗 Affectation cuve → abaque
        <label style="margin-left:var(--space-2);font-weight:400;font-size:var(--text-caption);cursor:pointer">
          <input type="checkbox" ${_epFilterNonCal ? 'checked' : ''} onchange="_epFilterNonCal=this.checked;_renderEpalementUI()">
          n'afficher que les non calibrées
        </label>
      </div>
      <div class="drawer-section-content" style="padding:0">
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:var(--text-callout)">
          <thead><tr>
            <th style="width:30px;border-bottom:1px solid var(--color-border)"></th>
            <th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--color-border)">Cuve</th>
            <th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--color-border)">Nominal (hL)</th>
            <th style="text-align:right;padding:8px 12px;border-bottom:1px solid var(--color-border)">Haut. tot. (cm)</th>
            <th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--color-border)">Modèle d'abaque</th>
          </tr></thead>
          <tbody>
            ${_epContenants.filter(c => !_epFilterNonCal || !_epIsCalibree(barByCont[c.id])).map(c => {
              const b = barByCont[c.id] || {};
              const cap = b.volume_nominal_hl != null ? Number(b.volume_nominal_hl) : null;
              const opts = _epModeles.map(m => {
                const sel = b.modele_id === m.id ? ' selected' : '';
                const hint = (cap != null && m.capacite_nominale_hl != null
                              && Math.abs(Number(m.capacite_nominale_hl) - cap) < 1) ? ' ⭐' : '';
                return `<option value="${m.id}"${sel}>${escapeHtml(m.nom)}${hint}</option>`;
              }).join('');
              return `<tr id="ep-row-${c.id}">
                <td style="padding:6px 4px 6px 10px;text-align:center">
                  <button class="ep-detail-toggle" id="ep-tg-${c.id}" onclick="epToggleDetail('${c.id}')"
                          title="Voir les données / calculs">▸</button>
                </td>
                <td style="padding:6px 12px;font-weight:600">${escapeHtml(c.nom)}</td>
                <td style="padding:6px 12px;text-align:right;color:var(--color-ink-tertiary)">${cap != null ? cap : '—'}</td>
                <td style="padding:6px 12px;text-align:right;color:var(--color-ink-tertiary)">${b.hauteur_totale_cm != null ? b.hauteur_totale_cm : '—'}</td>
                <td style="padding:6px 12px">
                  ${isPriv ? `<select class="select" style="min-width:200px"
                       onchange="epSetModele('${c.id}', this.value)">
                       <option value="">— aucun (linéaire seul) —</option>${opts}
                     </select>`
                   : `<span>${escapeHtml(_epModeles.find(m => m.id === b.modele_id)?.nom || '—')}</span>`}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  `;
}

async function epSetModele(contenantId, modeleId) {
  try {
    await WB3DB.saveBaremage(contenantId, { modele_id: modeleId || null });
    const b = _epBaremages.find(x => x.contenant_id === contenantId);
    if (b) b.modele_id = modeleId || null;
    else _epBaremages.push({ contenant_id: contenantId, modele_id: modeleId || null });
    toast('Abaque affecté', 'success');
  } catch(e) { toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

async function epToggleDetail(cid) {
  const tg  = document.getElementById('ep-tg-' + cid);
  let   det = document.getElementById('ep-det-' + cid);
  if (det) {
    const show = det.style.display === 'none';
    det.style.display = show ? '' : 'none';
    if (tg) tg.classList.toggle('open', show);
    return;
  }
  const row = document.getElementById('ep-row-' + cid);
  if (!row) return;
  det = document.createElement('tr');
  det.id = 'ep-det-' + cid;
  det.className = 'ep-detail-row';
  det.innerHTML = `<td colspan="5"><div class="ep-detail-box" id="ep-detbox-${cid}">Chargement…</div></td>`;
  row.after(det);
  if (tg) tg.classList.add('open');
  await _epRenderDetail(cid);
}

async function _epRenderDetail(cid) {
  const box = document.getElementById('ep-detbox-' + cid);
  if (!box) return;
  const c = _epContenants.find(x => x.id === cid) || {};
  const b = _epBaremages.find(x => x.contenant_id === cid) || {};
  const modele = _epModeles.find(m => m.id === b.modele_id);
  const v = x => (x == null || x === '') ? '—' : x;
  const isPriv = WB3DB.isPrivileged && WB3DB.isPrivileged();

  const raw = [
    ['Modèle d\'abaque',      modele ? escapeHtml(modele.nom) : '— (linéaire seul)'],
    ['Volume nominal (hL)',   v(b.volume_nominal_hl)],
    ['Hauteur totale (cm)',   v(b.hauteur_totale_cm)],
    ['Hauteur cheminée (cm)', v(b.hauteur_cheminee_cm)],
    ['Hauteur cachée (cm)',   v(b.hauteur_cachee_cm)],
    ['Coef métrique (hL/cm)', v(b.volume_metrique_hl_cm)],
    ['Type de mesure',        v(b.type_mesure)],
  ];

  let pointsHtml;
  if (modele) {
    let pts = [];
    try { pts = await WB3DB.getModelePoints(modele.id); } catch (e) { /* ignore */ }
    pointsHtml = pts.length
      ? `<div class="ep-det-col">
           <div class="ep-det-h">Abaque — ${pts.length} points (creux → volume)</div>
           <div class="ep-points">${pts.map(p => `<div><span>${p.creux_cm} cm</span><b>${p.volume_hl} hL</b></div>`).join('')}</div>
         </div>`
      : `<div class="ep-det-col"><div class="ep-det-h">Abaque</div><div class="ep-det-formula">Aucun point dans cet abaque.</div></div>`;
  } else {
    pointsHtml = `<div class="ep-det-col">
        <div class="ep-det-h">Calcul linéaire (formule Grille)</div>
        <div class="ep-det-formula">volume = (h. cheminée + h. totale − creux) × coef<br>
          <small>coef = ${v(b.volume_metrique_hl_cm)} hL/cm</small></div>
      </div>`;
  }

  box.innerHTML = `
    <div class="ep-det-grid">
      <div class="ep-det-col">
        <div class="ep-det-h">Données brutes — ${escapeHtml(c.nom || '')}</div>
        <table class="ep-raw">${raw.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
      </div>
      ${pointsHtml}
      <div class="ep-det-col">
        <div class="ep-det-h">Calcul direct (mesure → volume)</div>
        <div class="ep-calc">
          <input type="number" step="0.1" id="ep-cd-mes-${cid}" placeholder="cm">
          <select id="ep-cd-mode-${cid}">
            <option value="creux">Creux</option>
            <option value="jauge_bas">Jauge bas</option>
          </select>
          <button class="btn btn--primary btn--sm" onclick="epDirectCalc('${cid}')">=</button>
          <span id="ep-cd-res-${cid}" style="font-weight:700;color:var(--color-primary)"></span>
        </div>
      </div>
      ${isPriv ? `
      <div class="ep-det-col">
        <div class="ep-det-h">✎ Calibration linéaire (sans abaque)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-width:320px">
          <label style="font-size:var(--text-caption)">Volume nominal (hL)
            <input class="input" type="number" step="0.1" id="ep-lin-nom-${cid}" value="${b.volume_nominal_hl ?? ''}"></label>
          <label style="font-size:var(--text-caption)">Hauteur totale (cm)
            <input class="input" type="number" step="0.1" id="ep-lin-haut-${cid}" value="${b.hauteur_totale_cm ?? ''}"></label>
          <label style="font-size:var(--text-caption)">Hauteur cheminée (cm)
            <input class="input" type="number" step="0.1" id="ep-lin-chem-${cid}" value="${b.hauteur_cheminee_cm ?? ''}"></label>
          <label style="font-size:var(--text-caption)">Type de mesure
            <select class="select" id="ep-lin-mode-${cid}">
              <option value="creux"${b.type_mesure!=='jauge_bas'?' selected':''}>Creux</option>
              <option value="jauge_bas"${b.type_mesure==='jauge_bas'?' selected':''}>Jauge bas</option>
            </select></label>
        </div>
        <button class="btn btn--primary btn--sm" style="margin-top:6px" onclick="epSaveLineaire('${cid}')">💾 Enregistrer la calibration</button>
      </div>` : ''}
    </div>`;
}

function epNewModele() { _epEditModeleId = '__new__'; _epShowModeleEditor({ nom:'', capacite_nominale_hl:'', points:[] }); }

async function epEditModele(id) {
  const m = _epModeles.find(x => x.id === id); if (!m) return;
  _epEditModeleId = id;
  let pts = [];
  try { pts = await WB3DB.getModelePoints(id); } catch(_) {}
  _epShowModeleEditor({ nom:m.nom, capacite_nominale_hl:m.capacite_nominale_hl ?? '', points:pts });
}

function _epShowModeleEditor({ nom, capacite_nominale_hl, points }) {
  const host = document.getElementById('ep-modele-editor'); if (!host) return;
  const txt = (points || []).map(p => `${p.creux_cm}\t${p.volume_hl}`).join('\n');
  host.innerHTML = `
    <div style="border:1px solid var(--color-primary);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3);background:var(--color-bg-subtle)">
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:end;margin-bottom:var(--space-2)">
        <label style="font-size:var(--text-caption)">Nom du modèle<br>
          <input class="input" id="ep-md-nom" value="${escapeHtml(String(nom||''))}" placeholder="ex. Cuve 1250 hL"></label>
        <label style="font-size:var(--text-caption)">Capacité nominale (hL)<br>
          <input class="input" id="ep-md-cap" type="number" step="0.1" value="${capacite_nominale_hl ?? ''}" style="max-width:140px"></label>
      </div>
      <label style="font-size:var(--text-caption)">Points <b>creux → volume</b> (un par ligne, séparés par tab/espace/,/;)</label>
      <textarea id="ep-md-points" class="input" rows="8" style="width:100%;font-family:monospace;font-size:12px">${escapeHtml(txt)}</textarea>
      <div style="margin-top:var(--space-2);display:flex;gap:var(--space-2)">
        <button class="btn btn--primary btn--sm" onclick="epSaveModele()">💾 Enregistrer le modèle</button>
        <button class="btn btn--secondary btn--sm" onclick="epCancelModele()">Annuler</button>
        <span id="ep-md-count" style="font-size:var(--text-caption);color:var(--color-ink-tertiary);align-self:center"></span>
      </div>
    </div>`;
  const ta = document.getElementById('ep-md-points');
  const upd = () => { document.getElementById('ep-md-count').textContent = `${_epParsePoints(ta.value).length} point(s)`; };
  ta.addEventListener('input', upd); upd();
}

function _epParsePoints(text) {
  return String(text||'').split('\n').map(l => {
    const m = l.trim().split(/[\s,;]+/).filter(Boolean);
    if (m.length < 2) return null;
    const c = parseFloat(m[0].replace(',','.')), v = parseFloat(m[1].replace(',','.'));
    return (isNaN(c)||isNaN(v)) ? null : { creux_cm:c, volume_hl:v };
  }).filter(Boolean);
}

function epCancelModele() { _epEditModeleId = null; const h=document.getElementById('ep-modele-editor'); if(h) h.innerHTML=''; }

async function epSaveModele() {
  const nom = document.getElementById('ep-md-nom').value.trim();
  if (!nom) { toast('Nom du modèle requis', 'error'); return; }
  const cap = parseFloat(document.getElementById('ep-md-cap').value);
  const points = _epParsePoints(document.getElementById('ep-md-points').value);
  try {
    const id = await WB3DB.saveModele({ nom, capacite_nominale_hl: isNaN(cap) ? null : cap });
    await WB3DB.replaceModelePoints(id, points);
    toast(`Modèle « ${nom} » enregistré (${points.length} points)`, 'success');
    _epEditModeleId = null;
    await renderEpalementSection();
  } catch(e) {
    const msg = /row-level security|permission|policy/i.test(e.message||'') ? 'Droits insuffisants (admin/œnologue).' : (WB3DB.errMsg?WB3DB.errMsg(e):e.message);
    toast('Erreur : ' + msg, 'error');
  }
}

async function epDeleteModele(id, nom) {
  if (!(await WB3UI.confirm(`Supprimer le modèle « ${nom} » ?\nLes cuves qui l'utilisent repasseront en non calibrées.`, { title:'Supprimer le modèle', okText:'Supprimer', danger:true }))) return;
  try { await WB3DB.deleteModele(id); toast('Modèle supprimé', 'success'); await renderEpalementSection(); }
  catch(e) { toast('Erreur : ' + (WB3DB.errMsg?WB3DB.errMsg(e):e.message), 'error'); }
}

async function epSaveLineaire(cid) {
  const nom  = parseFloat(document.getElementById('ep-lin-nom-'+cid).value);
  const haut = parseFloat(document.getElementById('ep-lin-haut-'+cid).value);
  const chem = parseFloat(document.getElementById('ep-lin-chem-'+cid).value);
  const mode = document.getElementById('ep-lin-mode-'+cid).value;
  if (isNaN(nom) || isNaN(haut) || haut <= 0) { toast('Renseigne au moins le volume nominal et la hauteur totale (> 0)', 'error'); return; }
  const coef = nom / haut;
  try {
    await WB3DB.saveBaremage(cid, {
      volume_nominal_hl: nom, hauteur_totale_cm: haut,
      hauteur_cheminee_cm: isNaN(chem) ? null : chem,
      volume_metrique_hl_cm: Math.round(coef * 100000) / 100000,
      type_mesure: mode,
    });
    toast('Calibration enregistrée', 'success');
    await renderEpalementSection();
  } catch(e) {
    const msg = /row-level security|permission|policy/i.test(e.message||'') ? 'Droits insuffisants (admin/œnologue).' : (WB3DB.errMsg?WB3DB.errMsg(e):e.message);
    toast('Erreur : ' + msg, 'error');
  }
}

async function epDirectCalc(cid) {
  const mes  = parseFloat(document.getElementById('ep-cd-mes-' + cid)?.value);
  const mode = document.getElementById('ep-cd-mode-' + cid)?.value || 'creux';
  const res  = document.getElementById('ep-cd-res-' + cid);
  if (isNaN(mes)) { if (res) res.textContent = '—'; return; }
  try {
    const vol = await WB3DB.volumeFromMesure(cid, mes, mode);
    if (res) res.textContent = vol != null ? _invNum(vol) + ' hL' : 'n/a';
  } catch (e) { if (res) res.textContent = 'err'; }
}

async function epSaveArrondi() {
  const v = parseInt(document.getElementById('ep-arrondi').value, 10);
  try {
    await WB3DB.setTolerance('volume_arrondi_hl', v);
    _epArrondi = v;
    const el = document.getElementById('ep-arrondi-saved');
    if (el) { el.style.display = ''; setTimeout(() => el.style.display = 'none', 2000); }
    toast('Arrondi enregistré', 'success');
  } catch(e) {
    const msg = /row-level security|permission|policy/i.test(e.message || '') ? 'Droits insuffisants (admin/œnologue).' : e.message;
    toast('Erreur : ' + msg, 'error');
  }
}

async function epLiveTest() {
  const cid = document.getElementById('ep-test-cuve').value;
  const mes = parseFloat(document.getElementById('ep-test-mesure').value);
  const mode = document.getElementById('ep-test-mode').value;
  const out = document.getElementById('ep-test-result');
  if (!cid || isNaN(mes)) { out.textContent = '— renseigne cuve + mesure'; return; }
  try {
    const v = await WB3DB.volumeFromMesure(cid, mes, mode);
    out.innerHTML = v == null
      ? '<span style="color:var(--color-danger)">pas de calibration</span>'
      : `= <span style="color:var(--color-primary)">${Number(v).toFixed(1)} hL</span>`;
  } catch(e) {
    out.innerHTML = `<span style="color:var(--color-danger)">${escapeHtml(e.message)}</span>`;
  }
}

async function epImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { toast('Parseur XLSX non chargé', 'error'); return; }
  const report = document.getElementById('ep-import-report');
  report.innerHTML = '<div class="spinner"></div> Lecture du classeur…';
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellFormula: true });
    const contByNorm = {};
    _epContenants.forEach(c => { contByNorm[_epNormCuve(c.nom)] = c; });
    const SKIP = new Set(['grille', 'barriques', 'feuil1']);
    const modeleIdByNom = {};
    let nbModeles = 0, nbPoints = 0;
    for (const sheetName of wb.SheetNames) {
      if (SKIP.has(sheetName.trim().toLowerCase())) continue;
      const ws = wb.Sheets[sheetName];
      if (!ws || !ws['!ref']) continue;
      const a1 = ws['A1'] && String(ws['A1'].v || '');
      const d1 = ws['D1'] && String(ws['D1'].v || '');
      if (!/hauteur|creux/i.test(a1 || '') || !/volume.*hl/i.test(d1 || '')) continue;
      const range = XLSX.utils.decode_range(ws['!ref']);
      const raw = [];
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const ca = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        const cd = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
        if (!ca || ca.v == null || !cd || cd.v == null) continue;
        const a = Number(ca.v), vol = Number(cd.v);
        if (isNaN(a) || isNaN(vol)) continue;
        raw.push({ a, vol });
      }
      if (raw.length < 2) continue;
      raw.sort((p, q) => p.a - q.a);
      const increasing = raw[raw.length - 1].vol > raw[0].vol;
      const maxA = raw[raw.length - 1].a;
      const points = increasing
        ? raw.map(p => ({ creux_cm: maxA - p.a, volume_hl: p.vol }))
        : raw.map(p => ({ creux_cm: p.a,        volume_hl: p.vol }));
      const capMatch = sheetName.match(/(\d+(?:[.,]\d+)?)/);
      const cap = capMatch ? parseFloat(capMatch[1].replace(',', '.')) : null;
      report.innerHTML = `<div class="spinner"></div> Modèle « ${escapeHtml(sheetName)} » (${points.length} points)…`;
      const modeleId = await WB3DB.saveModele({ nom: sheetName, capacite_nominale_hl: cap });
      await WB3DB.replaceModelePoints(modeleId, points);
      modeleIdByNom[sheetName] = modeleId;
      nbModeles++; nbPoints += points.length;
    }
    const grille = wb.Sheets['Grille'] || wb.Sheets['grille'];
    let nbCuves = 0; const introuvables = [];
    if (grille && grille['!ref']) {
      const range = XLSX.utils.decode_range(grille['!ref']);
      const cellNum = (R, c) => { const cell = grille[XLSX.utils.encode_cell({ r: R, c })]; return cell && cell.v != null && cell.v !== '' ? Number(cell.v) : null; };
      const cellStr = (R, c) => { const cell = grille[XLSX.utils.encode_cell({ r: R, c })]; return cell && cell.v != null ? String(cell.v).trim() : ''; };
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const cuveRaw = cellStr(R, 3);
        if (!cuveRaw) continue;
        const cont = contByNorm[_epNormCuve(cuveRaw)];
        if (!cont) { introuvables.push(cuveRaw); continue; }
        const kCell = grille[XLSX.utils.encode_cell({ r: R, c: 10 })];
        let modeleId = null;
        if (kCell && kCell.f) { const m = kCell.f.match(/'([^']+)'!/); if (m && modeleIdByNom[m[1]]) modeleId = modeleIdByNom[m[1]]; }
        await WB3DB.saveBaremage(cont.id, {
          modele_id: modeleId, hauteur_totale_cm: cellNum(R, 4), hauteur_cachee_cm: cellNum(R, 5),
          volume_metrique_hl_cm: cellNum(R, 6), hauteur_cheminee_cm: cellNum(R, 7),
          volume_nominal_hl: cellNum(R, 11), type_mesure: cellStr(R, 12) || 'creux',
        });
        nbCuves++;
      }
    }
    report.innerHTML = `
      <div style="padding:10px 12px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:var(--radius-sm);color:#065f46">
        ✓ Import terminé : <b>${nbModeles}</b> modèle(s) (${nbPoints} points), <b>${nbCuves}</b> cuve(s) calibrée(s).
        ${introuvables.length ? `<br><span style="color:#92400e">⚠ ${introuvables.length} cuve(s) Excel non trouvées dans WB3 : ${escapeHtml(introuvables.slice(0,15).join(', '))}${introuvables.length>15?'…':''}</span>` : ''}
      </div>`;
    input.value = '';
    [_epModeles, _epBaremages] = await Promise.all([WB3DB.listModeles(), WB3DB.listBaremages()]);
    _renderEpalementUI();
  } catch(e) {
    console.error('[épalement import]', e);
    report.innerHTML = `<div style="color:var(--color-danger)">❌ ${escapeHtml(e.message)}</div>`;
  }
}
