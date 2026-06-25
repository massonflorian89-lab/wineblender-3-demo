// cuverie-drawer.js — Drawer fiche rapide contenant (N1/N2/N3)
// Extrait de cuverie.html (Étape 4 de la refactorisation progressive).
//
// Globals lus (définis dans cuverie.html ou cuverie-render.js) :
//   lotsMap, contenants, cuverieEtatMap, travees
//   TYPE_LABELS, LOT_STATUT_COLORS, LOT_STATUT_SHORT, LOT_COULEUR_DOT
//   ETAT_BADGE_LABELS (cuverie-render.js)
// Fonctions dans le script principal :
//   getPrincipalLot, getTraveeNom, getContenantEtat, escapeHtml, fmt, fmtDays,
//   daysSince, formatLotNumero, openOpPanel, _openSuiviFa, updateSelectionFab,
//   openTraceModal, WB3DB, WB3UI, WB3Nav, toast
// État partagé (accessible depuis le script principal aussi) :
//   _detailContenantId, opState

// ── État drawer ───────────────────────────────────────────────
let _detailContenantId = null;

// ── Helpers FA Sparkline (partagés avec D9c) ──────────────────
async function _drawerFaLoad(cid, lotId) {
  const body = document.getElementById('dd-fa-body');
  const sum  = document.getElementById('dd-fa-summary');
  if (!body) return;
  body.innerHTML = '<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">Chargement…</div>';
  const myCid = _detailContenantId;
  let rows = [];
  try {
    rows = await WB3DB.listTable('analyses', {
      select: 'date_analyse, densite, temperature',
      filter: { contenant_id: cid, lot_id: lotId },
      order: 'date_analyse', ascending: true, limit: 30,
    }) || [];
  } catch (e) {
    console.warn('[WB3 D9b] fetch analyses échoué :', e);
  }
  if (_detailContenantId !== myCid) return;
  rows = rows.filter(r => r.densite != null || r.temperature != null).slice(-20);

  if (sum) sum.textContent = rows.length ? `${rows.length} relevé${rows.length > 1 ? 's' : ''}` : '';

  const sparkHTML = _renderFaSparkline(rows);
  const tableHTML = _renderFaTable(rows);
  const buttonsHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-1);margin-top:var(--space-2)">
      <button class="dd-action-btn" type="button" onclick="openOpPanel('sulfitage')">
        <span class="da-icon">🧪</span><span class="da-label">Sulfitage</span>
      </button>
      <button class="dd-action-btn" type="button" onclick="openOpPanel('levurage')">
        <span class="da-icon">🦠</span><span class="da-label">Levurage</span>
      </button>
      <button class="dd-action-btn" type="button" onclick="openOpPanel('chaptalisation')">
        <span class="da-icon">🍯</span><span class="da-label">Chaptal.</span>
      </button>
      <button class="dd-action-btn" type="button" onclick="openOpPanel('malo')">
        <span class="da-icon">🧫</span><span class="da-label">Malo</span>
      </button>
    </div>
    <button class="btn btn--ghost btn--sm" type="button"
      style="width:100%;margin-top:var(--space-2);text-align:left"
      onclick="_openSuiviFa('${cid}','${lotId}')">
      → Suivi FA détaillé (produits, à prévoir, …)
    </button>`;
  body.innerHTML = sparkHTML + tableHTML + buttonsHTML;
}

function _renderFaSparkline(rows, maxH) {
  const dens = rows.filter(r => r.densite     != null);
  const temp = rows.filter(r => r.temperature != null);
  if (!dens.length && !temp.length) {
    return '<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);padding:6px 0">Pas encore de relevé pour ce lot.</div>';
  }
  const _maxH = Number(maxH) || 160;
  const W = 320, H = 120;
  const mL = 38, mR = 36, mT = 8, mB = 18;
  const px0 = mL, px1 = W - mR;
  const py0 = mT, py1 = H - mB;
  const pw  = px1 - px0, ph = py1 - py0;

  const dates = rows.map(r => new Date(r.date_analyse).getTime()).filter(t => !isNaN(t));
  const tsMin = Math.min(...dates), tsMax = Math.max(...dates) || tsMin + 1;
  const xFor = (date) => {
    const t = new Date(date).getTime();
    return (px0 + ((t - tsMin) / Math.max(1, tsMax - tsMin)) * pw).toFixed(1);
  };

  const dV = dens.map(r => Number(r.densite));
  const dLo = dV.length ? Math.min(...dV, 0.990) : 0.990;
  const dHi = dV.length ? Math.max(...dV, 1.100) : 1.100;
  const yD = (v) => (py0 + (1 - (v - dLo) / Math.max(0.001, dHi - dLo)) * ph).toFixed(1);
  const tV = temp.map(r => Number(r.temperature));
  const tLo = tV.length ? Math.min(...tV, 10) : 10;
  const tHi = tV.length ? Math.max(...tV, 35) : 35;
  const yT = (v) => (py0 + (1 - (v - tLo) / Math.max(0.001, tHi - tLo)) * ph).toFixed(1);

  const grid = [0, 1, 2, 3].map(i => {
    const y = (py0 + (i / 3) * ph).toFixed(1);
    const dash = (i === 0 || i === 3) ? '' : ' stroke-dasharray="2 3"';
    return `<line x1="${px0}" y1="${y}" x2="${px1}" y2="${y}" stroke="var(--color-border)" stroke-width="0.6"${dash}/>`;
  }).join('');

  const yAxes = `
    <line x1="${px0}" y1="${py0}" x2="${px0}" y2="${py1}" stroke="var(--color-border)" stroke-width="0.8"/>
    <line x1="${px1}" y1="${py0}" x2="${px1}" y2="${py1}" stroke="var(--color-border)" stroke-width="0.8"/>`;

  const lbl = (x, y, text, color, anchor) =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="9" font-family="ui-monospace,monospace">${text}</text>`;
  const fmtD = (v) => Number(v).toFixed(3);
  const fmtT = (v) => Number(v).toFixed(0) + '°';
  const lvls = [
    { y: py0 + 3,         d: dHi,           t: tHi },
    { y: py0 + ph/2 + 3,  d: (dHi+dLo)/2,   t: (tHi+tLo)/2 },
    { y: py1 + 3,         d: dLo,           t: tLo },
  ];
  const densLabels = dens.length ? lvls.map(l => lbl(px0 - 3, l.y, fmtD(l.d), '#3b82f6', 'end')).join('') : '';
  const tempLabels = temp.length ? lvls.map(l => lbl(px1 + 3, l.y, fmtT(l.t), '#f59e0b', 'start')).join('') : '';

  const d0 = rows[0]?.date_analyse || '';
  const dN = rows[rows.length - 1]?.date_analyse || '';
  const xDates =
    lbl(px0, H - 5, escapeHtml(d0), 'var(--color-ink-tertiary)', 'start') +
    (dN && dN !== d0 ? lbl(px1, H - 5, escapeHtml(dN), 'var(--color-ink-tertiary)', 'end') : '');

  const densPts = dens.map(r => `${xFor(r.date_analyse)},${yD(r.densite)}`).join(' ');
  const tempPts = temp.map(r => `${xFor(r.date_analyse)},${yT(r.temperature)}`).join(' ');
  const densCircles = dens.map(r => `<circle cx="${xFor(r.date_analyse)}" cy="${yD(r.densite)}" r="2.5" fill="#3b82f6"/>`).join('');
  const tempCircles = temp.map(r => `<circle cx="${xFor(r.date_analyse)}" cy="${yT(r.temperature)}" r="2.5" fill="#f59e0b"/>`).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"
      style="width:100%;height:auto;max-height:${_maxH}px;background:var(--color-bg-subtle);border-radius:var(--radius-sm);border:1px solid var(--color-border)">
      ${grid}
      ${yAxes}
      ${densLabels}${tempLabels}${xDates}
      ${densPts ? `<polyline fill="none" stroke="#3b82f6" stroke-width="1.8" points="${densPts}"/>${densCircles}` : ''}
      ${tempPts ? `<polyline fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4 3" points="${tempPts}"/>${tempCircles}` : ''}
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--color-ink-tertiary);margin-top:2px">
      ${dens.length ? '<span style="color:#3b82f6">— Densité (échelle gauche)</span>' : '<span></span>'}
      ${temp.length ? '<span style="color:#f59e0b">- - T° (échelle droite)</span>' : '<span></span>'}
    </div>`;
}

function _renderFaTable(rows) {
  const last5 = rows.slice(-5).reverse();
  if (!last5.length) return '';
  return `<table style="width:100%;font-size:var(--text-caption);border-collapse:collapse;margin-top:var(--space-2)">
    <thead><tr>
      <th style="text-align:left;padding:3px 4px;color:var(--color-ink-tertiary);font-weight:600">Date</th>
      <th style="text-align:right;padding:3px 4px;color:var(--color-ink-tertiary);font-weight:600">Densité</th>
      <th style="text-align:right;padding:3px 4px;color:var(--color-ink-tertiary);font-weight:600">T °C</th>
    </tr></thead>
    <tbody>${last5.map(r => `<tr>
      <td style="padding:3px 4px;border-top:1px solid var(--color-border)">${escapeHtml(r.date_analyse || '—')}</td>
      <td style="padding:3px 4px;text-align:right;font-variant-numeric:tabular-nums;border-top:1px solid var(--color-border)">${r.densite != null ? Number(r.densite).toFixed(4) : '—'}</td>
      <td style="padding:3px 4px;text-align:right;font-variant-numeric:tabular-nums;border-top:1px solid var(--color-border)">${r.temperature != null ? Number(r.temperature).toFixed(1) : '—'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

// ── Helpers contextuels (bois / prochaine action / action-bar) ─
function _isBoisContenant(c) {
  if (!c) return false;
  if (c.type === 'fut' || c.type === 'foudre') return true;
  return /ch[êe]ne|\bbois\b|barrique|tonneau|demi[-\s]?muid|amphore|jarre/i.test(c.materiau || '');
}

const _NEXT_ACTION_BASE = {
  vendange:'🍇 Levurage / départ en fermentation',
  mout:'🦠 Levurage → fermentation',
  fa:'🌡 Suivre densité, sulfiter en fin de FA',
  fml:'🧫 Suivre la malo (chromato)',
  vin:'🧪 Contrôle SO₂ · soutirage',
  elevage:'🧪 Contrôle SO₂ / ouillage',
  clarification:'🍂 Collage / soutirage',
  collage:'🔬 Soutirage puis filtration',
  filtration:'🍾 Préparer la mise',
  vin_filtre:'🍾 Préparer la mise',
  pret:'🍾 Mise en bouteille',
  pre_mise:'🍾 Mise en bouteille',
  conditionnement:'🍾 Mise en bouteille',
};

function _ddNextAction(statut, c) {
  if (_isBoisContenant(c) && ['vin','elevage','clarification','collage','vin_filtre'].includes(statut)) {
    return '🪣 Ouiller (évaporation) · 🔬 analyse SO₂ · 📦 produit · 🔄 soutirage';
  }
  return _NEXT_ACTION_BASE[statut] || null;
}

function _ddBarHot(statut, c) {
  if (_isBoisContenant(c) && ['vin','elevage','clarification','collage','vin_filtre'].includes(statut)) {
    return 'ddbar-ouillage';
  }
  const map = {
    fa:'ddbar-analyse', fml:'ddbar-analyse', vin:'ddbar-soutirage',
    elevage:'ddbar-ouillage',
    clarification:'ddbar-soutirage', collage:'ddbar-soutirage', filtration:'ddbar-soutirage',
  };
  return map[statut] || null;
}

function _ddActbarContext(statut, c) {
  ['ddbar-soutirage','ddbar-ouillage','ddbar-analyse','ddbar-traitement','ddbar-relogement']
    .forEach(id => { const b = document.getElementById(id);
      if (b) { b.classList.remove('btn--primary'); b.classList.add('btn--secondary'); } });
  const hot = _ddBarHot(statut, c);
  if (hot) { const b = document.getElementById(hot);
    if (b) { b.classList.remove('btn--secondary'); b.classList.add('btn--primary'); } }
}

// ── Drawer N1 — fiche rapide (ouverture + fermeture) ─────────
async function openDetailDrawer(c) {
  _detailContenantId = c.id;
  // T8 fix — masquer la selection-fab qui se chevauche avec le drawer
  const _fab = document.getElementById('selection-fab');
  if (_fab) _fab.style.display = 'none';
  _drawerResetMore();
  const _moreS = document.getElementById('dd-more-section');
  if (_moreS) _moreS.style.display = '';
  const _actS = document.getElementById('dd-actions-section');
  if (_actS) _actS.style.display = '';
  // Sortir du mode op si le drawer était resté en op-mode orphelin.
  const _detDrawer = document.getElementById('detail-drawer');
  if (_detDrawer && _detDrawer.classList.contains('op-mode')) {
    _detDrawer.classList.remove('op-mode');
    const _op = document.getElementById('dd-op-panel');
    if (_op) _op.style.display = 'none';
    const _ff = document.getElementById('dd-foot-fiche-content');
    const _fo = document.getElementById('dd-foot-op-content');
    if (_ff) _ff.style.display = '';
    if (_fo) _fo.style.display = 'none';
  }
  const lots      = lotsMap.get(c.id) || [];
  const _ddPrincipal = getPrincipalLot(c);
  _ddActbarContext(_ddPrincipal?.statut, c);
  const traveeNom = getTraveeNom(c.travee_id);
  const typeLine  = [TYPE_LABELS[c.type] || c.type, c.materiau].filter(Boolean).join(' ');

  document.getElementById('dd-title').textContent = c.nom;
  document.getElementById('dd-sub').textContent   = `${typeLine} · ${fmt(c.capacite_hl)} hL`;

  const volTotal = lots.reduce((s, l) => s + (Number(l.volume_hl) || 0), 0);
  const pctReal  = c.capacite_hl ? Math.round(volTotal / c.capacite_hl * 100) : 0;
  const pctBar   = Math.min(100, pctReal);
  const pct      = pctReal;
  const fillColor = pctReal >= 100 ? 'var(--color-danger)' : pctReal > 0 ? 'var(--color-success)' : 'var(--color-bg-mute)';

  // Bandeau d'alertes (source : cuverieEtatMap Sprint 2).
  const _erDrawer = cuverieEtatMap.get(c.id);
  let _alertBanner = '';
  if (_erDrawer && (_erDrawer.niveau_alerte === 'critique' || _erDrawer.niveau_alerte === 'warn')) {
    const isCritique = _erDrawer.niveau_alerte === 'critique';
    const flags = [];
    if (_erDrawer.sur_capacite) {
      flags.push(`⛔ <b>Sur-capacité</b> — Volume stocké (${fmt(volTotal)} hL) dépasse la capacité déclarée (${fmt(c.capacite_hl)} hL).`);
    }
    if (_erDrawer.volume_incoherent) {
      flags.push(`⚖️ <b>Volume incohérent</b> — Σ lot_contenants du lot principal ≠ lots.volume_actuel_hl (tolérance 0,01 hL).`);
    }
    if (_erDrawer.fa_stuck) {
      flags.push(`🚨 <b>FA bloquée</b> — Densité stagne depuis ≥ 2 jours sur le lot en FA.`);
    }
    if (_erDrawer.analyse_en_retard) {
      flags.push(`🔬 <b>Analyse en retard</b> — Pas d'analyse depuis plus de 30 jours sur le lot principal.`);
    }
    if (_erDrawer.sans_operation_recente) {
      flags.push(`⏳ <b>Sans opération récente</b> — Aucune opération réalisée touchant ce contenant depuis 30 jours.`);
    }
    if (_erDrawer.dluo_produit_proche) {
      flags.push(`📅 <b>DLUO produit proche</b> — Un produit utilisé récemment a une DLUO < 30 jours.`);
    }
    const bg = isCritique ? '#fee2e2' : '#fef3c7';
    const bd = isCritique ? '#ef4444' : '#f59e0b';
    const fg = isCritique ? '#991b1b' : '#92400e';
    _alertBanner = `
      <div style="margin-bottom:var(--space-2);padding:8px 12px;background:${bg};border:1px solid ${bd};border-left:4px solid ${bd};border-radius:var(--radius-sm);color:${fg};font-size:var(--text-footnote);min-width:0;word-wrap:break-word;overflow-wrap:anywhere">
        <div style="font-weight:700;text-transform:uppercase;letter-spacing:.4px;font-size:var(--text-caption);margin-bottom:var(--space-1)">
          ${isCritique ? '🔴 Alerte critique' : '🟠 Alerte'}
        </div>
        ${flags.map(f => `<div style="margin-top:3px">${f}</div>`).join('')}
      </div>`;
  }

  document.getElementById('dd-fill-bar').innerHTML = `
    ${_alertBanner}
    <div style="display:flex;align-items:center;gap:var(--space-2)">
      <div style="flex:1;height:10px;border-radius:5px;background:var(--color-bg-subtle);overflow:hidden">
        <div style="width:${pctBar}%;height:100%;border-radius:5px;background:${fillColor};transition:width .3s"></div>
      </div>
      <span style="font-size:var(--text-footnote);font-weight:600;min-width:48px;text-align:right${pctReal > 100 ? ';color:var(--color-danger)' : ''}">${pctReal}%</span>
    </div>
    <div style="font-size:var(--text-caption);color:${pctReal > 100 ? 'var(--color-danger)' : 'var(--color-ink-tertiary)'};margin-top:4px${pctReal > 100 ? ';font-weight:600' : ''}">
      ${lots.length ? fmt(volTotal)+' hL en cours' : 'Vide'} / ${fmt(c.capacite_hl)} hL capacité${pctReal > 100 ? ' · ⚠ dépassement de ' + fmt(volTotal - c.capacite_hl) + ' hL' : ''}
    </div>
    ${(() => {
      const _na = _ddPrincipal ? _ddNextAction(_ddPrincipal.statut, c) : null;
      return _na
        ? `<div style="margin-top:6px;font-size:var(--text-caption);background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:5px 8px">
             <b>Prochaine action</b> · ${_na}${_isBoisContenant(c) ? ' <span title="Contenant bois — ouillage récurrent conseillé" style="color:#a16207">🛢</span>' : ''}</div>`
        : '';
    })()}`;

  // Lots en cours
  const lotsSec  = document.getElementById('dd-lots-section');
  const lotsList = document.getElementById('dd-lots-list');
  if (lots.length) {
    lotsSec.style.display = '';
    lotsList.innerHTML = lots.map(l => {
      const [bg, fg] = (LOT_STATUT_COLORS[l.statut] || '#eee|#555').split('|');
      const dot      = LOT_COULEUR_DOT[l.couleur] || '';
      const jours    = daysSince(l.date_affectation);
      const joursTxt = fmtDays(jours);
      const joursClr = jours != null && jours > 365 ? '#d97706' : 'var(--color-ink-tertiary)';
      const numLotD = formatLotNumero(l);
      return `<div style="padding:6px 0;border-bottom:1px solid var(--color-border)">
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <span style="background:${bg};color:${fg};padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;flex-shrink:0">
            ${LOT_STATUT_SHORT[l.statut] || l.statut}
          </span>
          <span style="font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${dot} ${escapeHtml(l.nom)}${l.millesime ? ` · ${l.millesime}` : ''}
          </span>
          ${l.volume_hl != null ? `<span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);flex-shrink:0">${fmt(l.volume_hl)} hL</span>` : ''}
          ${joursTxt ? `<span style="font-size:var(--text-caption);color:${joursClr};flex-shrink:0;white-space:nowrap" title="Depuis le ${l.date_affectation || '?'}">⏱ ${joursTxt}</span>` : ''}
        </div>
        ${numLotD ? `<div style="font-family:monospace;font-size:10px;color:var(--color-ink-tertiary);margin-top:2px;padding-left:2px">${escapeHtml(numLotD)}</div>` : ''}
      </div>`;
    }).join('');
  } else {
    lotsSec.style.display = 'none';
  }

  // Localisation
  const locParts = [];
  if (traveeNom)     locParts.push(`📍 ${escapeHtml(traveeNom)}`);
  if (c.localisation) locParts.push(escapeHtml(c.localisation));
  const locSec = document.getElementById('dd-loc-section');
  if (locParts.length) {
    locSec.style.display = '';
    document.getElementById('dd-loc').innerHTML =
      `<span style="font-size:var(--text-callout)">${locParts.join(' · ')}</span>`;
  } else {
    locSec.style.display = 'none';
  }

  // Accès rapides (fiche lot, traçabilité)
  const linkLot      = document.getElementById('dd-link-lot');
  const btnTrace     = document.getElementById('dd-btn-trace');
  const linkTraceAmont = document.getElementById('dd-link-trace-amont');
  if (lots.length) {
    if (lots.length === 1) {
      linkLot.href            = `lot-detail.html?id=${lots[0].id}`;
      linkLot.removeAttribute('onclick');
      linkLot.textContent     = '🍷 Fiche lot complète →';
    } else {
      linkLot.href            = '#';
      linkLot.setAttribute('onclick', 'event.preventDefault();_ddShowLotPicker(event);return false');
      linkLot.textContent     = `🍷 Fiche lot · ${lots.length} lots ▾`;
    }
    linkLot.style.display     = '';
    if (btnTrace)              btnTrace.style.display = '';
    if (linkTraceAmont) {
      linkTraceAmont.href     = `tracabilite.html?contenant=${c.id}`;
      linkTraceAmont.style.display = '';
    }
  } else {
    linkLot.style.display     = 'none';
    if (btnTrace)              btnTrace.style.display = 'none';
    if (linkTraceAmont)        linkTraceAmont.style.display = 'none';
  }
  document.getElementById('dd-link-detail').href = `contenant-detail.html?id=${c.id}`;

  document.getElementById('detail-drawer').classList.add('open');
  document.getElementById('detail-drawer-backdrop').classList.add('open');

  // D9b — Section FA
  const _ddFa = document.getElementById('dd-fa-section');
  if (_ddFa) {
    const faLots = lots.filter(l => l.statut === 'fa');
    if (faLots.length > 1 && c.actif !== false) {
      _ddFa.style.display = '';
      const body = document.getElementById('dd-fa-body');
      const sum  = document.getElementById('dd-fa-summary');
      if (sum) sum.textContent = `${faLots.length} lots en FA`;
      if (body) {
        body.innerHTML = `
          <div style="padding:10px 12px;background:#fef3c7;border:1px solid #f59e0b;border-left:4px solid #f59e0b;border-radius:var(--radius-sm);color:#92400e;font-size:var(--text-footnote);margin-bottom:var(--space-2)">
            🚥 <b>Cuve multi-lots FA</b> (${faLots.length} lots). Choisis le lot à suivre :
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:var(--space-2)">
            ${faLots.map(l => `
              <button type="button" class="btn btn--secondary btn--sm"
                onclick="_openSuiviFa('${c.id}','${l.id}')"
                style="text-align:left;padding:8px 12px">
                <b>${escapeHtml(l.nom)}</b>${l.millesime ? ' ' + escapeHtml(String(l.millesime)) : ''}<br>
                <span style="font-size:var(--text-caption);opacity:.75">${l.volume_hl != null ? l.volume_hl + ' hL' : ''}</span>
              </button>
            `).join('')}
          </div>
        `;
      }
    } else if (faLots.length === 1 && c.actif !== false) {
      _ddFa.style.display = '';
      _drawerFaLoad(c.id, faLots[0].id);
    } else {
      _ddFa.style.display = 'none';
    }
  }

  // Dernière analyse
  const analyseSec   = document.getElementById('dd-analyse-section');
  const analyseGrid  = document.getElementById('dd-analyse-grid');
  const analyseDateEl= document.getElementById('dd-analyse-date');
  analyseSec.style.display = 'none';
  if (c.id) {
    try {
      const rows = await WB3DB.listTable('analyses', {
        select: 'date_analyse,lots(id,nom),so2_libre,so2_total,so2_actif,ph,ta,acidite_volatile,tav,sucres_residuels,densite,temperature,acide_malique,acide_lactique,gf_neg5,gf_pos5,co2,turbidite',
        filter: { contenant_id: c.id },
        order: 'date_analyse', ascending: false, limit: 1,
      });
      const a = rows?.[0];
      if (a) {
        const lotSuffix = a.lots ? ` · ${escapeHtml(a.lots.nom)}` : '';
        analyseDateEl.textContent = (a.date_analyse || '') + lotSuffix;
        const FIELDS = [
          { key:'tav',              label:'TAV',       unit:'% vol' },
          { key:'so2_libre',        label:'SO₂ L.',    unit:'mg/L'  },
          { key:'so2_total',        label:'SO₂ T.',    unit:'mg/L'  },
          { key:'so2_actif',        label:'SO₂ act.',  unit:'mg/L'  },
          { key:'ph',               label:'pH',        unit:''      },
          { key:'ta',               label:'AT',        unit:'g/L'   },
          { key:'acidite_volatile', label:'AV',        unit:'g/L'   },
          { key:'sucres_residuels', label:'SR',        unit:'g/L'   },
          { key:'densite',          label:'Dens.',     unit:''      },
          { key:'temperature',      label:'T°',        unit:'°C'    },
          { key:'acide_malique',    label:'Malique',   unit:'g/L'   },
          { key:'acide_lactique',   label:'Lactique',  unit:'g/L'   },
          { key:'gf_neg5',          label:'GF-5',      unit:'g/L'   },
          { key:'gf_pos5',          label:'GF+5',      unit:'g/L'   },
          { key:'co2',              label:'CO₂',       unit:'g/L'   },
          { key:'turbidite',        label:'NTU',       unit:''      },
        ];
        const cards = FIELDS.filter(f => a[f.key] != null).map(f => `
          <div style="background:var(--color-bg-subtle);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:6px 8px;text-align:center">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--color-ink-tertiary);margin-bottom:2px">${escapeHtml(f.label)}</div>
            <div style="font-size:var(--text-callout);font-weight:700;font-variant-numeric:tabular-nums">${Number(a[f.key]).toLocaleString('fr-FR',{maximumFractionDigits:2})}</div>
            ${f.unit ? `<div style="font-size:9px;color:var(--color-ink-tertiary)">${escapeHtml(f.unit)}</div>` : ''}
          </div>`).join('');
        if (cards) {
          analyseGrid.innerHTML = cards;
          analyseSec.style.display = '';
        }
      }
    } catch(e) { console.warn('analyse fetch:', e); }
  }

  // Dernières activités sur la cuve
  const activitesSec  = document.getElementById('dd-activites-section');
  const activitesList = document.getElementById('dd-activites-list');
  if (activitesSec) activitesSec.style.display = 'none';
  try {
    const opConts = await WB3DB.listTable('operation_contenants', {
      select: 'role, volume_hl, operations(id, type_operation, date_operation, operateur, statut)',
      filter: { contenant_id: c.id },
      order: 'created_at', ascending: false, limit: 5,
    }).catch(() => null);

    const rows = (opConts || []).filter(oc => oc.operations)
      .sort((a,b) => (b.operations.date_operation||'').localeCompare(a.operations.date_operation||''))
      .slice(0, 5);

    if (rows.length && activitesSec && activitesList) {
      const OP_ICONS_DD = {
        soutirage:'🔄', assemblage:'🧬', sulfitage:'🧪', collage:'🍂',
        filtration:'🔬', levurage:'🦠', enzymage:'⚗️', chaptalisation:'🍯',
        acidification:'⬆️', desacidification:'⬇️', malo:'🧫',
        mise_en_bouteille:'🍾', autre:'⚙️',
      };
      activitesList.innerHTML = rows.map(oc => {
        const op  = oc.operations;
        const ico = OP_ICONS_DD[op.type_operation] || '⚙️';
        const lbl = op.type_operation || 'Opération';
        const dt  = op.date_operation ? new Date(op.date_operation + 'T00:00:00').toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}) : '—';
        const statutDot = op.statut === 'realise' ? '✅' : op.statut === 'annule' ? '❌' : '⏳';
        return `<div style="display:flex;align-items:baseline;gap:7px;padding:5px 0;border-bottom:1px solid var(--color-border)">
          <span style="font-size:var(--text-footnote);flex-shrink:0">${ico}</span>
          <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);flex-shrink:0;min-width:46px">${dt}</span>
          <span style="flex:1;font-size:var(--text-footnote);font-weight:500">${escapeHtml(lbl)}</span>
          <span style="font-size:var(--text-caption)">${statutDot}</span>
        </div>`;
      }).join('');
      activitesSec.style.display = '';
    }
  } catch(e) { console.warn('activites fetch:', e); }
}

function closeDetailDrawer() {
  const drawer = document.getElementById('detail-drawer');
  drawer.classList.remove('open', 'op-mode');
  document.getElementById('detail-drawer-backdrop').classList.remove('open');
  document.getElementById('dd-op-panel').style.display = 'none';
  document.getElementById('dd-foot-fiche-content').style.display = '';
  document.getElementById('dd-foot-op-content').style.display = 'none';
  document.getElementById('dd-fill-section').style.display = '';
  document.getElementById('dd-actions-section').style.display = '';
  document.getElementById('dd-analyse-section').style.display = 'none';
  const ddAct = document.getElementById('dd-activites-section');
  if (ddAct) ddAct.style.display = 'none';
  const ddMore = document.getElementById('dd-more-section');
  if (ddMore) ddMore.style.display = '';
  const ddFa = document.getElementById('dd-fa-section');
  if (ddFa) ddFa.style.display = 'none';
  _drawerResetMore();
  _detailContenantId = null;
  opState = null;
  // T8 fix — réafficher la selection-fab si une sélection multi est active.
  if (typeof updateSelectionFab === 'function') updateSelectionFab();
}

// ── Drawer N2/N3 — Détails & historique ──────────────────────
let _drawerTab = null;
let _drawerMoreOpen = false;

function _drawerResetMore() {
  _drawerTab = null;
  _drawerMoreOpen = false;
  const body = document.getElementById('dd-more-body');
  const tgl  = document.getElementById('dd-more-toggle');
  const tb   = document.getElementById('dd-tab-body');
  if (body) body.style.display = 'none';
  if (tgl)  tgl.textContent = '▸ Détails & historique';
  if (tb)   tb.innerHTML = '';
  document.querySelectorAll('#dd-tabs .dd-tab').forEach(b => b.classList.remove('active'));
}

function toggleDrawerMore() {
  _drawerMoreOpen = !_drawerMoreOpen;
  const body = document.getElementById('dd-more-body');
  const tgl  = document.getElementById('dd-more-toggle');
  if (!body || !tgl) return;
  body.style.display = _drawerMoreOpen ? '' : 'none';
  tgl.textContent = (_drawerMoreOpen ? '▾' : '▸') + ' Détails & historique';
  if (_drawerMoreOpen && !_drawerTab) selectDrawerTab('analyses');
}

// ── Préfetch N2 au survol (P1) ────────────────────────────────
const _n2Cache = new Map();
const _N2_TTL = 30000;
const _N2_MAX_INFLIGHT = 6;
let _n2InFlight = 0;
const _n2Pending = new Map();

function _n2CacheInvalidate(cid) { if (cid == null) _n2Cache.clear(); else _n2Cache.delete(String(cid)); }

function _n2Fetch(cid) {
  cid = String(cid);
  const hit = _n2Cache.get(cid);
  if (hit && (Date.now() - hit.t) < _N2_TTL) return Promise.resolve(hit.data);
  if (_n2Pending.has(cid)) return _n2Pending.get(cid);
  const p = WB3DB.listTable('analyses', {
    select: 'date_analyse, lots(nom), so2_libre, so2_total, ph, tav, densite',
    filter: { contenant_id: cid }, order: 'date_analyse', ascending: false, limit: 6,
  }).then(rows => { _n2Cache.set(cid, { t: Date.now(), data: rows || [] }); return rows || []; })
    .catch(() => null)
    .finally(() => { _n2Pending.delete(cid); });
  _n2Pending.set(cid, p);
  return p;
}

function _n2Prefetch(cid) {
  cid = String(cid);
  const hit = _n2Cache.get(cid);
  if (hit && (Date.now() - hit.t) < _N2_TTL) return;
  if (_n2Pending.has(cid)) return;
  if (_n2InFlight >= _N2_MAX_INFLIGHT) return;
  _n2InFlight++;
  _n2Fetch(cid).finally(() => { _n2InFlight = Math.max(0, _n2InFlight - 1); });
}

(function _wireN2Hover() {
  if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
  const root = document.getElementById('content') || document.body;
  if (!root || root._n2HoverBound) return;
  root._n2HoverBound = true;
  let timer = null, curCid = null;
  root.addEventListener('mouseover', e => {
    const card = e.target.closest && e.target.closest('[data-cid]');
    if (!card) return;
    const cid = card.dataset.cid;
    if (cid === curCid) return;
    curCid = cid; clearTimeout(timer);
    timer = setTimeout(() => { _n2Prefetch(cid); }, 300);
  });
  root.addEventListener('mouseout', e => {
    const card = e.target.closest && e.target.closest('[data-cid]');
    if (!card) return;
    if (e.relatedTarget && card.contains(e.relatedTarget)) return;
    clearTimeout(timer); curCid = null;
  });
})();

async function selectDrawerTab(tab) {
  _drawerTab = tab;
  document.querySelectorAll('#dd-tabs .dd-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  const tb = document.getElementById('dd-tab-body');
  const cid = _detailContenantId;
  if (!tb || !cid) return;
  const c    = contenants.find(x => x.id === cid);
  const lots = lotsMap.get(cid) || [];
  const lot  = getPrincipalLot(c) || lots[0] || null;
  tb.innerHTML = `<div style="padding:var(--space-3);text-align:center"><div class="spinner"></div></div>`;
  const token = cid + '::' + tab;
  tb._token = token;
  const done = (html) => { if (tb._token === token) tb.innerHTML = html; };
  const esc  = (lbl, href) =>
    `<a class="btn btn--secondary btn--sm" style="display:block;text-align:center;margin-top:var(--space-2)" href="${href}">${lbl}</a>`;

  try {
    if (tab === 'analyses') {
      const rows = (await _n2Fetch(cid)) || [];
      const list = (rows || []).map(a => `
        <div style="display:flex;gap:var(--space-2);align-items:baseline;padding:5px 0;border-bottom:1px solid var(--color-border);font-size:var(--text-footnote)">
          <span style="color:var(--color-ink-tertiary);min-width:74px">${a.date_analyse || '—'}</span>
          <span style="flex:1;display:flex;gap:10px;flex-wrap:wrap">
            ${a.tav!=null?`<span>TAV ${a.tav}</span>`:''}
            ${a.so2_libre!=null?`<span>SO₂L ${a.so2_libre}</span>`:''}
            ${a.so2_total!=null?`<span>SO₂T ${a.so2_total}</span>`:''}
            ${a.ph!=null?`<span>pH ${a.ph}</span>`:''}
            ${a.densite!=null?`<span>d ${a.densite}</span>`:''}
          </span>
        </div>`).join('');
      done((list || `<div style="color:var(--color-ink-tertiary);font-size:var(--text-caption)">Aucune analyse.</div>`)
        + esc('🔬 Toutes les analyses de la cuve →', `contenant-detail.html?id=${cid}`));
    }
    else if (tab === 'produits') {
      done(`<div style="color:var(--color-ink-tertiary);font-size:var(--text-caption);line-height:1.5">
          Produits ajoutés (doses, DLUO, n° lot fournisseur) tracés par opération.
        </div>`
        + esc('📦 Produits ajoutés sur la cuve →', `contenant-detail.html?id=${cid}#produits`)
        + (lot ? esc('🍷 Produits du lot (fiche lot) →', `lot-detail.html?id=${lot.id}`) : ''));
    }
    else if (tab === 'mouvements') {
      if (!lot) { done(`<div style="color:var(--color-ink-tertiary);font-size:var(--text-caption)">Aucun lot en cours — pas de mouvements à afficher.</div>`
        + esc('ℹ️ Fiche cuve complète →', `contenant-detail.html?id=${cid}`)); return; }
      const mv = await WB3DB.getLotMouvements(lot.id).catch(() => []);
      const last = (mv || []).slice(-8).reverse();
      const list = last.map(m => `
        <div style="display:flex;gap:var(--space-2);align-items:baseline;padding:5px 0;border-bottom:1px solid var(--color-border);font-size:var(--text-footnote)">
          <span style="color:var(--color-ink-tertiary);min-width:74px">${m.date_mouvement || '—'}</span>
          <span style="flex:1">${escapeHtml(m.type_operation || 'mvt')} ·
            ${escapeHtml(m.contenant_source?.nom || '—')} → ${escapeHtml(m.contenant_dest?.nom || '—')}</span>
          ${m.volume_hl!=null?`<span style="flex-shrink:0">${fmt(m.volume_hl)} hL</span>`:''}
        </div>`).join('');
      done(`<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-bottom:var(--space-1)">Journal immuable — lot ${escapeHtml(lot.nom)}</div>`
        + (list || `<div style="color:var(--color-ink-tertiary);font-size:var(--text-caption)">Aucun mouvement.</div>`)
        + esc('🔀 Journal complet (fiche lot) →', `lot-detail.html?id=${lot.id}`));
    }
    else if (tab === 'dossier') {
      done(lots.length
        ? `<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-bottom:var(--space-1)">Dossier de lot (impression / export PDF) :</div>`
          + lots.map(l => esc(`📄 Dossier — ${escapeHtml(l.nom)} →`, `lot-detail.html?id=${l.id}#dossier`)).join('')
        : `<div style="color:var(--color-ink-tertiary);font-size:var(--text-caption)">Aucun lot en cours — pas de dossier de lot.</div>`);
    }
  } catch(e) {
    done(`<div style="color:var(--color-danger);font-size:var(--text-caption)">Erreur de chargement.</div>`);
  }
}

// Realtime : la cuve affichée vient d'être rafraîchie en direct.
function _drawerMarkUpdated() {
  const sub = document.getElementById('dd-sub');
  if (!sub || !document.getElementById('detail-drawer').classList.contains('open')) return;
  if (sub.querySelector('.dd-rt')) return;
  const b = document.createElement('span');
  b.className = 'dd-rt';
  b.textContent = ' · ● mis à jour';
  b.style.cssText = 'color:var(--color-success);font-weight:600';
  sub.appendChild(b);
}

// C2 — Menu déroulant de choix de lot pour cuves multi-lots.
function _ddShowLotPicker(evt) {
  document.getElementById('dd-lot-picker')?.remove();
  const lots = lotsMap.get(_detailContenantId) || [];
  if (!lots.length) return;
  const btn = evt.currentTarget;
  const rect = btn.getBoundingClientRect();
  const el = document.createElement('div');
  el.id = 'dd-lot-picker';
  el.innerHTML = `
    <div style="position:fixed;inset:0;z-index:1000" onclick="document.getElementById('dd-lot-picker')?.remove()">
      <div style="position:absolute;top:${Math.round(rect.bottom + 4)}px;left:${Math.round(rect.left)}px;
                  background:var(--color-bg-elevated);border:1px solid var(--color-border);
                  border-radius:var(--radius-md);box-shadow:0 4px 16px rgba(0,0,0,.18);
                  min-width:240px;max-width:340px;padding:6px"
           onclick="event.stopPropagation()">
        <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);padding:4px 8px;text-transform:uppercase;letter-spacing:.4px;font-weight:600">
          ${lots.length} lots — choisir
        </div>
        ${lots.map(l => {
          const [bg, fg] = (LOT_STATUT_COLORS[l.statut] || '#eee|#555').split('|');
          return `
          <div role="button" tabindex="0"
             onclick="document.getElementById('dd-lot-picker')?.remove();WB3Nav.navigate('lot-detail.html?id=${l.id}')"
             style="display:flex;align-items:center;gap:var(--space-2);padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;color:inherit"
             onmouseover="this.style.background='var(--color-bg-subtle)'"
             onmouseout="this.style.background=''">
            <span style="background:${bg};color:${fg};padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;flex-shrink:0">
              ${LOT_STATUT_SHORT[l.statut] || l.statut}
            </span>
            <span style="flex:1;font-weight:500;font-size:var(--text-callout);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${escapeHtml(l.nom)}${l.millesime ? ' · ' + escapeHtml(String(l.millesime)) : ''}
            </span>
            <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);flex-shrink:0">
              ${l.volume_hl != null ? l.volume_hl + ' hL' : ''}
            </span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  document.body.appendChild(el);
}

// ── Retour à la fiche depuis le panneau d'opération ──────────
function backToFiche() {
  opState = null;
  const drawer = document.getElementById('detail-drawer');
  drawer.classList.remove('op-mode');
  document.getElementById('dd-op-panel').style.display      = 'none';
  document.getElementById('dd-foot-op-content').style.display  = 'none';
  document.getElementById('dd-foot-fiche-content').style.display = '';

  if (_detailContenantId) {
    const c = contenants.find(x => x.id === _detailContenantId);
    document.getElementById('dd-fill-section').style.display     = '';
    document.getElementById('dd-actions-section').style.display  = '';
    const moreS = document.getElementById('dd-more-section');
    if (moreS) moreS.style.display = '';
    if (c) {
      const lots = lotsMap.get(c.id) || [];
      document.getElementById('dd-lots-section').style.display = lots.length ? '' : 'none';
      const hasLoc = getTraveeNom(c.travee_id) || c.localisation;
      document.getElementById('dd-loc-section').style.display  = hasLoc ? '' : 'none';
      const ddFa = document.getElementById('dd-fa-section');
      if (ddFa) ddFa.style.display = lots.some(l => l.statut === 'fa') ? '' : 'none';
    }
  } else {
    closeDetailDrawer();
  }
}
