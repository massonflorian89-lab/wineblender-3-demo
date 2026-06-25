// cuverie-densites.js — Étiquette cuve (impression) + saisie densités « au km »
// Extrait de cuverie.html (Étape 11 de la refactorisation progressive).
//
// Deux outils de la tournée FA :
//   • _printEtiquetteCuve — impression d'une étiquette cuve (label 100×70 mm),
//     appelée depuis openCuveActions ('🏷 Étiquette cuve')
//   • openDensiteTour … _densSaveAll — modal de saisie rapide des densités/T°
//     au clavier (recopie de feuille, validation par lot), écrit dans analyses
//
// État top-level : _densSaved (compteur de relevés enregistrés).
//
// Globals lus (cuverie.html principal / modules) :
//   contenants, lotsMap, WB3DB, WB3UI, toast, escapeHtml, fmt, getPrincipalLot,
//   TYPE_LABELS, LOT_STATUT_SHORT
//
// Scripts classiques : fonctions globales → atteignables par les onclick
// inline (openDensiteTour(), _densSaveAll()…) et openCuveActions. Aucun appel
// top-level → ordre de chargement indifférent.

'use strict';

// ============================================================
// P1.2 — Étiquette cuve : impression (labels 100 × 70 mm)
// Appelée depuis openCuveActions → '🏷 Étiquette cuve'.
// ============================================================
function _printEtiquetteCuve(c) {
  if (!c) return;
  const lots = lotsMap.get(c.id) || [];
  const lp   = getPrincipalLot(c);
  const vol  = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const now  = new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
  const root = document.getElementById('wb3-print-root');
  if (!root) return;
  root.innerHTML = `
    <div class="wb3-etiquette">
      <div class="wb3-etq-nom">${escapeHtml(c.nom)}</div>
      ${lp ? `<div class="wb3-etq-lot">${escapeHtml(lp.nom)}${lp.millesime ? ' · ' + lp.millesime : ''}</div>` : '<div class="wb3-etq-lot" style="opacity:.4">Cuve vide</div>'}
      <div class="wb3-etq-meta">
        ${c.type ? escapeHtml(TYPE_LABELS[c.type] || c.type) : ''}
        ${c.capacite_hl ? ' · ' + fmt(c.capacite_hl) + ' hL' : ''}
        ${vol > 0 ? ' · ' + fmt(vol) + ' hL actuels' : ''}
      </div>
      ${lp ? `<div class="wb3-etq-statut">${escapeHtml(LOT_STATUT_SHORT[lp.statut] || lp.statut)}</div>` : ''}
      <div class="wb3-etq-date">Imprimé le ${now}</div>
    </div>`;
  document.body.classList.add('wb3-print-etiquette');
  window.print();
  document.body.classList.remove('wb3-print-etiquette');
  root.innerHTML = '';
}

// ============================================================
// Saisie densités « au km » — tournée FA au clavier
// ------------------------------------------------------------
// Remplace la saisie inline (colonne FA + formulaire sur carte, retirés).
// Mode BLOC : l'opérateur recopie sa feuille (n° cuve → Tab densité → Tab
// température, Entrée/Tab = ligne suivante), corrige librement n'importe quelle
// ligne, ajoute des lignes (＋ ou Tab), puis « Enregistrer » écrit tout d'un
// coup. Fermeture uniquement via « Fermer »/« Enregistrer » (pas de clic
// extérieur ni Échap) pour éviter les fausses manipulations.
// ============================================================
let _densSaved = 0;

function openDensiteTour() {
  document.getElementById('densite-tour-modal')?.remove();
  _densSaved = 0;
  const today = new Date().toISOString().slice(0, 10);
  const ov = document.createElement('div');
  ov.id = 'densite-tour-modal';
  ov.className = 'dens-modal';
  ov.innerHTML = `
    <div class="dens-card">
      <div class="dens-head">
        <h3>⌨️ Saisie des densités</h3>
        <label class="dens-date">Date <input type="date" id="dens-date" value="${today}"></label>
        <button class="close-btn" onclick="closeDensiteTour()" aria-label="Fermer">×</button>
      </div>
      <p class="dens-hint">Recopie tes relevés : <b>n° de cuve</b> → <kbd>Tab</kbd> densité → <kbd>Tab</kbd> température → <kbd>Entrée</kbd>/<kbd>Tab</kbd> passe à la ligne suivante. Tu peux <b>corriger n'importe quelle ligne</b> à tout moment, puis clique <b>💾 Enregistrer</b> pour tout sauver.</p>
      <div class="dens-tablewrap">
        <table class="dens-table">
          <thead><tr><th>Cuve</th><th>Densité</th><th>T° (°C)</th><th></th><th></th></tr></thead>
          <tbody id="dens-rows"></tbody>
        </table>
      </div>
      <div class="dens-foot">
        <button class="btn btn--secondary btn--sm" onclick="_densAddRowFocus()">＋ Ajouter une cuve</button>
        <span id="dens-count"></span>
        <div style="display:flex;gap:8px;margin-left:auto">
          <button class="btn btn--secondary" onclick="closeDensiteTour()">Fermer</button>
          <button class="btn btn--primary" id="dens-save-btn" onclick="_densSaveAll()">💾 Enregistrer</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(ov);
  // Pas de fermeture au clic extérieur ni à Échap (anti-fausse-manipulation) :
  // seuls « Fermer » et « Enregistrer » ferment la fenêtre.
  _densAddRow(); _densAddRow(); _densAddRow();
  _densUpdateSaveBtn();
  setTimeout(() => document.querySelector('#dens-rows .dens-cuve')?.focus(), 30);
}

async function closeDensiteTour(force) {
  if (!force) {
    const dirty = Array.from(document.querySelectorAll('#dens-rows tr'))
      .some(tr => !tr._saved && _densRowFilled(tr));
    if (dirty) {
      const ok = await WB3UI.confirm(
        'Des saisies ne sont pas encore enregistrées et seront perdues. Fermer sans enregistrer ?',
        { title: 'Saisies non enregistrées', okText: 'Fermer sans enregistrer', danger: true });
      if (!ok) return;
    }
  }
  document.getElementById('densite-tour-modal')?.remove();
  // Rafraîchir la cuverie pour refléter les relevés (sparkline FA, alertes analyse).
  if (_densSaved > 0) { try { loadCuverieData().then(render).catch(() => {}); } catch (_) {} }
}

function _densAddRow() {
  const tb = document.getElementById('dens-rows');
  if (!tb) return null;
  const tr = document.createElement('tr');
  tr.className = 'dens-row';
  tr.innerHTML = `
    <td><input class="input dens-cuve" type="text" autocomplete="off" spellcheck="false" placeholder="n° cuve"
        onkeydown="_densKey(event,'cuve')" oninput="_densResolveInline(this)"></td>
    <td><input class="input dens-d" type="number" step="0.0001" min="0.9" max="1.2" inputmode="decimal"
        placeholder="1.080" onkeydown="_densKey(event,'d')" oninput="_densUpdateSaveBtn()"></td>
    <td><input class="input dens-t" type="number" step="0.1" min="-5" max="50" inputmode="decimal"
        placeholder="T°" onkeydown="_densKey(event,'t')" oninput="_densUpdateSaveBtn()"></td>
    <td class="dens-status"></td>
    <td class="dens-del"><button type="button" class="dens-del-btn" title="Retirer cette ligne" onclick="_densRemoveRow(this)">✕</button></td>`;
  tb.appendChild(tr);
  return tr;
}
// Retire une ligne (✕). S'il ne reste qu'une ligne, on la vide au lieu de la
// supprimer (on garde toujours au moins une ligne de saisie).
function _densRemoveRow(btn) {
  const tr = btn.closest('tr');
  const tb = document.getElementById('dens-rows');
  if (tb && tb.children.length <= 1) {
    tr.querySelectorAll('input').forEach(i => {
      i.value = ''; i.readOnly = false;
      i.classList.remove('dens-locked', 'dens-ok-input', 'dens-bad-input');
    });
    tr._saved = false;
    _densMark(tr, '', '');
  } else {
    const focusTarget = tr.previousElementSibling || tr.nextElementSibling;
    tr.remove();
    focusTarget?.querySelector('.dens-cuve')?.focus();
  }
  _densUpdateSaveBtn();
}
function _densAddRowFocus() {
  const nr = _densAddRow();
  if (nr) { nr.querySelector('.dens-cuve').focus(); nr.scrollIntoView({ block: 'nearest' }); }
  _densUpdateSaveBtn();
}

// Résolution « n° de cuve » → contenant. Exact (insensible casse) puis préfixe
// unique. Renvoie le contenant, '__ambig__' si plusieurs, ou null si introuvable.
function _densResolve(text) {
  const q = (text || '').trim().toLowerCase();
  if (!q) return null;
  const actifs = contenants.filter(c => c.actif !== false);
  let m = actifs.filter(c => (c.nom || '').toLowerCase() === q);
  if (m.length === 1) return m[0];
  if (m.length > 1) return '__ambig__';
  m = actifs.filter(c => (c.nom || '').toLowerCase().startsWith(q));
  if (m.length === 1) return m[0];
  if (m.length > 1) return '__ambig__';
  return null;
}
function _densResolveInline(inp) {
  const tr = inp.closest('tr');
  const st = tr.querySelector('.dens-status');
  inp.classList.remove('dens-ok-input', 'dens-bad-input');
  if (tr._saved) { _densUpdateSaveBtn(); return; }
  if (!inp.value.trim()) { st.textContent = ''; _densUpdateSaveBtn(); return; }
  const r = _densResolve(inp.value);
  if (r === '__ambig__') { st.innerHTML = '<span class="dens-warn">plusieurs cuves</span>'; inp.classList.add('dens-bad-input'); }
  else if (!r)           { st.innerHTML = '<span class="dens-warn">introuvable</span>';   inp.classList.add('dens-bad-input'); }
  else {
    const lp = getPrincipalLot(r);
    st.innerHTML = `<span class="dens-resolved">→ ${escapeHtml(r.nom)}${lp ? ' · ' + escapeHtml(lp.nom) : ''}</span>`;
    inp.classList.add('dens-ok-input');
  }
  _densUpdateSaveBtn();
}

// Navigation clavier UNIQUEMENT (aucun enregistrement ici — il se fait en bloc
// via « Enregistrer »). Entrée/Tab depuis T° → ligne suivante (créée au besoin).
function _densKey(ev, field) {
  const tr = ev.target.closest('tr');
  if (ev.key === 'Enter') {
    ev.preventDefault();
    if (field === 'cuve') return tr.querySelector('.dens-d').focus();
    if (field === 'd')    return tr.querySelector('.dens-t').focus();
    if (field === 't')    return _densNextRow(tr);
  }
  if (ev.key === 'Tab' && field === 't' && !ev.shiftKey) { ev.preventDefault(); _densNextRow(tr); }
}
function _densNextRow(tr) {
  let nr = tr.nextElementSibling;
  if (!nr) nr = _densAddRow();
  if (nr) { nr.querySelector('.dens-cuve').focus(); nr.scrollIntoView({ block: 'nearest' }); }
  _densUpdateSaveBtn();
}

// Une ligne « pleine » = au moins une cuve OU une densité saisie.
function _densRowFilled(tr) {
  return (tr.querySelector('.dens-cuve').value.trim() !== '')
      || (tr.querySelector('.dens-d').value.trim() !== '');
}
function _densMark(tr, text, cls) {
  const st = tr.querySelector('.dens-status');
  if (!st) return;
  if (!text) { st.innerHTML = ''; return; }
  const k = cls === 'done' ? 'dens-done' : cls === 'warn' ? 'dens-warn' : cls === 'saving' ? 'dens-saving' : '';
  st.innerHTML = `<span class="${k}">${escapeHtml(text)}</span>`;
}
function _densLockRow(tr) {
  tr.querySelectorAll('input').forEach(i => { i.readOnly = true; i.classList.add('dens-locked'); });
}
// Valide une ligne ; renvoie { ok, msg } ou { ok:true, payload }.
function _densValidate(tr) {
  const c = _densResolve(tr.querySelector('.dens-cuve').value);
  if (!c || c === '__ambig__') return { ok: false, msg: 'cuve ?' };
  const dRaw = tr.querySelector('.dens-d').value;
  const dens = dRaw === '' ? null : parseFloat(dRaw.replace(',', '.'));
  if (dens == null || !Number.isFinite(dens)) return { ok: false, msg: 'densité ?' };
  if (dens < 0.9 || dens > 1.2)               return { ok: false, msg: 'hors plage' };
  const tRaw = tr.querySelector('.dens-t').value;
  const temp = tRaw === '' ? null : parseFloat(tRaw.replace(',', '.'));
  if (temp != null && (!Number.isFinite(temp) || temp < -5 || temp > 50)) return { ok: false, msg: 'T° ?' };
  const lp = getPrincipalLot(c);
  const payload = {
    date_analyse: document.getElementById('dens-date')?.value || new Date().toISOString().slice(0, 10),
    contenant_id: c.id, lot_id: lp ? lp.id : null, densite: dens,
  };
  if (temp != null) payload.temperature = temp;
  return { ok: true, payload };
}
function _densUpdateSaveBtn() {
  const trs = Array.from(document.querySelectorAll('#dens-rows tr'));
  const pending = trs.filter(tr => !tr._saved && _densRowFilled(tr)).length;
  const btn = document.getElementById('dens-save-btn');
  if (btn) btn.textContent = pending ? `💾 Enregistrer (${pending})` : '💾 Enregistrer';
  const cnt = document.getElementById('dens-count');
  if (cnt) cnt.textContent = _densSaved > 0
    ? `${_densSaved} enregistré${_densSaved > 1 ? 's' : ''}${pending ? ` · ${pending} en attente` : ''}`
    : (pending ? `${pending} ligne${pending > 1 ? 's' : ''} à enregistrer` : '');
}

// Enregistre EN BLOC toutes les lignes pleines non encore sauvées. Si tout
// passe → ferme. Sinon → reste ouvert, lignes fautives en rouge à corriger.
async function _densSaveAll() {
  const todo = Array.from(document.querySelectorAll('#dens-rows tr'))
    .filter(tr => !tr._saved && _densRowFilled(tr));
  if (!todo.length) { toast('Aucune saisie à enregistrer', 'info'); return; }
  // 1) Validation préalable de toutes les lignes (on n'écrit rien tant qu'il reste une erreur).
  let firstBad = null;
  todo.forEach(tr => {
    const v = _densValidate(tr);
    if (!v.ok) { _densMark(tr, v.msg, 'warn'); if (!firstBad) firstBad = tr; }
    else _densMark(tr, '', '');
  });
  if (firstBad) {
    toast('Corrige les lignes signalées en rouge avant d\'enregistrer', 'error');
    firstBad.querySelector('.dens-cuve').focus();
    return;
  }
  // 2) Insertion.
  const btn = document.getElementById('dens-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }
  let ok = 0, fail = 0;
  for (const tr of todo) {
    const v = _densValidate(tr);
    _densMark(tr, '…', 'saving');
    try {
      await WB3DB.insertRow('analyses', v.payload);
      tr._saved = true; ok++;
      _densLockRow(tr); _densMark(tr, '✓', 'done');
    } catch (e) {
      fail++;
      const msg = (e && e.message) || String(e);
      _densMark(tr, /temperature/i.test(msg) && /column/i.test(msg) ? 'mig 049 ?' : 'erreur', 'warn');
      console.warn('[WB3 saisie densités]', e);
    }
  }
  _densSaved += ok;
  if (btn) btn.disabled = false;
  _densUpdateSaveBtn();
  if (fail === 0) { toast(`${ok} relevé${ok > 1 ? 's' : ''} enregistré${ok > 1 ? 's' : ''}`, 'success'); closeDensiteTour(true); }
  else { toast(`${ok} enregistré(s), ${fail} en erreur — corrige et réessaie`, 'error'); }
}
