// ============================================================
// config.js — WineBlender 3 DÉMO
// ------------------------------------------------------------
// Ce fichier est DIFFÉRENT de la version Richemer prod.
// Il pointe vers le projet Supabase « wb3-demo » (base fictive).
//
// La clé "anon" est publique par design (RLS protège les données).
// Ne JAMAIS coller ici la clé service_role.
// ============================================================

// Projet Supabase « wb3-demo » — région eu-central-1 (Frankfurt).
// La clé anon est publique par design (RLS protège les données).
const WB3_SUPABASE_URL      = 'https://ynwwrjhxvpjyrucpbxqq.supabase.co';
const WB3_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud3dyamh4dnBqeXJ1Y3BieHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODI2MjMsImV4cCI6MjA5Njc1ODYyM30.K0G196Dtna8oLOfyLx2xR_6R0bhe6NN3cAwG6aeKXpQ';

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
