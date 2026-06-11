// ============================================================
// config.js — WineBlender 3 DÉMO
// ------------------------------------------------------------
// Ce fichier est DIFFÉRENT de la version Richemer prod.
// Il pointe vers le projet Supabase « wb3-demo » (base fictive).
//
// La clé "anon" est publique par design (RLS protège les données).
// Ne JAMAIS coller ici la clé service_role.
// ============================================================

// >>> À REMPLACER PAR LES VRAIES VALEURS DU PROJET SUPABASE DEMO <<<
// (Sera mis à jour automatiquement après l'étape 4 du déploiement.)
const WB3_SUPABASE_URL      = 'https://REMPLACER-MOI.supabase.co';
const WB3_SUPABASE_ANON_KEY = 'REMPLACER-MOI-PAR-ANON-KEY';

// ============================================================
// Exposition globale + marqueur d'environnement
// ------------------------------------------------------------
// `isDemo` permet aux écrans d'afficher la bannière "🧪 Démo"
// et d'éviter les fonctionnalités réservées à la prod.
// ============================================================
window.WB3_CONFIG = {
  url:     WB3_SUPABASE_URL,
  anonKey: WB3_SUPABASE_ANON_KEY,
  region:  'eu-central-1',
  isDemo:  true,   // ← repo wineblender-3-demo = TOUJOURS true
};
