/* params-echantillons.js — Paramètres : section Échantillons (étiquettes + listes) */
'use strict';

let _echPrefsCache = {};
let _echClients = [], _echCourtiers = [];
function _echEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
const _ECH_AVERY = [
  ['L7159','24 / page — 63,5 × 33,9 mm (L7159/3422)'],
  ['L7160','21 / page — 63,5 × 38,1 mm (L7160/3652)'],
  ['L7163','14 / page — 99,1 × 38,1 mm (L7163/3653)'],
  ['L7165','8 / page — 99,1 × 67,7 mm (L7165/3655)'],
  ['L7168','4 / page — 99,1 × 139 mm (L7168)'],
  ['custom','✏️ Trame personnalisée (je règle moi-même)'],
];
const _ECH_TRAME_DEFAUT = { cols:3, rows:8, w:63.5, h:37, padX:7, padY:0, gapX:2.5, gapY:0 };

const _ECH_AVERY_DIM = {
  L7159:{w:63.5,h:33.9}, L7160:{w:63.5,h:38.1}, L7163:{w:99.1,h:38.1},
  L7165:{w:99.1,h:67.7}, L7168:{w:99.1,h:139},
};
const _LBL_BLOCKS = [
  { k:'logo',     name:'Logo',          type:'image' },
  { k:'qr',       name:'QR code',       type:'image' },
  { k:'vin',      name:'Nom du vin',    type:'text' },
  { k:'millesime',name:'Millésime',     type:'text' },
  { k:'lot',      name:'Lot',           type:'text' },
  { k:'degre',    name:'Degré (% vol)', type:'text' },
  { k:'cuve',     name:'Cuve / source', type:'text' },
  { k:'vol',      name:'Volume',        type:'text' },
  { k:'client',   name:'Client',        type:'text' },
  { k:'numero',   name:'N° échantillon',type:'text' },
  { k:'date',     name:'Date',          type:'text' },
  { k:'tel',      name:'Coordonnées',   type:'text' },
];
const _LBL_BLOCK_NAME = Object.fromEntries(_LBL_BLOCKS.map(b => [b.k, b.name]));
const _LBL_BLOCK_TYPE = Object.fromEntries(_LBL_BLOCKS.map(b => [b.k, b.type]));

function _lblDefaultLayout(){
  return { blocks: {
    logo:     { x:2,  y:8,  w:22, h:84, align:'center' },
    vin:      { x:27, y:5,  w:54, h:15, fs:15,  align:'left', bold:true, prefix:'' },
    qr:       { x:83, y:5,  w:15, h:24 },
    millesime:{ x:27, y:22, w:71, h:9,  fs:8,   align:'left', prefix:'Millésime : ' },
    lot:      { x:27, y:32, w:71, h:9,  fs:8,   align:'left', prefix:'Lot : ' },
    degre:    { x:27, y:42, w:71, h:9,  fs:8,   align:'left', prefix:'Degré : ' },
    cuve:     { x:27, y:52, w:71, h:9,  fs:8,   align:'left', prefix:'Cuve : ' },
    vol:      { x:27, y:62, w:71, h:9,  fs:8,   align:'left', prefix:'Vol : ' },
    client:   { x:27, y:72, w:71, h:9,  fs:8,   align:'left', prefix:'Client : ' },
    numero:   { x:27, y:82, w:36, h:8,  fs:7.5, align:'left', bold:true, prefix:'' },
    date:     { x:64, y:82, w:34, h:8,  fs:7.5, align:'left', prefix:'' },
    tel:      { x:27, y:91, w:71, h:7,  fs:6.5, align:'left', prefix:'' },
  }};
}
function _lblFieldChecked(k){
  const cb = document.querySelector('.ech-field[data-k="' + k + '"]');
  if (cb) return cb.checked;
  const f = _echPrefsCache.fields;
  return !f || f[k] !== false;
}
function _lblBlockShown(k){
  if (!_lblEdit.layout.blocks[k]) return false;
  return _lblFieldChecked(k);
}
function _lblRectsOverlap(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function _lblOverlapsOther(k, rect){
  for (const [ok] of Object.entries(_lblEdit.layout.blocks)) {
    if (ok === k || !_lblBlockShown(ok)) continue;
    if (_lblRectsOverlap(rect, _lblEdit.layout.blocks[ok])) return true;
  }
  return false;
}
const _LBL_SAMPLE = {
  vin:'Niellucio Rosé', millesime:'2025', lot:'12', degre:'13,5 % vol',
  cuve:'Cuve 12', vol:'2×0,75 L', client:'Dupont SARL', numero:'E25-0042', date:'15/09/2025',
};
function _lblSampleVal(k){
  if (k === 'tel') return (_echPrefsCache.tel || 'Caves Richemer · 04 67 00 00 00');
  return _LBL_SAMPLE[k] != null ? _LBL_SAMPLE[k] : '';
}

let _lblEdit = null;

function _lblEditorDims(){
  const sel = document.getElementById('ech-avery')?.value;
  if (sel === 'custom') {
    const g = id => Number(document.getElementById(id)?.value) || 0;
    return { w: g('tr-w') || 63.5, h: g('tr-h') || 37 };
  }
  return _ECH_AVERY_DIM[sel] || _ECH_AVERY_DIM.L7159;
}
function _lblNormalizeLayout(saved){
  const def = _lblDefaultLayout();
  const out = { blocks: {} };
  _LBL_BLOCKS.forEach(({k}) => {
    out.blocks[k] = { ...def.blocks[k], ...((saved && saved.blocks && saved.blocks[k]) || {}) };
  });
  return out;
}

function openLabelEditor(){
  const dims = _lblEditorDims();
  const layout = _lblNormalizeLayout(_echPrefsCache.layout);
  const scale = Math.min(480 / dims.w, 360 / dims.h);
  _lblEdit = { layout, dims, scale, sel: 'vin', drag: null };

  const ov = document.createElement('div');
  ov.id = 'lbl-editor-modal';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px';
  ov.innerHTML = `
    <div style="background:var(--color-bg-elevated);border-radius:var(--radius-lg);max-width:920px;width:100%;max-height:94vh;overflow:auto;padding:18px 20px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <h3 style="margin:0;flex:1">✏️ Éditeur d'étiquette</h3>
        <button class="btn btn--ghost btn--sm" onclick="_lblEditReset()">↺ Réinitialiser</button>
        <button class="btn btn--ghost btn--sm" onclick="_lblEditClearLayout()" title="Revenir à la disposition automatique">Disposition auto</button>
        <button class="btn btn--secondary btn--sm" onclick="closeLabelEditor()">Annuler</button>
        <button class="btn btn--primary btn--sm" onclick="_lblEditSave()">💾 Enregistrer</button>
      </div>
      <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:0 0 12px">
        Glisse un bloc pour le déplacer, tire le coin ◢ pour le redimensionner. Clique un bloc pour régler
        sa police, son alignement et son texte à droite. Aperçu avec des données d'exemple.</p>
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
        <div>
          <div id="lbl-canvas" style="position:relative;background:#fff;border:1px solid #999;box-shadow:0 1px 6px rgba(0,0,0,.12);user-select:none;touch-action:none"></div>
          <div class="t-footnote" style="color:var(--color-ink-tertiary);margin-top:6px">Étiquette ${dims.w} × ${dims.h} mm · échelle d'aperçu</div>
          <div id="lbl-warn" style="margin-top:8px"></div>
          <div id="lbl-hidden" style="margin-top:10px"></div>
        </div>
        <div id="lbl-props" style="flex:1;min-width:240px"></div>
      </div>
    </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('pointerdown', e => { if (e.target === ov) closeLabelEditor(); });
  _lblEditRender();
}
function closeLabelEditor(){ document.getElementById('lbl-editor-modal')?.remove(); _lblEdit = null; }

function _lblEditBlockInner(k){
  if (k === 'logo') return _echPrefsCache.logo
    ? `<img src="${_echPrefsCache.logo}" style="max-width:100%;max-height:100%;object-fit:contain;pointer-events:none">`
    : `<span style="color:#aaa;pointer-events:none">LOGO</span>`;
  if (k === 'qr') return `<div style="width:100%;height:100%;background:repeating-linear-gradient(45deg,#d8d8d8,#d8d8d8 2px,#fff 2px,#fff 4px);display:flex;align-items:center;justify-content:center;color:#777;font-size:9px;pointer-events:none">QR</div>`;
  const b = _lblEdit.layout.blocks[k];
  const prefix = (b.prefix != null) ? b.prefix : '';
  return `<span style="pointer-events:none">${_echEsc(prefix)}${_echEsc(_lblSampleVal(k))}</span>`;
}

function _lblEditRender(){
  const cv = document.getElementById('lbl-canvas');
  if (!cv || !_lblEdit) return;
  const { dims, scale, layout, sel } = _lblEdit;
  cv.style.width  = (dims.w * scale).toFixed(0) + 'px';
  cv.style.height = (dims.h * scale).toFixed(0) + 'px';
  let html = '';
  let nOverlap = 0;
  _LBL_BLOCKS.forEach(({k, type}) => {
    const b = layout.blocks[k];
    if (!_lblBlockShown(k)) return;
    const selected = (k === sel);
    const overlapping = _lblOverlapsOther(k, { x:b.x, y:b.y, w:b.w, h:b.h });
    if (overlapping) nOverlap++;
    const fontPx = type === 'text' ? (dims.h * (Number(b.fs) || 10) / 100 * scale).toFixed(1) + 'px' : '';
    const border = overlapping ? '2px solid #d32f2f' : (selected ? '1px solid var(--color-primary,#6a1b2a)' : '1px dashed #bbb');
    const css = `position:absolute;left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;`
      + `box-sizing:border-box;overflow:hidden;cursor:move;border:${border};`
      + `background:${overlapping ? 'rgba(211,47,47,.08)' : (selected ? 'rgba(106,27,42,.06)' : 'transparent')};`
      + (type === 'text' ? `font-size:${fontPx};font-weight:${b.bold?'700':'400'};text-align:${b.align||'left'};line-height:1.08;${k==='numero'?'font-family:monospace;':''}white-space:${b.nowrap?'nowrap':'normal'};word-break:break-word;` : `display:flex;align-items:center;justify-content:center;`);
    html += `<div class="fbE" data-k="${k}" style="${css}">${_lblEditBlockInner(k)}`
      + `<span class="fbE-handle" data-k="${k}" style="position:absolute;right:0;bottom:0;width:12px;height:12px;cursor:nwse-resize;background:${selected?'var(--color-primary,#6a1b2a)':'#bbb'};border-radius:2px 0 0 0"></span>`
      + `</div>`;
  });
  _lblEdit._nOverlap = nOverlap;
  cv.innerHTML = html;
  cv.querySelectorAll('.fbE').forEach(el => el.addEventListener('pointerdown', _lblEditPointerDown));
  cv.querySelectorAll('.fbE-handle').forEach(el => el.addEventListener('pointerdown', _lblEditHandleDown));
  const warn = document.getElementById('lbl-warn');
  if (warn) warn.innerHTML = nOverlap
    ? `<div style="background:#fdecea;color:#c62828;border:1px solid #f5c6cb;border-radius:6px;padding:6px 10px;font-size:var(--text-caption);font-weight:600">⚠️ ${nOverlap} bloc(s) en chevauchement (bordure rouge) — déplace-les ou clique « ↺ Réinitialiser ».</div>`
    : '';
  _lblEditRenderProps();
  _lblEditRenderHidden();
}

function _lblEditRenderHidden(){
  const host = document.getElementById('lbl-hidden');
  if (!host) return;
  const hidden = _LBL_BLOCKS.filter(({k}) => !_lblFieldChecked(k));
  host.innerHTML = hidden.length
    ? `<div class="t-footnote" style="color:var(--color-ink-tertiary);margin-bottom:4px">Blocs masqués (clique pour réafficher) :</div>`
      + hidden.map(({k,name}) => `<button class="btn btn--ghost btn--sm" style="margin:2px" onclick="_lblEditShow('${k}')">+ ${_echEsc(name)}</button>`).join('')
    : '';
}

function _lblEditRenderProps(){
  const host = document.getElementById('lbl-props');
  if (!host || !_lblEdit) return;
  const k = _lblEdit.sel;
  const b = _lblEdit.layout.blocks[k];
  if (!b) { host.innerHTML = '<p class="t-footnote">Sélectionne un bloc.</p>'; return; }
  const type = _LBL_BLOCK_TYPE[k];
  const numF = (lbl, prop, step) =>
    `<label style="display:flex;flex-direction:column;gap:3px;font-size:var(--text-caption);font-weight:600">${lbl}
       <input type="number" step="${step||1}" value="${Number(b[prop])||0}" oninput="_lblEditSetProp('${prop}',this.value)"
         style="width:80px;padding:6px 8px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit"></label>`;
  const alignBtn = (v, lbl) =>
    `<button class="btn btn--sm ${ (b.align||'left')===v ? 'btn--primary':'btn--secondary'}" onclick="_lblEditSetProp('align','${v}')">${lbl}</button>`;
  host.innerHTML = `
    <div style="border:1px solid var(--color-border);border-radius:var(--radius-md);padding:14px">
      <div style="font-weight:700;margin-bottom:10px">${_echEsc(_LBL_BLOCK_NAME[k])}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
        ${numF('X (%)','x')} ${numF('Y (%)','y')} ${numF('Largeur (%)','w')} ${numF('Hauteur (%)','h')}
      </div>
      ${type === 'text' ? `
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
        ${numF('Police (% haut.)','fs','0.5')}
        <div style="display:flex;flex-direction:column;gap:3px;font-size:var(--text-caption);font-weight:600">Alignement
          <div style="display:flex;gap:4px">${alignBtn('left','⬅')}${alignBtn('center','⬌')}${alignBtn('right','➡')}</div></div>
        <label class="toggle" style="display:flex;align-items:center;gap:6px;font-size:var(--text-caption);font-weight:600">
          <input type="checkbox" ${b.bold?'checked':''} onchange="_lblEditSetProp('bold',this.checked)"> Gras</label>
        <label class="toggle" style="display:flex;align-items:center;gap:6px;font-size:var(--text-caption);font-weight:600">
          <input type="checkbox" ${b.nowrap?'checked':''} onchange="_lblEditSetProp('nowrap',this.checked)"> 1 ligne</label>
      </div>
      <label style="display:flex;flex-direction:column;gap:3px;font-size:var(--text-caption);font-weight:600;margin-bottom:10px">Préfixe (texte avant la valeur)
        <input type="text" value="${_echEsc(b.prefix||'')}" oninput="_lblEditSetProp('prefix',this.value)"
          style="padding:7px 9px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit"></label>
      ` : `<p class="t-footnote" style="color:var(--color-ink-tertiary);margin:0 0 10px">Image — ajuste la position et la taille. (Logo/QR se règlent dans les sections dédiées.)</p>`}
      <button class="btn btn--secondary btn--sm" onclick="_lblEditHide('${k}')">🚫 Masquer ce bloc</button>
    </div>`;
}

function _lblEditSetProp(prop, val){
  const b = _lblEdit.layout.blocks[_lblEdit.sel];
  if (!b) return;
  if (prop === 'bold' || prop === 'nowrap') { b[prop] = !!val; }
  else if (prop === 'align' || prop === 'prefix') { b[prop] = val; }
  else if (prop === 'fs') { b.fs = Math.max(1, Number(String(val).replace(',', '.')) || 0); }
  else {
    const n = Math.max(0, Math.min(100, Number(String(val).replace(',', '.')) || 0));
    const cand = { x:b.x, y:b.y, w:b.w, h:b.h }; cand[prop] = n;
    cand.w = Math.min(cand.w, 100 - cand.x); cand.h = Math.min(cand.h, 100 - cand.y);
    if (_lblOverlapsOther(_lblEdit.sel, cand)) { toast('Chevauchement refusé : ce bloc toucherait un autre bloc.', 'info'); _lblEditRender(); return; }
    b[prop] = n;
  }
  _lblEditRender();
}
function _lblEditSetField(k, on){
  const cb = document.querySelector('.ech-field[data-k="' + k + '"]');
  if (cb) cb.checked = on;
  if (!_echPrefsCache.fields) _echPrefsCache.fields = {};
  _echPrefsCache.fields[k] = on;
  if (k === 'qr') _echPrefsCache.qr = on;
}
function _lblEditShow(k){ _lblEditSetField(k, true);  _lblEdit.sel = k; _lblEditRender(); }
function _lblEditHide(k){ _lblEditSetField(k, false); _lblEditRender(); }

function _lblEditPointerDown(e){
  if (e.target.classList.contains('fbE-handle')) return;
  e.preventDefault();
  const k = e.currentTarget.dataset.k;
  _lblEdit.sel = k;
  const cv = document.getElementById('lbl-canvas');
  const rect = cv.getBoundingClientRect();
  const b = _lblEdit.layout.blocks[k];
  _lblEdit.drag = { mode:'move', k, rect, startX:e.clientX, startY:e.clientY, bx:b.x, by:b.y };
  document.addEventListener('pointermove', _lblEditPointerMove);
  document.addEventListener('pointerup', _lblEditPointerUp);
  _lblEditRender();
}
function _lblEditHandleDown(e){
  e.preventDefault(); e.stopPropagation();
  const k = e.currentTarget.dataset.k;
  _lblEdit.sel = k;
  const cv = document.getElementById('lbl-canvas');
  const rect = cv.getBoundingClientRect();
  const b = _lblEdit.layout.blocks[k];
  _lblEdit.drag = { mode:'resize', k, rect, startX:e.clientX, startY:e.clientY, bw:b.w, bh:b.h };
  document.addEventListener('pointermove', _lblEditPointerMove);
  document.addEventListener('pointerup', _lblEditPointerUp);
}
function _lblEditPointerMove(e){
  const d = _lblEdit?.drag; if (!d) return;
  const dxPct = (e.clientX - d.startX) / d.rect.width  * 100;
  const dyPct = (e.clientY - d.startY) / d.rect.height * 100;
  const b = _lblEdit.layout.blocks[d.k];
  const r = v => Math.round(v * 10) / 10;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  if (d.mode === 'move') {
    const nx = r(clamp(d.bx + dxPct, 0, 100 - b.w));
    const ny = r(clamp(d.by + dyPct, 0, 100 - b.h));
    if      (!_lblOverlapsOther(d.k, { x:nx, y:ny, w:b.w, h:b.h })) { b.x = nx; b.y = ny; }
    else if (!_lblOverlapsOther(d.k, { x:nx, y:b.y, w:b.w, h:b.h })) { b.x = nx; }
    else if (!_lblOverlapsOther(d.k, { x:b.x, y:ny, w:b.w, h:b.h })) { b.y = ny; }
  } else {
    const nw = r(clamp(d.bw + dxPct, 4, 100 - b.x));
    const nh = r(clamp(d.bh + dyPct, 4, 100 - b.y));
    if      (!_lblOverlapsOther(d.k, { x:b.x, y:b.y, w:nw, h:nh })) { b.w = nw; b.h = nh; }
    else if (!_lblOverlapsOther(d.k, { x:b.x, y:b.y, w:nw, h:b.h })) { b.w = nw; }
    else if (!_lblOverlapsOther(d.k, { x:b.x, y:b.y, w:b.w, h:nh })) { b.h = nh; }
  }
  const el = document.querySelector(`.fbE[data-k="${d.k}"]`);
  if (el) { el.style.left = b.x + '%'; el.style.top = b.y + '%'; el.style.width = b.w + '%'; el.style.height = b.h + '%'; }
}
function _lblEditPointerUp(){
  document.removeEventListener('pointermove', _lblEditPointerMove);
  document.removeEventListener('pointerup', _lblEditPointerUp);
  if (_lblEdit) { _lblEdit.drag = null; _lblEditRender(); }
}

function _lblEditReset(){ if (_lblEdit) { _lblEdit.layout = _lblDefaultLayout(); _lblEditRender(); } }
async function _lblEditClearLayout(){
  const p = _echCollectPrefs();
  delete p.layout;
  await _lblPersistPrefs(p, 'Disposition automatique rétablie');
  closeLabelEditor();
}
async function _lblEditSave(){
  const p = _echCollectPrefs();
  p.layout = _lblEdit.layout;
  await _lblPersistPrefs(p, 'Disposition enregistrée — l\'impression suit maintenant l\'éditeur');
  closeLabelEditor();
}
async function _lblPersistPrefs(p, msg){
  try { await WB3DB.setUserPref('echantillon', p); _echPrefsCache = { ...p }; toast(msg, 'success'); }
  catch(e){ toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message||e)), 'error'); }
}

const _ECH_FIELDS = [
  ['logo','Logo de la cave'], ['qr','QR code'], ['vin','Nom du vin'],
  ['millesime','Millésime'], ['lot','Lot'], ['degre','Degré (% vol)'],
  ['cuve','Cuve / source'], ['vol','Volume'], ['client','Client'],
  ['numero','Numéro échantillon'], ['date','Date'], ['tel','Coordonnées (bas)'],
];
function _echFieldsEditorHTML(p){
  const f = p.fields || {};
  const on = k => (k === 'qr' ? p.qr !== false : f[k] !== false);
  const logoW = Number(p.logoW) || 20;
  const box = ([k,lbl]) =>
    `<label class="toggle" style="display:flex;align-items:center;gap:8px;padding:5px 0;min-width:180px">
       <input type="checkbox" class="ech-field" data-k="${k}" ${on(k)?'checked':''}> ${lbl}</label>`;
  return `
    <div class="drawer-section"><div class="drawer-section-title">Contenu de l'étiquette</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:0 0 10px">
          Coche ce que tu veux voir sur l'étiquette. Décoche pour alléger. Les champs vides
          ne s'affichent jamais, même cochés.</p>
        <div style="display:flex;flex-wrap:wrap;gap:2px 20px">
          ${_ECH_FIELDS.map(box).join('')}
        </div>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-caption);font-weight:600;margin-top:14px;max-width:200px">
          Largeur du logo (mm)
          <input type="number" id="ech-logo-w" step="1" min="6" value="${logoW}"
            style="width:120px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
        </label>
      </div></div>`;
}

function _echTrameEditorHTML(p){
  const t = { ..._ECH_TRAME_DEFAUT, ...(p.customTrame || {}) };
  const show = (p.avery === 'custom');
  const f = (id, lbl, val, step) =>
    `<label style="display:flex;flex-direction:column;gap:3px;font-size:var(--text-caption);font-weight:600">
       ${lbl}
       <input type="number" id="${id}" value="${Number(val)}" step="${step||'0.1'}" min="0" oninput="_echTrameCompute()"
         style="width:100px;padding:7px 9px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
     </label>`;
  return `
    <div id="ech-trame-editor" style="margin-top:var(--space-4);padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-bg-subtle,#f7f7f7);display:${show?'block':'none'}">
      <div style="font-weight:700;margin-bottom:4px">✏️ Trame personnalisée</div>
      <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:0 0 12px">
        Mesure ta planche à la règle. Nombre d'étiquettes en hauteur (lignes) et en largeur (colonnes),
        taille d'<b>une</b> étiquette, marges depuis le bord de la feuille et espaces entre étiquettes.
      </p>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        ${f('tr-cols','Colonnes (largeur)', t.cols, '1')}
        ${f('tr-rows','Lignes (hauteur)',   t.rows, '1')}
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px">
        ${f('tr-w','Largeur étiquette (mm)', t.w)}
        ${f('tr-h','Hauteur étiquette (mm)', t.h)}
      </div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px">
        ${f('tr-padx','Marge gauche (mm)', t.padX)}
        ${f('tr-pady','Marge haut (mm)',  t.padY)}
        ${f('tr-gapx','Espace H entre étiq. (mm)', t.gapX)}
        ${f('tr-gapy','Espace V entre étiq. (mm)', t.gapY)}
      </div>
      <div id="ech-trame-calc" class="t-footnote" style="color:var(--color-ink-secondary);margin-top:12px;font-weight:600"></div>
    </div>`;
}
function _echToggleTrame(){
  const sel = document.getElementById('ech-avery');
  const ed  = document.getElementById('ech-trame-editor');
  if (!sel || !ed) return;
  ed.style.display = (sel.value === 'custom') ? 'block' : 'none';
  if (sel.value === 'custom') _echTrameCompute();
}
function _echTrameCompute(){
  const g = id => Number(document.getElementById(id)?.value) || 0;
  const cols = g('tr-cols'), rows = g('tr-rows');
  const w = g('tr-w'), h = g('tr-h');
  const padX = g('tr-padx'), padY = g('tr-pady'), gapX = g('tr-gapx'), gapY = g('tr-gapy');
  const totalW = padX + cols * w + Math.max(0, cols - 1) * gapX;
  const totalH = padY + rows * h + Math.max(0, rows - 1) * gapY;
  const out = document.getElementById('ech-trame-calc');
  if (!out) return;
  const warnW = totalW > 210 ? ' ⚠️ dépasse 210 mm (largeur A4)' : '';
  const warnH = totalH > 297 ? ' ⚠️ dépasse 297 mm (hauteur A4)' : '';
  out.innerHTML = `${cols * rows} étiquettes / page · occupe ${totalW.toFixed(1)} × ${totalH.toFixed(1)} mm`
    + `<span style="color:var(--color-danger)">${warnW}${warnH}</span>`;
}

async function renderEchantillonsSettings(){
  const root = document.getElementById('settings-content');
  root.innerHTML = `<div class="loading-state"><div class="spinner"></div>Chargement…</div>`;
  let p = {};
  try { p = (await WB3DB.getUserPref('echantillon')) || {}; } catch(_){}
  _echPrefsCache = { ...p };
  try { [_echClients, _echCourtiers] = await Promise.all([WB3DB.listEchantillonClients('client'), WB3DB.listEchantillonClients('courtier')]); }
  catch(_){ _echClients = []; _echCourtiers = []; }
  const cur = p.avery || 'L7159';
  root.innerHTML = `
    <h2>🍾 Échantillons</h2>
    <div style="display:flex;gap:6px;border-bottom:1px solid var(--color-border);margin-bottom:var(--space-4)">
      <button class="btn btn--sm btn--primary ech-subtab-btn" data-st="etiquette" onclick="_echSubtab('etiquette')">🏷 Étiquettes</button>
      <button class="btn btn--sm btn--ghost ech-subtab-btn" data-st="clients" onclick="_echSubtab('clients')">👥 Clients &amp; courtiers</button>
    </div>

    <div id="ech-st-etiquette">
    <p class="lead">Réglages des étiquettes imprimées depuis le module Échantillons. Synchronisé entre tes appareils.</p>

    <div class="drawer-section"><div class="drawer-section-title">Coordonnées (haut d'étiquette)</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <input type="text" id="ech-tel" value="${_echEsc(p.tel||'')}" placeholder="ex. Caves Richemer · 04 67 …"
          style="width:100%;max-width:400px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
      </div></div>

    <div class="drawer-section"><div class="drawer-section-title">Logo de la cave</div>
      <div class="drawer-section-content" style="padding:var(--space-4);display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div id="ech-logo-prev" style="width:96px;height:54px;border:1px dashed var(--color-border);border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden">
          ${p.logo?`<img src="${p.logo}" style="max-width:100%;max-height:100%">`:'<span class="t-footnote" style="color:var(--color-ink-tertiary)">aucun</span>'}
        </div>
        <div>
          <input type="file" id="ech-logo-file" accept="image/*" onchange="_echLogoPick(event)">
          <button class="btn btn--secondary btn--sm" type="button" onclick="_echLogoClear()" style="margin-left:8px">Retirer</button>
          <div class="t-footnote" style="color:var(--color-ink-tertiary);margin-top:6px">PNG/JPG ; réduit automatiquement pour l'impression.</div>
        </div>
      </div></div>

    ${_echFieldsEditorHTML(p)}

    <div class="drawer-section"><div class="drawer-section-title">Disposition de l'étiquette</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:0 0 10px">
          ${p.layout && p.layout.blocks
            ? '✅ Une disposition personnalisée est active : elle pilote l\'impression (déplacement libre des blocs).'
            : 'Disposition automatique. Ouvre l\'éditeur pour placer logo, textes et QR exactement où tu veux.'}
        </p>
        <button class="btn btn--primary btn--sm" type="button" onclick="openLabelEditor()">✏️ Ouvrir l'éditeur d'étiquette</button>
        <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:10px 0 0">
          Astuce : choisis d'abord le bon modèle / la bonne trame ci-dessous (les dimensions de
          l'étiquette servent de cadre à l'éditeur).</p>
      </div></div>

    <div class="drawer-section"><div class="drawer-section-title">Modèle d'étiquettes Avery</div>
      <div class="drawer-section-content" style="padding:var(--space-4)">
        <select id="ech-avery" onchange="_echToggleTrame()" style="max-width:400px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
          ${_ECH_AVERY.map(([k,l])=>`<option value="${k}" ${cur===k?'selected':''}>${l}</option>`).join('')}
        </select>
        <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:8px 0 0">À l'impression : régler les marges sur « aucune » et l'échelle sur 100 % pour un alignement correct.</p>

        ${_echTrameEditorHTML(p)}

        <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--color-border-subtle,#eee)">
          <div style="font-weight:600;font-size:var(--text-callout);margin-bottom:4px">Calibrage fin (mm)</div>
          <p class="t-footnote" style="color:var(--color-ink-tertiary);margin:0 0 10px">
            Si l'impression test est décalée sur ta planche, ajuste ici puis ré-imprime.
            <b>Vertical négatif = remonte</b> · horizontal négatif = vers la gauche.
            Ex. : tout remonter de 1 cm → Vertical <b>−10</b>.
          </p>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-caption);font-weight:600">
              Vertical (↓ bas)
              <input type="number" id="ech-offset-y" step="0.5" value="${Number(p.offsetY)||0}"
                style="width:120px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
            </label>
            <label style="display:flex;flex-direction:column;gap:4px;font-size:var(--text-caption);font-weight:600">
              Horizontal (→ droite)
              <input type="number" id="ech-offset-x" step="0.5" value="${Number(p.offsetX)||0}"
                style="width:120px;padding:8px 10px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit">
            </label>
          </div>
        </div>
      </div></div>

    <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:var(--space-3);border-top:1px solid var(--color-border)">
      <button class="btn" onclick="saveEchantillonsSettings()">💾 Enregistrer</button>
    </div>
    </div><!-- /ech-st-etiquette -->

    <div id="ech-st-clients" style="display:none">
    <p class="lead">Gère ici les clients et courtiers proposés à la saisie d'un échantillon (plus de saisie libre : on choisit dans la liste).</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-4)">
      <div class="drawer-section"><div class="drawer-section-title">👤 Clients</div>
        <div class="drawer-section-content" style="padding:var(--space-4)">
          <div style="display:flex;gap:6px;margin-bottom:var(--space-3)">
            <input type="text" id="ech-add-client" placeholder="Nouveau client" style="flex:1;padding:7px 9px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit"
              onkeydown="if(event.key==='Enter')echAddPartner('client')">
            <button class="btn btn--secondary btn--sm" onclick="echAddPartner('client')">+ Ajouter</button>
          </div>
          <div id="ech-list-client"></div>
        </div></div>
      <div class="drawer-section"><div class="drawer-section-title">🤝 Courtiers</div>
        <div class="drawer-section-content" style="padding:var(--space-4)">
          <div style="display:flex;gap:6px;margin-bottom:var(--space-3)">
            <input type="text" id="ech-add-courtier" placeholder="Nouveau courtier" style="flex:1;padding:7px 9px;border:1px solid var(--color-border);border-radius:var(--radius-md);font:inherit"
              onkeydown="if(event.key==='Enter')echAddPartner('courtier')">
            <button class="btn btn--secondary btn--sm" onclick="echAddPartner('courtier')">+ Ajouter</button>
          </div>
          <div id="ech-list-courtier"></div>
        </div></div>
    </div>
    </div><!-- /ech-st-clients -->`;
  _renderEchPartners();
}

function _echSubtab(which){
  const e = document.getElementById('ech-st-etiquette');
  const c = document.getElementById('ech-st-clients');
  if (e) e.style.display = which === 'etiquette' ? '' : 'none';
  if (c) c.style.display = which === 'clients'   ? '' : 'none';
  document.querySelectorAll('.ech-subtab-btn').forEach(b => {
    const on = b.dataset.st === which;
    b.classList.toggle('btn--primary', on);
    b.classList.toggle('btn--ghost', !on);
  });
}

function _echPartnerRows(arr, role){
  if (!arr.length) return '<div class="t-footnote" style="color:var(--color-ink-tertiary)">Aucun pour l\'instant.</div>';
  return arr.map(c => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--color-border)">
      <span style="flex:1">${_echEsc(c.nom)}</span>
      <button class="btn btn--ghost btn--sm" title="Renommer" onclick="echRenamePartner('${c.id}','${role}')">✏️</button>
      <button class="btn btn--ghost btn--sm" title="Supprimer" onclick="echDeletePartner('${c.id}','${role}')">🗑</button>
    </div>`).join('');
}
function _renderEchPartners(){
  const c1 = document.getElementById('ech-list-client'); if (c1) c1.innerHTML = _echPartnerRows(_echClients, 'client');
  const c2 = document.getElementById('ech-list-courtier'); if (c2) c2.innerHTML = _echPartnerRows(_echCourtiers, 'courtier');
}
async function _echReloadPartners(){
  try { [_echClients, _echCourtiers] = await Promise.all([WB3DB.listEchantillonClients('client'), WB3DB.listEchantillonClients('courtier')]); } catch(_){}
  _renderEchPartners();
}
async function echAddPartner(role){
  const inp = document.getElementById(role === 'courtier' ? 'ech-add-courtier' : 'ech-add-client');
  const nom = (inp.value || '').trim(); if (!nom) return;
  try { await WB3DB.addEchantillonClient(nom, role); inp.value = ''; await _echReloadPartners(); }
  catch(e){ toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}
async function echRenamePartner(id, role){
  const arr = role === 'courtier' ? _echCourtiers : _echClients;
  const cur = arr.find(x => x.id === id); if (!cur) return;
  const nv = await WB3UI.prompt('Renommer « ' + cur.nom + ' » :', { value: cur.nom });
  if (nv == null) return;
  const clean = String(nv).trim(); if (!clean || clean === cur.nom) return;
  try { await WB3DB.renameEchantillonClient(id, cur.nom, clean, role); await _echReloadPartners(); toast('Renommé', 'success'); }
  catch(e){ toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}
async function echDeletePartner(id, role){
  const arr = role === 'courtier' ? _echCourtiers : _echClients;
  const cur = arr.find(x => x.id === id); if (!cur) return;
  if (!await WB3UI.confirm('Supprimer « ' + cur.nom + ' » de la liste ? (les échantillons existants gardent ce nom)', { title:'Supprimer', okText:'Supprimer', danger:true })) return;
  try { await WB3DB.deleteEchantillonClient(id); await _echReloadPartners(); }
  catch(e){ toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : e.message), 'error'); }
}

function _echLogoPick(ev){
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxW = 260, sc = Math.min(1, maxW / img.width);
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const url = cv.toDataURL('image/png');
      _echPrefsCache.logo = url;
      document.getElementById('ech-logo-prev').innerHTML = '<img src="' + url + '" style="max-width:100%;max-height:100%">';
    };
    img.src = rd.result;
  };
  rd.readAsDataURL(f);
}
function _echLogoClear(){
  _echPrefsCache.logo = null;
  const el = document.getElementById('ech-logo-prev');
  if (el) el.innerHTML = '<span class="t-footnote" style="color:var(--color-ink-tertiary)">aucun</span>';
}
function _echCollectPrefs(){
  const fields = {};
  document.querySelectorAll('.ech-field').forEach(cb => { fields[cb.dataset.k] = cb.checked; });
  const p = {
    ..._echPrefsCache,
    tel:   document.getElementById('ech-tel')?.value.trim() ?? (_echPrefsCache.tel || ''),
    qr:    fields.qr !== false,
    fields,
    logoW: Math.max(6, Number(document.getElementById('ech-logo-w')?.value) || 20),
    avery: document.getElementById('ech-avery')?.value || _echPrefsCache.avery || 'L7159',
    offsetY: Number(document.getElementById('ech-offset-y')?.value) || 0,
    offsetX: Number(document.getElementById('ech-offset-x')?.value) || 0,
  };
  if (document.getElementById('tr-cols')) {
    const g = id => Number(document.getElementById(id)?.value) || 0;
    p.customTrame = {
      cols: Math.max(1, Math.round(g('tr-cols'))),
      rows: Math.max(1, Math.round(g('tr-rows'))),
      w: g('tr-w'), h: g('tr-h'),
      padX: g('tr-padx'), padY: g('tr-pady'),
      gapX: g('tr-gapx'), gapY: g('tr-gapy'),
    };
  }
  return p;
}
async function saveEchantillonsSettings(){
  const p = _echCollectPrefs();
  try { await WB3DB.setUserPref('echantillon', p); _echPrefsCache = { ...p }; toast('Réglages enregistrés', 'success'); }
  catch(e){ toast('Échec : ' + (WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message||e)), 'error'); }
}
