// ============================================================
// wb3-qualite.js — Helper PUR partagé des seuils qualité (workflow 4)
// ------------------------------------------------------------
// Source unique des défauts + logique d'alerte analytique, pour
// éviter la duplication entre analyses.html, contenant-detail.html,
// rapports.html, qualite-traca.html.
//
// Pur (aucune dépendance DOM). Chargé via <script src> AVANT le
// script principal de chaque page. Expose window.WB3Qualite.
//
// Les seuils EFFECTIFS viennent de wb3_get_tolerances (mig 056+058)
// via WB3DB.getTolerances ; ce helper ne fait que normaliser +
// évaluer. Si les tolérances ne sont pas chargées → DEFAULTS.
// ============================================================
'use strict';

(function (global) {
  // Défaut WB3 (miroir de wb3_get_tolerances 058). Source unique côté front.
  const DEFAULTS = {
    ph_min: 2.8, ph_max: 4.2,
    tav_min: 7,  tav_max: 17,
    av_max: 1.5, so2_libre_max: 120, temp_max: 30,
  };

  // Couleur d'alerte unique (cohérence visuelle inter-pages).
  const ALERT_COLOR = '#b91c1c';

  // Libellés métier courts (1 par paramètre à seuil).
  const LABELS = {
    ph:               'pH hors seuil',
    tav:              'TAV hors seuil',
    acidite_volatile: 'AV élevée',
    so2_libre:        'SO₂ libre élevé',
    temperature:      'Température élevée',
  };

  // Normalise un objet tolérances (issu de getTolerances, partiel ou null)
  // en objet seuils complet (défauts comblés, valeurs coercées en nombre).
  function normalize(tol) {
    const t = {};
    for (const k of Object.keys(DEFAULTS)) {
      const v = tol && tol[k] != null ? Number(tol[k]) : DEFAULTS[k];
      t[k] = Number.isFinite(v) ? v : DEFAULTS[k];
    }
    return t;
  }

  // Renvoie ALERT_COLOR si (param, valeur) dépasse le seuil, sinon null.
  function alertColor(param, v, th) {
    if (v == null) return null;
    const T = th || DEFAULTS;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    switch (param) {
      case 'ph':               return (n < T.ph_min || n > T.ph_max) ? ALERT_COLOR : null;
      case 'tav':              return (n < T.tav_min || n > T.tav_max) ? ALERT_COLOR : null;
      // Plafonds de danger : ATTEINDRE le seuil = alerte (>=), pas seulement
      // le dépasser. Ex. temp_max=30 → 30 °C déclenche déjà l'alerte FA.
      case 'acidite_volatile': return n >= T.av_max ? ALERT_COLOR : null;
      case 'so2_libre':        return n >= T.so2_libre_max ? ALERT_COLOR : null;
      case 'temperature':      return n >= T.temp_max ? ALERT_COLOR : null;
      default:                 return null;
    }
  }

  // Champs en alerte d'une analyse → [{ param, label, value, detail }].
  // detail = libellé court + valeur (ex: "pH hors seuil (3.0)").
  function alertFields(a, th) {
    if (!a) return [];
    const out = [];
    for (const param of ['ph', 'tav', 'acidite_volatile', 'so2_libre', 'temperature']) {
      const v = a[param];
      if (alertColor(param, v, th)) {
        out.push({ param, label: LABELS[param], value: v,
                   detail: `${LABELS[param]} (${v})` });
      }
    }
    return out;
  }

  function isAlert(a, th) { return alertFields(a, th).length > 0; }

  // Chargement pratique : normalise WB3DB.getTolerances() si dispo.
  // Renvoie toujours un objet seuils complet (défauts si indispo).
  async function load(opts) {
    try {
      if (global.WB3DB && global.WB3DB.getTolerances) {
        const tol = await global.WB3DB.getTolerances(opts || {});
        return normalize(tol);
      }
    } catch (_) { /* fallback défauts */ }
    return normalize(null);
  }

  global.WB3Qualite = {
    DEFAULTS, ALERT_COLOR, LABELS,
    normalize, alertColor, alertFields, isAlert, load,
  };
})(window);
