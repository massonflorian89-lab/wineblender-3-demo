// cuverie-suivifa.js — Suivi FA détaillé (D9b inline + D9c drawer 3/4 écran)
// Extrait de cuverie.html (Étape 5 de la refactorisation progressive).
//
// Globals lus (définis dans cuverie.html principal) :
//   contenants, lotsMap, WB3DB, toast, escapeHtml, fmt
// Fonctions dans cuverie-drawer.js (chargé avant) :
//   _renderFaSparkline, closeDetailDrawer

// ── D9b — Saisie inline densité+T° depuis la carte cuve ───────
async function _faSubmit(ev, contenantId, lotId) {
  ev.preventDefault();
  ev.stopPropagation();
  const form    = ev.currentTarget.closest('form') || ev.target.closest('form');
  if (!form) return;
  const densInp = form.querySelector('input[name=densite]');
  const tempInp = form.querySelector('input[name=temperature]');
  const dens = densInp.value === '' ? null : parseFloat(densInp.value);
  const temp = tempInp.value === '' ? null : parseFloat(tempInp.value);

  if (dens == null || !Number.isFinite(dens)) {
    toast('Densité requise (ex. 1.080)', 'error');
    densInp.focus(); return;
  }
  if (dens < 0.9 || dens > 1.2) {
    toast('Densité hors plage usuelle (0,900 – 1,200) — corrige ou supprime la valeur', 'error');
    densInp.focus(); return;
  }
  if (temp != null && (!Number.isFinite(temp) || temp < -5 || temp > 50)) {
    toast('Température hors plage (-5 à 50 °C)', 'error');
    tempInp.focus(); return;
  }

  const goBtn = form.querySelector('.wb-fa-go');
  if (goBtn) { goBtn.disabled = true; goBtn.textContent = '…'; }
  try {
    const payload = {
      date_analyse: new Date().toISOString().slice(0, 10),
      contenant_id: contenantId,
      lot_id: lotId,
      densite: dens,
    };
    if (temp != null) payload.temperature = temp;
    await WB3DB.insertRow('analyses', payload);
    toast('Relevé enregistré', 'success');
    densInp.value = ''; tempInp.value = '';
    _faFocusNext(contenantId);
  } catch (e) {
    const msg = (e && e.message) || String(e);
    if (/temperature/i.test(msg) && /column/i.test(msg)) {
      toast('Colonne temperature absente — applique la migration 049 (voir diag/APPLICATION_049.md)', 'error');
    } else {
      toast('Erreur : ' + msg, 'error');
    }
    densInp.focus();
  } finally {
    if (goBtn) { goBtn.disabled = false; goBtn.textContent = '↵'; }
  }
}

function _faFocusNext(currentCid) {
  const inputs = Array.from(document.querySelectorAll(
    '#content [data-cid] .wb-fa-form input[name=densite]'));
  if (!inputs.length) return;
  const idx = inputs.findIndex(i => i.closest('[data-cid]')?.dataset.cid === currentCid);
  const next = (idx >= 0 && idx + 1 < inputs.length) ? inputs[idx + 1] : inputs[0];
  if (next) {
    next.focus();
    next.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ── D9c — Suivi FA détaillé (drawer 3/4 écran) ───────────────
// Détecte le début de FA via audit_log (trigger trg_audit sur lots)
// avec fallback « 1ʳᵉ analyse densité du lot ». Liste produits avant
// (7j) et pendant la FA via queryOperations. Heuristiques « à prévoir »
// côté frontend, sans écriture base.

function _closeSuiviFa() {
  document.getElementById('suivi-fa-drawer')?.classList.remove('open');
  document.getElementById('suivi-fa-backdrop')?.classList.remove('open');
}

function _shiftDate(yyyymmdd, days) {
  const d = new Date(yyyymmdd + 'T00:00:00');
  if (isNaN(d.getTime())) return yyyymmdd;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Cherche dans audit_log la 1ʳᵉ transition de lots.statut vers 'fa'.
// Fallback : date de la 1ʳᵉ analyse avec densité du lot.
async function _faDetermineStart(lotId) {
  try {
    const rows = await WB3DB.listTable('audit_log', {
      select: 'created_at, new_data, changed_fields',
      filter: { table_name: 'lots', record_id: lotId },
      order:  'created_at', ascending: true, limit: 100,
    });
    const tr = (rows || []).find(r =>
      Array.isArray(r.changed_fields) && r.changed_fields.includes('statut') &&
      r.new_data && r.new_data.statut === 'fa'
    );
    if (tr && tr.created_at) return tr.created_at.slice(0, 10);
  } catch (_) { /* fallback */ }
  try {
    const rows = await WB3DB.listTable('analyses', {
      select: 'date_analyse, densite',
      filter: { lot_id: lotId },
      order:  'date_analyse', ascending: true, limit: 30,
    });
    const first = (rows || []).find(r => r.densite != null);
    if (first) return first.date_analyse;
  } catch (_) {}
  return null;
}

async function _openSuiviFa(cid, lotId) {
  const aside = document.getElementById('suivi-fa-drawer');
  if (!aside) return;
  const c    = contenants.find(x => x.id === cid);
  const lots = lotsMap.get(cid) || [];
  const lp   = lots.find(l => l.id === lotId) || lots[0];
  closeDetailDrawer();

  document.getElementById('sf-sub').textContent =
    (lp ? lp.nom + (lp.millesime ? ' ' + lp.millesime : '') : '?') + (c ? ' · ' + c.nom : '');
  const body = document.getElementById('sf-body');
  body.innerHTML = '<div style="padding:14px;text-align:center"><div class="spinner"></div></div>';

  document.getElementById('suivi-fa-backdrop').classList.add('open');
  aside.classList.add('open');

  // P1.1 — Navigation séquentielle : liste des cuves FA triées par nom.
  const _faNavList = () => {
    const list = [];
    for (const [ncid, nlots] of lotsMap) {
      const faLot = nlots.find(l => l.statut === 'fa');
      if (!faLot) continue;
      const nc = contenants.find(x => x.id === ncid);
      if (!nc || nc.actif === false) continue;
      list.push({ cid: ncid, lotId: faLot.id, nom: nc.nom || ncid });
    }
    return list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  };
  const _navList = _faNavList();
  const _navIdx  = _navList.findIndex(e => e.cid === cid);
  const sfNav    = document.getElementById('sf-nav');
  if (sfNav) {
    if (_navList.length > 1 && _navIdx >= 0) {
      const prev = _navList[(_navIdx - 1 + _navList.length) % _navList.length];
      const next = _navList[(_navIdx + 1) % _navList.length];
      sfNav.innerHTML =
        `<span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);white-space:nowrap">${_navIdx + 1}/${_navList.length}</span>
         <button class="btn btn--ghost btn--sm" type="button"
           title="Cuve FA précédente : ${escapeHtml(prev.nom)}"
           onclick="_openSuiviFa('${prev.cid}','${prev.lotId}')">←</button>
         <button class="btn btn--ghost btn--sm" type="button"
           title="Cuve FA suivante : ${escapeHtml(next.nom)}"
           onclick="_openSuiviFa('${next.cid}','${next.lotId}')">→</button>`;
    } else {
      sfNav.innerHTML = '';
    }
  }

  const token = cid + '::' + lotId + '::' + Date.now();
  aside._token = token;

  try {
    const startFa = await _faDetermineStart(lotId);
    if (aside._token !== token) return;
    const since = startFa ? _shiftDate(startFa, -7) : null;

    const [opsAll, anaAll] = await Promise.all([
      WB3DB.queryOperations(since ? { date_from: since } : {}).catch(() => []),
      WB3DB.listTable('analyses', {
        select: 'date_analyse, densite, temperature, so2_libre',
        filter: { lot_id: lotId },
        order:  'date_analyse', ascending: true, limit: 50,
      }).catch(() => []),
    ]);
    if (aside._token !== token) return;

    const opsOfLot = (opsAll || []).filter(op =>
      Array.isArray(op.operation_lots) &&
      op.operation_lots.some(ol => ol.lots && ol.lots.id === lotId));

    const before = startFa
      ? opsOfLot.filter(op => op.date_operation && op.date_operation < startFa)
      : [];
    const during = startFa
      ? opsOfLot.filter(op => op.date_operation && op.date_operation >= startFa)
      : opsOfLot;

    body.innerHTML = _renderSuiviFa(c, lp, startFa, before, during, anaAll || []);
  } catch (e) {
    console.warn('[WB3 D9c] _openSuiviFa:', e);
    if (aside._token === token) {
      body.innerHTML = `<div style="color:var(--color-danger);padding:14px">Erreur de chargement : ${escapeHtml(e?.message || String(e))}</div>`;
    }
  }
}

function _renderSuiviFa(c, lp, startFa, opsBefore, opsDuring, analyses) {
  const fmtD = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('fr-FR') : '—';

  const allLots = (c && lotsMap.get(c.id)) || [];
  const faLots  = allLots.filter(l => l.statut === 'fa');
  const lotPickerSec = (faLots.length > 1) ? `
    <div style="margin-bottom:var(--space-3);padding:8px 10px;background:var(--color-bg-subtle);border-radius:var(--radius-sm);border-left:3px solid var(--color-accent)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px;margin-bottom:6px">🚥 Lots en FA dans cette cuve (${faLots.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${faLots.map(l => {
          const active = (lp && l.id === lp.id);
          return `<button type="button"
            onclick="_openSuiviFa('${c.id}','${l.id}')"
            style="padding:4px 10px;border-radius:var(--radius-sm);border:1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'};background:${active ? 'var(--color-accent)' : 'var(--color-bg-elevated)'};color:${active ? '#fff' : 'var(--color-ink-primary)'};font-size:var(--text-caption);font-weight:${active ? '600' : '500'};cursor:pointer">
            ${escapeHtml(l.nom)}${l.millesime ? ' ' + escapeHtml(String(l.millesime)) : ''}
          </button>`;
        }).join('')}
      </div>
    </div>` : '';

  const lastAna = analyses.length ? analyses[analyses.length - 1] : null;
  const lastDensTxt = (lastAna && lastAna.densite != null) ? `dernière : ${Number(lastAna.densite).toFixed(3)}` : 'aucun relevé';
  const lastTempTxt = (lastAna && lastAna.temperature != null) ? `dernière : ${Number(lastAna.temperature).toFixed(1)} °C` : '—';
  const saisieSec = (lp && lp.statut === 'fa') ? `
    <div style="margin-bottom:var(--space-3);padding:10px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:var(--radius-sm)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px;margin-bottom:6px">✍️ Nouveau relevé — ${escapeHtml(lp.nom)}${lp.millesime ? ' ' + escapeHtml(String(lp.millesime)) : ''}</div>
      <form class="wb-fa-form" autocomplete="off" style="display:flex;gap:6px;align-items:center"
        onsubmit="_faSubmit(event,'${c.id}','${lp.id}');return false">
        <label style="flex:1;display:flex;flex-direction:column;gap:2px">
          <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">Densité (${lastDensTxt})</span>
          <input class="input" type="number" step="0.0001" min="0.9" max="1.2"
            name="densite" inputmode="decimal" placeholder="ex. 1.080" required autofocus>
        </label>
        <label style="flex:1;display:flex;flex-direction:column;gap:2px">
          <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary)">T °C (${lastTempTxt})</span>
          <input class="input" type="number" step="0.1" min="-5" max="50"
            name="temperature" inputmode="decimal" placeholder="ex. 22.5">
        </label>
        <button type="submit" class="btn btn--primary wb-fa-go" style="align-self:flex-end;height:36px"
          title="Enregistrer le relevé">↵ Enregistrer</button>
      </form>
    </div>` : '';

  const chartSec = `
    <div style="margin-bottom:var(--space-3)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px;margin-bottom:6px">📈 Densité & température</div>
      ${_renderFaSparkline(analyses, 300)}
    </div>`;

  const startSec = `
    <div style="margin-bottom:var(--space-3);padding:8px 10px;background:var(--color-bg-subtle);border-radius:var(--radius-sm)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px">Début FA estimé</div>
      <div style="font-size:var(--text-headline);font-weight:700">${escapeHtml(fmtD(startFa))}</div>
      <div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-top:2px">
        ${startFa ? 'Source : audit du statut lot (ou 1ʳᵉ mesure de densité)' : 'Aucune trace de passage en FA détectée — historique complet affiché.'}
      </div>
    </div>`;

  const opCard = (op) => {
    const produits = (op.operation_produits || []).map(opp => {
      const cat = opp.produits_lots?.produits_catalogue;
      const nom = cat?.nom || '?';
      const qty = opp.quantite != null ? ` · ${escapeHtml(String(opp.quantite))} ${escapeHtml(opp.unite || '')}` : '';
      return `<li style="font-size:var(--text-caption)">${escapeHtml(nom)}${qty}</li>`;
    }).join('');
    return `
      <div style="padding:6px 10px;border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-bottom:6px;background:var(--color-bg-elevated)">
        <div style="display:flex;align-items:baseline;gap:var(--space-2)">
          <span style="font-size:var(--text-caption);color:var(--color-ink-tertiary);min-width:78px">${escapeHtml(fmtD(op.date_operation))}</span>
          <span style="font-weight:600;flex:1">${escapeHtml(op.type_operation || '?')}</span>
        </div>
        ${produits ? `<ul style="margin:4px 0 0 22px;padding:0">${produits}</ul>`
                   : `<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);margin-top:2px">(sans produit listé)</div>`}
      </div>`;
  };

  const beforeSec = `
    <div style="margin-bottom:var(--space-3)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px;margin-bottom:6px">📥 Juste avant la FA (7 j)</div>
      ${opsBefore.length ? opsBefore.map(opCard).join('') : '<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);padding:4px 2px">Aucune opération tracée dans la semaine précédant la FA.</div>'}
    </div>`;

  const duringSec = `
    <div style="margin-bottom:var(--space-3)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px;margin-bottom:6px">🌡 Pendant la FA</div>
      ${opsDuring.length ? opsDuring.map(opCard).join('') : '<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);padding:4px 2px">Aucune opération tracée depuis le début de la FA.</div>'}
    </div>`;

  const todos = _faSuggestions(startFa, opsDuring, analyses);
  const todoSec = `
    <div style="margin-bottom:var(--space-3)">
      <div style="font-size:var(--text-caption);text-transform:uppercase;color:var(--color-ink-tertiary);font-weight:600;letter-spacing:.4px;margin-bottom:6px">📋 À prévoir</div>
      ${todos.length
        ? todos.map(t => `<div style="padding:6px 10px;background:${t.bg};border-left:3px solid ${t.color};border-radius:0 var(--radius-sm) var(--radius-sm) 0;margin-bottom:var(--space-1);font-size:var(--text-footnote)">${t.icon} ${escapeHtml(t.text)}</div>`).join('')
        : '<div style="font-size:var(--text-caption);color:var(--color-ink-tertiary);padding:4px 2px">Rien à signaler pour l\'instant.</div>'}
    </div>`;

  return lotPickerSec + saisieSec + chartSec + startSec + beforeSec + duringSec + todoSec;
}

function _faSuggestions(startFa, opsDuring, analyses) {
  const out = [];
  const last = analyses.length ? analyses[analyses.length - 1] : null;
  const lastDens = last && last.densite != null ? Number(last.densite) : null;
  const lastTemp = last && last.temperature != null ? Number(last.temperature) : null;

  // 1) Densité < 0.998 sans sulfitage tracé pendant la FA
  if (lastDens != null && lastDens < 0.998) {
    const hasSulf = (opsDuring || []).some(op => op.type_operation === 'sulfitage');
    if (!hasSulf) {
      out.push({ icon:'🧪', text:`Densité < 0,998 (${lastDens.toFixed(3)}) — penser au sulfitage de fin de FA.`,
        color:'#f59e0b', bg:'#fef3c7' });
    }
  }

  // 2) Plateau densité ≥ 5 j avec densité encore > 1,000
  const densAna = analyses.filter(a => a.densite != null);
  if (densAna.length >= 3) {
    const recent = densAna.slice(-5);
    const first  = Number(recent[0].densite);
    const lastR  = Number(recent[recent.length - 1].densite);
    const dStart = new Date(recent[0].date_analyse + 'T00:00:00');
    const dEnd   = new Date(recent[recent.length - 1].date_analyse + 'T00:00:00');
    const days   = Math.round((dEnd - dStart) / 86400000);
    if (days >= 5 && Math.abs(first - lastR) < 0.003 && lastR > 1.000) {
      out.push({ icon:'⚠', text:`Densité quasi stable (${first.toFixed(3)} → ${lastR.toFixed(3)}) sur ${days} j, mais > 1,000 — FA potentiellement bloquée.`,
        color:'#ef4444', bg:'#fee2e2' });
    }
  }

  // 3) Température > 30 °C
  if (lastTemp != null && lastTemp > 30) {
    out.push({ icon:'🌡', text:`Température élevée (${lastTemp.toFixed(1)} °C) — surveiller, risque d'arrêt de FA.`,
      color:'#ef4444', bg:'#fee2e2' });
  }

  // 4) FA > 21 j sans sulfitage tracé
  if (startFa) {
    const start = new Date(startFa + 'T00:00:00');
    const days  = Math.floor((Date.now() - start.getTime()) / 86400000);
    if (days > 21) {
      const hasSulf = (opsDuring || []).some(op => op.type_operation === 'sulfitage');
      if (!hasSulf) {
        out.push({ icon:'⏱', text:`FA en cours depuis ${days} j sans sulfitage tracé — vérifier l'évolution.`,
          color:'#f59e0b', bg:'#fef3c7' });
      }
    }
  }

  return out;
}
