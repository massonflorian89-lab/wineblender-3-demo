/* ============================================================
 * winescan.js — Parser WineScan mutualisé (atelier VitiScan + analyses.html)
 *
 * Format WineScan : CSV `;`, encodage Windows-1252, MULTI-BLOCS (une suite de
 * « Jobs », chacun avec son en-tête `Product;ID;…`). L'ID encode date + stade +
 * cuve (ex. 25_09_27_Vsec_B1-10). Aucune dépendance ; expose `window.WineScan`.
 *
 * API :
 *   WineScan.decodeCsv(arrayBuffer)           → texte (win-1252, repli utf-8)
 *   WineScan.parse(text)                       → { rows, remarks, excluded, paramCols }
 *   WineScan.derive(row, stades)               → { cuve, momentCode, moment, sample, date, heure, product }
 *   WineScan.deriveFromId(id, stades)          → { cuve, momentCode, moment, sampleType }
 *   WineScan.momentLabel(code, stades)         → libellé du stade
 *   WineScan.bestDate(row)                     → date JJ/MM/AAAA (gère série Excel)
 *   WineScan.toAnalyse(row, derived)           → payload table `analyses` VitiFlux
 *   WineScan.splitCsvLine / junkReason / normDate / excelSerialToDMY
 *   WineScan.PARAM_ORDER / META_COLS / CUVE_RE / MAP
 * ============================================================ */
(function (global) {
  'use strict';

  const PARAM_ORDER = ['D','TAV','AT','VA 111','pH','Malic','ALac','ATar','SO2 Actif','SO2 L','SO2 T',
    'SucTot','Sorbic','CO2','GF-5','GF+5','SR-5','SR+5','IPT','TSat','IC','A420','A520','A620','Degaz','Air'];
  const META_COLS = new Set(['Product','ID','Date','Heure','Description du lot','Remark','Type','SubType','Code']);
  const CUVE_RE = /^[A-Za-z]{1,3}\d+([-_.]\d+)?$/;

  function decodeCsv(buf){
    try { return new TextDecoder('windows-1252').decode(new Uint8Array(buf)); }
    catch (_){ return new TextDecoder('utf-8').decode(new Uint8Array(buf)); }
  }

  function splitCsvLine(line){
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++){
      const ch = line[i];
      if (q){ if (ch === '"'){ if (line[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; }
      else { if (ch === '"') q = true; else if (ch === ';'){ out.push(cur); cur = ''; } else cur += ch; }
    }
    out.push(cur);
    return out;
  }

  // Lignes à exclure : produits nommés « Zéro », récapitulatifs « moyenne pondérée ».
  function junkReason(obj){
    const p = (obj.Product || '').trim();
    if (/^z[ée]ro$/i.test(p)) return 'Produit « Zéro »';
    if (/moyenne|pond[eé]r|weighted|\bmean\b|average/i.test((obj.ID||'') + ' ' + p)) return 'Récapitulatif (moyenne)';
    return '';
  }

  function parse(text){
    const lines = String(text || '').split(/\r\n|\n|\r/);
    const rows = [], remarks = [], excluded = [];
    let header = null, block = null, collDate = null;
    for (const raw of lines){
      const cells = splitCsvLine(raw);
      const first = (cells[0] || '').trim();
      if (/^job name\s*:/i.test(first))        { block = first.replace(/^job name\s*:/i, '').trim(); header = null; continue; }
      if (/^collection date\s*:/i.test(first)) { collDate = first.replace(/^collection date\s*:/i, '').trim(); continue; }
      if (/^job type\s*:/i.test(first))         { continue; }
      if (first.toLowerCase() === 'product')    { header = cells.map(c => (c || '').trim()); continue; }
      if (!header) continue;
      if (!cells.some(c => (c || '').trim() !== '')) continue;
      const obj = {};
      header.forEach((h, i) => { if (h) obj[h] = (cells[i] != null ? cells[i] : '').trim(); });
      obj._block = block; obj._collDate = collDate;
      const product = (obj['Product'] || '').trim();
      const id = (obj['ID'] || '').trim();
      if (!product && !id){ const rem = (obj['Remark'] || '').trim(); if (rem) remarks.push({ block, remark: rem }); continue; }
      const reason = junkReason(obj);
      if (reason){ excluded.push({ ID:id, Product:product, Date:(obj.Date||''), reason, block }); continue; }
      rows.push(obj);
    }
    const seen = new Set();
    rows.forEach(r => Object.keys(r).forEach(k => { if (!k.startsWith('_') && !META_COLS.has(k)) seen.add(k); }));
    const paramCols = [...PARAM_ORDER.filter(c => seen.has(c)), ...[...seen].filter(c => !PARAM_ORDER.includes(c)).sort()];
    return { rows, remarks, excluded, paramCols };
  }

  function momentLabel(code, stades){
    return (stades || {})[(code || '').toLowerCase().replace(/\s/g, '')] || code || '';
  }

  function deriveFromId(id, stades){
    if (!id) return { cuve:'', momentCode:'', moment:'', sampleType:'inconnu' };
    if (/t[eé]mo/i.test(id)) return { cuve:'', momentCode:'', moment:'Témoin', sampleType:'temoin' };
    const segs = id.split('_').map(s => s.trim()).filter(Boolean);
    let cuve = '', momentCode = '';
    if (segs.length){
      const last = segs[segs.length - 1];
      if (CUVE_RE.test(last)) cuve = last;
      const mids = segs.slice(0, cuve ? -1 : segs.length).filter(s => !/^\d{1,4}$/.test(s));
      momentCode = mids.join('-');
    }
    return { cuve, momentCode, moment: momentLabel(momentCode, stades), sampleType: cuve ? 'cuve' : 'inconnu' };
  }

  // Série Excel (ex. 45927) → JJ/MM/AAAA. Epoch Excel = 1899-12-30.
  function excelSerialToDMY(n){
    const ms = Math.round((Number(n) - 25569) * 86400000);
    const dt = new Date(ms); if (isNaN(dt.getTime())) return '';
    return `${String(dt.getUTCDate()).padStart(2,'0')}/${String(dt.getUTCMonth()+1).padStart(2,'0')}/${dt.getUTCFullYear()}`;
  }
  function normDate(s){
    s = String(s == null ? '' : s).trim();
    if (/^\d{4,6}$/.test(s)){ const n = parseInt(s, 10); if (n >= 20000 && n <= 80000) return excelSerialToDMY(n); }
    return s;
  }
  function bestDate(r){
    let d = (r.Date || '').trim();
    if (!d) d = (r._collDate || '').trim();
    if (!d){ const m = (r.ID || '').match(/^(\d{2})_(\d{2})_(\d{2})\b/); if (m) d = `${m[3]}/${m[2]}/20${m[1]}`; }
    return normDate(d);
  }

  function derive(row, stades){
    const d = deriveFromId(row.ID || '', stades);
    return { cuve:d.cuve, momentCode:d.momentCode, moment:d.moment, sample:d.sampleType,
      date: bestDate(row), heure: row.Heure || '', product: row.Product || '' };
  }

  // ── Mapping WineScan → table `analyses` VitiFlux ───────────────────────────
  const MAPPED = new Set(['D','TAV','pH','AT','VA 111','SO2 L','SO2 T','SucTot','Sucre','Malic','CO2']);
  function _num(v){ const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; }
  function _iso(d){
    const m = String(d || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return String(d).slice(0,10);
    return null;
  }
  // Construit le payload `analyses` (sans lot_id/contenant_id/tenant_id, ajoutés par l'appelant).
  function toAnalyse(row, derived){
    derived = derived || derive(row, null);
    const D = _num(row.D);
    const extra = {};
    Object.keys(row).forEach(k => {
      if (k[0] === '_' || META_COLS.has(k) || MAPPED.has(k)) return;
      const n = _num(row[k]); if (n != null && n !== 0) extra[k] = n;
    });
    const suc = _num(row.SucTot) != null ? _num(row.SucTot) : _num(row.Sucre);
    return {
      date_analyse: _iso(derived.date),
      heure: derived.heure || null,
      stade: derived.moment || null,
      source: 'winescan',
      densite: D != null ? +(D / 1000).toFixed(4) : null,
      tav: _num(row.TAV), ph: _num(row.pH), ta: _num(row.AT),
      acidite_volatile: _num(row['VA 111']),
      so2_libre: _num(row['SO2 L']), so2_total: _num(row['SO2 T']),
      sucres_residuels: suc,
      acide_malique: _num(row.Malic), co2: _num(row.CO2),
      extra: Object.keys(extra).length ? extra : null,
    };
  }

  global.WineScan = {
    PARAM_ORDER, META_COLS, CUVE_RE, MAPPED,
    decodeCsv, splitCsvLine, junkReason, parse,
    momentLabel, deriveFromId, derive, excelSerialToDMY, normDate, bestDate, toAnalyse,
  };
})(typeof window !== 'undefined' ? window : this);
