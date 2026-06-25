// cuverie-trace.js — Arbre de traçabilité (modal on-demand)
// Extrait de cuverie.html (Étape 6 de la refactorisation progressive).
//
// Globals lus (définis dans cuverie.html principal ou modules précédents) :
//   _detailContenantId (cuverie-drawer.js), lotsMap, WB3DB, escapeHtml, fmt
//   getPrincipalLot, LOT_STATUT_COLORS, LOT_STATUT_SHORT, LOT_COULEUR_DOT
//   OP_TYPES_DEF (cuverie-operations.js, chargé après — lu à l'appel, OK)

function openTraceFromDrawer() {
  if (!_detailContenantId) return;
  const lots = lotsMap.get(_detailContenantId) || [];
  if (!lots.length) return;
  const lp = getPrincipalLot(_detailContenantId) || lots[0];
  openTraceModal(lp.id, lp.nom, lots);
}

function openTraceModal(primaryLotId, title, lots) {
  const backdrop = document.getElementById('trace-modal-backdrop');
  const body     = document.getElementById('trace-modal-body');
  document.getElementById('trace-modal-title').textContent = `🌳 Traçabilité — ${title}`;
  body.innerHTML = '<div class="loading-state"><div class="spinner"></div>Chargement…</div>';
  backdrop.style.display = 'flex';
  buildTraceTree(lots || [{ id: primaryLotId }]).then(data => {
    renderTraceTree(body, data);
  }).catch(err => {
    body.innerHTML = `<p style="color:var(--color-danger);padding:var(--space-6)">Erreur : ${escapeHtml(String(err))}</p>`;
  });
}

function closeTraceModal() {
  document.getElementById('trace-modal-backdrop').style.display = 'none';
}

async function buildTraceTree(lots) {
  return Promise.all(lots.map(async lot => {
    const detail = await WB3DB.getLotDetail(lot.id);
    return {
      lot:        detail.lot,
      apports:    detail.apports    || [],
      opLots:     detail.opLots     || [],
      othersByOp: detail.othersByOp || {},
      contByOp:   detail.contByOp   || {},
      prodByOp:   detail.prodByOp   || {},
    };
  }));
}

// ── Couleurs par mode d'opération ────────────────────────────
const GENO_MODE_COLORS = {
  mouvement:  { badge: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' },
  traitement: { badge: '#dcfce7', border: '#86efac', text: '#15803d' },
  analyse:    { badge: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce' },
  autre:      { badge: '#f1f5f9', border: '#cbd5e1', text: '#475569' },
};

function renderTraceTree(container, nodes) {
  if (!nodes.length) {
    container.innerHTML = '<p class="geno-empty">Aucun lot à afficher.</p>';
    return;
  }

  let html = '';

  nodes.forEach((node, ni) => {
    const { lot, apports, opLots, othersByOp, contByOp, prodByOp } = node;

    if (ni > 0) html += `<hr style="margin:28px 0;border:none;border-top:2px dashed var(--color-border)">`;

    html += `<div class="geno-tree">`;

    // ── Racine : bulle du lot ──
    const [sbg, sfg] = (LOT_STATUT_COLORS[lot.statut] || '#eee|#555').split('|');
    const dot = LOT_COULEUR_DOT[lot.couleur] || '';
    html += `
    <div class="geno-lot-header">
      <div style="font-weight:800;font-size:var(--text-title3)">${dot} ${escapeHtml(lot.nom)}</div>
      <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-top:2px">
        ${[lot.millesime, lot.couleur, lot.appellation].filter(Boolean).join(' · ')}
      </div>
      <div style="margin-top:var(--space-2);display:flex;justify-content:center;gap:6px;flex-wrap:wrap">
        <span style="background:${sbg};color:${sfg};padding:2px 10px;border-radius:999px;font-size:10px;font-weight:700">${LOT_STATUT_SHORT[lot.statut]||lot.statut}</span>
        ${lot.volume_actuel_hl != null ? `<span style="font-size:12px;font-weight:600;color:var(--color-primary)">🔵 ${fmt(lot.volume_actuel_hl)} hL</span>` : ''}
      </div>
    </div>`;

    // ── Apports (origines du lot) ──
    if (apports && apports.length) {
      html += `<div class="geno-vline"></div>`;
      html += `<div class="geno-row">`;
      apports.forEach(ap => {
        html += `
        <div class="geno-bubble geno-bubble--apport">
          <span style="font-size:var(--text-body)">🍇</span>
          <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(ap.apporteur || 'Apport')}</span>
          ${ap.date_apport  ? `<span style="font-size:10px;color:#92400e">${ap.date_apport}</span>` : ''}
          ${ap.volume_hl    ? `<span style="font-size:10px;font-weight:600">🔵 ${fmt(ap.volume_hl)} hL</span>` : ''}
          ${ap.poids_kg     ? `<span style="font-size:10px">⚖️ ${fmt(ap.poids_kg)} kg</span>` : ''}
          ${ap.cepage_libre ? `<span style="font-size:10px">🍇 ${escapeHtml(ap.cepage_libre)}</span>` : ''}
        </div>`;
      });
      html += `</div>`;
    }

    // ── Opérations (triées chronologiquement) ──
    const sortedOps = [...opLots].sort((a, b) => {
      const da = a.operations?.date_operation || '';
      const db = b.operations?.date_operation || '';
      return da.localeCompare(db);
    });

    sortedOps.forEach(ol => {
      const op     = ol.operations;
      if (!op) return;
      const opDef  = OP_TYPES_DEF.find(t => t.key === op.type_operation) || { icon: '⚙️', label: op.type_operation, mode: 'autre' };
      const mode   = opDef.mode || 'autre';
      const colors = GENO_MODE_COLORS[mode] || GENO_MODE_COLORS.autre;
      const others = othersByOp[op.id] || [];
      const conts  = contByOp[op.id]   || [];
      const prods  = prodByOp[op.id]   || [];

      const srcConts = conts.filter(c => c.role === 'source');
      const dstConts = conts.filter(c => c.role === 'destination');
      const srcLots  = others.filter(o => o.role === 'source');
      const dstLots  = others.filter(o => o.role === 'destination');

      html += `<div class="geno-vline"></div>`;

      if (mode === 'mouvement') {
        // Mouvement / Relogement → layout horizontal bulle ─ badge ─ bulle
        const hasSrc = srcConts.length || srcLots.length;
        const hasDst = dstConts.length || dstLots.length;

        html += `<div class="geno-mvt-row">`;

        if (hasSrc) {
          html += `<div class="geno-bubbles-col">`;
          srcConts.forEach(c => {
            html += `<div class="geno-bubble geno-bubble--cuve">
              <span style="font-size:var(--text-body)">🛢</span>
              <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(c.contenants?.nom||'?')}</span>
              ${c.volume_hl != null ? `<span style="font-size:10px">🔵 ${fmt(c.volume_hl)} hL</span>` : ''}
            </div>`;
          });
          srcLots.forEach(s => {
            const sl = s.lots || {};
            html += `<div class="geno-bubble geno-bubble--lot-source">
              <span style="font-size:var(--text-body)">🍷</span>
              <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(sl.nom||'?')}</span>
              ${sl.millesime ? `<span style="font-size:10px">${sl.millesime}</span>` : ''}
            </div>`;
          });
          html += `</div><div class="geno-hline"></div>`;
        }

        // Badge opération (centre)
        html += `<div class="geno-op-badge" style="background:${colors.badge};border-color:${colors.border};color:${colors.text}">
          <span style="font-size:var(--text-body)">${opDef.icon}</span>
          <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(opDef.label)}</span>
          ${op.date_operation ? `<span style="font-size:10px;opacity:.75">${op.date_operation}</span>` : ''}
          ${ol.volume_hl != null ? `<span style="font-size:10px;font-weight:600">🔵 ${fmt(ol.volume_hl)} hL</span>` : ''}
          ${op.operateur ? `<span style="font-size:10px;opacity:.75">👤 ${escapeHtml(op.operateur)}</span>` : ''}
        </div>`;

        if (hasDst) {
          html += `<div class="geno-hline"></div><div class="geno-bubbles-col">`;
          dstConts.forEach(c => {
            html += `<div class="geno-bubble geno-bubble--cuve">
              <span style="font-size:var(--text-body)">🛢</span>
              <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(c.contenants?.nom||'?')}</span>
              ${c.volume_hl != null ? `<span style="font-size:10px">🔵 ${fmt(c.volume_hl)} hL</span>` : ''}
            </div>`;
          });
          dstLots.forEach(d => {
            const dl = d.lots || {};
            html += `<div class="geno-bubble geno-bubble--lot-dest">
              <span style="font-size:var(--text-body)">🍷</span>
              <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(dl.nom||'?')}</span>
              ${dl.millesime ? `<span style="font-size:10px">${dl.millesime}</span>` : ''}
            </div>`;
          });
          html += `</div>`;
        }

        html += `</div>`; // geno-mvt-row

      } else {
        // Traitement / Analyse / Autre → carte centrée
        const prodsLine = prods.map(p => {
          const nom = p.produits_lots?.produits_catalogue?.nom || '?';
          return `<span class="geno-chip">🧪 ${escapeHtml(nom)}${p.quantite!=null?` ${fmt(p.quantite)}${p.unite?' '+p.unite:''}`:''}</span>`;
        }).join('');
        const hasDetails = prodsLine || op.operateur || ol.volume_hl != null || ol.notes;

        html += `<div class="geno-op-card" style="border-color:${colors.border};background:${colors.badge}">
          <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap${hasDetails ? ';margin-bottom:6px' : ''}">
            <span style="font-size:16px">${opDef.icon}</span>
            <span style="font-weight:700;font-size:var(--text-callout);color:${colors.text}">${escapeHtml(opDef.label)}</span>
            ${op.date_operation ? `<span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-left:auto">${op.date_operation}</span>` : ''}
          </div>
          ${hasDetails ? `<div style="display:flex;flex-wrap:wrap;gap:var(--space-1)">
            ${ol.volume_hl != null ? `<span class="geno-chip" style="font-weight:600;color:${colors.text}">🔵 ${fmt(ol.volume_hl)} hL</span>` : ''}
            ${prodsLine}
            ${op.operateur ? `<span class="geno-chip">👤 ${escapeHtml(op.operateur)}</span>` : ''}
            ${ol.notes ? `<span class="geno-chip" style="font-style:italic">💬 ${escapeHtml(ol.notes)}</span>` : ''}
          </div>` : ''}
        </div>`;
      }
    });

    // ── État actuel : bulle(s) cuve ──
    const curConts = lot.lot_contenants || [];
    html += `<div class="geno-vline"></div>`;
    html += `<div class="geno-row">`;
    if (curConts.length) {
      curConts.forEach(lc => {
        html += `<div class="geno-bubble geno-bubble--current">
          <span style="font-size:var(--text-body)">🛢</span>
          <span style="font-weight:700;font-size:var(--text-caption)">${escapeHtml(lc.contenants?.nom||'?')}</span>
          ${lc.volume_hl != null ? `<span style="font-size:10px;font-weight:600;color:var(--color-primary)">🔵 ${fmt(lc.volume_hl)} hL</span>` : ''}
          <span style="font-size:10px;font-weight:700;background:${sbg};color:${sfg};padding:1px 6px;border-radius:999px">${LOT_STATUT_SHORT[lot.statut]||lot.statut}</span>
        </div>`;
      });
    } else {
      html += `<div class="geno-bubble geno-bubble--current">
        <span style="font-size:var(--text-body)">📍</span>
        <span style="font-weight:700;font-size:var(--text-caption)">État actuel</span>
        ${lot.volume_actuel_hl != null ? `<span style="font-size:10px;font-weight:600;color:var(--color-primary)">🔵 ${fmt(lot.volume_actuel_hl)} hL</span>` : ''}
        <span style="font-size:10px;font-weight:700;background:${sbg};color:${sfg};padding:1px 6px;border-radius:999px">${LOT_STATUT_SHORT[lot.statut]||lot.statut}</span>
      </div>`;
    }
    html += `</div>`;

    if (!opLots.length && !(apports && apports.length)) {
      html += `<p class="geno-empty" style="margin-top:var(--space-4)">Aucun mouvement ni traitement enregistré pour ce lot.</p>`;
    }

    html += `</div>`; // geno-tree
  });

  container.innerHTML = html;
}
