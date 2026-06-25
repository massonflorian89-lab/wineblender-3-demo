/* ============================================================
 * wb3-import.js — Import xlsx générique (trame + aperçu + validation)
 * ------------------------------------------------------------
 * Fournit WB3Import.run(config) : une modale qui (1) télécharge une
 * trame .xlsx aux bons en-têtes, (2) lit le fichier rempli, (3) affiche
 * un aperçu ligne par ligne (✅ créer / ✏️ régulariser / ⚠️ erreur),
 * (4) importe après validation.
 * Dépendances : SheetJS (global XLSX, lib/xlsx.full.min.js) + toast().
 * ============================================================ */
(function (global) {
  'use strict';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _xlsx() { return global.XLSX; }

  // Génère et télécharge une trame .xlsx (en-têtes + lignes d'exemple).
  function downloadTemplate(filename, columns, exampleRows, sheetName) {
    const XLSX = _xlsx();
    if (!XLSX) { global.toast && global.toast('Bibliothèque Excel (xlsx) non chargée', 'error'); return; }
    const headers = columns.map(c => c.header);
    const aoa = [headers];
    (exampleRows || []).forEach(ex => aoa.push(columns.map(c => (ex[c.key] != null ? ex[c.key] : ''))));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = columns.map(c => ({ wch: Math.max(12, (c.header || '').length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Modèle').slice(0, 31));
    XLSX.writeFile(wb, filename || 'modele.xlsx');
  }

  // Lit un fichier xlsx → tableau de lignes { key: valeur } (mappées sur columns).
  async function parseFile(file, columns) {
    const XLSX = _xlsx();
    if (!XLSX) throw new Error('Bibliothèque Excel (xlsx) non chargée');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error('Feuille de calcul vide');
    const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
    const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
    const headerMap = {};
    columns.forEach(c => {
      headerMap[norm(c.header)] = c.key;
      (c.aliases || []).forEach(a => { headerMap[norm(a)] = c.key; });
    });
    return json.map(raw => {
      const row = {};
      Object.keys(raw).forEach(h => { const k = headerMap[norm(h)]; if (k) row[k] = raw[h]; });
      return row;
    }).filter(row => Object.values(row).some(v => String(v).trim() !== ''));
  }

  // Flux complet dans une modale.
  // config = {
  //   title, templateName, sheetName, instructions,
  //   columns: [{ key, header, example, aliases }],
  //   examples: [{ key: val, ... }],
  //   prepare(row) -> { status:'create'|'update'|'skip'|'error', label, msg, data },
  //   commit(validData[], onProgress) -> Promise<{ ok, fail, messages? }>,
  //   onDone()
  // }
  function run(config) {
    const ov = document.createElement('div');
    ov.className = 'wb3imp-modal';
    ov.innerHTML = `
      <div class="wb3imp-card">
        <div class="wb3imp-head">
          <h3>${esc(config.title || 'Import')}</h3>
          <button class="close-btn" data-act="close" aria-label="Fermer">×</button>
        </div>
        <div class="wb3imp-body">
          <ol class="wb3imp-steps">
            <li><b>Télécharge la trame</b>, remplis-la dans Excel (1 ligne = 1 entrée), enregistre.</li>
            <li><b>Choisis ton fichier</b> rempli → vérifie l'aperçu → <b>Importer</b>.</li>
          </ol>
          ${config.instructions ? `<p class="wb3imp-hint">${config.instructions}</p>` : ''}
          <div class="wb3imp-actions">
            <button class="btn btn--secondary btn--sm" data-act="template">⬇️ Télécharger la trame (.xlsx)</button>
            <label class="btn btn--secondary btn--sm" style="cursor:pointer;margin:0">📂 Choisir le fichier rempli
              <input type="file" accept=".xlsx,.xls" data-act="file" style="display:none"></label>
          </div>
          <div class="wb3imp-preview" data-role="preview"></div>
        </div>
        <div class="wb3imp-foot">
          <span data-role="summary"></span>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn--secondary" data-act="close">Fermer</button>
            <button class="btn btn--primary" data-act="import" disabled>Importer</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);

    const q = sel => ov.querySelector(sel);
    const preview = q('[data-role="preview"]');
    const summary = q('[data-role="summary"]');
    const importBtn = q('[data-act="import"]');
    let prepared = [];

    const close = () => ov.remove();
    ov.addEventListener('click', e => {
      if (e.target === ov) return; // pas de fermeture au clic extérieur
      const act = e.target.closest('[data-act]') && e.target.closest('[data-act]').dataset.act;
      if (act === 'close') close();
      else if (act === 'template') downloadTemplate(config.templateName || 'modele.xlsx', config.columns, config.examples, config.sheetName);
    });

    q('[data-act="file"]').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      preview.innerHTML = '<div style="padding:14px;text-align:center;color:var(--color-ink-tertiary)">Lecture…</div>';
      try {
        const rows = await parseFile(f, config.columns);
        prepared = rows.map(r => {
          try { return config.prepare(r) || { status: 'error', msg: 'ligne ignorée' }; }
          catch (err) { return { status: 'error', msg: err.message }; }
        });
        renderPreview();
      } catch (err) {
        preview.innerHTML = `<div style="color:#c62828;padding:12px">Lecture impossible : ${esc(err.message)}</div>`;
      }
    });

    function renderPreview() {
      const okN = prepared.filter(p => p.status === 'create' || p.status === 'update').length;
      const badN = prepared.filter(p => p.status === 'error').length;
      summary.textContent = `${prepared.length} ligne(s) lue(s) · ${okN} à importer${badN ? ` · ${badN} en erreur` : ''}`;
      importBtn.disabled = okN === 0;
      importBtn.textContent = `Importer (${okN})`;
      const badge = s => s === 'create' ? '<span style="color:#15803d;font-weight:600">✅ créer</span>'
        : s === 'update' ? '<span style="color:#1d4ed8;font-weight:600">✏️ régulariser</span>'
        : s === 'skip' ? '<span style="color:#888">— ignoré</span>'
        : '<span style="color:#c62828;font-weight:600">⚠️ erreur</span>';
      preview.innerHTML = `<table class="wb3imp-table"><thead><tr><th>#</th><th>Ligne</th><th>Action</th><th>Détail</th></tr></thead><tbody>${prepared.map((p, i) =>
        `<tr><td>${i + 1}</td><td>${esc(p.label || '')}</td><td>${badge(p.status)}</td><td style="color:${p.status === 'error' ? '#c62828' : 'var(--color-ink-tertiary)'}">${esc(p.msg || '')}</td></tr>`).join('')}</tbody></table>`;
    }

    importBtn.addEventListener('click', async () => {
      const valid = prepared.filter(p => p.status === 'create' || p.status === 'update').map(p => p.data);
      if (!valid.length) return;
      importBtn.disabled = true; importBtn.textContent = 'Import…';
      try {
        const res = await config.commit(valid, (done, total) => { importBtn.textContent = `Import… ${done}/${total}`; });
        if (global.toast) global.toast(`${res.ok} importé(s)${res.fail ? `, ${res.fail} en erreur` : ''}`, res.fail ? 'error' : 'success');
        if (config.onDone) { try { config.onDone(); } catch (_) {} }
        if (!res.fail) close();
        else { importBtn.disabled = false; importBtn.textContent = 'Réessayer'; if (res.messages && res.messages.length) summary.textContent = res.messages.slice(0, 3).join(' · '); }
      } catch (err) {
        importBtn.disabled = false; importBtn.textContent = 'Réessayer';
        if (global.toast) global.toast('Échec import : ' + (err.message || err), 'error');
      }
    });
  }

  (function injectCss() {
    if (document.getElementById('wb3imp-css')) return;
    const s = document.createElement('style'); s.id = 'wb3imp-css';
    s.textContent = `
      .wb3imp-modal{position:fixed;inset:0;z-index:2200;display:flex;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.45);padding:24px;overflow:auto}
      .wb3imp-card{background:var(--color-bg-elevated,#fff);color:var(--color-ink,#1a1a1a);border-radius:14px;width:min(780px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.35)}
      .wb3imp-head{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid var(--color-border,#e5e5e5)}
      .wb3imp-head h3{margin:0;flex:1;font-size:16px}
      .wb3imp-body{padding:14px 18px;overflow:auto}
      .wb3imp-steps{margin:0 0 10px;padding-left:20px;font-size:13px;color:var(--color-ink-secondary,#444);line-height:1.6}
      .wb3imp-hint{font-size:12.5px;color:var(--color-ink-tertiary,#777);margin:0 0 10px;line-height:1.5}
      .wb3imp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
      .wb3imp-preview{overflow:auto}
      .wb3imp-table{width:100%;border-collapse:collapse;font-size:12.5px}
      .wb3imp-table th{text-align:left;color:var(--color-ink-tertiary,#777);font-weight:600;padding:4px 8px;border-bottom:1px solid var(--color-border,#eee);position:sticky;top:0;background:var(--color-bg-elevated,#fff)}
      .wb3imp-table td{padding:4px 8px;border-bottom:1px solid var(--color-border-subtle,#f0f0f0);vertical-align:top}
      .wb3imp-foot{display:flex;align-items:center;gap:10px;padding:14px 18px;border-top:1px solid var(--color-border,#e5e5e5)}
      .wb3imp-foot [data-role=summary]{font-size:12.5px;color:var(--color-ink-secondary,#444)}
    `;
    document.head.appendChild(s);
  })();

  global.WB3Import = { run, downloadTemplate, parseFile };
})(window);
