/* ============================================================
 * chrono.js — L7 : regroupement VISUEL par tranche de temps des
 *   listes WB3 (Opérations · Analyses). Aucun re-fetch : on classe
 *   les lignes DÉJÀ chargées / paginées dans des sections datées.
 *
 * Sections (ordre chronologique inverse), vides masquées :
 *   Aujourd'hui · Hier · Cette semaine (J-2..J-7) · Ce mois
 *   (J-8..J-30) · Plus ancien.
 *
 * API :
 *   WB3Chrono.bucket(items, getDate) -> [{ key, label, items }]
 *       (seulement les sections non vides, dans l'ordre)
 *   WB3Chrono.getCollapsed(module)   -> Set des sections repliées
 *   WB3Chrono.setCollapsed(module,s) -> persiste en session
 *
 * État replié/déplié : persistance SESSION (sessionStorage) —
 * « mémoire courte » volontaire : on ne fige pas un pli permanent,
 * mais on garde le confort le temps de la session de travail.
 * ============================================================ */
(function () {
  'use strict';

  const SECTIONS = [
    { key: 'today',     label: "Aujourd'hui" },
    { key: 'yesterday', label: 'Hier' },
    { key: 'week',      label: 'Cette semaine' },
    { key: 'month',     label: 'Ce mois' },
    { key: 'older',     label: 'Plus ancien' },
  ];

  function _startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  // Renvoie la clé de section pour une date donnée (chaîne ISO ou Date).
  function _keyFor(dateVal, today) {
    if (!dateVal) return 'older';
    const d = _startOfDay(dateVal);
    if (isNaN(d.getTime())) return 'older';
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000); // jours pleins
    if (diff <= 0) return 'today';      // aujourd'hui (ou date future éventuelle)
    if (diff === 1) return 'yesterday';
    if (diff <= 7) return 'week';        // J-2 à J-7
    if (diff <= 30) return 'month';      // J-8 à J-30
    return 'older';
  }

  function bucket(items, getDate) {
    const today = _startOfDay(new Date());
    const map = {};
    (items || []).forEach(it => {
      let dv; try { dv = getDate(it); } catch (_) { dv = null; }
      const k = _keyFor(dv, today);
      (map[k] = map[k] || []).push(it);
    });
    return SECTIONS
      .filter(s => map[s.key] && map[s.key].length)
      .map(s => ({ key: s.key, label: s.label, items: map[s.key] }));
  }

  function _ck(mod) { return 'wb3.l7.collapsed.' + mod; }
  function getCollapsed(mod) {
    try { return new Set(JSON.parse(sessionStorage.getItem(_ck(mod)) || '[]')); }
    catch (_) { return new Set(); }
  }
  function setCollapsed(mod, set) {
    try { sessionStorage.setItem(_ck(mod), JSON.stringify([...set])); } catch (_) {}
  }

  window.WB3Chrono = { bucket, getCollapsed, setCollapsed, SECTIONS };
})();
