/* params-import-cuverie.js — Paramètres : sous-section Import CSV cuverie
 * Dépend de : _getSubRoot() (params-cuverie-groupe.js),
 *             travees (var dans main), loadTravees() (dans main).
 * splitCsvLine() est aussi appelée par params-analyses.js (_parseAnalyseCsv).
 */
'use strict';

function renderImportSection() {
  const root = _getSubRoot();
  root.innerHTML = `
    <h2>📥 Import cuverie CSV</h2>
    <p class="lead">Initialise ta cuverie en important un fichier CSV depuis Excel ou LibreOffice Calc. Les travées manquantes sont créées automatiquement.</p>

    <div class="drawer-section">
      <div class="drawer-section-title">Étape 1 — Télécharger la trame</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Télécharge la trame, remplis-la sous Excel (séparateur <b>point-virgule</b>),
          puis importe-la ci-dessous. Enregistre le fichier en <b>CSV UTF-8</b>.
        </p>
        <button class="btn btn--secondary" onclick="downloadTemplate()">📄 Télécharger la trame CSV</button>
        <div class="t-footnote" style="margin-top:var(--space-2);color:var(--color-ink-tertiary)">
          Colonnes attendues :
          <code style="background:var(--color-bg-mute);padding:2px 6px;border-radius:4px;font-size:var(--text-caption)">
            Travée ; Cuve ; Type ; Capacité (hL) ; Matériaux ; Marque ; Tonnelier ; Année mise en service ; Origine bois ; Chauffe ; Spécificités
          </code>
          <br>Types acceptés : <code style="background:var(--color-bg-mute);padding:2px 4px;border-radius:3px;font-size:10px">cuve · foudre · fut · demi_muid · cuve_bois · pressoir · autre</code>
        </div>
      </div>
    </div>

    <div class="drawer-section">
      <div class="drawer-section-title">Étape 2 — Importer le fichier</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-3)">
          Les contenants dont le nom existe déjà dans la cave seront ignorés (pas de doublon).
        </p>
        <input type="file" id="csv-file" accept=".csv,text/csv"
          style="font-size:var(--text-callout)"
          onchange="handleCSVFile(this)">
      </div>
    </div>

    <div id="import-preview" style="display:none"></div>

    <!-- ── Création par lot de barriques (Prompt 10, point 2) ── -->
    <div class="drawer-section" style="margin-top:var(--space-5)">
      <div class="drawer-section-title">🛢 Création par lot de barriques</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="margin:0 0 var(--space-4)">
          Génère plusieurs fûts d'un coup, avec numérotation automatique et attributs
          bois communs. Idéal pour un chai à barriques — pas de saisie unitaire de 225 fûts.
        </p>

        ${_bbField('Préfixe', `<input class="input" id="bb-prefix" value="B-${new Date().getFullYear()}-" oninput="updateBatchPreview()">`)}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3)">
          ${_bbField('N° de départ', `<input class="input" id="bb-start" type="number" min="1" value="1" oninput="updateBatchPreview()">`)}
          ${_bbField('Nombre', `<input class="input" id="bb-count" type="number" min="1" max="500" value="50" oninput="updateBatchPreview()">`)}
          ${_bbField('Chiffres (zéros)', `<input class="input" id="bb-pad" type="number" min="1" max="5" value="3" oninput="updateBatchPreview()">`)}
          ${_bbField('Type', `<select class="input" id="bb-type">
            <option value="fut">Fût</option>
            <option value="foudre">Foudre</option>
            <option value="demi_muid">Demi-muid</option>
            <option value="cuve_bois">Cuve bois</option>
          </select>`)}
          ${_bbField('Capacité (hL)', `<input class="input" id="bb-capacite" type="number" step="0.01" min="0.01" value="2.25">`)}
          ${_bbField('Travée', `<select class="input" id="bb-travee">
            <option value="">— Aucune —</option>
            ${(travees || []).map(t => `<option value="${t.id}">${escapeHtml(t.nom)}</option>`).join('')}
          </select>`)}
        </div>

        <div style="font-weight:600;font-size:var(--text-caption);text-transform:uppercase;letter-spacing:.4px;color:var(--color-ink-tertiary);margin:var(--space-4) 0 var(--space-2)">Attributs bois (communs à toutes)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--space-3)">
          ${_bbField('Tonnelier', `<input class="input" id="bb-tonnelier" placeholder="ex : Seguin Moreau">`)}
          ${_bbField('Origine bois', `<input class="input" id="bb-origine" placeholder="ex : Chêne Allier">`)}
          ${_bbField('Chauffe', `<select class="input" id="bb-chauffe">
            <option value="">—</option>
            <option value="legere">Légère</option>
            <option value="moyenne">Moyenne</option>
            <option value="forte">Forte</option>
            <option value="extra_forte">Extra-forte</option>
          </select>`)}
          ${_bbField('Année mise en service', `<input class="input" id="bb-annee" type="number" min="1900" max="2100" value="${new Date().getFullYear()}">`)}
          ${_bbField("Prix d'achat (€)", `<input class="input" id="bb-prix" type="number" step="0.01" min="0" placeholder="ex : 750">`)}
          ${_bbField('Spécificités', `<input class="input" id="bb-specificites" placeholder="ex : grain serré">`)}
        </div>

        <div id="bb-preview" style="margin-top:var(--space-3);font-size:var(--text-callout);color:var(--color-ink-secondary)"></div>
        <button class="btn btn--primary" id="bb-btn" style="margin-top:var(--space-3)" onclick="confirmBatchBarriques()">🛢 Créer les barriques</button>
      </div>
    </div>
  `;
  updateBatchPreview();
}

// Petit helper : un champ label + contrôle empilés.
function _bbField(label, control) {
  return `<label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-caption);font-weight:600;color:var(--color-ink-secondary);margin-bottom:var(--space-2)">${label}${control}</label>`;
}

function _bbPad(n, pad) { return String(n).padStart(Math.max(1, pad || 1), '0'); }

function updateBatchPreview() {
  const el = document.getElementById('bb-preview');
  if (!el) return;
  const prefix = document.getElementById('bb-prefix')?.value ?? '';
  const start  = parseInt(document.getElementById('bb-start')?.value, 10) || 1;
  const count  = parseInt(document.getElementById('bb-count')?.value, 10) || 0;
  const pad    = parseInt(document.getElementById('bb-pad')?.value, 10) || 3;
  if (count < 1) { el.textContent = ''; return; }
  const first = prefix + _bbPad(start, pad);
  const last  = prefix + _bbPad(start + count - 1, pad);
  el.innerHTML = count === 1
    ? `→ 1 barrique : <b>${escapeHtml(first)}</b>`
    : `→ <b>${count}</b> barriques : <b>${escapeHtml(first)}</b> … <b>${escapeHtml(last)}</b>`;
}

async function confirmBatchBarriques() {
  const g = (id) => document.getElementById(id);
  const prefix   = g('bb-prefix').value || '';
  const start    = parseInt(g('bb-start').value, 10) || 1;
  const count    = parseInt(g('bb-count').value, 10) || 0;
  const pad      = parseInt(g('bb-pad').value, 10) || 3;
  const type     = g('bb-type').value;
  const capacite = parseFloat(g('bb-capacite').value);
  const travee_id = g('bb-travee').value || null;
  const annee    = parseInt(g('bb-annee').value, 10);
  const prix     = parseFloat(g('bb-prix').value);

  if (count < 1 || count > 500) { toast('Nombre de barriques : entre 1 et 500', 'error'); return; }
  if (!capacite || capacite <= 0) { toast('Capacité invalide', 'error'); return; }

  const bois = {
    tonnelier:          g('bb-tonnelier').value.trim() || null,
    origine_bois:       g('bb-origine').value.trim()   || null,
    chauffe:            g('bb-chauffe').value || null,
    annee_mise_service: Number.isFinite(annee) ? annee : null,
    prix_achat:         Number.isFinite(prix)  ? prix  : null,
    specificites:       g('bb-specificites').value.trim() || null,
  };

  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({ nom: prefix + _bbPad(start + i, pad), type, capacite_hl: capacite, travee_id, ...bois });
  }

  const btn = g('bb-btn');
  if (btn) { btn.disabled = true; btn.textContent = '… création'; }
  try {
    const res = await WB3DB.createContenantsBatch(rows);
    let msg = `✅ ${res.created} barrique${res.created > 1 ? 's' : ''} créée${res.created > 1 ? 's' : ''}`;
    if (res.skipped) msg += ` · ${res.skipped} doublon${res.skipped > 1 ? 's' : ''} ignoré${res.skipped > 1 ? 's' : ''}`;
    toast(msg, 'success');
  } catch (e) {
    toast('Erreur : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    console.error('[WB3 batch barriques]', e);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🛢 Créer les barriques'; }
  }
}

function downloadTemplate() {
  const rows = [
    'Travée;Cuve;Type;Capacité (hL);Matériaux;Marque;Tonnelier;Année mise en service;Origine bois;Chauffe;Spécificités',
    'Travée A;CX001;cuve;150;INOX;Pera-Pellenc;;2018;;;',
    'Travée A;CX002;cuve;200;INOX;;;2020;;;',
    'Travée B;FD001;foudre;300;Chêne français;;Stockinger;2015;Chêne Allier;;',
    'Travée B;FD002;foudre;300;Chêne français;;Taransaud;2016;Chêne Nevers;;',
    'Chai C;FT001;fut;2.25;Chêne français;;Seguin Moreau;2022;Chêne Allier;moyenne;grain serré',
    'Chai C;FT002;fut;2.25;Chêne américain;;World Cooperage;2021;Chêne Américain;forte;',
    ';PR001;pressoir;50;Pneumatique;Bucher Vaslin;;2019;;;',
  ];
  const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'trame-cuverie-wineblender.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('Trame téléchargée', 'success');
}

function handleCSVFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const parsed = parseCSV(e.target.result);
    if (parsed.error) { toast(parsed.error, 'error'); return; }
    if (!parsed.rows.length) { toast('Aucune ligne valide dans le fichier', 'error'); return; }
    window._importParsed = parsed;
    renderImportPreview(parsed);
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim());
  if (nonEmpty.length < 2) return { error: 'Fichier vide ou sans données' };

  const header = nonEmpty[0];
  const sep    = header.includes(';') ? ';' : ',';
  const cols   = header.split(sep).map(h => h.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''));

  function findCol(...candidates) {
    for (const c of candidates) {
      const i = cols.findIndex(h => h.includes(c));
      if (i >= 0) return i;
    }
    return -1;
  }

  const VALID_TYPES = new Set(['cuve','foudre','fut','demi_muid','cuve_bois','pressoir','autre']);
  const CHAUFFE_MAP = { 'légère':'legere','legere':'legere','l':'legere','légère (l)':'legere',
    'moyenne':'moyenne','m':'moyenne','moyenne (m)':'moyenne',
    'forte':'forte','f':'forte','forte (f)':'forte',
    'extra-forte':'extra_forte','extra_forte':'extra_forte','ef':'extra_forte','extra-forte (ef)':'extra_forte' };

  const ci = {
    travee:       findCol('travee', 'zone', 'secteur'),
    nom:          findCol('cuve', 'nom', 'contenant'),
    type:         findCol('type'),
    capa:         findCol('capacite', 'capacit', 'cap', 'hl'),
    mat:          findCol('materiaux', 'materiau', 'matiere', 'mat'),
    marque:       findCol('marque', 'fabricant', 'constructeur'),
    tonnelier:    findCol('tonnelier'),
    annee:        findCol('annee', 'date', 'service', 'mise'),
    origine:      findCol('origine', 'bois'),
    chauffe:      findCol('chauffe'),
    specificites: findCol('specificites', 'specificit', 'particularites', 'notes'),
  };

  if (ci.nom  === -1) return { error: 'Colonne "Cuve" introuvable dans l\'en-tête' };
  if (ci.capa === -1) return { error: 'Colonne "Capacité" introuvable dans l\'en-tête' };

  const rows   = [];
  const errors = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const cells   = splitCsvLine(nonEmpty[i], sep);
    const nom     = cells[ci.nom]?.trim() || '';
    const capaRaw = (cells[ci.capa] || '').trim().replace(',', '.');

    if (!nom) { errors.push(`Ligne ${i + 1} : nom vide → ignorée`); continue; }

    const capa = parseFloat(capaRaw);
    if (isNaN(capa) || capa <= 0) {
      errors.push(`Ligne ${i + 1} ("${nom}") : capacité invalide ("${capaRaw}") → ignorée`);
      continue;
    }

    const typeRaw = (ci.type >= 0 ? (cells[ci.type] || '').trim().toLowerCase().replace(/[-\s]/g,'_') : '');
    const type    = VALID_TYPES.has(typeRaw) ? typeRaw : 'cuve';
    const isBarrel = ['fut','foudre','demi_muid','cuve_bois'].includes(type);
    const chauffeRaw = (ci.chauffe >= 0 ? (cells[ci.chauffe] || '').trim().toLowerCase() : '');

    rows.push({
      traveeNom:          ci.travee   >= 0 ? (cells[ci.travee]   || '').trim() : '',
      nom,
      type,
      capacite_hl:        capa,
      materiau:           ci.mat      >= 0 ? (cells[ci.mat]      || '').trim() || null : null,
      marque:             ci.marque   >= 0 ? (cells[ci.marque]   || '').trim() || null : null,
      tonnelier:          ci.tonnelier>= 0 ? (cells[ci.tonnelier]|| '').trim() || null : null,
      annee_mise_service: parseAnnee(ci.annee >= 0 ? (cells[ci.annee] || '').trim() : ''),
      origine_bois:       isBarrel && ci.origine >= 0 ? (cells[ci.origine] || '').trim() || null : null,
      chauffe:            isBarrel ? (CHAUFFE_MAP[chauffeRaw] || null) : null,
      specificites:       isBarrel && ci.specificites >= 0 ? (cells[ci.specificites] || '').trim() || null : null,
    });
  }
  return { rows, errors };
}

function splitCsvLine(line, sep) {
  const cells = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"')           { inQ = !inQ; }
    else if (c === sep && !inQ) { cells.push(cur); cur = ''; }
    else                     { cur += c; }
  }
  cells.push(cur);
  return cells;
}

function parseAnnee(s) {
  if (!s) return null;
  const m = s.match(/\b(19|20)\d{2}\b/);
  if (m) return parseInt(m[0], 10);
  const n = parseInt(s, 10);
  return (!isNaN(n) && n >= 1900 && n <= 2100) ? n : null;
}

function renderImportPreview(parsed) {
  const { rows, errors } = parsed;

  const knownTraveeNames = new Set(travees.map(t => t.nom.toLowerCase()));
  const newTraveeNames   = [...new Set(
    rows.filter(r => r.traveeNom).map(r => r.traveeNom)
  )].filter(n => !knownTraveeNames.has(n.toLowerCase()));

  let html = `
    <div class="drawer-section">
      <div class="drawer-section-title">Étape 3 — Vérification avant import</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">
          <span class="tag tag--success">✅ ${rows.length} contenant${rows.length > 1 ? 's' : ''} prêt${rows.length > 1 ? 's' : ''}</span>
          ${newTraveeNames.length
            ? `<span class="tag">📍 ${newTraveeNames.length} travée${newTraveeNames.length > 1 ? 's' : ''} à créer :
               ${newTraveeNames.map(escapeHtml).join(', ')}</span>`
            : ''}
          ${errors.length
            ? `<span class="tag" style="background:var(--color-warning-soft);color:var(--color-warning)">
               ⚠️ ${errors.length} ligne${errors.length > 1 ? 's' : ''} ignorée${errors.length > 1 ? 's' : ''}</span>`
            : ''}
        </div>`;

  if (errors.length) {
    html += `
        <details style="margin-bottom:var(--space-3)">
          <summary style="cursor:pointer;font-size:var(--text-caption);color:var(--color-warning)">
            Voir les lignes ignorées
          </summary>
          <ul style="margin:var(--space-2) 0 0 var(--space-4);font-size:var(--text-caption);color:var(--color-ink-tertiary)">
            ${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
          </ul>
        </details>`;
  }

  if (rows.length) {
    const preview = rows.slice(0, 15);
    html += `
        <div style="overflow-x:auto;margin-bottom:var(--space-4)">
          <table class="data-table">
            <thead>
              <tr>
                <th>Travée</th><th>Cuve</th><th>Type</th>
                <th class="num">Capa (hL)</th><th>Matériaux</th><th>Tonnelier</th>
                <th class="num">Année</th><th>Origine bois</th><th>Chauffe</th>
              </tr>
            </thead>
            <tbody>
              ${preview.map(r => `
                <tr>
                  <td>${r.traveeNom
                    ? `<span class="tag">${escapeHtml(r.traveeNom)}</span>`
                    : '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
                  <td><b>${escapeHtml(r.nom)}</b></td>
                  <td><span class="tag">${escapeHtml(r.type || 'cuve')}</span></td>
                  <td class="num">${r.capacite_hl.toLocaleString('fr-FR')}</td>
                  <td>${r.materiau   ? escapeHtml(r.materiau)   : '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
                  <td>${r.tonnelier  ? escapeHtml(r.tonnelier)  : '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
                  <td class="num">${r.annee_mise_service || '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
                  <td>${r.origine_bois ? escapeHtml(r.origine_bois) : '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
                  <td>${r.chauffe    ? escapeHtml(r.chauffe)    : '<span style="color:var(--color-ink-tertiary)">—</span>'}</td>
                </tr>`).join('')}
              ${rows.length > 15
                ? `<tr><td colspan="9" style="text-align:center;color:var(--color-ink-tertiary);font-size:var(--text-caption)">
                    … et ${rows.length - 15} autre${rows.length - 15 > 1 ? 's' : ''}
                   </td></tr>`
                : ''}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:var(--space-2);align-items:center">
          <button class="btn" id="btn-import-confirm" onclick="confirmImport()">
            ✅ Importer ${rows.length} contenant${rows.length > 1 ? 's' : ''}
          </button>
          <button class="btn btn--ghost" onclick="cancelImport()">Annuler</button>
        </div>`;
  }

  html += '</div></div>';
  const previewEl = document.getElementById('import-preview');
  previewEl.innerHTML = html;
  previewEl.style.display = '';
  previewEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelImport() {
  window._importParsed = null;
  document.getElementById('import-preview').style.display = 'none';
  const fi = document.getElementById('csv-file');
  if (fi) fi.value = '';
}

async function confirmImport() {
  const parsed = window._importParsed;
  if (!parsed?.rows?.length) return;

  const btn = document.getElementById('btn-import-confirm');
  if (btn) { btn.disabled = true; btn.textContent = 'Import en cours…'; }

  const { rows } = parsed;
  let created = 0, skipped = 0;
  const importErrors = [];

  try {
    const traveeMap = new Map(travees.map(t => [t.nom.toLowerCase(), t.id]));
    const neededNames = [...new Set(rows.filter(r => r.traveeNom).map(r => r.traveeNom))];
    const missing     = neededNames.filter(n => !traveeMap.has(n.toLowerCase()));

    if (missing.length) {
      let maxOrdre = travees.length ? Math.max(...travees.map(t => t.ordre)) : 0;
      for (const nomT of missing) {
        maxOrdre++;
        await WB3DB.insertRow('travees', { nom: nomT, ordre: maxOrdre });
      }
      await loadTravees();
      travees.forEach(t => traveeMap.set(t.nom.toLowerCase(), t.id));
    }

    for (const r of rows) {
      const travee_id = r.traveeNom ? (traveeMap.get(r.traveeNom.toLowerCase()) || null) : null;
      try {
        await WB3DB.insertRow('contenants', {
          nom:                r.nom,
          type:               r.type || 'cuve',
          capacite_hl:        r.capacite_hl,
          travee_id,
          materiau:           r.materiau           || null,
          marque:             r.marque             || null,
          tonnelier:          r.tonnelier          || null,
          annee_mise_service: r.annee_mise_service || null,
          origine_bois:       r.origine_bois       || null,
          chauffe:            r.chauffe            || null,
          specificites:       r.specificites       || null,
          actif: true, tags: [],
        });
        created++;
      } catch(e) {
        if (e.code === '23505' || /duplicate/i.test(e.message)) {
          skipped++;
        } else {
          importErrors.push(`"${r.nom}" : ${e.message}`);
        }
      }
    }

    let msg = `✅ ${created} contenant${created > 1 ? 's' : ''} importé${created > 1 ? 's' : ''}`;
    if (skipped) msg += ` · ${skipped} doublon${skipped > 1 ? 's' : ''} ignoré${skipped > 1 ? 's' : ''}`;
    toast(msg, 'success');
    if (importErrors.length) {
      console.warn('[WB3 import errors]', importErrors);
      toast(`⚠️ ${importErrors.length} erreur(s) — voir console`, 'error');
    }
    cancelImport();

  } catch(e) {
    toast('Erreur import : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error');
    console.error(e);
    if (btn) { btn.disabled = false; btn.textContent = `Importer ${rows.length} contenants`; }
  }
}
