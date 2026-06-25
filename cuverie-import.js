// cuverie-import.js — Import état de cave (xlsx) : migration rapide des « qualités »
// Extrait de cuverie.html (Étape 12 de la refactorisation progressive).
//
// Outil de migration ponctuel : un classeur xlsx où 1 ligne = un volume d'une
// qualité dans une cuve. Les lignes de même Qualité sont regroupées en UN lot
// réparti sur plusieurs cuves, créé via wb3_save_lot_graph (graphe lot +
// contenants journalisé). S'appuie sur lib/xlsx + lib/wb3-import.js (assistant).
//
// Contenu : _impNumCave (parse numérique tolérant), openCaveImport (assistant).
//
// Globals lus : WB3DB, toast, contenants, loadCuverieData, render,
//   WB3Import (lib/wb3-import.js), XLSX (lib/xlsx.full.min.js)
//
// Scripts classiques : fonctions globales → onclick inline / openCuveActions.
// Aucun appel top-level → ordre de chargement indifférent.

'use strict';

// ============================================================
// Import état de cave (xlsx) — migration rapide des « qualités »
// ------------------------------------------------------------
// 1 ligne = un volume d'une qualité dans une cuve. Les lignes de même
// Qualité sont regroupées en UN lot réparti sur plusieurs cuves, créé via
// wb3_save_lot_graph (graphe lot + contenants journalisé).
// ============================================================
function _impNumCave(v){ if(v==null||v==='')return null; const n=Number(String(v).replace(',','.').replace(/[^\d.\-]/g,'')); return Number.isFinite(n)?n:null; }
function openCaveImport(){
  const COULEURS = ['rouge','blanc','rose','gris'];
  const COLS = [
    { key:'cuve',        header:'Cuve',        example:'H1-06', aliases:['contenant','n cuve','numero cuve'] },
    { key:'qualite',     header:'Qualité',     example:'Viognier 2025', aliases:['lot','vin','nom lot','nom du lot'] },
    { key:'couleur',     header:'Couleur',     example:'blanc' },
    { key:'millesime',   header:'Millésime',   example:'2025' },
    { key:'societe',     header:'Société',     example:'Négoce' },
    { key:'appellation', header:'Appellation', example:'IGP Pays d\'Oc' },
    { key:'statut',      header:'État',        example:'elevage', aliases:['statut'] },
    { key:'volume_hl',   header:'Volume hL',   example:'24', aliases:['volume','hl','volume (hl)'] },
  ];
  WB3Import.run({
    title: '📥 Import état de cave (qualités)',
    templateName: 'modele_inventaire_cave.xlsx',
    sheetName: 'Cave',
    instructions: 'Une ligne = un volume d\'une qualité dans une cuve. Colonnes <b>Cuve</b>, <b>Qualité</b> et <b>Volume hL</b> obligatoires. Plusieurs lignes de même <b>Qualité</b> = un seul lot réparti dans plusieurs cuves. Couleur : rouge / blanc / rose / gris. État par défaut : élevage.',
    columns: COLS,
    examples: [ Object.fromEntries(COLS.map(c => [c.key, c.example])) ],
    prepare: (row) => {
      const cuveTxt = String(row.cuve || '').trim();
      if (!cuveTxt) return { status:'error', label:'(ligne sans cuve)', msg:'colonne « Cuve » vide' };
      const c = _densResolve(cuveTxt);
      if (c === '__ambig__') return { status:'error', label:cuveTxt, msg:'plusieurs cuves correspondent' };
      if (!c)                return { status:'error', label:cuveTxt, msg:'cuve introuvable' };
      const qualite = String(row.qualite || '').trim();
      if (!qualite) return { status:'error', label:c.nom, msg:'colonne « Qualité » vide' };
      const vol = _impNumCave(row.volume_hl);
      if (vol == null || vol <= 0) return { status:'error', label:`${c.nom} · ${qualite}`, msg:'volume hL manquant ou invalide' };
      let couleur = String(row.couleur || '').trim().toLowerCase();
      if (couleur === 'rosé' || couleur === 'rose') couleur = 'rose';
      if (!COULEURS.includes(couleur)) couleur = 'rouge';
      const mill = (() => { const n = parseInt(String(row.millesime || '').replace(/[^\d]/g, ''), 10); return (Number.isFinite(n) && n > 1900 && n < 2100) ? n : null; })();
      const statut = String(row.statut || '').trim().toLowerCase() || 'elevage';
      return {
        status: 'create',
        label: `${c.nom} · ${qualite} · ${vol} hL`,
        msg: `${couleur}${mill ? ' ' + mill : ''}`,
        data: { contenant_id:c.id, qualite, couleur, millesime:mill, societe:String(row.societe||'').trim()||null, appellation:String(row.appellation||'').trim()||null, statut, volume_hl:vol },
      };
    },
    commit: async (rows, onProgress) => {
      // Regroupe par Qualité : 1 lot = N cuves.
      const groups = new Map();
      rows.forEach(r => { const k = r.qualite.toLowerCase(); if (!groups.has(k)) groups.set(k, { first:r, list:[] }); groups.get(k).list.push(r); });
      let ok = 0, fail = 0, done = 0; const total = rows.length; const messages = [];
      for (const { first, list } of groups.values()) {
        const lotPayload = { nom:first.qualite, couleur:first.couleur, statut:first.statut, millesime:first.millesime, societe:first.societe, appellation:first.appellation };
        const contenants = list.map(r => ({ contenant_id:r.contenant_id, volume_hl:r.volume_hl }));
        try { await WB3DB.saveLotGraphAtomic(lotPayload, { cepages:[], contenants, motif:'Import inventaire cave' }); ok += list.length; }
        catch (e) { fail += list.length; messages.push(`${first.qualite} : ${WB3DB.errMsg ? WB3DB.errMsg(e) : (e.message || e)}`); }
        done += list.length; onProgress(done, total);
      }
      return { ok, fail, messages };
    },
    onDone: async () => { try { await loadCuverieData(); render(); } catch (_) {} },
  });
}
