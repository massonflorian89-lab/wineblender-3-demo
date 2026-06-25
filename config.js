// ============================================================
// wb3/config.js — Configuration Supabase pour WineBlender 3
// ------------------------------------------------------------
// La clé "anon" est publique par design. Elle ne donne accès
// qu'à ce que les Row Level Security policies autorisent.
// Ne JAMAIS coller ici la clé service_role (qui est secrète).
// ============================================================

const WB3_SUPABASE_URL = 'https://erixkvtrhlaznqadyzey.supabase.co';
const WB3_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaXhrdnRyaGxhem5xYWR5emV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzQ2OTIsImV4cCI6MjA5Nzk1MDY5Mn0.Hgb6xOkiTh9Yiu3LBw_kD_Cwue7iCBlXu263eYoEokA';

// Exposé en global pour que db.js / auth.js puissent l'utiliser
window.WB3_CONFIG = {
  url: WB3_SUPABASE_URL,
  anonKey: WB3_SUPABASE_ANON_KEY,
  // Région de hébergement — à vérifier dans Settings → General du dashboard Supabase
  region: 'eu-central-1',
};
