// ============================================================
// cuverie-utils.js — fonctions utilitaires pures de cuverie
// (socle 9 — extraction pilote, aucune dépendance externe)
// Chargé par <script src="cuverie-utils.js"> avant le script
// principal de cuverie.html.
// ============================================================
'use strict';

// Tri canonique des lots d'un contenant : volume_hl DESC, puis
// date_affectation DESC. Identique au LATERAL JOIN de v_cuverie_etat (048).
// Appliqué à la source (loadCuverieData) → lots[0] déterministe partout.
function _sortLotsCanonical(lots) {
  return [...(lots || [])].sort((a, b) => {
    const va = Number(a.volume_hl) || 0;
    const vb = Number(b.volume_hl) || 0;
    if (vb !== va) return vb - va;
    const da = a.date_affectation || '';
    const db = b.date_affectation || '';
    return db < da ? -1 : db > da ? 1 : 0;
  });
}

// Arrondi à sig chiffres significatifs (doses produit, ex. 2.78 L).
function _opToSigFig(n, sig) {
  if (!Number.isFinite(n) || n === 0) return 0;
  const mag = Math.pow(10, sig - 1 - Math.floor(Math.log10(Math.abs(n))));
  return Math.round(n * mag) / mag;
}
